import { Router } from 'express';
import { pool } from '../config/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { calculateMetrics, calculateScore } from '../services/metrics';
import { parse } from 'csv-parse/sync';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const router = Router();

const hasAWS = process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_ACCESS_KEY_ID !== 'your_key_here';

const s3 = hasAWS
  ? new S3Client({ region: process.env.AWS_REGION })
  : null;

// Step 1 — frontend asks for a pre-signed upload URL (S3 mode)
router.get('/:cid/upload-url', authenticate, requireRole('admin', 'analyst'), async (req, res) => {
  if (!s3) {
    // Local mode: tell frontend to POST file content directly
    return res.json({ mode: 'local', key: `local/${req.params.cid}/${Date.now()}.csv` });
  }
  try {
    const key = `financials/${req.params.cid}/${Date.now()}.csv`;
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: 'text/csv'
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });
    res.json({ mode: 's3', url, key });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Step 2 — after upload, trigger processing
router.post('/:cid/process-csv', authenticate, requireRole('admin', 'analyst'), async (req: AuthRequest, res) => {
  const cid = req.params.cid;
  const { s3_key, csvContent } = req.body;
  let auditId: number | null = null;

  try {
    let rawCsv = '';

    if (s3 && s3_key && !csvContent) {
      // Production: read from S3
      const cmd = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3_key
      });
      const response = await s3.send(cmd);
      rawCsv = await response.Body?.transformToString() || '';
    } else {
      // Local dev: content sent directly from frontend
      rawCsv = csvContent;
    }

    if (!rawCsv) return res.status(400).json({ error: 'No CSV content found' });

    const rows: any[] = parse(rawCsv, {
      columns: true,
      skip_empty_lines: true,
      cast: true,
      trim: true
    });

    if (rows.length === 0)
      return res.status(400).json({ error: 'CSV has no data rows' });

    // Validate required columns
    const required = ['fiscal_year', 'revenue', 'ebitda', 'pat', 'total_debt', 'operating_profit'];
    const missing = required.filter(col => !(col in rows[0]));
    if (missing.length > 0)
      return res.status(400).json({ error: `Missing columns: ${missing.join(', ')}` });

    // Create audit record
    const aud = await pool.query(
      `INSERT INTO upload_audits (company_id, uploaded_by, s3_key, row_count, status)
       VALUES ($1, $2, $3, $4, 'processing') RETURNING id`,
      [cid, req.user!.id, s3_key || `local/${cid}/${Date.now()}`, rows.length]
    );
    auditId = aud.rows[0].id;

    // Insert / update each year's financials
    for (const row of rows) {
      await pool.query(
        `INSERT INTO financials
           (company_id, fiscal_year, revenue, ebitda, pat, total_debt, operating_profit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (company_id, fiscal_year) DO UPDATE SET
           revenue          = EXCLUDED.revenue,
           ebitda           = EXCLUDED.ebitda,
           pat              = EXCLUDED.pat,
           total_debt       = EXCLUDED.total_debt,
           operating_profit = EXCLUDED.operating_profit`,
        [cid, row.fiscal_year, row.revenue, row.ebitda,
         row.pat, row.total_debt, row.operating_profit]
      );
    }

    // Recalculate metrics from ALL rows for this company
    const allRows = await pool.query(
      'SELECT * FROM financials WHERE company_id = $1 ORDER BY fiscal_year', [cid]
    );
    const metrics = calculateMetrics(allRows.rows);

    await pool.query(
      `INSERT INTO financial_metrics
         (company_id, op_margin, pat_margin, sales_cagr_3y,
          pat_cagr_3y, debt_trend, margin_trend)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (company_id) DO UPDATE SET
         op_margin      = EXCLUDED.op_margin,
         pat_margin     = EXCLUDED.pat_margin,
         sales_cagr_3y  = EXCLUDED.sales_cagr_3y,
         pat_cagr_3y    = EXCLUDED.pat_cagr_3y,
         debt_trend     = EXCLUDED.debt_trend,
         margin_trend   = EXCLUDED.margin_trend,
         calculated_at  = NOW()`,
      [cid, metrics.op_margin, metrics.pat_margin, metrics.sales_cagr_3y,
       metrics.pat_cagr_3y, metrics.debt_trend, metrics.margin_trend]
    );

    // Recalculate score
    const sentRows = await pool.query(
      `SELECT sentiment, COUNT(*) as count
       FROM research_notes WHERE company_id = $1 GROUP BY sentiment`, [cid]
    );
    const counts = { positive: 0, negative: 0, total: 0 };
    sentRows.rows.forEach((r: any) => {
      counts.total += +r.count;
      if (r.sentiment === 'positive') counts.positive = +r.count;
      if (r.sentiment === 'negative') counts.negative = +r.count;
    });
    const score = calculateScore(metrics, counts);

    await pool.query(
      `INSERT INTO company_scores
         (company_id, investment_score, growth_score, risk_score, overall_score)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (company_id) DO UPDATE SET
         investment_score = EXCLUDED.investment_score,
         growth_score     = EXCLUDED.growth_score,
         risk_score       = EXCLUDED.risk_score,
         overall_score    = EXCLUDED.overall_score,
         scored_at        = NOW()`,
      [cid, score.investment_score, score.growth_score,
       score.risk_score, score.overall_score]
    );

    await pool.query(
      `UPDATE upload_audits SET status = 'success' WHERE id = $1`, [auditId]
    );

    res.json({
      success: true,
      rows_imported: rows.length,
      metrics,
      score
    });

  } catch (err: any) {
    if (auditId) {
      await pool.query(
        `UPDATE upload_audits SET status = 'failed', error_log = $1 WHERE id = $2`,
        [err.message, auditId]
      );
    }
    res.status(500).json({ error: 'CSV processing failed', detail: err.message });
  }
});

export default router;