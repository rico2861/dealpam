import React, { createContext, useContext, useState } from 'react'
const Ctx = createContext(null)
export const useCurrency = () => useContext(Ctx)
export function CurrencyProvider({ children }) {
  const [cur, setCur]   = useState(localStorage.getItem('dp_cur') || 'USD')
  const [rate, setRate] = useState(parseFloat(localStorage.getItem('dp_rate') || '136'))
  const toggle = () => { const n = cur==='USD'?'HTG':'USD'; setCur(n); localStorage.setItem('dp_cur',n) }
  const setR   = r  => { setRate(r); localStorage.setItem('dp_rate', String(r)) }
  const fmt = (v=0, forceUSD=false) => {
    const n = Number(v) || 0
    if (cur === 'HTG' && !forceUSD) return `${Math.round(n*rate).toLocaleString('fr')} HTG`
    return `$${n.toFixed(2)}`
  }
  const fmtBoth = (v=0) => ({ usd:`$${(Number(v)||0).toFixed(2)}`, htg:`${Math.round((Number(v)||0)*rate).toLocaleString('fr')} HTG` })
  return <Ctx.Provider value={{ cur, rate, toggle, setRate:setR, fmt, fmtBoth }}>{children}</Ctx.Provider>
}
