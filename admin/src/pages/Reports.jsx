import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts'
import api from '../utils/api'
import { useCurrency } from '../context/CurrencyContext'
import { Card, CardHead, CardBody, KpiCard, Tabs, Spinner } from '../components/UI'

const COLORS = ['#00D9FF','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6']

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'#111120',border:'1px solid rgba(255,255,255,.12)',padding:'10px 14px',fontSize:12}}>
      <div style={{color:'#50566E',marginBottom:4,fontWeight:600}}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color,fontWeight:600,marginTop:2}}>
          {p.name}: ${Number(p.value||0).toFixed(2)}
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const [data, setData]       = useState(null)
  const [period, setPeriod]   = useState('month')
  const { fmt, rate, cur }    = useCurrency()

  useEffect(() => {
    setData(null)
    api.get(`/reports?period=${period}`).then(r => setData(r.data)).catch(() => {})
  }, [period])

  const kList = data ? [
    { label:"CA période",   value:fmt(data.revenue),  sub:cur==='USD'?`${(data.revenueHTG||0).toLocaleString('fr')} HTG`:null,  icon:'💰', color:'cyan'  },
    { label:'Encaissé',     value:fmt(data.paid),     sub:cur==='USD'?`${(data.paidHTG||0).toLocaleString('fr')} HTG`:null,     icon:'✅', color:'green' },
    { label:'Dépenses',     value:fmt(data.expenses), sub:cur==='USD'?`${(data.expensesHTG||0).toLocaleString('fr')} HTG`:null, icon:'📊', color:'gold'  },
    { label:'Profit Net',   value:fmt(data.profit),   sub:cur==='USD'?`${(data.profitHTG||0).toLocaleString('fr')} HTG`:null,   icon:'📈', color:data.profit>=0?'green':'red' },
    { label:'Nb Ventes',    value:data.salesCount,    icon:'🛒', color:'purple' },
  ] : []

  return (
    <div className="fade-up">
      {/* Header row */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:'var(--fd)',fontSize:22,fontWeight:800,margin:0}}>Rapports & CA</h1>
          <p style={{fontSize:12,color:'#50566E',margin:'3px 0 0'}}>Analyse financière détaillée</p>
        </div>
        <Tabs active={period} onChange={setPeriod} tabs={[
          { key:'week',  label:'Cette semaine' },
          { key:'month', label:'Ce mois'       },
          { key:'year',  label:'Cette année'   },
        ]}/>
      </div>

      {!data ? <Spinner/> : (
        <>
          {/* KPI row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10,marginBottom:16}}>
            {kList.map((k,i) => <KpiCard key={i} {...k}/>)}
          </div>

          {/* Main charts — responsive 2-col then 1-col */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12,marginBottom:12}}>
            {/* 6-month bar chart */}
            <Card style={{minWidth:0}}>
              <CardHead title="Tendance 6 mois — CA · Dépenses · Profit"/>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.monthlyTrend||[]} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                    <XAxis dataKey="month" tick={{fontSize:10,fill:'#50566E'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10,fill:'#50566E'}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<TT/>}/>
                    <Legend wrapperStyle={{fontSize:11,color:'#8892B0'}}/>
                    <Bar name="Revenus"  dataKey="revenue"  fill="#00D9FF" radius={[3,3,0,0]}/>
                    <Bar name="Dépenses" dataKey="expenses" fill="#EF4444" radius={[3,3,0,0]}/>
                    <Bar name="Profit"   dataKey="profit"   fill="#10B981" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            {/* Expenses by category */}
            <Card style={{minWidth:0}}>
              <CardHead title="Dépenses par catégorie"/>
              <CardBody>
                {(data.expByCategory||[]).length ? (
                  <>
                    <ResponsiveContainer width="100%" height={130}>
                      <PieChart>
                        <Pie
                          data={data.expByCategory}
                          dataKey="amount"
                          nameKey="cat"
                          cx="50%" cy="50%"
                          outerRadius={58} innerRadius={30}
                        >
                          {(data.expByCategory||[]).map((_,i) => (
                            <Cell key={i} fill={COLORS[i%COLORS.length]}/>
                          ))}
                        </Pie>
                        <Tooltip formatter={v => `$${Number(v||0).toFixed(2)}`}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:10}}>
                      {(data.expByCategory||[]).map((e,i) => (
                        <div key={e.cat} style={{display:'flex',justifyContent:'space-between',fontSize:12,alignItems:'center'}}>
                          <div style={{display:'flex',alignItems:'center',gap:7}}>
                            <div style={{width:7,height:7,background:COLORS[i%COLORS.length],flexShrink:0}}/>
                            <span style={{color:'#8892B0'}}>{e.cat}</span>
                          </div>
                          <span style={{fontWeight:700}}>{fmt(e.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{textAlign:'center',color:'#50566E',padding:'32px 0',fontSize:13}}>
                    Aucune dépense sur cette période
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Profit trend line */}
          <Card>
            <CardHead title="Évolution CA & Profit — courbe de tendance"/>
            <CardBody>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.monthlyTrend||[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:'#50566E'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:'#50566E'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<TT/>}/>
                  <Legend wrapperStyle={{fontSize:11,color:'#8892B0'}}/>
                  <Line name="CA"     type="monotone" dataKey="revenue"  stroke="#00D9FF" strokeWidth={2} dot={{fill:'#00D9FF',r:3}}/>
                  <Line name="Profit" type="monotone" dataKey="profit"   stroke="#10B981" strokeWidth={2} dot={{fill:'#10B981',r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Summary table */}
          {(data.monthlyTrend||[]).length > 0 && (
            <Card style={{marginTop:12}}>
              <CardHead title="Récapitulatif mensuel"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                  <thead>
                    <tr>
                      {['Mois','Revenus','Dépenses','Profit','Marge'].map(h => (
                        <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:9.5,textTransform:'uppercase',letterSpacing:1,color:'#50566E',fontWeight:700,background:'rgba(255,255,255,.018)',borderBottom:'1px solid rgba(255,255,255,.06)',whiteSpace:'nowrap'}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyTrend.map((row,i) => {
                      const marge = row.revenue > 0 ? Math.round((row.profit/row.revenue)*100) : 0
                      return (
                        <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,.03)'}}>
                          <td style={{padding:'11px 14px',fontWeight:600,color:'#8892B0'}}>{row.month}</td>
                          <td style={{padding:'11px 14px',color:'#00D9FF',fontWeight:700}}>{fmt(row.revenue)}</td>
                          <td style={{padding:'11px 14px',color:'#F87171',fontWeight:600}}>{fmt(row.expenses)}</td>
                          <td style={{padding:'11px 14px',color:row.profit>=0?'#34D399':'#F87171',fontWeight:700}}>{fmt(row.profit)}</td>
                          <td style={{padding:'11px 14px'}}>
                            <span style={{
                              padding:'2px 8px',fontSize:10,fontWeight:700,
                              background:marge>=30?'rgba(16,185,129,.12)':marge>=0?'rgba(245,158,11,.12)':'rgba(239,68,68,.12)',
                              color:marge>=30?'#34D399':marge>=0?'#FCD34D':'#F87171',
                              border:`1px solid ${marge>=30?'rgba(16,185,129,.25)':marge>=0?'rgba(245,158,11,.25)':'rgba(239,68,68,.25)'}`,
                            }}>
                              {marge}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
