import React, { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import api from '../utils/api'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { KpiCard, Card, CardHead, CardBody, Table, Badge, Spinner } from '../components/UI'

const COLORS = ['#00D9FF','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6']

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'#111120',border:'1px solid rgba(255,255,255,.12)',padding:'10px 14px',fontSize:12}}>
      <div style={{color:'#50566E',marginBottom:4,fontWeight:600}}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{color:p.color,fontWeight:600,marginTop:2}}>{p.name}: ${Number(p.value||0).toFixed(2)}</div>)}
    </div>
  )
}

export default function Dashboard() {
  const [data, setData]     = useState(null)
  const [err, setErr]       = useState('')
  const { fmt, cur }        = useCurrency()
  const { can }             = useAuth()
  const showFin             = can('Admin','Comptable')

  const load = () => {
    setErr('')
    api.get('/dashboard').then(r => setData(r.data)).catch(e => setErr(e.response?.data?.error || 'Erreur de chargement'))
  }
  useEffect(() => { load() }, [])

  if (err) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:16}}>
      <div style={{fontSize:48}}>⚠️</div>
      <div style={{fontSize:16,fontWeight:700,color:'#EF4444'}}>Erreur de chargement</div>
      <div style={{fontSize:13,color:'#50566E',textAlign:'center',maxWidth:400}}>{err}</div>
      <button onClick={load} style={{padding:'9px 22px',background:'linear-gradient(135deg,#00D9FF,#8B5CF6)',border:'none',color:'#fff',cursor:'pointer',fontWeight:700,fontSize:13}}>
        Réessayer
      </button>
    </div>
  )
  if (!data) return <Spinner/>

  const { kpis, dailySales, monthlyTrend, paymentMethods, lowStock, recentSales } = data
  const htgSub = v => cur === 'USD'
    ? `${Math.round((v||0)*(data.exchangeRate||136)).toLocaleString('fr')} HTG`
    : `$${(v||0).toFixed(2)}`

  const kpiList = [
    {label:"CA Ce mois",    value:fmt(kpis.revenueMois),   sub:htgSub(kpis.revenueMois),   icon:'💰', color:'cyan'},
    {label:"Encaissé",      value:fmt(kpis.paidMois),      sub:htgSub(kpis.paidMois),      icon:'✅', color:'green'},
    {label:"Ventes",        value:kpis.totalVentes,         sub:`${kpis.totalClients} clients`, icon:'🛒', color:'purple'},
    {label:"Produits",      value:kpis.totalProduits,       sub:`${kpis.stockUnites} unités`, icon:'📦', color:'blue'},
    ...(showFin ? [
      {label:"Dépenses",    value:fmt(kpis.depensesMois),  sub:htgSub(kpis.depensesMois),  icon:'📊', color:'gold'},
      {label:"Profit Net",  value:fmt(kpis.profit),         sub:htgSub(kpis.profit),         icon:'📈', color:kpis.profit>=0?'green':'red'},
    ] : []),
    ...(kpis.stockAlerte > 0 ? [{label:"Stock Alerte", value:kpis.stockAlerte, sub:"produits à réapprovisionner", icon:'⚠️', color:'red'}] : []),
  ]

  return (
    <div className="fade-up">
      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:16}}>
        {kpiList.map((k,i) => <KpiCard key={i} {...k}/>)}
      </div>

      {/* Balance warning */}
      {(kpis.balanceDue||0) > 0.01 && (
        <div style={{background:'rgba(239,68,68,.07)',border:'1px solid rgba(239,68,68,.2)',padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:12,fontSize:13}}>
          <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
          <span>
            Balance dûe : <strong style={{color:'#F87171'}}>{fmt(kpis.balanceDue)}</strong>
            {cur === 'USD' && <span style={{color:'#50566E',marginLeft:8}}>{Math.round((kpis.balanceDue||0)*(data.exchangeRate||136)).toLocaleString('fr')} HTG</span>}
          </span>
        </div>
      )}

      {/* Charts row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:12,marginBottom:12}}>
        {/* 7-day area chart */}
        <Card>
          <CardHead title="Revenus — 7 derniers jours"/>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dailySales||[]}>
                <defs>
                  <linearGradient id="gcyan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00D9FF" stopOpacity={0.28}/>
                    <stop offset="95%" stopColor="#00D9FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gred" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="label" tick={{fontSize:10,fill:'#50566E'}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<ChartTip/>}/>
                <Area name="CA" type="monotone" dataKey="revenue" stroke="#00D9FF" strokeWidth={2} fill="url(#gcyan)"/>
                {showFin && <Area name="Dépenses" type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#gred)"/>}
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Payment methods pie */}
        <Card>
          <CardHead title="Modes de paiement ce mois"/>
          <CardBody>
            {paymentMethods?.length ? (
              <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <ResponsiveContainer width={120} height={120} style={{flexShrink:0}}>
                  <PieChart>
                    <Pie data={paymentMethods} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={55} innerRadius={28}>
                      {paymentMethods.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v => `$${Number(v||0).toFixed(2)}`}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{flex:1,minWidth:120,display:'flex',flexDirection:'column',gap:7}}>
                  {paymentMethods.map((pm,i) => (
                    <div key={pm.method} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:7,height:7,background:COLORS[i%COLORS.length],flexShrink:0}}/>
                        <span style={{color:'#8892B0'}}>{pm.method}</span>
                      </div>
                      <span style={{fontWeight:700}}>{fmt(pm.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{textAlign:'center',color:'#50566E',padding:'24px 0',fontSize:13}}>Aucune vente ce mois</div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* 6-month bar chart */}
      {showFin && (monthlyTrend||[]).length > 0 && (
        <Card style={{marginBottom:12}}>
          <CardHead title="Tendance 6 mois — CA · Dépenses · Profit"/>
          <CardBody>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyTrend} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="month" tick={{fontSize:10,fill:'#50566E'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:'#50566E'}} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend wrapperStyle={{fontSize:11,color:'#8892B0'}}/>
                <Bar name="Revenus"  dataKey="revenue"  fill="#00D9FF" radius={[3,3,0,0]}/>
                <Bar name="Dépenses" dataKey="expenses" fill="#EF4444" radius={[3,3,0,0]}/>
                <Bar name="Profit"   dataKey="profit"   fill="#10B981" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Bottom: recent sales + stock alerts */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
        <Card>
          <CardHead title="Ventes récentes" actions={<Badge color="cyan">{recentSales?.length||0}</Badge>}/>
          <Table
            data={recentSales||[]}
            empty="Aucune vente"
            cols={[
              {label:'Client',  render:r=><span style={{fontWeight:600,fontSize:12}}>{r.clientName}</span>},
              {label:'Produit', render:r=><span style={{color:'#8892B0',fontSize:11}}>{(r.productName||'').slice(0,20)}</span>},
              {label:'Total',   render:r=><span style={{color:'#00D9FF',fontWeight:700}}>{fmt(r.totalUSD)}</span>},
              {label:'Statut',  render:r=>r.paidUSD>=r.totalUSD?<Badge color="green" dot>Payé</Badge>:r.paidUSD>0?<Badge color="gold" dot>Partiel</Badge>:<Badge color="red" dot>Impayé</Badge>},
            ]}
          />
        </Card>

        <Card>
          <CardHead
            title="⚠️ Alertes Stock"
            actions={<Badge color={lowStock?.length?'red':'green'}>{lowStock?.length||0}</Badge>}
          />
          {!lowStock?.length ? (
            <CardBody>
              <div style={{textAlign:'center',color:'#10B981',fontSize:13,padding:'8px 0'}}>✅ Tous les stocks sont OK</div>
            </CardBody>
          ) : (
            <Table
              data={lowStock||[]}
              empty=""
              cols={[
                {label:'Produit', render:r=><span style={{fontWeight:600,fontSize:12}}>{r.name}</span>},
                {label:'SKU',     render:r=><span style={{color:'#50566E',fontSize:11,fontFamily:'monospace'}}>{r.sku||'—'}</span>},
                {label:'Stock',   render:r=><Badge color={r.qty===0?'red':'gold'}>{r.qty===0?'Épuisé':`${r.qty} unités`}</Badge>},
              ]}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
