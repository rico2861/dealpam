import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'

export default function Home() {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const { add }                 = useCart()
  const { fmt }                 = useCurrency()
  const nav                     = useNavigate()

  useEffect(() => {
    Promise.all([
      axios.get('/api/public/products').then(r => setProducts(r.data.filter(p => p.featured).slice(0,4))),
      axios.get('/api/public/settings').then(r => setSettings(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  return (
    <main>
      {/* ── HERO — full-width, two-column on desktop, single on mobile ── */}
      <section className="hero">
        <div className="hero-bg"/>
        <div className="hero-inner">

          {/* Left: text */}
          <div className="hero-content fade-up">
            <div className="hero-badge">
              <span className="limited-badge">✦ LIMITED EDITION</span>
              <span>Collection 2025</span>
            </div>
            <h1 className="hero-title">
              Parfums<br/><em>d'exception</em><br/>
              {settings.heroText || 'Zara Luxe'}
            </h1>
            <p className="hero-subtitle">
              {settings.slogan || 'Découvrez notre collection exclusive de parfums Zara — des fragrances uniques, des prix irrésistibles.'}
            </p>
            <div className="hero-actions">
              <Link to="/shop" className="btn btn-gold">Découvrir la collection →</Link>
              <Link to="/about" className="btn btn-outline">Notre histoire</Link>
            </div>
          </div>

          {/* Right: floating product images */}
          <div className="hero-images">
            {loading
              ? [0,1,2,3].map(i => (
                  <div key={i} className="hero-img-item">
                    <div className="skeleton" style={{aspectRatio:'1'}}/>
                  </div>
                ))
              : products.slice(0,4).map((p, i) => (
                  <div key={p.id} className="hero-img-item"
                    onClick={() => nav(`/product/${p.id}`)}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} loading="lazy"/>
                      : <div style={{aspectRatio:'1',background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,color:'var(--muted)'}}>🧴</div>
                    }
                  </div>
                ))
            }
            {!loading && products.length === 0 && (
              [0,1,2,3].map(i => (
                <div key={i} className="hero-img-item">
                  <div style={{aspectRatio:'1',background:'rgba(201,168,76,.04)',border:'1px solid rgba(201,168,76,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,opacity:.3}}>🧴</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── STATS BAR — full width ── */}
      <div className="stats-bar">
        {[
          { num:'100+', label:'Fragrances' },
          { num:'1000+', label:'Clients satisfaits' },
          { num:'5★', label:'Qualité garantie' },
          { num:'24h', label:'Livraison rapide' },
        ].map((s,i) => (
          <div key={i} className="stat-item">
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURED PRODUCTS ── */}
      <section className="section">
        <div className="section-header">
          <div>
            <p style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'var(--gold)',marginBottom:10}}>✦ Sélection</p>
            <h2 className="section-title">Nos <em>best-sellers</em></h2>
            <div className="divider"/>
          </div>
          <Link to="/shop" className="btn btn-outline btn-sm">Voir tout →</Link>
        </div>

        {loading ? (
          <div className="product-grid">
            {[1,2,3,4].map(i => (
              <div key={i}>
                <div className="skeleton" style={{aspectRatio:'1',marginBottom:16}}/>
                <div className="skeleton" style={{height:16,marginBottom:8,width:'60%'}}/>
                <div className="skeleton" style={{height:12,width:'40%'}}/>
              </div>
            ))}
          </div>
        ) : (
          <div className="product-grid">
            {products.map(p => (
              <ProductCard key={p.id} product={p} onAdd={() => add(p)} fmt={fmt} nav={nav}/>
            ))}
          </div>
        )}
      </section>

      {/* ── BRAND STORY — full-width dark block ── */}
      <section style={{background:'var(--dark)',width:'100%'}}>
        <div style={{
          display:'grid',
          gridTemplateColumns:'var(--brand-cols, 1fr 1fr)',
          alignItems:'stretch',
        }}>
          <style>{`
            @media(max-width:768px){
              :root{--brand-cols:1fr;}
              .brand-text{padding:48px 5% !important;}
              .brand-imgs{grid-template-columns:1fr 1fr !important;}
            }
          `}</style>
          <div className="brand-text" style={{padding:'80px 7%',display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <p style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'var(--gold)',marginBottom:16}}>✦ Notre histoire</p>
            <h2 className="section-title">L'<em>art</em> du parfum<br/>à portée de main</h2>
            <div className="divider"/>
            <p style={{fontSize:15,color:'var(--muted)',lineHeight:1.8,marginBottom:24}}>
              DEALPAM est né d'une passion pour les parfums d'exception. Nous sélectionnons les meilleures fragrances Zara pour vous offrir une expérience olfactive unique à des prix accessibles.
            </p>
            <p style={{fontSize:15,color:'var(--muted)',lineHeight:1.8,marginBottom:36}}>
              Chaque parfum raconte une histoire, chaque fragrance est une invitation au voyage. Notre collection vous transporte dans un monde de sophistication et d'élégance.
            </p>
            <Link to="/shop" className="btn btn-gold" style={{alignSelf:'flex-start'}}>Explorer la collection →</Link>
          </div>
          <div className="brand-imgs" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
            {products.slice(0,4).map((p,i) => p.imageUrl ? (
              <img key={i} src={p.imageUrl} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover',display:'block',opacity:i%2===0?.95:.75}}/>
            ) : (
              <div key={i} style={{aspectRatio:'1',background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,color:'var(--muted)',opacity:.2}}>🧴</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section style={{padding:'80px 6%',textAlign:'center',background:'var(--black)'}}>
        <p style={{fontSize:11,letterSpacing:'2px',textTransform:'uppercase',color:'var(--gold)',marginBottom:16}}>✦ Rejoignez-nous</p>
        <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(26px,4vw,52px)',fontWeight:700,marginBottom:20}}>
          Créez votre compte<br/><em style={{color:'var(--gold)',fontStyle:'italic'}}>et commandez facilement</em>
        </h2>
        <p style={{fontSize:16,color:'var(--muted)',margin:'0 auto 36px',maxWidth:480,lineHeight:1.7}}>
          Accédez à votre espace personnel, suivez vos commandes et bénéficiez d'offres exclusives.
        </p>
        <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
          <Link to="/register" className="btn btn-gold">Créer un compte gratuit</Link>
          <Link to="/shop" className="btn btn-outline">Voir la boutique</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">DEAL<span>PAM</span></div>
            <p>Votre destination pour les parfums Zara d'exception. Qualité garantie, prix imbattables.</p>
          </div>
          <div className="footer-links">
            <h4>Navigation</h4>
            <Link to="/">Accueil</Link>
            <Link to="/shop">Boutique</Link>
            <Link to="/about">À propos</Link>
          </div>
          <div className="footer-links">
            <h4>Compte</h4>
            <Link to="/login">Connexion</Link>
            <Link to="/register">S'inscrire</Link>
            <Link to="/orders">Mes commandes</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 DEALPAM. Tous droits réservés.</p>
          <p style={{color:'var(--gold)',fontFamily:'var(--font-serif)'}}>✦ Parfums d'exception</p>
        </div>
      </footer>
    </main>
  )
}

// ── PRODUCT CARD ────────────────────────────────────
export function ProductCard({ product: p, onAdd, fmt, nav }) {
  const [adding, setAdding] = useState(false)

  const handleAdd = (e) => {
    e.stopPropagation()
    if (!p.inStock) return
    setAdding(true)
    onAdd()
    setTimeout(() => setAdding(false), 800)
  }

  return (
    <div className="product-card" onClick={() => nav(`/product/${p.id}`)}>
      <div className="product-img-wrap">
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.name} className="product-img" loading="lazy"/>
          : <div className="product-img" style={{background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:60,color:'var(--muted)'}}>🧴</div>
        }
        <div className="product-badge-wrap">
          {p.featured && <span className="product-featured-badge">✦ Featured</span>}
          {!p.inStock && <span className="product-out-badge">Épuisé</span>}
        </div>
      </div>
      <div className="product-body">
        <div className="product-cat">{p.category}</div>
        <h3 className="product-name">{p.name}</h3>
        <p className="product-desc">{p.description}</p>
        <div className="product-footer">
          <div>
            <div className="product-price">{fmt(p.price)}</div>
            <div className="product-price-htg">{p.priceHTG?.toLocaleString('fr')} HTG</div>
          </div>
          <button
            className="add-to-cart-btn"
            onClick={handleAdd}
            disabled={!p.inStock}
            title={p.inStock ? 'Ajouter au panier' : 'Épuisé'}
          >
            {adding ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>
  )
}
