import React, { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { useCurrency } from '../context/CurrencyContext'
import { useAuth } from '../context/AuthContext'
import { Btn, Badge, Card, Table, Modal, FGroup, FormGrid, Input, Select, Textarea, toast, PageHeader, SearchInput, IconBtn, StatRow, TotalBox, useConfirm } from '../components/UI'

const PAY_METHODS = ['Cash','MoCash','Carte bancaire','Virement','Crédit']
const today = () => new Date().toISOString().slice(0,10)

// ── VENTES ─────────────────────────────────────────
export function Sales() {
  const [sales, setSales]       = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({date:today(),qty:1,paymentMethod:'Cash'})
  const { fmt, rate, cur }      = useCurrency()
  const { can }                 = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    const [s,p,c] = await Promise.all([api.get('/sales'),api.get('/products'),api.get('/clients')])
    setSales(s.data); setProducts(p.data); setClients(c.data); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = sales
    .filter(s=>!search||(s.clientName||'').toLowerCase().includes(search.toLowerCase())||(s.productName||'').toLowerCase().includes(search.toLowerCase()))
    .filter(s=>!statusF||(statusF==='paid'?s.paidUSD>=s.totalUSD:s.paidUSD<s.totalUSD))

  const totalCA   = filtered.reduce((a,s)=>a+(s.totalUSD||0),0)
  const totalPaid = filtered.reduce((a,s)=>a+(s.paidUSD||0),0)
  const totalBal  = totalCA - totalPaid

  const setP = (pid) => {
    const p = products.find(x=>x.id===parseInt(pid))
    if (p) setForm(f=>({...f,productId:p.id,productName:p.name,unitPrice:p.price,totalUSD:p.price*(f.qty||1),paidUSD:p.price*(f.qty||1)}))
  }
  const setQ = q => { const n=parseInt(q)||1; setForm(f=>({...f,qty:n,totalUSD:(f.unitPrice||0)*n,paidUSD:(f.unitPrice||0)*n})) }

  const openNew  = () => { setEditing(null); setForm({date:today(),qty:1,paymentMethod:'Cash'}); setModal(true) }
  const openEdit = s => { setEditing(s); setForm({...s}); setModal(true) }

  const save = async () => {
    if (!form.productId||!form.date) { toast('Produit et date requis','e'); return }
    setSaving(true)
    try {
      const payload = {...form}
      if (form.clientId) { const c=clients.find(x=>x.id===parseInt(form.clientId)); if(c) payload.clientName=c.name }
      if (!payload.clientName) payload.clientName='Client direct'
      if (editing) await api.put(`/sales/${editing.id}`, payload)
      else         await api.post('/sales', payload)
      toast(editing?'Vente mise à jour':'Vente enregistrée !'); setModal(false); load()
    } catch(e) { toast(e.response?.data?.error||'Erreur','e') }
    finally { setSaving(false) }
  }

  const del = async s => {
    if (!await confirm(`Supprimer la vente de ${s.clientName} ?`)) return
    await api.delete(`/sales/${s.id}`); toast('Vente supprimée','i'); load()
  }

  const total     = form.totalUSD || (form.unitPrice||0)*(form.qty||1)
  const totalHTG  = Math.round(total * rate)

  return (
    <div className="fade-up">
      <PageHeader title="Ventes" sub={`${sales.length} vente(s) enregistrée(s)`}
        actions={<>
          <SearchInput value={search} onChange={setSearch}/>
          <Select value={statusF} onChange={e=>setStatusF(e.target.value)} style={{width:135}}>
            <option value="">Tous statuts</option>
            <option value="paid">Payées</option>
            <option value="due">Solde dû</option>
          </Select>
          <Btn onClick={openNew}>+ Nouvelle vente</Btn>
        </>}
      />

      <StatRow stats={[
        {label:'CA Total',    value:fmt(totalCA),   sub:cur==='USD'?`${Math.round(totalCA*rate).toLocaleString('fr')} HTG`:null},
        {label:'Encaissé',    value:fmt(totalPaid), color:'#34D399'},
        {label:'Balance dûe', value:fmt(totalBal),  color:totalBal>0.01?'#F87171':'#34D399'},
        {label:'Transactions',value:filtered.length},
      ]}/>

      <Card>
        <Table loading={loading} empty="Aucune vente" data={filtered}
          cols={[
            {label:'Date',      render:r=><span style={{color:'#8892B0',fontSize:12,whiteSpace:'nowrap'}}>{r.date}</span>},
            {label:'Client',    render:r=><span style={{fontWeight:600}}>{r.clientName}</span>},
            {label:'Produit',   render:r=><span style={{color:'#8892B0',fontSize:12}}>{r.productName}</span>},
            {label:'Qté',       render:r=><span style={{color:'#00D9FF',fontWeight:700}}>{r.qty}</span>},
            {label:`Prix (${cur})`, render:r=>(
              <div>
                <div style={{fontWeight:600}}>{fmt(r.unitPrice)}</div>
                {cur==='USD' && <div style={{fontSize:10,color:'#50566E'}}>{(r.unitPriceHTG||0).toLocaleString('fr')} HTG</div>}
              </div>
            )},
            {label:`Total (${cur})`, render:r=>(
              <div>
                <div style={{fontWeight:700,color:'#EEF0F8'}}>{fmt(r.totalUSD)}</div>
                {cur==='USD' && <div style={{fontSize:10,color:'#50566E'}}>{(r.totalHTG||0).toLocaleString('fr')} HTG</div>}
              </div>
            )},
            {label:`Payé`,     render:r=><span style={{color:'#34D399',fontWeight:600}}>{fmt(r.paidUSD)}</span>},
            {label:'Balance',  render:r=>(r.balanceUSD||0)>0.01?<span style={{color:'#F87171',fontWeight:700}}>{fmt(r.balanceUSD)}</span>:<span style={{color:'#34D399'}}>—</span>},
            {label:'Mode',     render:r=><Badge color="gray">{r.paymentMethod}</Badge>},
            {label:'Statut',   render:r=>r.paidUSD>=r.totalUSD?<Badge color="green" dot>Payé</Badge>:r.paidUSD>0?<Badge color="gold" dot>Partiel</Badge>:<Badge color="red" dot>Impayé</Badge>},
            {label:'',         render:r=>(
              <div style={{display:'flex',gap:5}}>
                <IconBtn icon="✏" onClick={()=>openEdit(r)}/>
                {can('Admin')&&<IconBtn icon="🗑" danger onClick={()=>del(r)}/>}
              </div>
            )},
          ]}
        />
      </Card>

      <Modal open={modal} title={editing?'Modifier la vente':'Nouvelle vente'}
        onClose={()=>setModal(false)} onConfirm={save} confirmLabel={editing?'Enregistrer':'Enregistrer la vente'} loading={saving} wide>
        <FormGrid cols={2}>
          <FGroup label="Date *"><Input type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></FGroup>
          <FGroup label="Produit *">
            <Select value={form.productId||''} onChange={e=>setP(e.target.value)}>
              <option value="">— Sélectionner un produit —</option>
              {products.map(p=><option key={p.id} value={p.id}>{p.name} · {fmt(p.price,true)} (stock: {p.qty})</option>)}
            </Select>
          </FGroup>
          <FGroup label="Client">
            <Select value={form.clientId||''} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))}>
              <option value="">Client direct / Anonyme</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FGroup>
          <FGroup label="Quantité"><Input type="number" min={1} value={form.qty||1} onChange={e=>setQ(e.target.value)}/></FGroup>
          <FGroup label="Prix unitaire (USD)">
            <Input type="number" step=".01" min={0} value={form.unitPrice||''} onChange={e=>{const v=parseFloat(e.target.value)||0;setForm(f=>({...f,unitPrice:v,totalUSD:v*(f.qty||1),paidUSD:v*(f.qty||1)}))}}/>
          </FGroup>
          <FGroup label="Prix unitaire (HTG)">
            <Input type="number" step="1" min={0} value={form.unitPrice?Math.round(form.unitPrice*rate):''} onChange={e=>{const v=parseFloat(e.target.value)||0;const usd=parseFloat((v/rate).toFixed(2));setForm(f=>({...f,unitPrice:usd,totalUSD:usd*(f.qty||1),paidUSD:usd*(f.qty||1)}))}}/>
          </FGroup>
          <FGroup label="Total USD">
            <Input type="number" step=".01" value={form.totalUSD||''} onChange={e=>setForm(f=>({...f,totalUSD:parseFloat(e.target.value)||0}))} style={{color:'#00D9FF',fontWeight:700}}/>
          </FGroup>
          <FGroup label="Total HTG (calculé)">
            <Input type="number" disabled value={form.totalUSD?Math.round(form.totalUSD*rate):''} style={{color:'#F59E0B',opacity:.8}}/>
          </FGroup>
          <FGroup label="Montant payé (USD)">
            <Input type="number" step=".01" min={0} value={form.paidUSD||''} onChange={e=>setForm(f=>({...f,paidUSD:parseFloat(e.target.value)||0}))}/>
          </FGroup>
          <FGroup label="Mode de paiement">
            <Select value={form.paymentMethod||'Cash'} onChange={e=>setForm(f=>({...f,paymentMethod:e.target.value}))}>
              {PAY_METHODS.map(m=><option key={m}>{m}</option>)}
            </Select>
          </FGroup>
          <FGroup label="Notes" col={2}><Textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></FGroup>
          {(form.totalUSD||0) > 0 && (
            <div style={{gridColumn:'1/-1',background:'rgba(0,217,255,.06)',border:'1px solid rgba(0,217,255,.15)',borderRadius:10,padding:'13px 16px',display:'flex',gap:24,flexWrap:'wrap'}}>
              <div><div style={{fontSize:10,color:'#00D9FF',fontWeight:700,marginBottom:2}}>TOTAL USD</div><div style={{fontSize:17,fontWeight:800,color:'#00D9FF'}}>${(form.totalUSD||0).toFixed(2)}</div></div>
              <div><div style={{fontSize:10,color:'#F59E0B',fontWeight:700,marginBottom:2}}>TOTAL HTG</div><div style={{fontSize:17,fontWeight:800,color:'#F59E0B'}}>{Math.round((form.totalUSD||0)*rate).toLocaleString('fr')} HTG</div></div>
              <div><div style={{fontSize:10,color:((form.totalUSD||0)-(form.paidUSD||0))>0.01?'#F87171':'#34D399',fontWeight:700,marginBottom:2}}>BALANCE</div><div style={{fontSize:17,fontWeight:800,color:((form.totalUSD||0)-(form.paidUSD||0))>0.01?'#F87171':'#34D399'}}>${((form.totalUSD||0)-(form.paidUSD||0)).toFixed(2)}</div></div>
            </div>
          )}
        </FormGrid>
      </Modal>
      <ConfirmDialog/>
    </div>
  )
}

