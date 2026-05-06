export async function generateSummary(prompt: string, model: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: ctrl.signal
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
    const data = await res.json() as { response: string };
    return data.response;
  } catch (err: any) {
    clearTimeout(t);
    if (err.name === 'AbortError') throw new Error('OLLAMA_TIMEOUT');
    throw new Error(`OLLAMA_FAILURE: ${err.message}`);
  }
}

export function buildPrompt(company: any, metrics: any, notes: any[], score: any): string {
  // Cast all values to Number to avoid "toFixed is not a function" error
  const op   = Number(metrics?.op_margin   || 0).toFixed(1);
  const pat  = Number(metrics?.pat_margin  || 0).toFixed(1);
  const cagr = Number(metrics?.sales_cagr_3y || 0).toFixed(1);
  const debt = metrics?.debt_trend   || 'unknown';
  const marg = metrics?.margin_trend || 'unknown';
  const sc   = Number(score?.overall_score  || 0).toFixed(0);

  const noteLines = notes.length > 0
    ? notes.slice(0, 5).map((n: any) => `- [${n.sentiment}] ${n.content}`).join('\n')
    : '- No analyst notes available';

  return `You are a financial analyst. Write a concise 150-word investment summary.

Company: ${company?.name} (${company?.sector || 'N/A'}, ${company?.country || 'N/A'})
Operating Margin: ${op}%
PAT Margin: ${pat}%
Sales CAGR 3Y: ${cagr}%
Debt Trend: ${debt}
Margin Trend: ${marg}
Investment Score: ${sc}/100

Analyst Notes:
${noteLines}

Write a clear investment summary covering growth, profitability, risk, and outlook.`;
}