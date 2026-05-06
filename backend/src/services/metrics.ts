interface FinancialRow {
  fiscal_year: number;
  revenue: number;
  pat: number;
  total_debt: number;
  operating_profit: number;
}

function cagr(start: number, end: number, years: number): number {
  if (!start || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}

export function calculateMetrics(rows: FinancialRow[]) {
  const s = [...rows].sort((a, b) => a.fiscal_year - b.fiscal_year);
  const latest = s[s.length - 1];
  const oldest = s[0];
  const years = latest.fiscal_year - oldest.fiscal_year;

  const op_margin = latest.operating_profit && latest.revenue
    ? (latest.operating_profit / latest.revenue) * 100 : 0;
  const pat_margin = latest.pat && latest.revenue
    ? (latest.pat / latest.revenue) * 100 : 0;
  const sales_cagr_3y = cagr(oldest.revenue, latest.revenue, years);
  const pat_cagr_3y = cagr(oldest.pat, latest.pat, years);

  const debts = s.map(r => Number(r.total_debt));
  const debt_trend = debts[debts.length - 1] < debts[0] ? 'decreasing'
    : debts[debts.length - 1] > debts[0] ? 'increasing' : 'stable';

  const margins = s.map(r => r.pat && r.revenue ? (r.pat / r.revenue) * 100 : 0);
  const margin_trend = margins[margins.length - 1] > margins[0] ? 'improving'
    : margins[margins.length - 1] < margins[0] ? 'declining' : 'stable';

  return { op_margin, pat_margin, sales_cagr_3y, pat_cagr_3y, debt_trend, margin_trend };
}

export function calculateScore(
  m: ReturnType<typeof calculateMetrics>,
  sent: { positive: number; negative: number; total: number }
) {
  const growth = Math.min(30, (m.sales_cagr_3y / 20) * 30);
  const pat = Math.min(25, (m.pat_margin / 15) * 25);
  const opEff = Math.min(20, (m.op_margin / 20) * 20);
  const debt = m.debt_trend === 'decreasing' ? 15 : m.debt_trend === 'stable' ? 8 : 0;
  const sentiment = sent.total === 0 ? 5
    : sent.negative > sent.positive ? 0
    : sent.positive > sent.negative ? 10 : 5;
  return {
    growth_score: growth,
    investment_score: pat + opEff,
    risk_score: 100 - debt - sentiment,
    overall_score: growth + pat + opEff + debt + sentiment
  };
}