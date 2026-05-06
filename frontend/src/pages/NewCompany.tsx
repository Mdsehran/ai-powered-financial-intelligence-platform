import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import Layout from '../components/Layout'

export default function NewCompany() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', sector: '', country: '', founded_year: '', description: '' })
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    try {
      const { data } = await api.post('/companies', { ...form, founded_year: +form.founded_year })
      navigate(`/companies/${data.id}`)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create company')
    }
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, boxSizing: 'border-box' as const }

  return (
    <Layout>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ color: '#1e3a5f', marginBottom: 24 }}>Add Company</h1>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 7, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
          {[['name','Company Name',true],['sector','Sector',false],['country','Country',false],['founded_year','Founded Year',false]].map(([k, label, req]) => (
            <div key={k as string}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>{label as string}</label>
              <input value={(form as any)[k as string]} onChange={e => setForm(f => ({...f, [k as string]: e.target.value}))}
                required={!!req} style={inp} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              rows={3} style={{ ...inp, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ flex: 1, padding: 11, background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, cursor: 'pointer' }}>Create Company</button>
            <button type="button" onClick={() => navigate('/')} style={{ padding: '11px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  )
}