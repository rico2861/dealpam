import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser]    = useState(null)
  const [loading, setLoad] = useState(true)
  useEffect(() => {
    const t = localStorage.getItem('dp_client_token')
    if (!t) { setLoad(false); return }
    api.get('/auth/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('dp_client_token')).finally(() => setLoad(false))
  }, [])
  const login = async (email, pw) => {
    const r = await api.post('/auth/login', { email, password: pw })
    localStorage.setItem('dp_client_token', r.data.token)
    setUser(r.data.user); return r.data
  }
  const register = async (d) => {
    const r = await api.post('/auth/register', d)
    localStorage.setItem('dp_client_token', r.data.token)
    setUser(r.data.user); return r.data
  }
  const logout = () => { localStorage.removeItem('dp_client_token'); setUser(null) }
  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}
