import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { ToastProvider } from './components/Toast'
import Header from './components/Header'
import CartDrawer, { setToastFn } from './components/CartDrawer'
import { toast } from './components/Toast'
import Home from './pages/Home'
import { Shop, ProductDetail, Login, Register, Orders, Profile, About } from './pages/Pages'

// Connect toast to cart drawer
setToastFn(toast)

export default function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>
          <ToastProvider>
            <BrowserRouter>
              <Header/>
              <CartDrawer/>
              <Routes>
                <Route path="/"            element={<Home/>}/>
                <Route path="/shop"        element={<Shop/>}/>
                <Route path="/product/:id" element={<ProductDetail/>}/>
                <Route path="/login"       element={<Login/>}/>
                <Route path="/register"    element={<Register/>}/>
                <Route path="/orders"      element={<Orders/>}/>
                <Route path="/profile"     element={<Profile/>}/>
                <Route path="/about"       element={<About/>}/>
                <Route path="*"            element={<Navigate to="/" replace/>}/>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  )
}
