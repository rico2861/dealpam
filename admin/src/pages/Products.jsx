import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import api from '../utils/api'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import {
  Btn, Badge, Card, Table, Modal, FGroup, FormGrid,
  Input, Select, Textarea, toast, PageHeader, SearchInput,
  IconBtn, useConfirm
} from '../components/UI'

const CATS = ['Femme Florale', 'Homme Intense', 'Homme Nuit', 'Oriental', 'Mixte Cuir', 'Femme Gourmand', 'Unisexe', 'Autre']
const CAT_COLOR = {
  'Femme Florale': 'pink',
  'Homme Intense': 'blue',
  'Homme Nuit': 'purple',
  'Oriental': 'gold',
  'Mixte Cuir': 'gray',
  'Femme Gourmand': 'pink',
  'Unisexe': 'cyan',
  'Autre': 'gray'
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [catF, setCatF] = useState('')
  const [view, setView] = useState('grid')
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const { fmt, cur, rate } = useCurrency()
  const { can } = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    const [p, c] = await Promise.all([
      api.get('/products'),
      api.get('/products/categories')
    ])
    setProducts(p.data)
    setCats(c.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = products.filter(p =>
    (!search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())) &&
    (!catF || p.category === catF)
  )

  const openNew = () => {
    setEditing(null)
    setForm({ qty: 0, alertQty: 2, cost: 0, price: 0, active: true })
    setModal(true)
  }

  const openEdit = p => {
    setEditing(p)
    setForm({ ...p })
    setModal(true)
  }

  const save = async () => {
    if (!form.name?.trim()) { toast('Nom du produit requis', 'e'); return }
    setSaving(true)
    try {
      if (editing) await api.put(`/products/${editing.id}`, form)
      else await api.post('/products', form)
      toast(editing ? 'Produit mis à jour' : 'Produit ajouté !')
      setModal(false)
      load()
    } catch (e) {
      toast(e.response?.data?.error || 'Erreur', 'e')
    } finally {
      setSaving(false)
    }
  }

  const del = async p => {
    if (!await confirm(`Supprimer "${p.name}" définitivement ?`)) return
    await api.delete(`/products/${p.id}`)
    toast('Produit supprimé', 'i')
    load()
  }

  const toggleFeatured = async p => {
    await api.put(`/products/${p.id}`, { ...p, featured: !p.featured })
    load()
  }

  const stockBadge = p => {
    if (p.qty === 0) return <Badge color="red" dot>Épuisé</Badge>
    if (p.qty <= p.alertQty) return <Badge color="gold" dot>⚠ {p.qty} restant{p.qty > 1 ? 's' : ''}</Badge>
    return <Badge color="green" dot>{p.qty} en stock</Badge>
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="Produits"
        sub={`${products.length} produit(s) en catalogue`}
        actions={
          <>
            <SearchInput value={search} onChange={setSearch} />
            <Select value={catF} onChange={e => setCatF(e.target.value)} style={{ width: 165 }}>
              <option value="">Toutes catégories</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </Select>
            <div style={{ display: 'flex', background: '#111120', padding: 3, border: '1px solid rgba(255,255,255,.06)', gap: 3 }}>
              {[['grid', '⊞'], ['list', '☰']].map(([k, ic]) => (
                <button key={k} onClick={() => setView(k)} style={{ padding: '5px 10px', border: 'none', background: view === k ? 'rgba(0,217,255,.12)' : 'transparent', color: view === k ? '#00D9FF' : '#8892B0', cursor: 'pointer', fontSize: 14, transition: '.18s' }}>
                  {ic}
                </button>
              ))}
            </div>
            {can('Admin', 'Vendeur') && <Btn onClick={openNew}>+ Nouveau produit</Btn>}
          </>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, color: '#50566E' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(0,217,255,.2)', borderTopColor: '#00D9FF', animation: 'spin .7s linear infinite' }} />
          Chargement...
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14, marginBottom: 18 }}>
          {!filtered.length && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#50566E' }}>
              <div style={{ fontSize: 42, marginBottom: 12, opacity: .2 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Aucun produit trouvé</div>
              {can('Admin', 'Vendeur') && <Btn style={{ marginTop: 14 }} onClick={openNew}>+ Ajouter un produit</Btn>}
            </div>
          )}
          {filtered.map(p => (
            <ProductGridCard
              key={p.id}
              product={p}
              fmt={fmt}
              catColor={CAT_COLOR}
              onView={() => setDetail(p)}
              onEdit={() => openEdit(p)}
              onDel={() => del(p)}
              onFeature={() => toggleFeatured(p)}
              canEdit={can('Admin', 'Vendeur')}
              canDel={can('Admin')}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table
            loading={loading}
            empty="Aucun produit"
            data={filtered}
            cols={[
              {
                label: 'Produit',
                render: r => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, background: '#111120', border: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                      {r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🧴'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                      {r.sku && <div style={{ fontSize: 10, color: '#50566E', fontFamily: 'monospace' }}>{r.sku}</div>}
                    </div>
                  </div>
                )
              },
              { label: 'Catégorie', render: r => <Badge color={CAT_COLOR[r.category] || 'gray'}>{r.category || '—'}</Badge> },
              {
                label: `Prix (${cur})`,
                render: r => (
                  <div>
                    <div style={{ fontWeight: 700, color: '#00D9FF' }}>{fmt(r.price)}</div>
                    <div style={{ fontSize: 10, color: '#50566E' }}>Marge: {r.margin}%</div>
                  </div>
                )
              },
              { label: 'Stock', render: r => stockBadge(r) },
              {
                label: 'Featured',
                render: r => (
                  <button onClick={() => toggleFeatured(r)} style={{ background: r.featured ? 'rgba(245,158,11,.12)' : 'rgba(255,255,255,.06)', border: r.featured ? '1px solid rgba(245,158,11,.3)' : '1px solid rgba(255,255,255,.06)', padding: '3px 10px', color: r.featured ? '#F59E0B' : '#50566E', cursor: 'pointer', fontSize: 12, transition: '.18s' }}>
                    {r.featured ? '★ Featured' : '☆ Non featured'}
                  </button>
                )
              },
              {
                label: '',
                render: r => (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <IconBtn icon="👁" title="Détail" onClick={() => setDetail(r)} />
                    {can('Admin', 'Vendeur') && <IconBtn icon="✏" title="Modifier" onClick={() => openEdit(r)} />}
                    {can('Admin') && <IconBtn icon="🗑" danger title="Supprimer" onClick={() => del(r)} />}
                  </div>
                )
              }
            ]}
          />
        </Card>
      )}

      {detail && (
        <ProductDetailModal
          product={detail}
          fmt={fmt}
          rate={rate}
          cur={cur}
          onClose={() => setDetail(null)}
          onEdit={() => { openEdit(detail); setDetail(null) }}
          canEdit={can('Admin', 'Vendeur')}
        />
      )}

      <Modal
        open={modal}
        title={editing ? `Modifier : ${editing.name}` : 'Nouveau produit'}
        onClose={() => setModal(false)}
        onConfirm={save}
        confirmLabel={editing ? 'Enregistrer' : 'Créer le produit'}
        loading={saving}
        wide
      >
        <FormGrid cols={2}>
          <FGroup label="Nom du produit *" col={2}>
            <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Zara Gardenia" />
          </FGroup>
          <FGroup label="SKU / Référence">
            <Input value={form.sku || ''} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Ex: ZAR-001" />
          </FGroup>
          <FGroup label="Catégorie">
            <Select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </Select>
          </FGroup>
          <FGroup label="Coût d'achat (USD)">
            <Input type="number" step=".01" min={0} value={form.cost || ''} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
          </FGroup>
          <FGroup label="Prix de vente (USD)">
            <Input type="number" step=".01" min={0} value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
          </FGroup>
          <FGroup label="Stock actuel">
            <Input type="number" min={0} value={form.qty ?? 0} onChange={e => setForm(f => ({ ...f, qty: parseInt(e.target.value) || 0 }))} />
          </FGroup>
          <FGroup label="Seuil d'alerte stock">
            <Input type="number" min={0} value={form.alertQty ?? 2} onChange={e => setForm(f => ({ ...f, alertQty: parseInt(e.target.value) || 2 }))} />
          </FGroup>
          <FGroup label="URL image" col={2}>
            <Input value={form.imageUrl || ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
          </FGroup>
          <FGroup label="Description" col={2}>
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du produit..." />
          </FGroup>

          {(form.price || 0) > 0 && (
            <div style={{ gridColumn: '1/-1', background: 'rgba(0,217,255,.06)', border: '1px solid rgba(0,217,255,.15)', padding: '13px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: '#00D9FF', fontWeight: 700, marginBottom: 2 }}>PRIX USD</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#00D9FF' }}>${(form.price || 0).toFixed(2)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700, marginBottom: 2 }}>PRIX HTG</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#F59E0B' }}>{Math.round((form.price || 0) * rate).toLocaleString('fr')} HTG</div>
              </div>
              {(form.cost || 0) > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#10B981', fontWeight: 700, marginBottom: 2 }}>MARGE</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#10B981' }}>{Math.round(((form.price - form.cost) / form.price) * 100)}%</div>
                </div>
              )}
            </div>
          )}

          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { key: 'featured', label: '⭐ Produit Featured', color: '#F59E0B' },
              { key: 'active', label: '✓ Produit actif', color: '#10B981' }
            ].map(({ key, label, color }) => (
              <button key={key} onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))} style={{ padding: '7px 16px', border: `1px solid ${form[key] ? color + '44' : 'rgba(255,255,255,.08)'}`, background: form[key] ? color + '18' : 'rgba(255,255,255,.04)', color: form[key] ? color : '#8892B0', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: '.18s' }}>
                {label}
              </button>
            ))}
          </div>
        </FormGrid>
      </Modal>

      <ConfirmDialog />
    </div>
  )
}