// ── CLIENTS ────────────────────────────────────────
export function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({country:'Haïti'})
  const { fmt, rate, cur }    = useCurrency()
  const { can }               = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()

  const load = useCallback(async () => { setLoading(true); setClients((await api.get('/clients')).data); setLoading(false) }, [])
  useEffect(() => { load() }, [load])

  const filtered = clients.filter(c=>!search||c.name.toLowerCase().includes(search.toLowerCase())||(c.phone||'').includes(search)||(c.email||'').toLowerCase().includes(search.toLowerCase())||(c.city||'').toLowerCase().includes(search.toLowerCase()))

  const openNew  = () => { setEditing(null); setForm({country:'Haïti'}); setModal(true) }
  const openEdit = c => { setEditing(c); setForm({...c}); setModal(true) }

  const save = async () => {
    if (!form.name?.trim()) { toast('Nom requis','e'); return }
    setSaving(true)
    try {
      if (editing) await api.put(`/clients/${editing.id}`, form)
      else         await api.post('/clients', form)
      toast(editing?'Client mis à jour':'Client ajouté !'); setModal(false); load()
    } catch(e) { toast(e.response?.data?.error||'Erreur','e') }
    finally { setSaving(false) }
  }

  const del = async c => {
    if (!await confirm(`Supprimer le client ${c.name} ?`)) return
    await api.delete(`/clients/${c.id}`); toast('Client supprimé','i'); load()
  }

  return (
    <div className="fade-up">
      <PageHeader title="Clients" sub={`${clients.length} client(s) enregistré(s)`}
        actions={<><SearchInput value={search} onChange={setSearch}/><Btn onClick={openNew}>+ Nouveau client</Btn></>}/>
      <Card>
        <Table loading={loading} empty="Aucun client" data={filtered}
          cols={[
            {label:'Client', render:r=>(
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#8B5CF6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff'}}>{r.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{r.name}</div>
                  <div style={{fontSize:11,color:'#50566E'}}>{r.email||r.phone||'—'}</div>
                </div>
              </div>
            )},
            {label:'Téléphone', render:r=><span style={{color:'#00D9FF',fontSize:12}}>{r.phone||'—'}</span>},
            {label:'Ville',     render:r=><span style={{color:'#8892B0',fontSize:12}}>{[r.city,r.country].filter(Boolean).join(', ')||'—'}</span>},
            {label:'Pièce ID',  render:r=>r.idType?<Badge color="purple">{r.idType}: {r.idNumber}</Badge>:null},
            {label:'Ventes',    render:r=><Badge color="gray">{r.totalSales||0}</Badge>},
            {label:`Total (${cur})`, render:r=>(
              <div>
                <div style={{fontWeight:700,color:'#00D9FF'}}>{fmt(r.totalUSD||0)}</div>
                {cur==='USD' && <div style={{fontSize:10,color:'#50566E'}}>{(r.totalHTG||0).toLocaleString('fr')} HTG</div>}
              </div>
            )},
            {label:'Balance',   render:r=>(r.balanceUSD||0)>0.01?<Badge color="red" dot>{fmt(r.balanceUSD)}</Badge>:<Badge color="green" dot>Soldé</Badge>},
            {label:'Depuis',    render:r=><span style={{color:'#50566E',fontSize:11}}>{r.createdAt}</span>},
            {label:'',          render:r=>(
              <div style={{display:'flex',gap:5}}>
                <IconBtn icon="✏" onClick={()=>openEdit(r)}/>
                {can('Admin')&&<IconBtn icon="🗑" danger onClick={()=>del(r)}/>}
              </div>
            )},
          ]}
        />
      </Card>
      <Modal open={modal} title={editing?'Modifier client':'Nouveau client'}
        onClose={()=>setModal(false)} onConfirm={save} confirmLabel={editing?'Enregistrer':'Ajouter'} loading={saving} wide>
        <FormGrid cols={2}>
          <FGroup label="Nom complet *" col={2}><Input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></FGroup>
          <FGroup label="Téléphone"><Input value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="509-XXXX-XXXX"/></FGroup>
          <FGroup label="Email"><Input type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></FGroup>
          <FGroup label="Adresse"><Input value={form.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></FGroup>
          <FGroup label="Ville"><Input value={form.city||''} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/></FGroup>
          <FGroup label="Pays">
            <Select value={form.country||'Haïti'} onChange={e=>setForm(f=>({...f,country:e.target.value}))}>
              {['Haïti','République Dominicaine','États-Unis','France','Canada','Autre'].map(c=><option key={c}>{c}</option>)}
            </Select>
          </FGroup>
          <FGroup label="Type de pièce d'identité">
            <Select value={form.idType||''} onChange={e=>setForm(f=>({...f,idType:e.target.value}))}>
              <option value="">— Aucune —</option>
              {['CIN','Passeport','Permis de conduire','NIF','Autre'].map(t=><option key={t}>{t}</option>)}
            </Select>
          </FGroup>
          {form.idType && <FGroup label="Numéro de pièce"><Input value={form.idNumber||''} onChange={e=>setForm(f=>({...f,idNumber:e.target.value}))}/></FGroup>}
          <FGroup label="Notes" col={2}><Textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></FGroup>
        </FormGrid>
      </Modal>
      <ConfirmDialog/>
    </div>
  )
}

