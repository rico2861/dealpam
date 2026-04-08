import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CurrencyProvider, useCurrency } from './context/CurrencyContext'
import { ToastContainer, Modal, FGroup, Input, toast } from './components/UI'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Reports from './pages/Reports'
import { Sales, Clients, Expenses } from './pages/Transactions'
import { Users, Settings } from './pages/Admin'
import api from './utils/api'

const PAGE_META = {
  '/': { title: 'Tableau de bord', sub: "Vue générale de l'activité", icon: '◈' },
  '/rapports': { title: 'Rapports & CA', sub: 'Analyse financière détaillée', icon: '◇' },
  '/produits': { title: 'Produits', sub: 'Catalogue et gestion des stocks', icon: '◻' },
  '/ventes': { title: 'Ventes', sub: 'Registre des transactions', icon: '◆' },
  '/clients': { title: 'Clients', sub: 'Portefeuille clients', icon: '◉' },
  '/depenses': { title: 'Dépenses', sub: 'Suivi des charges', icon: '▣' },
  '/utilisateurs': { title: 'Utilisateurs', sub: 'Gestion des accès', icon: '◎' },
  '/parametres': { title: 'Paramètres', sub: 'Configuration', icon: '⊡' },
}

// ── Force password change overlay ─────────────────
function ForcePasswordModal() {
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const { clearForce } = useAuth()

  const submit = async () => {
    setErr('')
    if (!cur) { setErr("Entrez le mot de passe temporaire fourni par l'admin"); return }
    if (nw.length < 6) { setErr('Nouveau mot de passe : minimum 6 caractères'); return }
    if (cur === nw) { setErr('Le nouveau mot de passe doit être différent du temporaire'); return }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { currentPassword: cur, newPassword: nw })
      toast('Mot de passe changé avec succès !'); clearForce()
    } catch (e) { setErr(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,.12)', width: '100%', maxWidth: 480, padding: 36, boxShadow: '0 32px 100px rgba(0,0,0,.8)', animation: 'mIn .25s ease' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--fd)', marginBottom: 6, background: 'linear-gradient(135deg,#00D9FF,#8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Changement de mot de passe requis</div>
        <div style={{ fontSize: 13, color: '#8892B0', marginBottom: 24, lineHeight: 1.6 }}>
          Votre administrateur a réinitialisé votre mot de passe. Définissez un nouveau mot de passe pour continuer.
        </div>
        {err && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.22)', padding: '10px 14px', fontSize: 13, color: '#F87171', marginBottom: 16, display: 'flex', gap: 8 }}><span>⚠️</span>{err}</div>}
        <FGroup label="Mot de passe temporaire (fourni par l'admin)">
          <Input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="Entrez le mot de passe temporaire" />
        </FGroup>
        <div style={{ height: 12 }} />
        <FGroup label="Votre nouveau mot de passe (min. 6 caractères)">
          <Input type="password" value={nw} onChange={e => setNw(e.target.value)} placeholder="Choisissez un mot de passe sécurisé" />
        </FGroup>
        <button
          onClick={submit} disabled={saving}
          style={{ width: '100%', padding: 13, border: 'none', background: 'linear-gradient(135deg,#00D9FF,#8B5CF6)', color: '#fff', fontFamily: 'var(--fb)', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: saving ? .7 : 1 }}
        >
          {saving && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite' }} />}
          {saving ? 'Modification...' : 'Définir mon nouveau mot de passe'}
        </button>
      </div>
    </div>
  )
}

// ── Currency toggle ────────────────────────────────
function CurrencyToggle() {
  const { cur, toggle, rate } = useCurrency()
  return (
    <button
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 13px',
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.08)',
        color: cur === 'HTG' ? '#F59E0B' : '#00D9FF',
        cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: '.2s', fontFamily: 'var(--fb)',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{cur === 'USD' ? '$ USD' : '₲ HTG'}</span>
      <span style={{ fontSize: 9, color: '#50566E', fontWeight: 400 }}>{rate} HTG/$</span>
    </button>
  )
}

// ── Protected route ────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { user, loading, forceChange, can } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, color: '#50566E' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(0,217,255,.2)', borderTopColor: '#00D9FF', animation: 'spin .7s linear infinite' }} />
      Chargement...
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !can(...roles)) return <Navigate to="/" replace />
  return <>{forceChange && <ForcePasswordModal />}{children}</>
}

// ── Main app shell ─────────────────────────────────
function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const { user } = useAuth()
  const loc = useLocation()
  const meta = PAGE_META[loc.pathname] || { title: 'DEALPAM', sub: '', icon: '◈' }

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', fn, { passive: true })
    return () => window.removeEventListener('resize', fn)
  }, [])

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [loc.pathname])

  return (
    <div className="admin-shell">
      <Sidebar
        collapsed={isMobile ? false : collapsed}
        onToggle={() => isMobile ? setMobileOpen(o => !o) : setCollapsed(c => !c)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="admin-main">
        {/* Topbar */}
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            {/* Hamburger on mobile */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              style={{
                background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)',
                color: '#8892B0', padding: '7px 10px', cursor: 'pointer', fontSize: 16,
                transition: '.18s', flexShrink: 0, display: isMobile ? 'flex' : 'none',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              ☰
            </button>
            {/* Collapse toggle on desktop */}
            {!isMobile && (
              <button
                onClick={() => setCollapsed(c => !c)}
                style={{
                  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)',
                  color: '#8892B0', padding: '7px 10px', cursor: 'pointer', fontSize: 16,
                  transition: '.18s', flexShrink: 0,
                }}
              >
                ☰
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--fd)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#EEF0F8' }}>
                <span style={{ marginRight: 8, opacity: .5 }}>{meta.icon}</span>{meta.title}
              </div>
              {!isMobile && <div style={{ fontSize: 11, color: '#50566E' }}>{meta.sub}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <CurrencyToggle />
            <div style={{
              fontSize: 11, color: '#00D9FF',
              background: 'rgba(0,217,255,.07)', border: '1px solid rgba(0,217,255,.16)',
              padding: '4px 12px', fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              {user?.role}
              {!isMobile && ` · ${user?.name?.split(' ')[0]}`}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="admin-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produits" element={<Products />} />
            <Route path="/ventes" element={<Sales />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/rapports" element={<ProtectedRoute roles={['Admin', 'Comptable']}><Reports /></ProtectedRoute>} />
            <Route path="/depenses" element={<ProtectedRoute roles={['Admin', 'Comptable']}><Expenses /></ProtectedRoute>} />
            <Route path="/utilisateurs" element={<ProtectedRoute roles={['Admin']}><Users /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute roles={['Admin']}><Settings /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </CurrencyProvider>
    </AuthProvider>
  )
}
