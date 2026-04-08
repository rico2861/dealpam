import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// ── DESIGN TOKENS ──────────────────────────────────
const C = {
  cyan:'#00D9FF',purple:'#8B5CF6',pink:'#EC4899',gold:'#F59E0B',
  green:'#10B981',red:'#EF4444',blue:'#3B82F6',
  t1:'#EEF0F8',t2:'#8892B0',t3:'#50566E',
  b1:'rgba(255,255,255,.06)',b2:'rgba(255,255,255,.10)',
  card:'#0D0D1A',card2:'#111120',card3:'#16162A',
}
const BADGE_STYLES = {
  green:  {bg:'rgba(16,185,129,.12)', tx:'#34D399', bd:'rgba(16,185,129,.25)'},
  red:    {bg:'rgba(239,68,68,.12)',  tx:'#F87171', bd:'rgba(239,68,68,.25)'},
  gold:   {bg:'rgba(245,158,11,.12)', tx:'#FCD34D', bd:'rgba(245,158,11,.25)'},
  cyan:   {bg:'rgba(0,217,255,.1)',   tx:'#00D9FF', bd:'rgba(0,217,255,.25)'},
  purple: {bg:'rgba(139,92,246,.12)',tx:'#A78BFA',  bd:'rgba(139,92,246,.25)'},
  blue:   {bg:'rgba(59,130,246,.12)',tx:'#93C5FD',  bd:'rgba(59,130,246,.25)'},
  pink:   {bg:'rgba(236,72,153,.12)',tx:'#F9A8D4',  bd:'rgba(236,72,153,.25)'},
  gray:   {bg:'rgba(255,255,255,.07)',tx:C.t2,      bd:'rgba(255,255,255,.12)'},
}

// ── BUTTON ─────────────────────────────────────────
export function Btn({ variant='primary', size='md', loading=false, children, style={}, ...p }) {
  const base = {display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,borderRadius:9,border:'none',cursor:loading?'wait':'pointer',fontFamily:'var(--fb)',fontWeight:700,transition:'all .2s',whiteSpace:'nowrap',position:'relative',overflow:'hidden'}
  const sz   = {sm:{padding:'6px 14px',fontSize:12},md:{padding:'9px 18px',fontSize:13},lg:{padding:'11px 24px',fontSize:14}}
  const vs   = {
    primary:{background:'linear-gradient(135deg,#00D9FF,#8B5CF6)',color:'#fff'},
    ghost:  {background:'transparent',color:C.t1,border:'1px solid rgba(255,255,255,.1)'},
    danger: {background:'rgba(239,68,68,.12)',color:'#F87171',border:'1px solid rgba(239,68,68,.22)'},
    success:{background:'rgba(16,185,129,.15)',color:'#34D399',border:'1px solid rgba(16,185,129,.25)'},
  }
  return (
    <button style={{...base,...sz[size],...(vs[variant]||vs.primary),opacity:loading?.7:1,...style}} {...p}>
      {loading && <div style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,.2)',borderTopColor:'#fff',animation:'spin .7s linear infinite'}}/>}
      {children}
    </button>
  )
}

// ── BADGE ──────────────────────────────────────────
export function Badge({ color='gray', dot=false, children }) {
  const s = BADGE_STYLES[color] || BADGE_STYLES.gray
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:20,fontSize:10,fontWeight:700,whiteSpace:'nowrap',background:s.bg,color:s.tx,border:`1px solid ${s.bd}`}}>
      {dot && <span style={{width:5,height:5,borderRadius:'50%',background:s.tx,flexShrink:0}}/>}
      {children}
    </span>
  )
}

// ── CARD ───────────────────────────────────────────
export function Card({ children, style={} }) {
  return <div style={{background:C.card,border:`1px solid ${C.b1}`,borderRadius:16,overflow:'hidden',...style}}>{children}</div>
}
export function CardHead({ title, sub, actions }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',borderBottom:`1px solid ${C.b1}`,gap:12,flexWrap:'wrap'}}>
      <div>
        <div style={{fontSize:13.5,fontWeight:700,fontFamily:'var(--fd)',color:C.t1}}>{title}</div>
        {sub && <div style={{fontSize:11,color:C.t3,marginTop:2}}>{sub}</div>}
      </div>
      {actions && <div style={{display:'flex',alignItems:'center',gap:8}}>{actions}</div>}
    </div>
  )
}
export function CardBody({ children, style={} }) {
  return <div style={{padding:18,...style}}>{children}</div>
}

