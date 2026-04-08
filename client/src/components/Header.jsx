import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobile] = useState(false)
  const { count, setOpen: openCart } = useCart()
  const { user, logout }         = useAuth()
  const { cur, toggle }          = useCurrency()
  const nav                      = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const close = () => setMobile(false)

  return (
    <>
      <header className={`header${scrolled ? ' scrolled' : ''}`}>
        {/* Logo — always visible, no shrink */}
        <Link to="/" className="logo" onClick={close}>
          DEAL<span>PAM</span>
        </Link>

        {/* Desktop nav — center */}
        <nav className="nav-desktop">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Accueil</NavLink>
          <NavLink to="/shop" className={({ isActive }) => isActive ? 'active' : ''}>Boutique</NavLink>
          <NavLink to="/about" className={({ isActive }) => isActive ? 'active' : ''}>À propos</NavLink>
          {user && <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>Mes commandes</NavLink>}
        </nav>

        {/* Right actions */}
        <div className="header-actions">
          {/* Currency toggle — hidden on mobile (shown in drawer) */}
          <div className="currency-toggle">
            <button className={`cur-btn${cur === 'USD' ? ' active' : ''}`} onClick={() => cur !== 'USD' && toggle()}>USD</button>
            <button className={`cur-btn${cur === 'HTG' ? ' active' : ''}`} onClick={() => cur !== 'HTG' && toggle()}>HTG</button>
          </div>

          {/* Auth button */}
          {user ? (
            <button
              onClick={() => nav('/profile')}
              style={{
                width:36,height:36,
                background:user.avatarColor || '#8B5CF6',
                border:'2px solid rgba(201,168,76,.4)',
                color:'#fff',fontWeight:700,fontSize:14,
                display:'flex',alignItems:'center',justifyContent:'center',
                cursor:'pointer',flexShrink:0,
                touchAction:'manipulation',
              }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </button>
          ) : (
            <Link to="/login" style={{
              fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',
              color:'var(--gold)',padding:'8px 14px',
              border:'1px solid rgba(201,168,76,.3)',
              transition:'all .2s',whiteSpace:'nowrap',
            }}>
              Connexion
            </Link>
          )}

          {/* Cart */}
          <button className="cart-btn" onClick={() => openCart(true)} aria-label="Panier">
            🛒
            {count > 0 && <span className="cart-count">{count}</span>}
          </button>

          {/* Hamburger — mobile only */}
          <button className="hamburger" onClick={() => setMobile(true)} aria-label="Menu">
            <span/><span/><span/>
          </button>
        </div>
      </header>

      {/* Mobile backdrop */}
      <div className={`mobile-overlay${mobileOpen ? ' open' : ''}`} onClick={close}/>

      {/* Mobile nav drawer (slides from right) */}
      <nav className={`mobile-nav${mobileOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        <button className="close-mobile" onClick={close} aria-label="Fermer">×</button>

        <NavLink to="/"       onClick={close}>Accueil</NavLink>
        <NavLink to="/shop"   onClick={close}>Boutique</NavLink>
        <NavLink to="/about"  onClick={close}>À propos</NavLink>
        {user && <NavLink to="/orders"  onClick={close}>Mes commandes</NavLink>}
        {user && <NavLink to="/profile" onClick={close}>Mon profil</NavLink>}
        {!user && <Link to="/login"    onClick={close}>Connexion</Link>}
        {!user && <Link to="/register" onClick={close}>Créer un compte</Link>}

        {/* Currency in mobile menu */}
        <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid rgba(255,255,255,.06)'}}>
          <p style={{fontSize:10,letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--muted)',marginBottom:10}}>Devise</p>
          <div className="currency-toggle" style={{width:'fit-content'}}>
            <button className={`cur-btn${cur === 'USD' ? ' active' : ''}`} onClick={() => { cur !== 'USD' && toggle() }}>USD</button>
            <button className={`cur-btn${cur === 'HTG' ? ' active' : ''}`} onClick={() => { cur !== 'HTG' && toggle() }}>HTG</button>
          </div>
        </div>

        {user && (
          <button
            onClick={() => { logout(); close() }}
            style={{
              background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',
              color:'#F87171',padding:'12px 0',fontSize:14,cursor:'pointer',
              marginTop:20,letterSpacing:'1px',display:'block',width:'100%',
              touchAction:'manipulation',
            }}
          >
            Déconnexion
          </button>
        )}
      </nav>
    </>
  )
}