function ProductGridCard({ product: p, fmt, catColor, onView, onEdit, onDel, onFeature, canEdit, canDel }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onView}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden', cursor: 'pointer', transform: hovered ? 'translateY(-2px)' : 'none', borderColor: hovered ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)', boxShadow: hovered ? '0 8px 40px rgba(0,0,0,.5)' : 'none', transition: '.22s' }}
    >
      <div style={{ height: 140, background: '#111120', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
            onMouseEnter={e => { e.target.style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { e.target.style.transform = 'none' }}
          />
        ) : (
          <div style={{ fontSize: 48, opacity: .14 }}>🧴</div>
        )}
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <Badge color={catColor[p.category] || 'gray'}>{p.category || '—'}</Badge>
        </div>
        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
          {p.qty === 0 ? <Badge color="red" dot>Épuisé</Badge> : p.qty <= p.alertQty ? <Badge color="gold" dot>⚠ {p.qty}</Badge> : <Badge color="green" dot>{p.qty}</Badge>}
        </div>
        {p.featured && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(245,158,11,.9)', padding: '2px 8px', fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: '#000', textTransform: 'uppercase' }}>
            ★ FEATURED
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#EEF0F8', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
        {p.sku && <div style={{ fontSize: 10, color: '#50566E', fontFamily: 'monospace', marginBottom: 8 }}>{p.sku}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#00D9FF' }}>{fmt(p.price)}</div>
            <div style={{ fontSize: 10, color: '#50566E' }}>Coût: {fmt(p.cost)} · Marge: {p.margin}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)' }}>
          <IconBtn icon="👁" title="Voir détail" onClick={e => { e.stopPropagation(); onView() }} />
          {canEdit && <IconBtn icon="✏" title="Modifier" onClick={e => { e.stopPropagation(); onEdit() }} />}
          <IconBtn icon={p.featured ? '★' : '☆'} title={p.featured ? 'Retirer du featured' : 'Mettre en featured'} onClick={e => { e.stopPropagation(); onFeature() }} />
          {canDel && <IconBtn icon="🗑" danger title="Supprimer" onClick={e => { e.stopPropagation(); onDel() }} />}
        </div>
      </div>
    </div>
  )
}

