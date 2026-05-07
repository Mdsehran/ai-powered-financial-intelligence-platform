import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import Layout from '../components/Layout'

function ScoreBadge({ score }: { score: number }) {
  const s = Math.round(score)
  const cls = s >= 70 ? 'score-bull' : s >= 40 ? 'score-neut' : 'score-bear'
  return <span className={`score-pill ${cls}`}>{s}</span>
}

export default function Dashboard() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const [sort, setSort]     = useState('name')
  const { user } = useAuthStore()
  const canEdit = ['admin','analyst'].includes(user?.role || '')

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', search, sector, sort],
    queryFn: () => api.get('/companies', { params: { search, sector, sort } }).then(r => r.data)
  })

  const sectors = [...new Set(companies.map((c: any) => c.sector).filter(Boolean))] as string[]

  return (
    <Layout>
      {/* Top bar */}
      <div className="top-bar">
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
          Companies
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {companies.length} companies
          </span>
          {canEdit && (
            <Link to="/companies/new" className="btn btn-primary" style={{ textDecoration: 'none', padding: '7px 16px', fontSize: 13 }}>
              + Add Company
            </Link>
          )}
        </div>
      </div>

      <div className="page-content">

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>⌕</span>
            <input
              className="input"
              placeholder="Search companies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <select
            value={sector}
            onChange={e => setSector(e.target.value)}
            className="input"
            style={{ width: 180 }}>
            <option value="">All Sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="input"
            style={{ width: 160 }}>
            <option value="name">Sort: Name A–Z</option>
            <option value="score">Sort: Score ↓</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 24, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>◈</div>
            Loading companies...
          </div>
        ) : companies.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px',
            background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>◎</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>No companies found</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {canEdit ? 'Add your first company to get started.' : 'No companies match your search.'}
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingLeft: 20 }}>Company</th>
                  <th>Sector</th>
                  <th>Country</th>
                  <th>Founded</th>
                  <th>Score</th>
                  <th style={{ paddingRight: 20 }}></th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c: any) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = `/companies/${c.id}`}>
                    <td style={{ paddingLeft: 20 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{c.name}</div>
                      {c.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        background: 'var(--surface-3)', color: 'var(--text-secondary)',
                        padding: '3px 8px', borderRadius: 4, fontSize: 12
                      }}>{c.sector || '—'}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.country || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.founded_year || '—'}</td>
                    <td>
                      {c.overall_score != null
                        ? <ScoreBadge score={c.overall_score} />
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ paddingRight: 20 }}>
                      <Link
                        to={`/companies/${c.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{ color: 'var(--gold-500)', fontSize: 12, textDecoration: 'none', fontWeight: 500 }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
