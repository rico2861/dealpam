import React, { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

let _add = null
export function ToastProvider({ children }) {
  const [list, setList] = useState([])
  _add = useCallback((msg, type='success') => {
    const id = Date.now()
    setList(p => [...p, {id,msg,type}])
    setTimeout(() => setList(p => p.filter(t => t.id!==id)), 4000)
  }, [])
  const icons = {success:'✓',error:'✕',info:'ℹ'}
  return (
    <>
      {children}
      {createPortal(
        <div className="toast-wrap">
          {list.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              <span className="toast-icon">{icons[t.type]||'ℹ'}</span>
              <span>{t.msg}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
export const toast = (msg, type='success') => _add?.(msg, type)
