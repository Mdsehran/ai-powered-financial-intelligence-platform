import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from 'recharts'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Layout from '../components/Layout'

const GOLD_GRADIENT = ['#c9a84c','#e2c06a','#f0d98a','#c9a84c','#a8893a']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: 'var(--gold-400)', fontFamily: 'var(--font-mono)' }}>
          {Number(p.value).toFixed(1)}
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/analytics/overview').then(r => r.data)
  })

  if (isLoading) return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>◈</div>
        Loading analytics...
      </div>
    </Layout>
  )

  const { sectors = [], rankings = [], sentiments = [] } = data || {}

  const bullish  = sentiments.find((s: any) => s.group === 'Bullish')?.count  || 0
  const neutral  = sentiments.find((s: any) => s.group === 'Neutral')?.count  || 0
  const cautious = sentiments.find((s: any) => s.group === 'Cautious')?.count || 0
  const total    = Number(bullish) + Number(neutral) + Number(cautious) || 1

  return (
    <Layout>
      <div className="top-bar">
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Analytics</h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {sectors.length} sectors · {rankings.length} ranked companies
        </span>
      </div>

      <div className="page-content">

        {/* Sentiment buckets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Bullish',  count: bullish,  pct: Math.round(bullish/total*100),  color: '#10b981', dim: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)',  icon: '▲' },
            { label: 'Neutral',  count: neutral,  pct: Math.round(neutral/total*100),  color: '#f59e0b', dim: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  icon: '◆' },
            { label: 'Cautious', count: cautious, pct: Math.round(cautious/total*100), color: '#ef4444', dim: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   icon: '▼' },
          ].map(s => (
            <div key={s.label} style={{
              background: s.dim, border: `1px solid ${s.border}`,
              borderRadius: 'var(--radius-lg)', padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: s.color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-mono)', color: s.color, lineHeight: 1 }}>
                    {s.count}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>companies</div>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: `rgba(${s.color === '#10b981' ? '16,185,129' : s.color === '#f59e0b' ? '245,158,11' : '239,68,68'},.15)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: s.color
                }}>{s.icon}</div>
              </div>
              <div style={{ marginTop: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 4, height: 4 }}>
                <div style={{ height: '100%', borderRadius: 4, background: s.color, width: `${s.pct}%`, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{s.pct}% of portfolio</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Bar chart */}
          <div className="card">
            <div className="section-header">
              <span className="section-title">Avg Score by Sector</span>
            </div>
            <div style={{ padding: '20px' }}>
              {sectors.length === 0
                ? <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px' }}>No sector data yet</p>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={sectors} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <XAxis dataKey="sector" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0,100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="avg_score" radius={[4,4,0,0]}>
                        {sectors.map((_: any, i: number) => (
                          <Cell key={i} fill={GOLD_GRADIENT[i % GOLD_GRADIENT.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </div>

          {/* Sector metrics table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="section-header">
              <span className="section-title">Sector Breakdown</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Cos</th>
                  <th>Avg Score</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                {sectors.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No data</td></tr>
                  : sectors.map((s: any) => (
                    <tr key={s.sector}>
                      <td>{s.sector || 'N/A'}</td>
                      <td>{s.company_count}</td>
                      <td style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{s.avg_score ?? '—'}</td>
                      <td style={{ color: Number(s.avg_growth) > 0 ? '#34d399' : '#f87171' }}>
                        {s.avg_growth != null ? `${s.avg_growth}%` : '—'}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Rankings */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="section-header">
            <span className="section-title">Top Companies by Investment Score</span>
          </div>
          {rankings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
              Upload financial data for companies to see rankings.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>#</th>
                  <th style={{ textAlign: 'left' }}>Company</th>
                  <th>Sector</th>
                  <th style={{ paddingRight: 20 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((c: any, i: number) => (
                  <tr key={c.id}>
                    <td style={{ paddingLeft: 20, color: i < 3 ? 'var(--gold-400)' : 'var(--text-muted)', fontWeight: i < 3 ? 700 : 400 }}>
                      {i < 3 ? ['①','②','③'][i] : `#${i+1}`}
                    </td>
                    <td>
                      <Link to={`/companies/${c.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                        {c.name}
                      </Link>
                    </td>
                    <td>
                      <span style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
                        {c.sector || '—'}
                      </span>
                    </td>
                    <td style={{ paddingRight: 20 }}>
                      <span className={`score-pill ${Number(c.overall_score) >= 70 ? 'score-bull' : Number(c.overall_score) >= 40 ? 'score-neut' : 'score-bear'}`}>
                        {Number(c.overall_score).toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  )
}
