import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
const Ctx = createContext(null)
export const useCurrency = () => useContext(Ctx)
export function CurrencyProvider({ children }) {
  const [cur, setCur]   = useState(localStorage.getItem('dp_cur') || 'USD')
  const [rate, setRate] = useState(parseFloat(localStorage.getItem('dp_rate') || '136'))
  useEffect(() => {
    axios.get('/api/public/settings').then(r => {
      if (r.data.exchangeRate) { setRate(r.data.exchangeRate); localStorage.setItem('dp_rate', String(r.data.exchangeRate)) }
    }).catch(() => {})
  }, [])
  const toggle = () => { const n = cur==='USD'?'HTG':'USD'; setCur(n); localStorage.setItem('dp_cur',n) }
  const fmt = (v=0) => { const n=Number(v)||0; return cur==='HTG'?`${Math.round(n*rate).toLocaleString('fr')} HTG`:`$${n.toFixed(2)}` }
  return <Ctx.Provider value={{ cur, rate, toggle, fmt }}>{children}</Ctx.Provider>
}