// ── FORM CONTROLS ──────────────────────────────────
export function Label({ children }) {
  return <label style={{display:'block',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'.9px',color:C.t3,marginBottom:6}}>{children}</label>
}
export function FGroup({ label, children, col=1 }) {
  return <div style={{gridColumn:`span ${col}`}}><Label>{label}</Label>{children}</div>
}

const inputBase = {width:'100%',padding:'10px 13px',borderRadius:8,background:C.card2,color:C.t1,fontFamily:'var(--fb)',fontSize:13,outline:'none',transition:'.2s',boxSizing:'border-box'}

export function Input({ style={}, ...p }) {
  const [f,setF] = useState(false)
  return (
    <input {...p} style={{...inputBase,border:`1px solid ${f?C.cyan:C.b1}`,boxShadow:f?`0 0 0 3px rgba(0,217,255,.08)`:'none',...style}}
      onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>
  )
}
export function Select({ children, style={}, ...p }) {
  return <select {...p} style={{...inputBase,border:`1px solid ${C.b1}`,...style}}>{children}</select>
}
export function Textarea({ style={}, ...p }) {
  return <textarea {...p} style={{...inputBase,border:`1px solid ${C.b1}`,resize:'vertical',minHeight:80,...style}}/>
}

// ── MODAL ──────────────────────────────────────────
export function Modal({ open, title, onClose, onConfirm, confirmLabel='Confirmer', children, wide=false, loading=false, footer }) {
  useEffect(() => {
    if (!open) return
    const h = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose?.()}}
      style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.8)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)'}}>
      <div onClick={e=>e.stopPropagation()}
        style={{width:'100%',maxWidth:wide?720:520,maxHeight:'92vh',background:C.card,border:'1px solid rgba(255,255,255,.12)',borderRadius:22,boxShadow:'0 32px 100px rgba(0,0,0,.8)',display:'flex',flexDirection:'column',animation:'mIn .25s cubic-bezier(.34,1.56,.64,1)'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 22px',borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
          <span style={{fontFamily:'var(--fd)',fontSize:17,fontWeight:700}}>{title}</span>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',background:C.b1,border:'none',color:C.t2,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>×</button>
        </div>
        {/* Body */}
        <div style={{padding:22,overflowY:'auto',flex:1}}>{children}</div>
        {/* Footer */}
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,padding:'14px 22px',borderTop:`1px solid ${C.b1}`,flexShrink:0}}>
          {footer || <>
            <Btn variant="ghost" onClick={onClose}>Annuler</Btn>
            {onConfirm && <Btn onClick={onConfirm} loading={loading}>{confirmLabel}</Btn>}
          </>}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── CONFIRM ────────────────────────────────────────
