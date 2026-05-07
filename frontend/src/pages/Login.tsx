import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.token, data.user)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--navy-950)',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px',
        background: 'var(--navy-900)',
        borderRight: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,171,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: 420, position: 'relative' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 60 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--gold-500), var(--gold-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'var(--navy-950)', fontWeight: 700
            }}>◈</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Finance Research</div>
              <div style={{ fontSize: 11, color: 'var(--gold-500)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Platform</div>
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36, fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.2, marginBottom: 12
          }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 36 }}>
            Sign in to access your research workspace
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '.08em', marginBottom: 8
              }}>Email address</label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="analyst@firm.com"
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '.08em', marginBottom: 8
              }}>Password</label>
              <input
                type="password" value={password} required
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>

      {/* Right panel — stats showcase */}
      <div style={{
        width: 420, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
        background: 'var(--navy-950)'
      }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontSize: 11, color: 'var(--gold-500)', fontWeight: 600,
            letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 16
          }}>Platform Capabilities</div>
          {[
            { icon: '◈', label: 'Multi-company research workspace', },
            { icon: '▦', label: 'Automated financial metric calculation', },
            { icon: '◉', label: 'AI-powered investment summaries', },
            { icon: '◆', label: 'Sector analytics & company rankings', },
            { icon: '◎', label: 'Role-based access control', },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: i < 4 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ color: 'var(--gold-500)', fontSize: 14 }}>{f.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.label}</span>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border-gold)',
          borderRadius: 'var(--radius-lg)', padding: '20px',
          boxShadow: 'var(--shadow-gold)'
        }}>
          <div style={{ fontSize: 10, color: 'var(--gold-500)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 14 }}>Sample Score Card</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Sales CAGR','24.9%'],['PAT Margin','11.8%'],['Op. Margin','16.7%'],['Score','86/100']].map(([l,v]) => (
              <div key={l} style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--gold-400)' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
