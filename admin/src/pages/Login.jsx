import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/UI'

const DEMOS = [
  { role:'Admin',     email:'admin@dealpam.com',     pw:'admin123', color:'#00D9FF' },
  { role:'Vendeur',   email:'vendeur@dealpam.com',   pw:'vend123',  color:'#10B981' },
  { role:'Comptable', email:'comptable@dealpam.com', pw:'comp123',  color:'#A78BFA' },
]

export default function Login() {
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
      toast('Bienvenue sur DEALPAM !')
      nav('/', { replace: true })
    } catch(err) {
      setError(err.response?.data?.error || 'Identifiants incorrects')
    } finally { setLoad(false) }
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'#04040A',
      display:'flex', alignItems:'center', justifyContent:'center',
      overflow:'auto', padding:20,
    }}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-28px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes mIn{from{opacity:0;transform:scale(.94) translateY(14px)}to{opacity:1;transform:none}}
        .lfi{width:100%;padding:11px 14px;background:#111120;border:1px solid rgba(255,255,255,.08);
          color:#EEF0F8;font-family:'DM Sans',sans-serif;font-size:13px;transition:.2s;outline:none;
          -webkit-appearance:none;}
        .lfi:focus{border-color:#00D9FF;background:rgba(0,217,255,.04);box-shadow:0 0 0 3px rgba(0,217,255,.08);}
        .lfi::placeholder{color:#50566E;}
        .dlb{display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.9px;color:#50566E;margin-bottom:6px;}
        .dbtn{padding:10px 6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);
          cursor:pointer;text-align:center;transition:.18s;font-family:'DM Sans',sans-serif;touch-action:manipulation;}
        .dbtn:hover,.dbtn:active{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.12);}
        .sbtn{width:100%;padding:13px;border:none;background:linear-gradient(135deg,#00D9FF,#8B5CF6);
          color:#fff;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;
          transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;
          touch-action:manipulation;}
        .sbtn:hover:not(:disabled){opacity:.88;transform:translateY(-1px);box-shadow:0 6px 24px rgba(0,217,255,.28);}
        .sbtn:disabled{opacity:.6;cursor:not-allowed;}
      `}</style>

      {/* Decorative orbs */}
      {[
        { w:500, h:500, c:'#00D9FF', s:'top:-140px;left:-120px', a:'float 9s ease-in-out infinite' },
        { w:420, h:420, c:'#8B5CF6', s:'bottom:-100px;right:-100px', a:'float 9s ease-in-out 3s infinite' },
        { w:280, h:280, c:'#EC4899', s:'top:50%;left:50%;transform:translate(-50%,-50%)', a:'float 7s ease-in-out 1.5s infinite' },
      ].map((o,i) => (
        <div key={i} style={{
          position:'absolute', width:o.w, height:o.h, borderRadius:'50%',
          filter:'blur(80px)', opacity:.12,
          background:`radial-gradient(circle,${o.c},transparent)`,
          animation:o.a, ...Object.fromEntries(o.s.split(';').filter(Boolean).map(s => { const [k,...v]=s.split(':'); return [k.trim().replace(/-(.)/g,(_,c)=>c.toUpperCase()), v.join(':').trim()] })),
        }}/>
      ))}

      {/* Grid pattern */}
      <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)',backgroundSize:'60px 60px',pointerEvents:'none'}}/>

      {/* Card */}
      <div style={{position:'relative',zIndex:1,width:'100%',maxWidth:440}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{
            display:'inline-flex',alignItems:'center',justifyContent:'center',
            width:62,height:62,
            background:'linear-gradient(135deg,#00D9FF,#8B5CF6)',
            fontSize:28,fontWeight:900,color:'#000',marginBottom:12,
            boxShadow:'0 8px 32px rgba(0,217,255,.28)',
            fontFamily:'var(--fd)',
          }}>D</div>
          <div style={{
            fontSize:28,fontWeight:800,letterSpacing:4,fontFamily:'var(--fd)',
            background:'linear-gradient(135deg,#00D9FF,#8B5CF6,#EC4899)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
          }}>DEALPAM</div>
          <div style={{fontSize:12,color:'#50566E',marginTop:4,letterSpacing:'1px'}}>Plateforme de gestion professionnelle</div>
        </div>

        {/* Form card */}
        <div style={{
          background:'rgba(13,13,24,.94)',border:'1px solid rgba(255,255,255,.1)',
          padding:'32px 28px',backdropFilter:'blur(20px)',
          boxShadow:'0 24px 80px rgba(0,0,0,.6)',animation:'mIn .3s ease',
        }}>
          <div style={{fontSize:18,fontWeight:700,fontFamily:'var(--fd)',marginBottom:4}}>Connexion</div>
          <div style={{fontSize:13,color:'#50566E',marginBottom:22}}>Accédez à votre espace de gestion</div>

          {error && (
            <div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.22)',padding:'11px 14px',fontSize:13,color:'#F87171',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
              <span>⚠️</span>{error}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{marginBottom:14}}>
              <label className="dlb">Email</label>
              <input
                className="lfi" type="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@dealpam.com" autoComplete="email" required
              />
            </div>
            <div style={{marginBottom:18,position:'relative'}}>
              <label className="dlb">Mot de passe</label>
              <input
                className="lfi" type={showPw ? 'text' : 'password'}
                value={pw} onChange={e => setPw(e.target.value)}
                placeholder="••••••••" style={{paddingRight:44}} required
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                style={{position:'absolute',right:12,bottom:11,background:'none',border:'none',color:'#50566E',cursor:'pointer',fontSize:15,padding:0}}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
            <button type="submit" className="sbtn" disabled={loading}>
              {loading && (
                <div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>
              )}
              {loading ? 'Connexion...' : '→ Se connecter'}
            </button>
          </form>

          {/* Divider */}
          <div style={{position:'relative',textAlign:'center',margin:'20px 0 14px'}}>
            <div style={{position:'absolute',top:'50%',left:0,right:0,height:1,background:'rgba(255,255,255,.06)'}}/>
            <span style={{position:'relative',background:'rgba(13,13,24,.94)',padding:'0 12px',fontSize:11,color:'#50566E',letterSpacing:'1px'}}>
              COMPTES DE DÉMONSTRATION
            </span>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
            {DEMOS.map(d => (
              <button key={d.role} className="dbtn" onClick={() => submit(null, d.email, d.pw)}>
                <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',color:d.color,marginBottom:3}}>{d.role}</div>
                <div style={{fontSize:10,color:'#50566E',fontFamily:'monospace'}}>{d.pw}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