export function useConfirm() {
  const [st, setSt] = useState(null)
  const confirm = useCallback(msg => new Promise(res => setSt({msg,res})), [])
  const ConfirmDialog = () => !st ? null : createPortal(
    <div style={{position:'fixed',inset:0,zIndex:9500,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.8)',backdropFilter:'blur(10px)'}}>
      <div style={{background:C.card,border:'1px solid rgba(255,255,255,.12)',borderRadius:18,padding:28,width:'100%',maxWidth:380,boxShadow:'0 24px 80px rgba(0,0,0,.8)',animation:'mIn .22s ease'}}>
        <div style={{fontSize:20,marginBottom:12}}>⚠️</div>
        <p style={{fontSize:14,color:C.t2,marginBottom:24,lineHeight:1.6}}>{st.msg}</p>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <Btn variant="ghost" onClick={()=>{st.res(false);setSt(null)}}>Annuler</Btn>
          <Btn variant="danger" onClick={()=>{st.res(true);setSt(null)}}>Confirmer</Btn>
        </div>
      </div>
    </div>,
    document.body
  )
  return {confirm, ConfirmDialog}
}

// ── TOAST ──────────────────────────────────────────
let _toast = null
export function ToastContainer() {
  const [list, setList] = useState([])
  _toast = (msg, type='s') => {
    const id = Date.now()
    setList(p => [...p,{id,msg,type}])
    setTimeout(() => setList(p => p.filter(t=>t.id!==id)), 3500)
  }
  const colors = {s:'linear-gradient(135deg,#065F46,#059669)',e:'linear-gradient(135deg,#7F1D1D,#DC2626)',i:'linear-gradient(135deg,#1E3A8A,#3B82F6)',w:'linear-gradient(135deg,#78350F,#D97706)'}
  const icons  = {s:'✓',e:'✕',i:'ℹ',w:'⚠'}
  return createPortal(
    <div style={{position:'fixed',bottom:22,right:22,zIndex:9999,display:'flex',flexDirection:'column',gap:9,maxWidth:320}}>
      {list.map(t => (
        <div key={t.id} style={{padding:'12px 16px',borderRadius:12,background:colors[t.type]||colors.s,color:'#fff',fontWeight:600,fontSize:13,display:'flex',alignItems:'center',gap:10,boxShadow:'0 8px 32px rgba(0,0,0,.5)',animation:'toastIn .28s ease'}}>
          <span style={{flexShrink:0,fontSize:15}}>{icons[t.type]||'✓'}</span>
          <span style={{lineHeight:1.4}}>{t.msg}</span>
        </div>
      ))}
    </div>,
    document.body
  )
}
export const toast = (msg, type='s') => _toast?.(msg, type)

// ── TABLE ──────────────────────────────────────────
export function Table({ cols, data=[], empty='Aucune donnée', loading=false, onRowClick }) {
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'56px 20px',gap:12,color:C.t3}}>
      <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid rgba(0,217,255,.2)`,borderTopColor:C.cyan,animation:'spin .7s linear infinite'}}/>
      <span style={{fontSize:13}}>Chargement...</span>
    </div>
  )
  if (!data.length) return (
    <div style={{textAlign:'center',padding:'52px 20px',color:C.t3}}>
      <div style={{fontSize:38,marginBottom:12,opacity:.2}}>📭</div>
      <div style={{fontSize:13}}>{empty}</div>
    </div>
  )
  return (
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
        <thead>
          <tr>{cols.map((c,i)=>(
            <th key={i} style={{padding:'10px 14px',textAlign:'left',fontSize:9.5,textTransform:'uppercase',letterSpacing:1,color:C.t3,fontWeight:700,background:'rgba(255,255,255,.018)',borderBottom:`1px solid ${C.b1}`,whiteSpace:'nowrap'}}>
              {c.label}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {data.map((row,i)=>(
            <tr key={i} onClick={()=>onRowClick?.(row)}
              style={{transition:'.15s',cursor:onRowClick?'pointer':'default'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,.025)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {cols.map((c,j)=>(
                <td key={j} style={{padding:'12px 14px',borderBottom:`1px solid rgba(255,255,255,.03)`,verticalAlign:'middle'}}>
                  {c.render?c.render(row):row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── KPI CARD ───────────────────────────────────────
export function KpiCard({ label, value, sub, icon, color='cyan', trend }) {
  const cc = {cyan:C.cyan,purple:C.purple,green:C.green,gold:C.gold,red:C.red,blue:C.blue,pink:C.pink}[color]||C.cyan
  return (
    <div style={{background:C.card,border:`1px solid ${C.b1}`,borderTop:`2px solid ${cc}`,borderRadius:14,padding:'16px 18px',position:'relative',overflow:'hidden',transition:'.22s',cursor:'default'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,.5)'}}
      onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none'}}>
      <div style={{position:'absolute',right:14,top:14,fontSize:22,opacity:.08}}>{icon}</div>
      <div style={{fontSize:9.5,fontWeight:700,textTransform:'uppercase',letterSpacing:'1.2px',color:C.t3,marginBottom:10}}>{label}</div>
      <div style={{fontSize:23,fontWeight:800,letterSpacing:'-.5px',marginBottom:4,fontFamily:'var(--fd)',color:cc}}>{value}</div>
      {sub && <div style={{fontSize:11,color:C.t3,lineHeight:1.4}}>{sub}</div>}
      {trend !== undefined && (
        <div style={{marginTop:6,fontSize:11,fontWeight:700,color:trend>=0?C.green:C.red}}>
          {trend>=0?'▲':'▼'} {Math.abs(trend)}% ce mois
        </div>
      )}
    </div>
  )
}

// ── PAGE HEADER ────────────────────────────────────
export function PageHeader({ title, sub, actions, badge }) {
  return (
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:3}}>
          <h1 style={{fontFamily:'var(--fd)',fontSize:22,fontWeight:800,margin:0}}>{title}</h1>
          {badge && <Badge color={badge.color}>{badge.label}</Badge>}
        </div>
        {sub && <p style={{fontSize:12,color:C.t3,margin:0}}>{sub}</p>}
      </div>
      {actions && <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>{actions}</div>}
    </div>
  )
}

// ── SEARCH ─────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder='Rechercher...' }) {
  return (
    <div style={{position:'relative'}}>
      <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.t3,fontSize:14,pointerEvents:'none'}}>🔍</span>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{paddingLeft:34,paddingRight:14,paddingTop:8,paddingBottom:8,fontSize:13,borderRadius:22,border:`1px solid ${C.b1}`,background:C.card2,color:C.t1,outline:'none',width:200,fontFamily:'var(--fb)',transition:'.25s'}}
        onFocus={e=>{e.target.style.borderColor=C.cyan;e.target.style.width='270px';e.target.style.background='rgba(0,217,255,.04)'}}
        onBlur={e=>{e.target.style.borderColor=C.b1;e.target.style.width='200px';e.target.style.background=C.card2}}/>
    </div>
  )
}

// ── ICON BUTTON ────────────────────────────────────
export function IconBtn({ icon, danger=false, title='', onClick, disabled=false }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      style={{width:30,height:30,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,background:danger?'rgba(239,68,68,.1)':C.b1,color:danger?'#F87171':C.t2,border:'none',cursor:disabled?'not-allowed':'pointer',transition:'all .15s',opacity:disabled?.5:1}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.transform='scale(1.12)'}}
      onMouseLeave={e=>e.currentTarget.style.transform='none'}>
      {icon}
    </button>
  )
}

// ── SPINNER ────────────────────────────────────────
export function Spinner({ size=20, center=true }) {
  const sp = <div style={{width:size,height:size,borderRadius:'50%',border:`${size>20?3:2}px solid rgba(0,217,255,.2)`,borderTopColor:C.cyan,animation:'spin .7s linear infinite'}}/>
  if (!center) return sp
  return <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'56px 20px',gap:12,color:C.t3}}>{sp}<span style={{fontSize:13}}>Chargement...</span></div>
}

// ── TABS ───────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{display:'flex',gap:3,background:C.card,borderRadius:11,padding:4,border:`1px solid ${C.b1}`,width:'fit-content',marginBottom:18,flexWrap:'wrap'}}>
      {tabs.map(t => (
        <button key={t.key} onClick={()=>onChange(t.key)}
          style={{padding:'7px 18px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'var(--fb)',transition:'.18s',background:active===t.key?'linear-gradient(135deg,#00D9FF,#8B5CF6)':'transparent',color:active===t.key?'#fff':C.t3}}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── STAT BOX ───────────────────────────────────────
export function StatRow({ stats }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:10,marginBottom:16}}>
      {stats.map((s,i) => (
        <div key={i} style={{background:C.card2,border:`1px solid ${C.b1}`,borderRadius:11,padding:'13px 15px'}}>
          <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.9px',color:C.t3,marginBottom:4,fontWeight:700}}>{s.label}</div>
          <div style={{fontSize:18,fontWeight:800,color:s.color||C.t1}}>{s.value}</div>
          {s.sub && <div style={{fontSize:10.5,color:C.t3,marginTop:2}}>{s.sub}</div>}
        </div>
      ))}
    </div>
  )
}

// ── TOTAL BOX ──────────────────────────────────────
export function TotalBox({ label='Total', usd, htg }) {
  return (
    <div style={{background:'rgba(0,217,255,.06)',border:'1px solid rgba(0,217,255,.15)',borderRadius:10,padding:'13px 16px'}}>
      <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.7px',color:C.cyan,marginBottom:3,fontWeight:700}}>{label}</div>
      <div style={{fontSize:20,fontWeight:800,color:C.t1}}>{usd}</div>
      <div style={{fontSize:11.5,color:C.t3,marginTop:2}}>{htg}</div>
    </div>
  )
}

// ── FORM GRID ──────────────────────────────────────
export function FormGrid({ cols=2, children, style={} }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:`repeat(auto-fill,minmax(${cols>1?'220px':'100%'},1fr))`,gap:14,...style}}>
      {children}
    </div>
  )
}
