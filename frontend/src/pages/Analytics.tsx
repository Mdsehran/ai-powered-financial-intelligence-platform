import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { api } from '../api/client'
import Layout from '../components/Layout'

const COLORS = ['#1e3a5f','#2563eb','#0ea5e9','#6366f1','#8b5cf6','#ec4899']

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data)
  })

  if (isLoading) return <Layout><p style={{ color: '#64748b' }}>Loading...</p></Layout>

  const { sectors = [], rankings = [], sentiments = [] } = data || {}

  return (
    <Layout>
      <h1 style={{ fontSize: 24, color: '#1e3a5f', marginBottom: 24 }}>Analytics</h1>

      {/* Sentiment Buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[{g:'Bullish',c:'#166534',bg:'#dcfce7'},{g:'Neutral',c:'#854d0e',bg:'#fef9c3'},{g:'Cautious',c:'#991b1b',bg:'#fee2e2'}].map(({g,c,bg}) => {
          const s = sentiments.find((x: any) => x.group === g)
          return (
            <div key={g} style={{ background: bg, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c, textTransform: 'uppercase', letterSpacing: '.07em' }}>{g}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: c }}>{s?.count || 0}</div>
              <div style={{ fontSize: 12, color: c, opacity: .7 }}>companies</div>
            </div>
          )
        })}
      </div>

      {/* Sector Chart */}
      {sectors.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, color: '#1e3a5f', marginBottom: 16 }}>Avg Investment Score by Sector</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectors} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <XAxis dataKey="sector" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip formatter={(v: any) => Number(v).toFixed(1)} />
              <Bar dataKey="avg_score" radius={[4,4,0,0]}>
                {sectors.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sector Table */}
      {sectors.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#1e3a5f' }}>Sector Summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Sector','Companies','Avg Score','Avg Growth','Avg PAT Margin'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Sector' ? 'left' : 'right', color: '#64748b', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sectors.map((s: any) => (
                <tr key={s.sector} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 500 }}>{s.sector || 'N/A'}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right' }}>{s.company_count}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>{s.avg_score ?? '—'}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right' }}>{s.avg_growth != null ? `${s.avg_growth}%` : '—'}</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right' }}>{s.avg_pat_margin != null ? `${s.avg_pat_margin}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rankings */}
      {rankings.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#1e3a5f' }}>Top 10 Companies by Score</div>
          {rankings.map((c: any, i: number) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ width: 28, color: '#94a3b8', fontSize: 13 }}>#{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{c.sector}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#1e3a5f' }}>{Number(c.overall_score).toFixed(0)}</div>
            </div>
          ))}
        </div>
      )}

      {sectors.length === 0 && rankings.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem' }}>No data yet. Add companies and upload financials first.</p>
      )}
    </Layout>
  )
}