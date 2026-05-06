import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: '#1e3a5f', padding: '0 2rem', display: 'flex', alignItems: 'center', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginRight: 'auto' }}>Finance Research</span>
        <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', marginRight: 24, fontSize: 14 }}>Dashboard</Link>
        <Link to="/analytics" style={{ color: '#94a3b8', textDecoration: 'none', marginRight: 24, fontSize: 14 }}>Analytics</Link>
        <span style={{ color: '#64748b', fontSize: 13, marginRight: 16 }}>{user?.email} · {user?.role}</span>
        <button onClick={() => { logout(); navigate('/login') }}
          style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
          Logout
        </button>
      </nav>
      <main style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}