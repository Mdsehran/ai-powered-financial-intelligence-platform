import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import Layout from '../components/Layout'

export default function Dashboard() {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const [sort, setSort] = useState('name')
  const { user } = useAuthStore()

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies', search, sector, sort],
    queryFn: () => api.get('/companies', { params: { search, sector, sort } }).then(r => r.data)
  })

  const sectors = [...new Set(companies.map((c: any) => c.sector).filter(Boolean))]

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, color: '#1e3a5f' }}>Companies</h1>
        {['admin','analyst'].includes(user?.role||'') && (
          <Link to="/companies/new" style={{ background: '#1e3a5f', color: '#fff', padding: '9px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>+ Add Company</Link>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
        <select value={sector} onChange={e => setSector(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}>
          <option value="">All Sectors</option>
          {sectors.map((s: any) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8 }}>
          <option value="name">Sort: Name</option>
          <option value="score">Sort: Score</option>
        </select>
      </div>

      {isLoading ? <p style={{ color: '#64748b' }}>Loading...</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {companies.map((c: any) => (
            <Link key={c.id} to={`/companies/${c.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1e3a5f', fontSize: 16 }}>{c.name}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{c.sector} · {c.country}</div>
                </div>
                {c.overall_score != null && (
                  <div style={{ padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 15,
                    background: c.overall_score >= 70 ? '#dcfce7' : c.overall_score >= 40 ? '#fef9c3' : '#fee2e2',
                    color: c.overall_score >= 70 ? '#166534' : c.overall_score >= 40 ? '#854d0e' : '#991b1b' }}>
                    {Math.round(c.overall_score)}
                  </div>
                )}
              </div>
            </Link>
          ))}
          {companies.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>No companies yet. Add one to get started.</p>}
        </div>
      )}
    </Layout>
  )
}