import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import api from '../utils/api'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { ProductCard } from './Home'
import { toast } from '../components/Toast'
import { createPortal } from 'react-dom'

// ── SHOP ─────────────────────────────────────────────
export function Shop() {
  const [products, setProducts]   = useState([])
  const [cats, setCats]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [activeCat, setActiveCat] = useState('')
  const { add }                   = useCart()
  const { fmt }                   = useCurrency()
  const nav                       = useNavigate()
  const [sp]                      = useSearchParams()

  useEffect(() => { setActiveCat(sp.get('cat') || '') }, [sp])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get('/api/public/products'),
      axios.get('/api/public/categories'),
    ]).then(([p,c]) => { setProducts(p.data); setCats(c.data) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter(p =>
    (!activeCat || p.category === activeCat) &&
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) ||
     (p.description||'').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <main style={{ paddingTop:70 }}>
      {/* Banner — full width */}
      <div style={{ background:'var(--dark)', padding:'48px 6%', borderBottom:'1px solid rgba(201,168,76,.12)', width:'100%' }}>
        <p style={{ fontSize:11, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>✦ Boutique</p>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(28px,4vw,52px)', fontWeight:700 }}>
          Notre <em style={{ fontStyle:'italic', color:'var(--gold)' }}>collection</em>
        </h1>
        <p style={{ color:'var(--muted)', marginTop:10, fontSize:15 }}>
          {products.length} parfum{products.length !== 1 ? 's' : ''} disponible{products.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="section">
        {/* Search */}
        <div style={{ marginBottom:24 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un parfum..."
            className="finput"
            style={{ maxWidth:420 }}
          />
        </div>

        {/* Category filters */}
        <div className="filter-bar">
          <button className={`filter-chip${activeCat === '' ? ' active' : ''}`} onClick={() => setActiveCat('')}>Tous</button>
          {cats.map(c => (
            <button key={c} className={`filter-chip${activeCat === c ? ' active' : ''}`} onClick={() => setActiveCat(c)}>{c}</button>
          ))}
        </div>

        {/* Products */}
        {loading ? (
          <div className="product-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio:'1', marginBottom:12 }}/>
                <div className="skeleton" style={{ height:14, marginBottom:8, width:'70%' }}/>
                <div className="skeleton" style={{ height:11, width:'40%' }}/>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'var(--muted)' }}>
            <div style={{ fontSize:48, marginBottom:16, opacity:.3 }}>🔍</div>
            <p style={{ fontSize:16 }}>Aucun parfum trouvé</p>
            {search && <button className="btn btn-outline btn-sm" style={{ marginTop:20 }} onClick={() => setSearch('')}>Effacer la recherche</button>}
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={() => add(p)} fmt={fmt} nav={nav}/>)}
          </div>
        )}
      </div>

      <footer>
        <div className="footer-bottom" style={{ borderTop:'1px solid rgba(201,168,76,.12)', padding:'24px 6%' }}>
          <p>© 2025 DEALPAM — Parfums d'exception</p>
          <Link to="/" style={{ color:'var(--gold)' }}>← Retour à l'accueil</Link>
        </div>
      </footer>
    </main>
  )
}

// ── PRODUCT DETAIL ────────────────────────────────────
export function ProductDetail() {
  const { id }          = useParams()
  const [product, setP] = useState(null)
  const [related, setR] = useState([])
  const [loading, setL] = useState(true)
  const [qty, setQty]   = useState(1)
  const { add }         = useCart()
  const { fmt }         = useCurrency()
  const nav             = useNavigate()

  useEffect(() => {
    setL(true)
    axios.get('/api/public/products').then(r => {
      const p = r.data.find(x => x.id === parseInt(id))
      setP(p)
      setR(r.data.filter(x => x.id !== parseInt(id) && x.category === p?.category).slice(0,4))
    }).finally(() => setL(false))
    window.scrollTo(0, 0)
  }, [id])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', paddingTop:70 }}>
      <div style={{ width:36, height:36, border:'2px solid rgba(201,168,76,.2)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
    </div>
  )
  if (!product) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:70, gap:16 }}>
      <div style={{ fontSize:48, opacity:.3 }}>🔍</div>
      <p>Produit introuvable</p>
      <Link to="/shop" className="btn btn-outline btn-sm">← Retour à la boutique</Link>
    </div>
  )

  const handleAdd = () => { add(product, qty); toast(`"${product.name}" ajouté au panier`, 'success') }

  return (
    <main style={{ paddingTop:70 }}>
      <div className="section">
        <Link to="/shop" style={{ fontSize:12, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', display:'inline-flex', alignItems:'center', gap:8, marginBottom:40, transition:'color .2s' }}>
          ← Retour à la boutique
        </Link>

        <div className="product-detail">
          {/* Image */}
          <div>
            {product.imageUrl
              ? <img src={product.imageUrl} alt={product.name} className="product-detail-img" style={{ border:'1px solid rgba(255,255,255,.06)' }}/>
              : <div style={{ aspectRatio:'1', background:'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:100, color:'var(--muted)' }}>🧴</div>
            }
          </div>

          {/* Info */}
          <div>
            {product.featured && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:10, marginBottom:20 }}>
                <span className="product-featured-badge">✦ Featured</span>
                <span className="limited-badge" style={{ fontSize:22 }}>LIMITED EDITION</span>
              </div>
            )}
            <p style={{ fontSize:11, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>{product.category}</p>
            <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(24px,3vw,42px)', fontWeight:700, lineHeight:1.2, marginBottom:16 }}>{product.name}</h1>
            <div style={{ display:'flex', alignItems:'baseline', gap:16, marginBottom:24, flexWrap:'wrap' }}>
              <span style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(28px,3vw,40px)', color:'var(--gold)', fontWeight:700 }}>{fmt(product.price)}</span>
              <span style={{ fontSize:16, color:'var(--muted)' }}>{product.priceHTG?.toLocaleString('fr')} HTG</span>
            </div>
            <p style={{ fontSize:15, color:'var(--muted)', lineHeight:1.8, marginBottom:32 }}>{product.description}</p>

            {/* Stock indicator */}
            <div style={{ marginBottom:28, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:product.inStock ? '#10B981' : '#EF4444', animation:product.inStock ? 'pulse 2s infinite' : 'none' }}/>
              <span style={{ fontSize:13, color:product.inStock ? '#10B981' : '#EF4444' }}>
                {product.inStock ? `En stock (${product.qty} disponible${product.qty > 1 ? 's' : ''})` : 'Épuisé'}
              </span>
            </div>

            {product.inStock && (
              <>
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontSize:11, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', marginBottom:14 }}>Quantité</p>
                  <div style={{ display:'flex', alignItems:'center', gap:0, width:'fit-content', border:'1px solid rgba(255,255,255,.12)' }}>
                    <button className="qty-btn" style={{ width:44, height:44 }} onClick={() => setQty(q => Math.max(1,q-1))}>−</button>
                    <span style={{ width:52, textAlign:'center', fontSize:16, fontWeight:700 }}>{qty}</span>
                    <button className="qty-btn" style={{ width:44, height:44 }} onClick={() => setQty(q => Math.min(product.qty,q+1))}>+</button>
                  </div>
                </div>
                <button className="btn btn-gold" style={{ width:'100%', maxWidth:360, justifyContent:'center' }} onClick={handleAdd}>
                  Ajouter au panier — {fmt(product.price * qty)}
                </button>
              </>
            )}

            <div style={{ display:'flex', gap:16, marginTop:32, flexWrap:'wrap' }}>
              {['✦ Authentique', '✦ Livraison rapide', '✦ Qualité garantie'].map(b => (
                <span key={b} style={{ fontSize:11, color:'var(--muted)', letterSpacing:'1px' }}>{b}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div style={{ marginTop:80 }}>
            <h2 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(22px,3vw,32px)', marginBottom:36 }}>Vous aimerez aussi</h2>
            <div className="product-grid">
              {related.map(p => <ProductCard key={p.id} product={p} onAdd={() => add(p)} fmt={fmt} nav={nav}/>)}
            </div>
          </div>
        )}
      </div>

      <footer>
        <div className="footer-bottom" style={{ borderTop:'1px solid rgba(201,168,76,.12)', padding:'24px 6%' }}>
          <p>© 2025 DEALPAM</p>
          <Link to="/shop" style={{ color:'var(--gold)' }}>← Boutique</Link>
        </div>
      </footer>
    </main>
  )
}

// ── LOGIN ─────────────────────────────────────────────
export function Login() {
  const [email, setEmail]   = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShow]   = useState(false)
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')
  const { login }           = useAuth()
  const nav                 = useNavigate()

  const submit = async (e, em, p) => {
    e?.preventDefault(); setError(''); setLoad(true)
    try {
      await login(em || email, p || pw)
      toast('Bienvenue sur DEALPAM !', 'success')
      nav('/', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects')
    } finally { setLoad(false) }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo" style={{ fontSize:28, letterSpacing:6 }}>DEAL<span>PAM</span></div>
        </div>
        <h1 className="auth-title">Connexion</h1>
        <p className="auth-sub">Accédez à votre espace personnel</p>

        {error && (
          <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', padding:'12px 16px', fontSize:13, color:'#F87171', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="fg">
            <label className="flabel">Email</label>
            <input className="finput" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="email" required/>
          </div>
          <div className="fg" style={{ position:'relative' }}>
            <label className="flabel">Mot de passe</label>
            <input className="finput" type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" style={{ paddingRight:48 }} required/>
            <button type="button" onClick={() => setShow(s => !s)} style={{ position:'absolute', right:14, bottom:14, background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:15 }}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          <button type="submit" className="btn btn-gold btn-full" style={{ marginTop:8 }} disabled={loading}>
            {loading ? <><span style={{ width:14, height:14, border:'2px solid rgba(0,0,0,.2)', borderTopColor:'#000', borderRadius:'50%', display:'inline-block', animation:'spin .7s linear infinite' }}/> Connexion...</> : 'Se connecter →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:24, fontSize:14, color:'var(--muted)' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color:'var(--gold)' }}>S'inscrire</Link>
        </p>

        {/* Demo fill */}
        <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid rgba(255,255,255,.06)', textAlign:'center' }}>
          <p style={{ fontSize:11, color:'var(--muted)', marginBottom:12, letterSpacing:'1px', textTransform:'uppercase' }}>Compte démo</p>
          <button className="btn btn-outline btn-sm" onClick={() => { setEmail('client@dealpam.com'); setPw('client123') }}>
            Remplir démo client
          </button>
        </div>
      </div>
    </main>
  )
}

// ── REGISTER ──────────────────────────────────────────
export function Register() {
  const [form, setForm]    = useState({ name:'', email:'', password:'', phone:'' })
  const [showPw, setShow]  = useState(false)
  const [loading, setLoad] = useState(false)
  const [error, setError]  = useState('')
  const nav                = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoad(true)
    try {
      await axios.post('/api/auth/register', form)
      toast('Compte créé ! Connectez-vous.', 'success')
      nav('/login')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de l\'inscription')
    } finally { setLoad(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo" style={{ fontSize:28, letterSpacing:6 }}>DEAL<span>PAM</span></div>
        </div>
        <h1 className="auth-title">Créer un compte</h1>
        <p className="auth-sub">Rejoignez la communauté DEALPAM</p>

        {error && (
          <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', padding:'12px 16px', fontSize:13, color:'#F87171', marginBottom:20 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="fg">
            <label className="flabel">Nom complet *</label>
            <input className="finput" type="text" value={form.name} onChange={set('name')} placeholder="Votre nom" required/>
          </div>
          <div className="fg">
            <label className="flabel">Email *</label>
            <input className="finput" type="email" value={form.email} onChange={set('email')} placeholder="votre@email.com" autoComplete="email" required/>
          </div>
          <div className="fg" style={{ position:'relative' }}>
            <label className="flabel">Mot de passe *</label>
            <input className="finput" type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Min. 6 caractères" style={{ paddingRight:48 }} required minLength={6}/>
            <button type="button" onClick={() => setShow(s => !s)} style={{ position:'absolute', right:14, bottom:14, background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:15 }}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
          <div className="fg">
            <label className="flabel">Téléphone</label>
            <input className="finput" type="tel" value={form.phone} onChange={set('phone')} placeholder="Optionnel"/>
          </div>
          <button type="submit" className="btn btn-gold btn-full" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:24, fontSize:14, color:'var(--muted)' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color:'var(--gold)' }}>Se connecter</Link>
        </p>
      </div>
    </main>
  )
}

// ── ORDERS ────────────────────────────────────────────
export function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoad]  = useState(true)
  const { user }            = useAuth()
  const { fmt }             = useCurrency()
  const nav                 = useNavigate()

  useEffect(() => {
    if (!user) { nav('/login'); return }
    api.get('/orders/my').then(r => setOrders(r.data)).finally(() => setLoad(false))
  }, [user])

  const statusColor = s => s === 'completed' ? 'status-completed' : s === 'cancelled' ? 'status-cancelled' : 'status-pending'
  const statusLabel = s => s === 'completed' ? 'Complétée' : s === 'cancelled' ? 'Annulée' : 'En attente'

  return (
    <main className="profile-section">
      <p style={{ fontSize:11, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>✦ Mon espace</p>
      <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(24px,3vw,40px)', fontWeight:700, marginBottom:48 }}>
        Mes <em style={{ fontStyle:'italic', color:'var(--gold)' }}>commandes</em>
      </h1>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
          <div style={{ width:36, height:36, border:'2px solid rgba(201,168,76,.2)', borderTopColor:'var(--gold)', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--muted)' }}>
          <div style={{ fontSize:48, marginBottom:16, opacity:.3 }}>📦</div>
          <p style={{ fontSize:16, marginBottom:24 }}>Vous n'avez pas encore de commandes</p>
          <Link to="/shop" className="btn btn-gold btn-sm">Aller à la boutique</Link>
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} className="order-card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
              <div>
                <span style={{ fontSize:11, color:'var(--muted)', letterSpacing:'1px', textTransform:'uppercase' }}>Commande #{order.id}</span>
                <p style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>{order.createdAt?.split('T')[0]}</p>
              </div>
              <span className={`order-status ${statusColor(order.status)}`}>{statusLabel(order.status)}</span>
            </div>
            <div style={{ marginBottom:14 }}>
              {(order.items || []).map((item, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.04)', fontSize:14 }}>
                  <span>{item.name} × {item.qty}</span>
                  <span style={{ color:'var(--gold)' }}>{fmt(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <strong style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--gold)' }}>Total : {fmt(order.totalUSD)}</strong>
            </div>
          </div>
        ))
      )}
    </main>
  )
}

// ── PROFILE ───────────────────────────────────────────
export function Profile() {
  const { user, logout } = useAuth()
  const nav              = useNavigate()

  if (!user) { nav('/login'); return null }

  return (
    <main className="profile-section">
      <p style={{ fontSize:11, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:12 }}>✦ Mon espace</p>
      <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(24px,3vw,40px)', fontWeight:700, marginBottom:48 }}>
        Mon <em style={{ fontStyle:'italic', color:'var(--gold)' }}>profil</em>
      </h1>

      <div style={{ background:'var(--dark)', border:'1px solid rgba(255,255,255,.06)', padding:32, maxWidth:520 }}>
        <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:32 }}>
          <div style={{ width:64, height:64, background:user.avatarColor || '#8B5CF6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:22, fontWeight:600 }}>{user.name}</div>
            <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>{user.email}</div>
            <div style={{ fontSize:11, color:'var(--gold)', marginTop:4, letterSpacing:'1px', textTransform:'uppercase' }}>{user.role}</div>
          </div>
        </div>

        {[
          { label:'Email', value:user.email },
          { label:'Téléphone', value:user.phone || '—' },
          { label:'Ville', value:user.city || '—' },
          { label:'Adresse', value:user.address || '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
            <p style={{ fontSize:11, color:'var(--muted)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>{label}</p>
            <p style={{ fontSize:14 }}>{value}</p>
          </div>
        ))}

        <div style={{ display:'flex', gap:12, marginTop:28, flexWrap:'wrap' }}>
          <Link to="/orders" className="btn btn-outline btn-sm">Mes commandes</Link>
          <button className="btn btn-sm" style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', color:'#F87171' }} onClick={logout}>
            Déconnexion
          </button>
        </div>
      </div>
    </main>
  )
}

// ── ABOUT ─────────────────────────────────────────────
export function About() {
  return (
    <main style={{ paddingTop:70 }}>
      {/* Hero */}
      <section style={{ width:'100%', background:'var(--black)', padding:'80px 6% 72px' }}>
        <p style={{ fontSize:11, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:16 }}>✦ Notre histoire</p>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(32px,5vw,68px)', fontWeight:700, lineHeight:1.1, marginBottom:20 }}>
          L'art de la <em style={{ fontStyle:'italic', color:'var(--gold)' }}>fragrance</em><br/>à prix accessible
        </h1>
        <div style={{ width:48, height:1, background:'var(--gold)', margin:'0 0 24px' }}/>
        <p style={{ fontSize:'clamp(14px,1.5vw,17px)', color:'var(--muted)', lineHeight:1.8, maxWidth:600 }}>
          DEALPAM est votre destination pour les parfums Zara d'exception. Nous croyons que le luxe devrait être accessible à tous.
        </p>
      </section>

      {/* Story block */}
      <section style={{ background:'var(--dark)', width:'100%', padding:'80px 6%' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
          <div>
            <h2 className="section-title">Notre <em>mission</em></h2>
            <div className="divider"/>
            <p style={{ fontSize:15, color:'var(--muted)', lineHeight:1.8, marginBottom:20 }}>
              Fondée avec une passion pour les parfums d'exception, DEALPAM sélectionne rigoureusement les meilleures fragrances Zara pour vous offrir une expérience olfactive unique.
            </p>
            <p style={{ fontSize:15, color:'var(--muted)', lineHeight:1.8 }}>
              Chaque produit est authentifié et expédié avec soin. Notre équipe est dédiée à vous offrir le meilleur service possible.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              { num:'100+', label:'Parfums disponibles' },
              { num:'1000+', label:'Clients satisfaits' },
              { num:'5★', label:'Note moyenne' },
              { num:'24h', label:'Délai de livraison' },
            ].map((s, i) => (
              <div key={i} style={{ background:'var(--black)', border:'1px solid rgba(201,168,76,.12)', padding:'28px 20px', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:32, color:'var(--gold)', fontWeight:700, marginBottom:8 }}>{s.num}</div>
                <div style={{ fontSize:12, color:'var(--muted)', letterSpacing:'1px', textTransform:'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <style>{`
            @media(max-width:768px){
              .about-two-col{grid-template-columns:1fr !important;}
            }
          `}</style>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 6%', textAlign:'center', background:'var(--black)' }}>
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(26px,4vw,48px)', fontWeight:700, marginBottom:16 }}>
          Rejoignez <em style={{ fontStyle:'italic', color:'var(--gold)' }}>DEALPAM</em>
        </h2>
        <p style={{ color:'var(--muted)', fontSize:16, marginBottom:36, maxWidth:480, margin:'0 auto 36px', lineHeight:1.7 }}>
          Des centaines de clients nous font confiance. Découvrez pourquoi.
        </p>
        <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
          <Link to="/shop" className="btn btn-gold">Voir la collection</Link>
          <Link to="/register" className="btn btn-outline">Créer un compte</Link>
        </div>
      </section>

      <footer>
        <div className="footer-bottom" style={{ borderTop:'1px solid rgba(201,168,76,.12)', padding:'24px 6%' }}>
          <p>© 2025 DEALPAM</p>
          <p style={{ color:'var(--gold)', fontFamily:'var(--font-serif)' }}>✦ Parfums d'exception</p>
        </div>
      </footer>
    </main>
  )
}
