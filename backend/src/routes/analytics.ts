import { Router } from 'express';
import { pool } from '../config/db';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/overview', authenticate, async (_req, res) => {
  try {
    const [sectors, rankings, sentiments] = await Promise.all([
      pool.query(`
        SELECT c.sector,
          COUNT(*) as company_count,
          ROUND(AVG(cs.overall_score)::numeric, 1) as avg_score,
          ROUND(AVG(fm.sales_cagr_3y)::numeric, 1) as avg_growth,
          ROUND(AVG(fm.pat_margin)::numeric, 1) as avg_pat_margin
        FROM companies c
        LEFT JOIN company_scores cs ON c.id = cs.company_id
        LEFT JOIN financial_metrics fm ON c.id = fm.company_id
        WHERE c.deleted_at IS NULL
        GROUP BY c.sector ORDER BY avg_score DESC NULLS LAST`),
      pool.query(`
        SELECT c.id, c.name, c.sector,
          ROUND(cs.overall_score::numeric, 1) as overall_score
        FROM companies c
        JOIN company_scores cs ON c.id = cs.company_id
        WHERE c.deleted_at IS NULL
        ORDER BY cs.overall_score DESC LIMIT 10`),
      pool.query(`
        SELECT
          CASE WHEN cs.overall_score >= 70 THEN 'Bullish'
               WHEN cs.overall_score >= 40 THEN 'Neutral'
               ELSE 'Cautious' END as group,
          COUNT(*) as count
        FROM companies c
        JOIN company_scores cs ON c.id = cs.company_id
        WHERE c.deleted_at IS NULL GROUP BY 1`)
    ]);
    res.json({ sectors: sectors.rows, rankings: rankings.rows, sentiments: sentiments.rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;