// ── DÉPENSES ───────────────────────────────────────
const EXP_CATS = ['Achat Stock','Shipping','Marketing','Loyer','Salaires','Services','Transport','Autre']
const catColor  = {
  'Achat Stock':'cyan','Shipping':'blue','Marketing':'purple','Loyer':'gold',
  'Salaires':'green','Services':'gray','Transport':'gray','Autre':'gray'
}

export function Expenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')
  const [catF, setCatF]         = useState('')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({date:today(),category:'Achat Stock',paymentMethod:'Cash'})
  const { fmt, rate, cur }      = useCurrency()
  const { confirm, ConfirmDialog } = useConfirm()

  const load = useCallback(async () => { setLoading(true); setExpenses((await api.get('/expenses')).data); setLoading(false) }, [])
  useEffect(() => { load() }, [load])

  const filtered = expenses
    .filter(e=>!search||e.description.toLowerCase().includes(search.toLowerCase())||(e.category||'').toLowerCase().includes(search.toLowerCase()))
    .filter(e=>!catF||e.category===catF)

  const total   = filtered.reduce((a,e)=>a+(e.amount||0),0)
  const bycat   = expenses.reduce((a,e)=>({...a,[e.category||'Autre']:(a[e.category||'Autre']||0)+(e.amount||0)}),{})

  const openNew  = () => { setEditing(null); setForm({date:today(),category:'Achat Stock',paymentMethod:'Cash'}); setModal(true) }
  const openEdit = e => { setEditing(e); setForm({...e}); setModal(true) }

  const save = async () => {
    if (!form.description?.trim()||!form.amount) { toast('Description et montant requis','e'); return }
    setSaving(true)
    try {
      if (editing) await api.put(`/expenses/${editing.id}`, form)
      else         await api.post('/expenses', form)
      toast(editing?'Mise à jour':'Dépense ajoutée !'); setModal(false); load()
    } catch(e) { toast(e.response?.data?.error||'Erreur','e') }
    finally { setSaving(false) }
  }

  const del = async e => {
    if (!await confirm(`Supprimer cette dépense ?`)) return
    await api.delete(`/expenses/${e.id}`); toast('Dépense supprimée','i'); load()
  }

  return (
    <div className="fade-up">
      <PageHeader title="Dépenses" sub={`${expenses.length} dépense(s) enregistrée(s)`}
        actions={<>
          <SearchInput value={search} onChange={setSearch}/>
          <Select value={catF} onChange={e=>setCatF(e.target.value)} style={{width:165}}>
            <option value="">Toutes catégories</option>
            {EXP_CATS.map(c=><option key={c}>{c}</option>)}
          </Select>
          <Btn onClick={openNew}>+ Nouvelle dépense</Btn>
        </>}
      />

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:10,marginBottom:16}}>
        <div style={{background:'#111120',border:'1px solid rgba(239,68,68,.2)',borderRadius:11,padding:'13px 15px',gridColumn:'1'}}>
          <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.9px',color:'#F87171',marginBottom:4,fontWeight:700}}>Total Dépenses</div>
          <div style={{fontSize:20,fontWeight:800,color:'#F87171'}}>{fmt(total)}</div>
          {cur==='USD' && <div style={{fontSize:10.5,color:'#50566E',marginTop:2}}>{Math.round(total*rate).toLocaleString('fr')} HTG</div>}
        </div>
        {Object.entries(bycat).slice(0,5).map(([k,v])=>(
          <div key={k} style={{background:'#111120',border:'1px solid rgba(255,255,255,.06)',borderRadius:11,padding:'13px 15px'}}>
            <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.9px',color:'#50566E',marginBottom:4,fontWeight:700}}>{k}</div>
            <div style={{fontSize:16,fontWeight:800}}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      <Card>
        <Table loading={loading} empty="Aucune dépense" data={filtered}
          cols={[
            {label:'Date',        render:r=><span style={{color:'#8892B0',fontSize:12,whiteSpace:'nowrap'}}>{r.date}</span>},
            {label:'Catégorie',   render:r=><Badge color={catColor[r.category]||'gray'}>{r.category}</Badge>},
            {label:'Description', render:r=><span style={{fontWeight:500}}>{r.description}</span>},
            {label:`Montant (${cur})`, render:r=>(
              <div>
                <div style={{fontWeight:700,color:'#F87171'}}>{fmt(r.amount)}</div>
                {cur==='USD' && <div style={{fontSize:10,color:'#50566E'}}>{(r.amountHTG||0).toLocaleString('fr')} HTG</div>}
              </div>
            )},
            {label:'Mode',        render:r=><Badge color="gray">{r.paymentMethod}</Badge>},
            {label:'Notes',       render:r=>r.notes?<span style={{fontSize:11,color:'#8892B0'}}>{r.notes.slice(0,30)}</span>:null},
            {label:'',            render:r=>(
              <div style={{display:'flex',gap:5}}>
                <IconBtn icon="✏" onClick={()=>openEdit(r)}/>
                <IconBtn icon="🗑" danger onClick={()=>del(r)}/>
              </div>
            )},
          ]}
        />
      </Card>

      <Modal open={modal} title={editing?'Modifier dépense':'Nouvelle dépense'}
        onClose={()=>setModal(false)} onConfirm={save} confirmLabel={editing?'Enregistrer':'Ajouter'} loading={saving}>
        <FGroup label="Date *"><Input type="date" value={form.date||today()} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></FGroup>
        <div style={{height:14}}/>
        <FormGrid cols={2}>
          <FGroup label="Catégorie">
            <Select value={form.category||'Autre'} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
              {EXP_CATS.map(c=><option key={c}>{c}</option>)}
            </Select>
          </FGroup>
          <FGroup label="Mode de paiement">
            <Select value={form.paymentMethod||'Cash'} onChange={e=>setForm(f=>({...f,paymentMethod:e.target.value}))}>
              {PAY_METHODS.map(m=><option key={m}>{m}</option>)}
            </Select>
          </FGroup>
        </FormGrid>
        <div style={{height:14}}/>
        <FGroup label="Description *"><Input value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></FGroup>
        <div style={{height:14}}/>
        <FormGrid cols={2}>
          <FGroup label="Montant (USD) *">
            <Input type="number" step=".01" min={0} value={form.amount||''} onChange={e=>setForm(f=>({...f,amount:parseFloat(e.target.value)||0}))}/>
          </FGroup>
          <FGroup label="Équivalent HTG">
            <Input type="number" disabled value={form.amount?Math.round(form.amount*rate):''} style={{opacity:.7,color:'#F59E0B'}}/>
          </FGroup>
        </FormGrid>
        <div style={{height:14}}/>
        <FGroup label="Notes"><Textarea value={form.notes||''} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></FGroup>
      </Modal>
      <ConfirmDialog/>
    </div>
  )
}
