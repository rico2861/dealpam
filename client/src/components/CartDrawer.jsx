import React from 'react'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

let _toast = null
export const setToastFn = fn => { _toast = fn }

export default function CartDrawer() {
  const { items, remove, update, total, count, open, setOpen, clear } = useCart()
  const { fmt } = useCurrency()
  const { user } = useAuth()
  const nav = useNavigate()

  const handleCheckout = async () => {
    if (!user) { setOpen(false); nav('/login?next=checkout'); return }
    try {
      await api.post('/orders', { items: items.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty})), notes:'' })
      clear(); setOpen(false)
      nav('/orders')
      _toast?.('Commande passée avec succès !', 'success')
    } catch(e) {
      _toast?.(e.response?.data?.error || 'Erreur lors de la commande', 'error')
    }
  }

  return (
    <>
      <div className={`cart-overlay${open?' open':''}`} onClick={() => setOpen(false)}/>
      <div className={`cart-drawer${open?' open':''}`}>
        <div className="cart-head">
          <h2 className="cart-title">Mon panier <span style={{color:'var(--gold)',fontSize:16}}>({count})</span></h2>
          <button className="close-btn" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div style={{fontSize:48,marginBottom:16,opacity:.3}}>🛒</div>
              <p style={{color:'var(--muted)',fontSize:14}}>Votre panier est vide</p>
              <button className="btn btn-outline btn-sm" style={{marginTop:20}} onClick={() => setOpen(false)}>
                Continuer mes achats
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="cart-item">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="cart-item-img"/>
                ) : (
                  <div className="cart-item-img" style={{background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'var(--muted)',flexShrink:0}}>🧴</div>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{fmt(item.price)}</div>
                  <div className="cart-qty">
                    <button className="qty-btn" onClick={() => update(item.id, item.qty-1)}>−</button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => update(item.id, item.qty+1)}>+</button>
                  </div>
                </div>
                <button className="cart-remove" onClick={() => remove(item.id)}>×</button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="cart-foot">
            <div className="cart-total">
              <span>Total</span>
              <span className="cart-total-val">{fmt(total)}</span>
            </div>
            <button className="btn btn-gold btn-full" onClick={handleCheckout}>
              Passer la commande →
            </button>
            <button className="btn btn-dark btn-full" style={{marginTop:10}} onClick={() => setOpen(false)}>
              Continuer les achats
            </button>
          </div>
        )}
      </div>
    </>
  )
}
