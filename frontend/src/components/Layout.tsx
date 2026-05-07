import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard',  icon: '▦' },
  { path: '/analytics', label: 'Analytics',  icon: '◈' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--gold-500), var(--gold-400))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: 'var(--navy-950)', fontWeight: 700
            }}>◈</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Finance
              </div>
              <div style={{ fontSize: 10, color: 'var(--gold-500)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Research Platform
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
            Workspace
          </div>
          {NAV_ITEMS.map(item => (
            <Link key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--radius-md)',
                marginBottom: 2, transition: 'all 0.15s',
                background: isActive(item.path) ? 'rgba(201,168,76,0.1)' : 'transparent',
                border: isActive(item.path) ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                color: isActive(item.path) ? 'var(--gold-400)' : 'var(--text-secondary)',
                fontSize: 14, fontWeight: isActive(item.path) ? 500 : 400,
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            background: 'var(--surface-3)', borderRadius: 'var(--radius-md)',
            padding: '10px 12px', marginBottom: 8
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--navy-600), var(--navy-500))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--gold-400)',
                flexShrink: 0
              }}>
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: 10, color: 'var(--gold-500)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {user?.role}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '7px' }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
