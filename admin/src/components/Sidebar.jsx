import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { path: '/', icon: '◈', label: 'Tableau de bord', group: 'Principal' },
  { path: '/rapports', icon: '◇', label: 'Rapports & CA', roles: ['Admin', 'Comptable'] },
  { path: '/produits', icon: '◻', label: 'Produits', group: 'Catalogue' },
  { path: '/ventes', icon: '◆', label: 'Ventes', group: 'Transactions' },
  { path: '/clients', icon: '◉', label: 'Clients' },
  { path: '/depenses', icon: '▣', label: 'Dépenses', roles: ['Admin', 'Comptable'] },
  { path: '/utilisateurs', icon: '◎', label: 'Utilisateurs', group: 'Administration', roles: ['Admin'] },
  { path: '/parametres', icon: '⊡', label: 'Paramètres', roles: ['Admin'] },
]

const ROLE_COLOR = { Admin: '#00D9FF', Vendeur: '#10B981', Comptable: '#8B5CF6', Client: '#F59E0B' }

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }) {
  const { user, logout, can } = useAuth()
  const visible = NAV.filter(n => !n.roles || can(...n.roles))
  const isCollapsed = collapsed && !mobileOpen

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="sidebar-overlay open" onClick={onClose} />
      )}

      <nav className={`admin-sidebar${isCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
        {/* Gradient accent line */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: 1, height: '100%', background: 'linear-gradient(180deg,transparent,#00D9FF 40%,#8B5CF6 70%,transparent)', opacity: .18, zIndex: 1, pointerEvents: 'none' }} />

        {/* Logo / toggle area */}
        <div
          onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 12px', borderBottom: '1px solid rgba(255,255,255,.06)',
            cursor: 'pointer', minWidth: 0, flexShrink: 0,
          }}
        >
          <div style={{
            width: 36, height: 36, minWidth: 36,
            background: 'linear-gradient(135deg,#00D9FF,#8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 15, color: '#000', fontFamily: 'var(--fd)',
            flexShrink: 0,
          }}>D</div>
          {!isCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, fontFamily: 'var(--fd)', background: 'linear-gradient(135deg,#00D9FF,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>DEALPAM</div>
              <div style={{ fontSize: 9, color: '#50566E' }}>Gestion pro</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0' }}>
          {visible.map((item, i) => {
            const prev = visible[i - 1]
            const showGroup = item.group && item.group !== prev?.group
            return (
              <React.Fragment key={item.path}>
                {showGroup && !isCollapsed && (
                  <div style={{ padding: '14px 18px 4px', fontSize: 9, letterSpacing: '1.8px', color: '#50566E', textTransform: 'uppercase', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {item.group}
                  </div>
                )}
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={mobileOpen ? onClose : undefined}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: isCollapsed ? '9px 16px' : '9px 12px',
                    margin: '2px 8px',
                    cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: isActive ? '#EEF0F8' : '#8892B0',
                    background: isActive ? 'rgba(0,217,255,.07)' : 'transparent',
                    border: isActive ? '1px solid rgba(0,217,255,.14)' : '1px solid transparent',
                    transition: '.18s', whiteSpace: 'nowrap', textDecoration: 'none',
                    position: 'relative', justifyContent: isCollapsed ? 'center' : 'flex-start',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !isCollapsed && (
                        <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, background: 'linear-gradient(180deg,#00D9FF,#8B5CF6)' }} />
                      )}
                      <div style={{
                        width: 32, height: 32, minWidth: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15,
                        background: isActive ? 'rgba(0,217,255,.12)' : 'rgba(255,255,255,.05)',
                        flexShrink: 0, transition: '.18s',
                      }}>
                        {item.icon}
                      </div>
                      {!isCollapsed && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              </React.Fragment>
            )
          })}
        </div>

        {/* User widget */}
        <div style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px',
            background: '#111120', border: '1px solid rgba(255,255,255,.06)',
            minWidth: 0,
          }}>
            <div style={{
              width: 32, height: 32, minWidth: 32,
              background: `linear-gradient(135deg,${ROLE_COLOR[user?.role] || '#8B5CF6'},${ROLE_COLOR[user?.role] || '#00D9FF'})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#EEF0F8' }}>{user?.name}</div>
                  <div style={{ fontSize: 10, color: ROLE_COLOR[user?.role] || '#50566E', fontWeight: 600 }}>{user?.role}</div>
                </div>
                <button
                  onClick={logout}
                  title="Déconnexion"
                  style={{
                    background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.2)',
                    color: '#F87171', padding: '5px 8px', cursor: 'pointer', fontSize: 13, flexShrink: 0,
                    transition: '.18s',
                  }}
                >
                  ⏻
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