// ✅ PORTAL — monté directement sur document.body
// Échappe tout parent avec overflow/transform/filter qui capture le position:fixed
function ProductDetailModal({ product: p, fmt, rate, onClose, onEdit, canEdit }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          background: '#0D0D1A',
          border: '1px solid rgba(255,255,255,.10)',
          boxShadow: '0 30px 80px rgba(0,0,0,.55)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0, background: 'rgba(255,255,255,.01)' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--fd)', fontSize: 16, fontWeight: 700, color: '#EEF0F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </div>
            <div style={{ fontSize: 12, color: '#50566E', marginTop: 4 }}>Détail du produit</div>
          </div>
          <button onClick={onClose} style={{ width: 38, height: 38, flexShrink: 0, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', color: '#AAB3CF', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1.15fr) minmax(260px, .85fr)', gap: 20, alignItems: 'start' }}>
            <div>
              <div style={{ width: '100%', background: '#111120', border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden' }}>
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', maxHeight: '420px', minHeight: '260px', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, opacity: 0.15 }}>🧴</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { l: 'Prix USD', v: fmt(p.price), c: '#00D9FF' },
                  { l: 'Prix HTG', v: `${Math.round(p.price * rate).toLocaleString('fr')} HTG`, c: '#F59E0B' },
                  { l: 'Coût', v: fmt(p.cost), c: '#AAB3CF' },
                  { l: 'Marge', v: `${p.margin}%`, c: '#10B981' },
                  { l: 'Stock', v: `${p.qty} unité${p.qty !== 1 ? 's' : ''}`, c: p.qty === 0 ? '#EF4444' : p.qty <= p.alertQty ? '#F59E0B' : '#10B981' },
                  { l: 'Alerte stock', v: `≤ ${p.alertQty}`, c: '#AAB3CF' }
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: '#111120', border: '1px solid rgba(255,255,255,.06)', padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#50566E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c, lineHeight: 1.2, wordBreak: 'break-word' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#111120', border: '1px solid rgba(255,255,255,.06)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#50566E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Informations</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: p.description ? 12 : 0 }}>
                  {p.category && <Badge color="gray">{p.category}</Badge>}
                  {p.sku && <Badge color="gray">SKU: {p.sku}</Badge>}
                  {p.featured && <Badge color="gold">★ Featured</Badge>}
                  {!p.active && <Badge color="red">Inactif</Badge>}
                </div>
                {p.description ? (
                  <p style={{ fontSize: 13, color: '#8892B0', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>{p.description}</p>
                ) : (
                  <p style={{ fontSize: 13, color: '#50566E', lineHeight: 1.7, margin: 0 }}>Aucune description disponible.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: 'rgba(255,255,255,.01)' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', color: '#8892B0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Fermer
          </button>
          {canEdit && (
            <button onClick={onEdit} style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#00D9FF,#8B5CF6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              ✏ Modifier
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}