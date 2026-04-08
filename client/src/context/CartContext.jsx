import React, { createContext, useContext, useState, useEffect } from 'react'
const Ctx = createContext(null)
export const useCart = () => useContext(Ctx)
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dp_cart') || '[]') } catch { return [] }
  })
  const [open, setOpen] = useState(false)
  useEffect(() => { localStorage.setItem('dp_cart', JSON.stringify(items)) }, [items])
  const add = (product, qty = 1) => {
    setItems(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) return prev.map(i => i.id===product.id ? {...i, qty: i.qty+qty} : i)
      return [...prev, { id:product.id, name:product.name, price:product.price, imageUrl:product.imageUrl, qty }]
    })
    setOpen(true)
  }
  const remove = id => setItems(p => p.filter(i => i.id !== id))
  const update = (id, qty) => {
    if (qty <= 0) { remove(id); return }
    setItems(p => p.map(i => i.id===id ? {...i,qty} : i))
  }
  const clear = () => setItems([])
  const total = items.reduce((a,i) => a+(i.price||0)*(i.qty||1), 0)
  const count = items.reduce((a,i) => a+(i.qty||1), 0)
  return <Ctx.Provider value={{ items, add, remove, update, clear, total, count, open, setOpen }}>{children}</Ctx.Provider>
}
