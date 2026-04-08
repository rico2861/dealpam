/**
 * DEALPAM v6 — Checkout.jsx
 * Checkout complet : livraison + paiement + code promo + conversion devise
 * Toute logique financière est validée côté BACKEND uniquement.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import api from '../utils/api'
import { useCart } from '../context/CartContext'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { toast } from '../components/Toast'

// ── Étapes du checkout ──────────────────────────
const STEPS = ['Infos', 'Livraison', 'Paiement', 'Confirmation']

// ── Modes de paiement ───────────────────────────
const PAYMENT_METHODS = [
  { id: 'moncash',   label: 'MonCash',                  icon: '📱', desc: 'Paiement mobile MonCash' },
  { id: 'virement',  label: 'Virement bancaire',         icon: '🏦', desc: 'SOGEBANK ou UNIBANK' },
  { id: 'livraison', label: 'Paiement à la livraison',   icon: '🚚', desc: 'Payez à la réception' },
  { id: 'shop',      label: 'Paiement au shop',          icon: '🏪', desc: 'Récupérez en boutique' },
]

// ── Comptes bancaires (données publiques depuis backend) ──
const BankAccounts = ({ accounts }) => (
  <div className="bank-accounts">
    {(accounts || []).map((acc, i) => (
      <div key={i} className="bank-card">
        <div className="bank-header">
          <span className="bank-name">{acc.bank}</span>
          <span className={`currency-badge ${acc.currency === 'USD' ? 'usd' : 'htg'}`}>{acc.currency}</span>
        </div>
        <div className="bank-detail">
          <span className="bank-label">Titulaire :</span>
          <span className="bank-value">{acc.name}</span>
        </div>
        <div className="bank-detail">
          <span className="bank-label">Compte :</span>
          <span className="bank-value acct">{acc.account}</span>
        </div>
      </div>
    ))}
    <p className="bank-note">
      ⚠️ Uploadez votre preuve de virement après avoir passé la commande.
    </p>
  </div>
)

// ── Composant principal ──────────────────────────
export default function Checkout() {
  const { items, total: cartTotal, clear } = useCart()
  const { fmt, cur, rate }                  = useCurrency()
  const { user }                            = useAuth()
  const navigate                            = useNavigate()

  const [step, setStep]         = useState(0)
  const [loading, setLoading]   = useState(false)
  const [zones, setZones]       = useState([])
  const [bankAccts, setBankAccts] = useState([])
  const [order, setOrder]       = useState(null)  // commande créée

  // Formulaire
  const [form, setForm] = useState({
    clientName:    user?.name    || '',
    clientPhone:   user?.phone   || '',
    clientAddress: '',
    zone:          '',
    paymentMethod: 'moncash',
    promoCode:     '',
    notes:         '',
    currencyDisplay: cur || 'USD',
  })

  // Livraison calculée par le backend
  const [deliveryInfo, setDeliveryInfo] = useState(null)
  // Code promo validé par le backend
  const [promoResult, setPromoResult]   = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)

  // Upload preuve virement
  const [proofFile, setProofFile]     = useState(null)
  const [proofBank, setProofBank]     = useState('')
  const [proofCurrency, setProofCurrency] = useState('HTG')
  const [proofAmount, setProofAmount] = useState('')
  const [proofUploading, setProofUploading] = useState(false)

  // ── Charger données publiques ─────────────────
  useEffect(() => {
    axios.get('/api/public/delivery-zones').then(r => setZones(r.data)).catch(() => {})
    axios.get('/api/public/bank-accounts').then(r => setBankAccts(r.data)).catch(() => {})
  }, [])

  // ── Mise à jour zone → info livraison ─────────
  useEffect(() => {
    if (form.zone) {
      const z = zones.find(z => z.zone === form.zone)
      setDeliveryInfo(z || null)
    } else {
      setDeliveryInfo(null)
    }
  }, [form.zone, zones])

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── Validation code promo (backend) ──────────
  const validatePromo = async () => {
    if (!form.promoCode.trim()) return
    setPromoLoading(true)
    try {
      // Calcul sous-total côté client uniquement pour l'affichage de pré-check
      // Le vrai calcul est refait côté backend lors de la création commande
      const subtotal = cartTotal  // En USD depuis CartContext
      const res = await axios.post('/api/public/validate-promo', {
        code: form.promoCode.trim(),
        subtotalUSD: subtotal,
      })
      setPromoResult(res.data)
      toast.success(`Code promo appliqué : ${res.data.label}`)
    } catch (e) {
      setPromoResult(null)
      toast.error(e.response?.data?.error || 'Code promo invalide')
    } finally {
      setPromoLoading(false)
    }
  }

  // ── Calculs affichage (indicatifs — backend recalcule) ──
  const subtotalUSD  = cartTotal
  const discountUSD  = promoResult?.discountUSD || 0
  const afterPromo   = subtotalUSD - discountUSD
  const feeHTG       = deliveryInfo?.feeHTG || 0
  const feeUSD       = deliveryInfo?.feeUSD || 0
  const totalUSD     = afterPromo  // livraison ajoutée en HTG
  const totalHTGDisplay = Math.round(totalUSD * rate + feeHTG)

  // ── Validation étapes ─────────────────────────
  const canNext = () => {
    if (step === 0) return form.clientName && form.clientPhone
    if (step === 1) return !!form.zone
    if (step === 2) return !!form.paymentMethod
    return false
  }

  // ── Création commande (backend) ───────────────
  const submitOrder = async () => {
    if (!user) { navigate('/login?redirect=/checkout'); return }
    setLoading(true)
    try {
      // Envoyer items au format attendu par le backend
      const itemsPayload = items.map(item => ({
        productId: item.id,
        variantId: item.variantId || null,
        qty:       item.qty,
      }))

      const res = await api.post('/orders', {
        ...form,
        items: itemsPayload,
      })

      setOrder(res.data)
      clear()  // Vider le panier
      setStep(3)

    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la commande')
    } finally {
      setLoading(false)
    }
  }

  // ── Upload preuve virement ────────────────────
  const uploadProof = async () => {
    if (!proofFile || !order) return
    setProofUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', proofFile)
      fd.append('bankName', proofBank)
      fd.append('accountCurrency', proofCurrency)
      fd.append('amountPaid', proofAmount)
      await api.post(`/payments/proof/${order.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Preuve de virement envoyée ! Notre équipe va vérifier.')
      setProofFile(null)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur upload')
    } finally {
      setProofUploading(false)
    }
  }

  // ── Panier vide ───────────────────────────────
  if (items.length === 0 && step < 3) {
    return (
      <main style={{ paddingTop: 90, textAlign: 'center', padding: '120px 24px' }}>
        <div style={{ fontSize: 56 }}>🛒</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', marginTop: 16 }}>Votre panier est vide</h2>
        <p style={{ color: 'var(--muted)', marginTop: 8 }}>Ajoutez des produits avant de procéder au paiement.</p>
        <button className="btn btn-gold" style={{ marginTop: 24 }} onClick={() => navigate('/shop')}>
          Découvrir nos parfums →
        </button>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  return (
    <main style={{ paddingTop: 80, maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px' }}>

      {/* ── Barre de progression ── */}
      <div className="checkout-steps">
        {STEPS.map((s, i) => (
          <div key={i} className={`checkout-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
            <div className="step-dot">{i < step ? '✓' : i + 1}</div>
            <span className="step-label">{s}</span>
            {i < STEPS.length - 1 && <div className="step-line"/>}
          </div>
        ))}
      </div>

      <div className="checkout-body">
        {/* ═══════ ÉTAPE 0 — INFOS CLIENT ═══════ */}
        {step === 0 && (
          <section className="checkout-section fade-up">
            <h2 className="checkout-title">Vos informations</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Nom complet *</label>
                <input className="finput" value={form.clientName}
                       onChange={e => upd('clientName', e.target.value)}
                       placeholder="Jean Dupont" />
              </div>
              <div className="form-group">
                <label>Téléphone *</label>
                <input className="finput" value={form.clientPhone}
                       onChange={e => upd('clientPhone', e.target.value)}
                       placeholder="509-XXXX-XXXX" type="tel" />
              </div>
              <div className="form-group full">
                <label>Adresse de livraison *</label>
                <input className="finput" value={form.clientAddress}
                       onChange={e => upd('clientAddress', e.target.value)}
                       placeholder="Rue, numéro, quartier..." />
              </div>
            </div>

            {/* Choix devise affichage */}
            <div className="currency-choice">
              <label>Afficher les prix en :</label>
              <div className="currency-toggle" style={{ display: 'inline-flex', marginLeft: 12 }}>
                {['USD', 'HTG'].map(c => (
                  <button key={c}
                          className={`cur-btn ${form.currencyDisplay === c ? 'active' : ''}`}
                          onClick={() => upd('currencyDisplay', c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══════ ÉTAPE 1 — LIVRAISON ═══════ */}
        {step === 1 && (
          <section className="checkout-section fade-up">
            <h2 className="checkout-title">Zone de livraison</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
              Livraison disponible dans l'Ouest d'Haïti uniquement.
            </p>

            <div className="zone-grid">
              {zones.map(z => (
                <button key={z.zone}
                        className={`zone-card ${form.zone === z.zone ? 'selected' : ''}`}
                        onClick={() => upd('zone', z.zone)}>
                  <div className="zone-name">{z.zone}</div>
                  <div className="zone-fee">{z.feeHTG.toLocaleString('fr')} HTG</div>
                  <div className="zone-delay">⏱ {z.delayDays} jour{z.delayDays > 1 ? 's' : ''}</div>
                  {form.zone === z.zone && <div className="zone-check">✓</div>}
                </button>
              ))}
            </div>

            {deliveryInfo && (
              <div className="delivery-summary">
                <span>📍 {deliveryInfo.zone}</span>
                <span>+{deliveryInfo.feeHTG.toLocaleString('fr')} HTG</span>
              </div>
            )}

            {/* Code promo */}
            <div className="promo-section">
              <h3>Code promotionnel</h3>
              <div className="promo-row">
                <input className="finput" value={form.promoCode}
                       onChange={e => { upd('promoCode', e.target.value); setPromoResult(null) }}
                       placeholder="Ex: BIENVENUE10"
                       style={{ flex: 1 }} />
                <button className="btn btn-outline"
                        onClick={validatePromo}
                        disabled={promoLoading || !form.promoCode.trim()}>
                  {promoLoading ? '...' : 'Appliquer'}
                </button>
              </div>
              {promoResult && (
                <div className="promo-success">
                  ✅ Code appliqué — Réduction : {fmt(promoResult.discountUSD)}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════ ÉTAPE 2 — PAIEMENT ═══════ */}
        {step === 2 && (
          <section className="checkout-section fade-up">
            <h2 className="checkout-title">Mode de paiement</h2>

            <div className="payment-methods">
              {PAYMENT_METHODS.map(pm => (
                <button key={pm.id}
                        className={`payment-card ${form.paymentMethod === pm.id ? 'selected' : ''}`}
                        onClick={() => upd('paymentMethod', pm.id)}>
                  <span className="pm-icon">{pm.icon}</span>
                  <div className="pm-info">
                    <div className="pm-label">{pm.label}</div>
                    <div className="pm-desc">{pm.desc}</div>
                  </div>
                  {form.paymentMethod === pm.id && <div className="pm-check">✓</div>}
                </button>
              ))}
            </div>

            {/* Infos virement */}
            {form.paymentMethod === 'virement' && (
              <div className="virement-info fade-in">
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                  Effectuez votre virement vers l'un des comptes ci-dessous, puis uploadez votre preuve après confirmation de la commande.
                </p>
                <BankAccounts accounts={bankAccts} />
              </div>
            )}

            {/* Infos MonCash */}
            {form.paymentMethod === 'moncash' && (
              <div className="moncash-info fade-in">
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  📱 Après confirmation, vous recevrez un lien MonCash pour effectuer le paiement de{' '}
                  <strong style={{ color: 'var(--gold)' }}>
                    {Math.round(totalUSD * rate + feeHTG).toLocaleString('fr')} HTG
                  </strong>
                </p>
              </div>
            )}

            {/* Note livraison / shop */}
            {(form.paymentMethod === 'livraison' || form.paymentMethod === 'shop') && (
              <div className="cod-info fade-in">
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  🔖 Un ID unique sera généré pour votre commande. Présentez-le lors du paiement.
                  Montant à payer :{' '}
                  <strong style={{ color: 'var(--gold)' }}>
                    {Math.round(totalUSD * rate + feeHTG).toLocaleString('fr')} HTG
                  </strong>
                </p>
              </div>
            )}

            {/* Notes commande */}
            <div className="form-group" style={{ marginTop: 20 }}>
              <label>Notes (optionnel)</label>
              <textarea className="finput" rows={3} value={form.notes}
                        onChange={e => upd('notes', e.target.value)}
                        placeholder="Instructions spéciales pour la livraison..." />
            </div>

            {/* Résumé total */}
            <div className="order-summary">
              <div className="summary-title">Résumé de commande</div>
              {items.map(item => (
                <div key={`${item.id}-${item.variantId}`} className="summary-row">
                  <span>{item.name} {item.variantLabel ? `(${item.variantLabel})` : ''} ×{item.qty}</span>
                  <span>{form.currencyDisplay === 'HTG'
                    ? `${Math.round(item.price * item.qty * rate).toLocaleString('fr')} HTG`
                    : `$${(item.price * item.qty).toFixed(2)}`
                  }</span>
                </div>
              ))}
              {discountUSD > 0 && (
                <div className="summary-row promo">
                  <span>🎉 Code promo ({form.promoCode})</span>
                  <span>-{form.currencyDisplay === 'HTG'
                    ? `${Math.round(discountUSD * rate).toLocaleString('fr')} HTG`
                    : `$${discountUSD.toFixed(2)}`
                  }</span>
                </div>
              )}
              <div className="summary-row">
                <span>Livraison ({form.zone})</span>
                <span>{feeHTG.toLocaleString('fr')} HTG</span>
              </div>
              <div className="summary-total">
                <span>TOTAL</span>
                <span>
                  {form.currencyDisplay === 'HTG'
                    ? `${totalHTGDisplay.toLocaleString('fr')} HTG`
                    : `$${totalUSD.toFixed(2)} + ${feeHTG.toLocaleString('fr')} HTG`
                  }
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, fontStyle: 'italic' }}>
                * Les prix sont confirmés par notre système. La livraison est en HTG.
              </p>
            </div>
          </section>
        )}

        {/* ═══════ ÉTAPE 3 — CONFIRMATION ═══════ */}
        {step === 3 && order && (
          <section className="checkout-section fade-up" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>
              {order.paymentMethod === 'moncash' ? '📱' :
               order.paymentMethod === 'virement' ? '🏦' : '✅'}
            </div>
            <h2 className="checkout-title">Commande confirmée !</h2>
            <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 15 }}>
              Votre commande <strong style={{ color: 'var(--gold)' }}>{order.orderRef}</strong> a été reçue.
            </p>

            {/* ID shop/livraison */}
            {order.shopId && (
              <div className="shop-id-badge">
                <div className="shop-id-label">Votre identifiant de commande</div>
                <div className="shop-id-value">{order.shopId}</div>
                <div className="shop-id-sub">Présentez ce code lors du paiement</div>
              </div>
            )}

            {/* Instructions MonCash */}
            {order.paymentMethod === 'moncash' && (
              <div className="moncash-instructions">
                <h3>Comment payer via MonCash ?</h3>
                <ol>
                  <li>Ouvrez l'app MonCash sur votre téléphone</li>
                  <li>Allez dans "Paiement marchand"</li>
                  <li>Référencez votre commande : <strong>{order.orderRef}</strong></li>
                  <li>Montant : <strong>{order.totalHTG?.toLocaleString('fr')} HTG</strong></li>
                </ol>
              </div>
            )}

            {/* Upload preuve virement */}
            {order.paymentMethod === 'virement' && (
              <div className="proof-upload fade-in">
                <h3>Uploadez votre preuve de virement</h3>
                <BankAccounts accounts={bankAccts} />

                <div className="upload-form" style={{ marginTop: 20 }}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Banque utilisée</label>
                      <select className="finput" value={proofBank} onChange={e => setProofBank(e.target.value)}>
                        <option value="">Choisir...</option>
                        <option value="SOGEBANK">SOGEBANK</option>
                        <option value="UNIBANK">UNIBANK</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Devise du compte</label>
                      <select className="finput" value={proofCurrency} onChange={e => setProofCurrency(e.target.value)}>
                        <option value="HTG">HTG</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div className="form-group full">
                      <label>Montant viré</label>
                      <input className="finput" type="number" value={proofAmount}
                             onChange={e => setProofAmount(e.target.value)}
                             placeholder="Ex: 10200" />
                    </div>
                  </div>

                  <div className="file-upload-zone"
                       onClick={() => document.getElementById('proof-file').click()}>
                    <input id="proof-file" type="file" accept=".pdf,.jpg,.jpeg,.png"
                           style={{ display: 'none' }}
                           onChange={e => setProofFile(e.target.files[0])} />
                    {proofFile
                      ? <><div style={{ fontSize: 28 }}>📎</div><div>{proofFile.name}</div></>
                      : <><div style={{ fontSize: 28 }}>⬆️</div><div>Cliquez pour uploader (PDF ou image)</div></>
                    }
                  </div>

                  <button className="btn btn-gold" style={{ marginTop: 16, width: '100%' }}
                          onClick={uploadProof}
                          disabled={!proofFile || proofUploading}>
                    {proofUploading ? 'Envoi en cours...' : 'Envoyer la preuve de virement'}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
              <button className="btn btn-outline"
                      onClick={() => navigate(`/track/${order.orderRef}`)}>
                📍 Suivre ma commande
              </button>
              <button className="btn btn-gold"
                      onClick={() => navigate('/shop')}>
                Continuer mes achats →
              </button>
            </div>
          </section>
        )}

        {/* ── Navigation étapes ── */}
        {step < 3 && (
          <div className="checkout-nav">
            {step > 0 && (
              <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
                ← Retour
              </button>
            )}
            {step < 2 ? (
              <button className="btn btn-gold"
                      disabled={!canNext()}
                      onClick={() => setStep(s => s + 1)}>
                Continuer →
              </button>
            ) : (
              <button className="btn btn-gold"
                      disabled={!canNext() || loading}
                      onClick={submitOrder}>
                {loading ? 'Création en cours...' : '✓ Confirmer la commande'}
              </button>
            )}
          </div>
        )}
      </div>

    </main>
  )
}

/* ── CSS à ajouter dans index.css ──────────────────────────────────────────

.checkout-steps{
  display:flex;align-items:center;justify-content:center;gap:0;
  margin-bottom:40px;padding:0 16px;
}
.checkout-step{display:flex;align-items:center;gap:8px;}
.step-dot{
  width:28px;height:28px;border-radius:50%;
  background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);
  color:var(--muted);font-size:12px;font-weight:700;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:all .2s;
}
.checkout-step.active .step-dot{background:var(--gold);color:var(--black);border-color:var(--gold);}
.checkout-step.done .step-dot{background:var(--gold);color:var(--black);}
.step-label{font-size:12px;color:var(--muted);white-space:nowrap;}
.checkout-step.active .step-label{color:var(--gold);}
.step-line{width:40px;height:1px;background:rgba(201,168,76,.2);margin:0 4px;}
@media(max-width:500px){.step-label{display:none;}.step-line{width:20px;}}

.checkout-section{max-width:600px;margin:0 auto;}
.checkout-title{
  font-family:var(--font-serif);font-size:clamp(20px,3vw,28px);
  margin-bottom:24px;color:var(--text);
}

.zone-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;}
.zone-card{
  position:relative;padding:16px;background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.08);text-align:left;cursor:pointer;
  transition:all .2s;display:flex;flex-direction:column;gap:4px;
}
.zone-card:hover{border-color:rgba(201,168,76,.4);background:rgba(201,168,76,.05);}
.zone-card.selected{border-color:var(--gold);background:rgba(201,168,76,.08);}
.zone-name{font-weight:600;font-size:14px;}
.zone-fee{color:var(--gold);font-size:15px;font-weight:700;}
.zone-delay{color:var(--muted);font-size:12px;}
.zone-check{
  position:absolute;top:8px;right:8px;width:20px;height:20px;
  background:var(--gold);color:var(--black);
  display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;
}

.payment-methods{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;}
.payment-card{
  position:relative;padding:14px 16px;background:rgba(255,255,255,.03);
  border:1px solid rgba(255,255,255,.08);text-align:left;cursor:pointer;
  transition:all .2s;display:flex;align-items:center;gap:14px;
}
.payment-card:hover{border-color:rgba(201,168,76,.4);}
.payment-card.selected{border-color:var(--gold);background:rgba(201,168,76,.06);}
.pm-icon{font-size:22px;flex-shrink:0;}
.pm-label{font-weight:600;font-size:14px;}
.pm-desc{color:var(--muted);font-size:12px;}
.pm-check{
  position:absolute;right:12px;width:22px;height:22px;
  background:var(--gold);color:var(--black);
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;
}

.order-summary{
  background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.15);
  padding:20px;margin-top:24px;
}
.summary-title{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:14px;}
.summary-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px;
}
.summary-row.promo{color:#10B981;}
.summary-total{
  display:flex;justify-content:space-between;align-items:center;
  padding:12px 0 6px;font-weight:700;font-size:15px;color:var(--gold);
}

.promo-section{margin-top:24px;}
.promo-section h3{font-size:13px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px;}
.promo-row{display:flex;gap:10px;}
.promo-success{color:#10B981;font-size:13px;margin-top:8px;}

.delivery-summary{
  display:flex;justify-content:space-between;
  background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.2);
  padding:10px 14px;font-size:13px;margin-bottom:24px;
}

.bank-accounts{display:flex;flex-direction:column;gap:10px;}
.bank-card{
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
  padding:14px;
}
.bank-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.bank-name{font-weight:700;font-size:13px;}
.currency-badge{
  padding:2px 8px;font-size:10px;font-weight:700;letter-spacing:1px;
}
.currency-badge.usd{background:rgba(16,185,129,.15);color:#10B981;}
.currency-badge.htg{background:rgba(201,168,76,.15);color:var(--gold);}
.bank-detail{display:flex;gap:8px;font-size:12px;margin-top:4px;}
.bank-label{color:var(--muted);}
.bank-value{color:var(--text);}
.bank-value.acct{font-family:monospace;letter-spacing:1px;color:var(--gold);}
.bank-note{color:var(--muted);font-size:11px;margin-top:10px;font-style:italic;}

.file-upload-zone{
  border:1px dashed rgba(201,168,76,.3);padding:24px;text-align:center;
  cursor:pointer;color:var(--muted);font-size:13px;margin-top:12px;
  transition:all .2s;
}
.file-upload-zone:hover{border-color:var(--gold);color:var(--text);}

.shop-id-badge{
  background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.3);
  padding:20px;margin:24px auto;max-width:280px;
}
.shop-id-label{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);}
.shop-id-value{font-size:28px;font-weight:700;color:var(--gold);letter-spacing:4px;margin:8px 0;}
.shop-id-sub{font-size:12px;color:var(--muted);}

.checkout-nav{
  display:flex;justify-content:space-between;align-items:center;
  margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);
}

.moncash-instructions{
  background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.2);
  padding:20px;margin-top:20px;text-align:left;max-width:400px;margin-inline:auto;
}
.moncash-instructions h3{font-size:13px;font-weight:700;margin-bottom:10px;}
.moncash-instructions ol{padding-left:16px;color:var(--muted);font-size:13px;line-height:1.8;}

*/
