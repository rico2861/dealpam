import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoad]  = useState(true)
  const [forceChange, setFC] = useState(false)
  useEffect(() => {
    const t = localStorage.getItem('dp_token')
    if (!t) { setLoad(false); return }
    api.get('/auth/me')
      .then(r => { setUser(r.data); setFC(!!r.data.forcePasswordChange) })
      .catch(() => localStorage.removeItem('dp_token'))
      .finally(() => setLoad(false))
  }, [])
  const login = async (email, password) => {
    const r = await api.post('/auth/login', { email, password })
    localStorage.setItem('dp_token', r.data.token)
    setUser(r.data.user); setFC(!!r.data.forcePasswordChange)
    return r.data
  }
  const logout = () => { localStorage.removeItem('dp_token'); setUser(null); setFC(false) }
  const can = (...roles) => !!user && (!roles.length || roles.includes(user.role))
  return <Ctx.Provider value={{ user, loading, login, logout, can, forceChange, clearForce:()=>setFC(false) }}>{children}</Ctx.Provider>
}
