import React, { useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { Btn, Badge, Card, CardHead, CardBody, Table, Modal, FGroup, FormGrid, Input, Select, Textarea, toast, PageHeader, IconBtn, useConfirm } from '../components/UI'

// ── UTILISATEURS ───────────────────────────────────
export function Users() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({})
  const [resetInfo, setResetInfo] = useState(null)
  const { user: me }          = useAuth()
  const { confirm, ConfirmDialog } = useConfirm()

  const load = useCallback(async () => { setLoading(true); setUsers((await api.get('/users')).data); setLoading(false) }, [])
  useEffect(() => { load() }, [load])

  const openNew  = () => { setEditing(null); setForm({role:'Vendeur',active:true}); setModal(true) }
  const openEdit = u  => { setEditing(u); setForm({...u,password:''}); setModal(true) }

  const save = async () => {
    if (!form.name?.trim()||!form.email?.trim()) { toast('Nom et email requis','e'); return }
    if (!editing&&!form.password) { toast('Mot de passe requis','e'); return }
    if (form.password&&form.password.length<6) { toast('Minimum 6 caractères','e'); return }
    setSaving(true)
    try {
      const d = {...form}; if (!d.password) delete d.password
      if (editing) await api.put(`/users/${editing.id}`, d)
      else         await api.post('/users', d)
      toast(editing?'Utilisateur mis à jour':'Utilisateur créé !'); setModal(false); load()
    } catch(e) { toast(e.response?.data?.error||'Erreur','e') }
    finally { setSaving(false) }
  }

  const resetPw = async u => {
    if (!await confirm(`Réinitialiser le mot de passe de ${u.name} ?`)) return
    try {
      const r = await api.post(`/users/${u.id}/reset-password`)
      setResetInfo({name:u.name, temp:r.data.tempPassword})
      toast(`Mot de passe réinitialisé pour ${u.name}`)
    } catch(e) { toast(e.response?.data?.error||'Erreur','e') }
  }

  const toggleActive = async u => {
    if (!await confirm(`${u.active?'Désactiver':'Activer'} le compte de ${u.name} ?`)) return
    try {
      const r = await api.post(`/users/${u.id}/toggle-active`)
      toast(`Compte ${r.data.active?'activé':'désactivé'}`); load()
    } catch(e) { toast(e.response?.data?.error||'Erreur','e') }
  }

  const del = async u => {
    if (u.id===me?.id) { toast('Impossible de supprimer votre propre compte','e'); return }
    if (!await confirm(`Supprimer définitivement ${u.name} ?`)) return
    await api.delete(`/users/${u.id}`); toast('Utilisateur supprimé','i'); load()
  }

  const roleColor = {Admin:'cyan',Vendeur:'green',Comptable:'purple'}

  return (
    <div className="fade-up">
      <PageHeader title="Utilisateurs" sub={`${users.length} utilisateur(s)`}
        actions={<Btn onClick={openNew}>+ Nouvel utilisateur</Btn>}/>

      {/* Reset password info */}
      {resetInfo && (
        <div style={{background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.3)',borderRadius:12,padding:'16px 20px',marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:14,color:'#F59E0B',marginBottom:8}}>🔑 Mot de passe temporaire généré</div>
          <div style={{fontSize:13,color:'#8892B0',marginBottom:6}}>Utilisateur : <strong style={{color:'#EEF0F8'}}>{resetInfo.name}</strong></div>
          <div style={{fontSize:13,color:'#8892B0',marginBottom:12}}>
            Mot de passe temporaire :&nbsp;
            <strong style={{color:'#F59E0B',fontSize:18,fontFamily:'monospace',letterSpacing:2}}>{resetInfo.temp}</strong>
          </div>
          <div style={{fontSize:12,color:'#50566E',marginBottom:12}}>⚠️ Communiquez ce mot de passe à l'utilisateur. Il devra le changer à sa prochaine connexion.</div>
          <Btn variant="ghost" size="sm" onClick={()=>setResetInfo(null)}>Fermer</Btn>
        </div>
      )}

      <Card>
        <Table loading={loading} empty="Aucun utilisateur" data={users}
          cols={[
            {label:'#', render:r=><span style={{color:'#50566E',fontSize:11}}>#{r.id}</span>},
            {label:'Utilisateur', render:r=>(
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,minWidth:34,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#8B5CF6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff'}}>{r.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{fontWeight:600}}>{r.name}</div>
                  <div style={{fontSize:11,color:'#00D9FF'}}>{r.email}</div>
                  {r.phone && <div style={{fontSize:11,color:'#50566E'}}>{r.phone}</div>}
                </div>
              </div>
            )},
            {label:'Rôle', render:r=><Badge color={roleColor[r.role]||'gray'}>{r.role}</Badge>},
            {label:'Statut', render:r=>(
              <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                {r.active?<Badge color="green" dot>Actif</Badge>:<Badge color="red" dot>Inactif</Badge>}
                {r.forcePasswordChange && <Badge color="gold">Doit changer MDP</Badge>}
              </div>
            )},
            {label:'Créé le', render:r=><span style={{color:'#50566E',fontSize:11}}>{r.createdAt}</span>},
            {label:'Actions', render:r=>(
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                <IconBtn icon="✏" title="Modifier" onClick={()=>openEdit(r)}/>
                <IconBtn icon="🔑" title="Réinitialiser MDP" onClick={()=>resetPw(r)}/>
                {r.id!==me?.id && <IconBtn icon={r.active?'🔒':'🔓'} title={r.active?'Désactiver':'Activer'} onClick={()=>toggleActive(r)}/>}
                {r.id!==me?.id && <IconBtn icon="🗑" danger title="Supprimer" onClick={()=>del(r)}/>}
              </div>
            )},
          ]}
        />
      </Card>

      <Modal open={modal} title={editing?'Modifier utilisateur':'Nouvel utilisateur'}
        onClose={()=>setModal(false)} onConfirm={save} confirmLabel={editing?'Enregistrer':'Créer'} loading={saving}>
        <FormGrid cols={2}>
          <FGroup label="Nom complet *" col={2}><Input value={form.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></FGroup>
          <FGroup label="Email *"><Input type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@dealpam.com"/></FGroup>
          <FGroup label="Téléphone"><Input value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+509 XXXX-XXXX"/></FGroup>
          <FGroup label={editing?'Nouveau MDP (vide = inchangé)':'Mot de passe *'} col={2}>
            <Input type="password" value={form.password||''} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={editing?'Laisser vide pour conserver':'Min. 6 caractères'}/>
          </FGroup>
          <FGroup label="Rôle">
            <Select value={form.role||'Vendeur'} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
              {['Admin','Vendeur','Comptable'].map(r=><option key={r}>{r}</option>)}
            </Select>
          </FGroup>
          {editing && <FGroup label="Statut">
            <Select value={form.active?'1':'0'} onChange={e=>setForm(f=>({...f,active:e.target.value==='1'}))}>
              <option value="1">Actif</option><option value="0">Inactif</option>
            </Select>
          </FGroup>}
        </FormGrid>
      </Modal>
      <ConfirmDialog/>
    </div>
  )
}

// ── PARAMÈTRES ─────────────────────────────────────
export function Settings() {
  const [settings, setSettings] = useState(null)
  const [form, setForm]         = useState({})
  const [pw, setPw]             = useState({cur:'',new:'',conf:''})
  const [savingS, setSavingS]   = useState(false)
  const [savingP, setSavingP]   = useState(false)
  const { setRate }             = useCurrency()

  useEffect(() => {
    api.get('/settings').then(r=>{ setSettings(r.data); setForm(r.data) })
  }, [])

  const saveS = async () => {
    setSavingS(true)
    try {
      await api.put('/settings', form)
      setSettings(form); setRate(form.exchangeRate||136)
      toast('Paramètres sauvegardés !')
    } catch { toast('Erreur','e') }
    finally { setSavingS(false) }
  }

  const savePw = async () => {
    if (!pw.cur||!pw.new) { toast('Remplissez tous les champs','e'); return }
    if (pw.new!==pw.conf) { toast('Les mots de passe ne correspondent pas','e'); return }
    if (pw.new.length<6)  { toast('Minimum 6 caractères','e'); return }
    setSavingP(true)
    try {
      await api.post('/auth/change-password',{currentPassword:pw.cur,newPassword:pw.new})
      toast('Mot de passe changé !'); setPw({cur:'',new:'',conf:''})
    } catch(e) { toast(e.response?.data?.error||'Erreur','e') }
    finally { setSavingP(false) }
  }

  if (!settings) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'60px 0',gap:12,color:'#50566E'}}><div style={{width:20,height:20,borderRadius:'50%',border:'2px solid rgba(0,217,255,.2)',borderTopColor:'#00D9FF',animation:'spin .7s linear infinite'}}/> Chargement...</div>

  return (
    <div className="fade-up">
      <PageHeader title="Paramètres" sub="Configuration de DEALPAM"/>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14,marginBottom:14}}>
        <Card>
          <CardHead title="Informations générales"/>
          <CardBody>
            <FormGrid cols={1}>
              <FGroup label="Nom de l'entreprise"><Input value={form.companyName||''} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))}/></FGroup>
              <FGroup label="Taux de change HTG/USD">
                <div style={{position:'relative'}}>
                  <Input type="number" step=".5" min={1} value={form.exchangeRate||136} onChange={e=>setForm(f=>({...f,exchangeRate:parseFloat(e.target.value)||136}))}/>
                  <span style={{position:'absolute',right:13,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'#50566E',pointerEvents:'none'}}>HTG/USD</span>
                </div>
              </FGroup>
              <FGroup label="Devise principale">
                <Select value={form.currency||'USD'} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  {['USD','HTG','EUR','CAD'].map(c=><option key={c}>{c}</option>)}
                </Select>
              </FGroup>
              <FGroup label="Adresse"><Input value={form.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></FGroup>
              <FGroup label="Téléphone"><Input value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></FGroup>
              <FGroup label="Email entreprise"><Input type="email" value={form.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></FGroup>
              <Btn onClick={saveS} loading={savingS}>Enregistrer les paramètres</Btn>
            </FormGrid>
          </CardBody>
        </Card>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <Card>
            <CardHead title="Changer mon mot de passe"/>
            <CardBody>
              <FormGrid cols={1}>
                <FGroup label="Mot de passe actuel"><Input type="password" value={pw.cur} onChange={e=>setPw(p=>({...p,cur:e.target.value}))}/></FGroup>
                <FGroup label="Nouveau mot de passe"><Input type="password" value={pw.new} onChange={e=>setPw(p=>({...p,new:e.target.value}))} placeholder="Min. 6 caractères"/></FGroup>
                <FGroup label="Confirmer le nouveau MDP"><Input type="password" value={pw.conf} onChange={e=>setPw(p=>({...p,conf:e.target.value}))}/></FGroup>
                <Btn onClick={savePw} loading={savingP}>Changer le mot de passe</Btn>
              </FormGrid>
            </CardBody>
          </Card>

          <Card>
            <CardHead title="À propos"/>
            <CardBody>
              <div style={{lineHeight:1.8,fontSize:13,color:'#8892B0'}}>
                <div style={{fontSize:20,fontWeight:800,marginBottom:8,fontFamily:'var(--fd)',background:'linear-gradient(135deg,#00D9FF,#8B5CF6)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>DEALPAM v4.0</div>
                <p>Plateforme de gestion professionnelle</p>
                <p style={{marginTop:4}}>Stack : <strong style={{color:'#EEF0F8'}}>React + Flask + SQLite</strong></p>
                <p style={{marginTop:4}}>Taux actuel : <strong style={{color:'#00D9FF'}}>{settings.exchangeRate} HTG/USD</strong></p>
                <p style={{marginTop:8,fontSize:11,color:'#50566E'}}>API → port 8000 · App → port 3000</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
