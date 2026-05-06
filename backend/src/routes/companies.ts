import { Router } from 'express';
import { pool } from '../config/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { generateSummary, buildPrompt } from '../services/ollama';

const router = Router();

// ── Get all companies ──────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, sector, sort = 'name' } = req.query;
    let q = `SELECT c.*, cs.overall_score FROM companies c
      LEFT JOIN company_scores cs ON c.id = cs.company_id
      WHERE c.deleted_at IS NULL`;
    const params: any[] = [];
    if (search) { params.push(`%${search}%`); q += ` AND c.name ILIKE $${params.length}`; }
    if (sector) { params.push(sector); q += ` AND c.sector = $${params.length}`; }
    q += sort === 'score'
      ? ' ORDER BY cs.overall_score DESC NULLS LAST'
      : ' ORDER BY c.name';
    res.json((await pool.query(q, params)).rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Create company ─────────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('admin', 'analyst'), async (req: AuthRequest, res) => {
  try {
    const { name, sector, description, country, founded_year } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name is required' });
    const result = await pool.query(
      `INSERT INTO companies (name, sector, description, country, founded_year, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, sector, description, country, founded_year || null, req.user!.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Get single company with all related data ───────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [co, fin, met, notes, score, summ] = await Promise.all([
      pool.query('SELECT * FROM companies WHERE id = $1', [id]),
      pool.query('SELECT * FROM financials WHERE company_id = $1 ORDER BY fiscal_year', [id]),
      pool.query('SELECT * FROM financial_metrics WHERE company_id = $1', [id]),
      pool.query(`
        SELECT rn.*, u.email as author
        FROM research_notes rn
        JOIN users u ON rn.author_id = u.id
        WHERE rn.company_id = $1
        ORDER BY rn.created_at DESC`, [id]),
      pool.query('SELECT * FROM company_scores WHERE company_id = $1', [id]),
      pool.query(`
        SELECT * FROM ai_summaries
        WHERE company_id = $1
        ORDER BY generated_at DESC LIMIT 1`, [id]),
    ]);
    if (!co.rows[0]) return res.status(404).json({ error: 'Company not found' });
    res.json({
      company: co.rows[0],
      financials: fin.rows,
      metrics: met.rows[0] || null,
      notes: notes.rows,
      score: score.rows[0] || null,
      summary: summ.rows[0] || null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Add research note ──────────────────────────────────────────────────────
router.post('/:id/notes', authenticate, requireRole('admin', 'analyst'), async (req: AuthRequest, res) => {
  try {
    const { content, sentiment = 'neutral' } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content is required' });
    const result = await pool.query(
      `INSERT INTO research_notes (company_id, author_id, content, sentiment)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, req.user!.id, content, sentiment]
    );
    res.status(201).json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Generate one-page brief ────────────────────────────────────────────────
router.post('/:id/brief', authenticate, requireRole('admin', 'analyst'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const [co, fin, met, notes, score] = await Promise.all([
      pool.query('SELECT * FROM companies WHERE id = $1', [id]),
      pool.query('SELECT * FROM financials WHERE company_id = $1 ORDER BY fiscal_year', [id]),
      pool.query('SELECT * FROM financial_metrics WHERE company_id = $1', [id]),
      pool.query(`
        SELECT * FROM research_notes
        WHERE company_id = $1
        ORDER BY created_at DESC LIMIT 5`, [id]),
      pool.query('SELECT * FROM company_scores WHERE company_id = $1', [id]),
    ]);

    const c = co.rows[0];
    const m = met.rows[0] || {};
    const s = score.rows[0] || {};
    const latestFin = fin.rows[fin.rows.length - 1] || {};

    // Cast all numeric values — pg returns strings for NUMERIC columns
    const op = Number(m.op_margin || 0).toFixed(1);
    const pat = Number(m.pat_margin || 0).toFixed(1);
    const cagr = Number(m.sales_cagr_3y || 0).toFixed(1);
    const pcagr = Number(m.pat_cagr_3y || 0).toFixed(1);
    const ovr = s.overall_score ? Math.round(Number(s.overall_score)) + '/100' : '—';
    const grw = s.growth_score ? Number(s.growth_score).toFixed(1) : '—';
    const eff = s.investment_score ? Number(s.investment_score).toFixed(1) : '—';

    const fmtM = (v: any) => v != null && v !== '' ? (Number(v) / 1e6).toFixed(2) + 'M' : '—';

    const brief = `
ONE-PAGE COMPANY BRIEF
======================
Company: ${c.name}
Sector: ${c.sector || 'N/A'}
Country: ${c.country || 'N/A'}
Founded: ${c.founded_year || 'N/A'}
Description: ${c.description || 'N/A'}

FINANCIAL SNAPSHOT (Latest Year: ${latestFin.fiscal_year || 'N/A'})
────────────────────────────────
Revenue: ${fmtM(latestFin.revenue)}
EBITDA: ${fmtM(latestFin.ebitda)}
PAT: ${fmtM(latestFin.pat)}
Total Debt: ${fmtM(latestFin.total_debt)}
Operating Profit: ${fmtM(latestFin.operating_profit)}

KEY METRICS
────────────────────────────────
Operating Margin: ${op}%
PAT Margin: ${pat}%
Sales CAGR 3Y: ${cagr}%
PAT CAGR 3Y: ${pcagr}%
Debt Trend: ${m.debt_trend || '—'}
Margin Trend: ${m.margin_trend || '—'}

INVESTMENT SCORE
────────────────────────────────
Overall Score: ${ovr}
Growth Score: ${grw}
Efficiency Score: ${eff}

ANALYST NOTES (${notes.rows.length} total)
────────────────────────────────
${notes.rows.length > 0
  ? notes.rows.map((n: any) => `[${n.sentiment.toUpperCase()}] ${n.content}`).join('\n')
  : 'No analyst notes added yet.'}
    `.trim();

    await pool.query(
      `INSERT INTO company_briefs (company_id, content, generated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id)
       DO UPDATE SET content = $2, generated_by = $3, generated_at = NOW()`,
      [id, brief, req.user!.id]
    );

    res.json({ brief });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Get saved brief ────────────────────────────────────────────────────────
router.get('/:id/brief', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM company_briefs WHERE company_id = $1', [req.params.id]
    );
    res.json(result.rows[0] || null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Generate AI summary via Ollama ─────────────────────────────────────────
router.post('/:id/ai-summary', authenticate, requireRole('admin', 'analyst'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const model = process.env.OLLAMA_MODEL || 'tinyllama';

    const [co, met, notes, sc] = await Promise.all([
      pool.query('SELECT * FROM companies WHERE id = $1', [id]),
      pool.query('SELECT * FROM financial_metrics WHERE company_id = $1', [id]),
      pool.query(`
        SELECT * FROM research_notes
        WHERE company_id = $1
        ORDER BY created_at DESC LIMIT 5`, [id]),
      pool.query('SELECT * FROM company_scores WHERE company_id = $1', [id]),
    ]);

    const prompt = buildPrompt(
      co.rows[0],
      met.rows[0] || {},
      notes.rows,
      sc.rows[0] || {}
    );

    const content = await generateSummary(prompt, model);

    const result = await pool.query(
      `INSERT INTO ai_summaries
         (company_id, content, model_name, prompt_version, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [id, content, model, 'v1.0']
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    const msg =
      err.message === 'OLLAMA_TIMEOUT'
        ? 'AI service timed out — try again'
        : err.message.includes('OLLAMA_FAILURE')
        ? 'Ollama is not running. Start it with: ollama serve'
        : `AI generation failed: ${err.message}`;
    res.status(503).json({ error: msg });
  }
});

// ── Approve AI summary (admin only) ───────────────────────────────────────
router.patch('/:id/summaries/:sid/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `UPDATE ai_summaries
       SET status = 'approved', approved_by = $1
       WHERE id = $2 RETURNING *`,
      [req.user!.id, req.params.sid]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Summary not found' });
    res.json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Reject AI summary (admin only) ────────────────────────────────────────
router.patch('/:id/summaries/:sid/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `UPDATE ai_summaries
       SET status = 'rejected', approved_by = $1
       WHERE id = $2 RETURNING *`,
      [req.user!.id, req.params.sid]
    );
    res.json(result.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Delete company (admin only) ────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    await pool.query(
      `UPDATE companies SET deleted_at = NOW() WHERE id = $1`, [_req.params.id]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;