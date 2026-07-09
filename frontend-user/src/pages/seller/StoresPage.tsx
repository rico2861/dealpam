import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Grid,
  Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import {
  Add, Edit, Delete, Star, Inventory2Outlined, ShoppingBagOutlined, Verified,
  ContentCopy, OpenInNew, StorefrontOutlined, LocationOnOutlined, ArrowForward,
  PhoneOutlined, LocalShippingOutlined, AccountBalanceWalletOutlined,
  PlaceOutlined, Close, AccessTimeOutlined,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { StoreCardSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
const GRN  = '#10B981';
const RED  = '#EF4444';
const BLU  = '#3B82F6';

const DEPTS = ['Ouest','Nord','Nord-Est','Nord-Ouest','Sud','Sud-Est','Grand-Anse','Nippes','Centre','Artibonite'];
const PAYMENT_OPTS = ['MONCASH','NATCASH','CASH','BANK_TRANSFER','OTHER'];
const PAYMENT_LABELS: Record<string,string> = { MONCASH:'MonCash', NATCASH:'NatCash', CASH:'Espèces', BANK_TRANSFER:'Virement', OTHER:'Autre' };

const CITIES: Record<string, string[]> = {
  'Ouest':      ['Port-au-Prince','Pétion-Ville','Carrefour','Delmas','Cité Soleil','Croix-des-Bouquets','Tabarre','Kenscoff','Gressier','Léogâne','Arcahaie'],
  'Nord':       ['Cap-Haïtien','Limbé','Plaisance','Limonade','Milot','Acul-du-Nord','Grande Rivière du Nord','Borgne','Saint-Raphaël','Quartier Morin'],
  'Nord-Est':   ['Fort-Liberté','Ouanaminthe','Trou-du-Nord','Ferrier','Caracol','Terrier Rouge','Sainte-Suzanne'],
  'Nord-Ouest': ['Port-de-Paix','Saint-Louis du Nord','Môle Saint-Nicolas','Anse-à-Foleur','Baie de Henne','Jean-Rabel'],
  'Sud':        ['Les Cayes','Camp-Perrin','Aquin','Chardonnières','Port-Salut','Saint-Louis du Sud','Île-à-Vache','Torbeck'],
  'Sud-Est':    ['Jacmel','Marigot','Bainet','Belle-Anse','Thiotte','Grand Gosier','Cayes-Jacmel'],
  'Grand-Anse': ['Jérémie','Beaumont','Chambellan','Corail','Pestel','Moron','Roseaux','Bonbon'],
  'Nippes':     ['Miragoâne','Petite Rivière de Nippes','Anse-à-Veau','Arnaud','Barradères','Grand Boucan','L\'Asile'],
  'Centre':     ['Hinche','Mirebalais','Lascahobas','Belladère','Boucan Carré','Savanette','Cerca Carvajal'],
  'Artibonite': ['Gonaïves','Saint-Marc','Dessalines','Grande Saline','Marchand-Dessalines','Ennery','Gros Morne','Port-de-Paix'],
};

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Lundi' },
  { key: 'tue', label: 'Mardi' },
  { key: 'wed', label: 'Mercredi' },
  { key: 'thu', label: 'Jeudi' },
  { key: 'fri', label: 'Vendredi' },
  { key: 'sat', label: 'Samedi' },
  { key: 'sun', label: 'Dimanche' },
];

const DEFAULT_SCHEDULE = Object.fromEntries(
  DAYS.map(d => [d.key, { open: '08:00', close: '18:00', closed: d.key === 'sun' }])
);

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: TXT, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)',
    '& fieldset': { borderColor: BORD },
    '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' },
    '&.Mui-focused fieldset': { borderColor: OR },
  },
  '& .MuiInputLabel-root': { color: SUB },
  '& .MuiInputLabel-root.Mui-focused': { color: OR },
  '& .MuiFormHelperText-root': { color: SUB },
  '& .MuiSelect-icon': { color: SUB },
};

const darkMenu = {
  PaperProps: {
    sx: {
      bgcolor: '#FFFFFF', border: `1px solid ${BORD}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      '& .MuiMenuItem-root': {
        fontSize: 13, color: TXT, py: 1,
        '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' },
        '&.Mui-selected': { bgcolor: 'rgba(255,107,0,0.14)', color: OR, fontWeight: 700 },
        '&.Mui-selected:hover': { bgcolor: 'rgba(255,107,0,0.2)' },
      },
    },
  },
};

function SecHead({ icon, label, color = OR }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.8, mt: 0.5 }}>
      <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: `${color}18`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
        {icon}
      </Box>
      <Typography fontSize={11.5} fontWeight={900} color={TXT} sx={{ textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</Typography>
    </Box>
  );
}

function TimeInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography fontSize={10} color={SUB} mb={0.4}>{label}</Typography>
      <Box sx={{ position: 'relative' }}>
        <input type="time" value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
          style={{
            width: '100%', padding: '8px 10px', background: disabled ? '#FFFFFF' : '#FFFFFF',
            border: `1px solid ${disabled ? 'rgba(15,23,42,0.09)' : BORD}`, borderRadius: '10px',
            color: disabled ? '#64748B' : TXT, fontSize: '13px', outline: 'none',
            colorScheme: 'dark', fontFamily: 'inherit',
          }} />
      </Box>
    </Box>
  );
}

function StoreForm({ initial, onSave, loading, _onDataChange }: {
  initial?: any; onSave?: (data: any) => void; loading: boolean; _onDataChange?: (data: any) => void;
}) {
  const parseJson = (v: any, fb: any) => { try { return typeof v === 'string' ? JSON.parse(v) : (v ?? fb); } catch { return fb; } };

  const [form, setForm] = useState({
    name:                   initial?.name ?? '',
    description:            initial?.description ?? '',
    department:             initial?.department ?? '',
    city:                   initial?.city ?? '',
    address:                initial?.address ?? '',
    phone:                  initial?.phone ?? '',
    whatsapp:               initial?.whatsapp ?? '',
    email:                  initial?.email ?? '',
    acceptedPaymentMethods: parseJson(initial?.acceptedPaymentMethods, []),
    moncashPhone:           initial?.moncashPhone ?? '',
    deliveryZones:          parseJson(initial?.deliveryZones, []) as { dept: string; priceHTG: number; estimatedDays: number }[],
    pickupPoints:           parseJson(initial?.pickupPoints, []) as { name: string; address: string; city: string; phone: string }[],
    schedule:               parseJson(initial?.schedule, DEFAULT_SCHEDULE) as Record<string, { open: string; close: string; closed: boolean }>,
  });

  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const togglePay = (m: string) => setForm(p => ({
    ...p,
    acceptedPaymentMethods: p.acceptedPaymentMethods.includes(m)
      ? p.acceptedPaymentMethods.filter((x: string) => x !== m)
      : [...p.acceptedPaymentMethods, m],
  }));

  const cities = form.department ? (CITIES[form.department] ?? []) : [];

  // Delivery zones
  const addZone    = () => setForm(p => ({ ...p, deliveryZones: [...p.deliveryZones, { dept: '', priceHTG: 0, estimatedDays: 1 }] }));
  const removeZone = (i: number) => setForm(p => ({ ...p, deliveryZones: p.deliveryZones.filter((_, j) => j !== i) }));
  const setZone    = (i: number, k: string, v: any) => setForm(p => ({ ...p, deliveryZones: p.deliveryZones.map((z, j) => j === i ? { ...z, [k]: v } : z) }));

  // Pickup points
  const addPickup    = () => setForm(p => ({ ...p, pickupPoints: [...p.pickupPoints, { name: '', address: '', city: '', phone: '' }] }));
  const removePickup = (i: number) => setForm(p => ({ ...p, pickupPoints: p.pickupPoints.filter((_, j) => j !== i) }));
  const setPickup    = (i: number, k: string, v: string) => setForm(p => ({ ...p, pickupPoints: p.pickupPoints.map((pt, j) => j === i ? { ...pt, [k]: v } : pt) }));

  // Schedule
  const setScheduleDay = (day: string, k: string, v: any) =>
    setForm(p => ({ ...p, schedule: { ...p.schedule, [day]: { ...p.schedule[day], [k]: v } } }));
  const toggleDayClosed = (day: string) =>
    setForm(p => ({ ...p, schedule: { ...p.schedule, [day]: { ...p.schedule[day], closed: !p.schedule[day].closed } } }));

  const buildPayload = () => ({
    ...form,
    deliveryZones: JSON.stringify(form.deliveryZones),
    pickupPoints:  JSON.stringify(form.pickupPoints),
    schedule:      JSON.stringify(form.schedule),
  });

  // Notify parent dialog of current form state on every change
  useEffect(() => { _onDataChange?.(buildPayload()); }, [form]); // eslint-disable-line

  const handleSave = () => onSave?.(buildPayload());

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Infos générales ── */}
      <SecHead icon={<StorefrontOutlined sx={{ fontSize: 14 }} />} label="Informations générales" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
        <TextField fullWidth label="Nom de la boutique *" value={form.name} onChange={f('name')} sx={fieldSx} />
        <TextField fullWidth label="Description" value={form.description} onChange={f('description')} multiline rows={2} sx={fieldSx} />
      </Box>

      {/* ── Localisation ── */}
      <SecHead icon={<PlaceOutlined sx={{ fontSize: 14 }} />} label="Localisation" color={BLU} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5 }}>
        {/* Département MUI Select */}
        <FormControl fullWidth sx={fieldSx}>
          <InputLabel shrink>Département</InputLabel>
          <Select value={form.department} label="Département"
            onChange={e => setForm(p => ({ ...p, department: e.target.value as string, city: '' }))}
            MenuProps={darkMenu}>
            <MenuItem value=""><em style={{ color: SUB, fontStyle: 'normal' }}>-- Choisir --</em></MenuItem>
            {DEPTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        </FormControl>
        {/* Ville MUI Select (dynamique) */}
        <FormControl fullWidth sx={fieldSx} disabled={!form.department}>
          <InputLabel shrink>Ville</InputLabel>
          <Select value={form.city} label="Ville" onChange={e => setForm(p => ({ ...p, city: e.target.value as string }))} MenuProps={darkMenu}>
            <MenuItem value=""><em style={{ color: SUB, fontStyle: 'normal' }}>-- Choisir --</em></MenuItem>
            {cities.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField fullWidth label="Adresse complète" value={form.address} onChange={f('address')} sx={{ ...fieldSx, gridColumn: '1/-1' }} />
      </Box>

      {/* ── Contact ── */}
      <SecHead icon={<PhoneOutlined sx={{ fontSize: 14 }} />} label="Contact" color="#10B981" />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2.5 }}>
        <TextField fullWidth label="Téléphone" value={form.phone} onChange={f('phone')} sx={fieldSx} />
        <TextField fullWidth label="WhatsApp" value={form.whatsapp} onChange={f('whatsapp')} sx={fieldSx} />
        <TextField fullWidth label="Email de la boutique" type="email" value={form.email} onChange={f('email')} sx={{ ...fieldSx, gridColumn: '1/-1' }} />
      </Box>

      {/* ── Horaires ── */}
      <SecHead icon={<AccessTimeOutlined sx={{ fontSize: 14 }} />} label="Horaires d'ouverture" color="#8B5CF6" />
      <Box sx={{ borderRadius: '12px', border: `1px solid ${BORD}`, overflow: 'hidden', mb: 2.5 }}>
        {DAYS.map((d, i) => {
          const day = form.schedule[d.key] ?? { open: '08:00', close: '18:00', closed: false };
          return (
            <Box key={d.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.8, py: 1.2,
              borderBottom: i < DAYS.length - 1 ? `1px solid ${BORD}` : 'none',
              bgcolor: day.closed ? '#FFFFFF' : 'transparent' }}>
              {/* Day toggle */}
              <Box onClick={() => toggleDayClosed(d.key)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', minWidth: 90 }}>
                <Box sx={{ width: 34, height: 19, borderRadius: '10px', position: 'relative', transition: 'all 0.2s', flexShrink: 0,
                  bgcolor: day.closed ? 'rgba(15,23,42,0.09)' : 'rgba(139,92,246,0.4)', border: `1px solid ${day.closed ? BORD : '#8B5CF6'}` }}>
                  <Box sx={{ position: 'absolute', top: 2, left: day.closed ? 2 : 16, width: 13, height: 13, borderRadius: '50%',
                    bgcolor: 'white', transition: 'left 0.2s' }} />
                </Box>
                <Typography fontSize={12.5} fontWeight={700} color={day.closed ? SUB : TXT}>{d.label}</Typography>
              </Box>
              {/* Times */}
              {day.closed ? (
                <Typography fontSize={12} color={SUB} sx={{ flex: 1 }}>Fermé</Typography>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, flex: 1 }}>
                  <TimeInput label="Ouverture" value={day.open} onChange={v => setScheduleDay(d.key, 'open', v)} />
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.9, color: SUB, fontSize: 14 }}>→</Box>
                  <TimeInput label="Fermeture" value={day.close} onChange={v => setScheduleDay(d.key, 'close', v)} />
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Paiement ── */}
      <SecHead icon={<AccountBalanceWalletOutlined sx={{ fontSize: 14 }} />} label="Moyens de paiement" color="#F59E0B" />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: form.acceptedPaymentMethods.includes('MONCASH') ? 1.5 : 2.5 }}>
        {PAYMENT_OPTS.map(m => {
          const active = form.acceptedPaymentMethods.includes(m);
          return (
            <Box key={m} onClick={() => togglePay(m)} sx={{
              px: 1.5, py: 0.8, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.14s',
              bgcolor: active ? 'rgba(255,107,0,0.14)' : '#FFFFFF',
              border: '1px solid', borderColor: active ? 'rgba(255,107,0,0.4)' : BORD,
              '&:hover': { borderColor: active ? 'rgba(255,107,0,0.55)' : 'rgba(15,23,42,0.09)' },
            }}>
              <Typography fontSize={12.5} fontWeight={700} color={active ? OR : SUB}>{PAYMENT_LABELS[m]}</Typography>
            </Box>
          );
        })}
      </Box>
      {form.acceptedPaymentMethods.includes('MONCASH') && (
        <Box sx={{ mb: 2.5 }}>
          <TextField fullWidth label="Numéro MonCash visible par les clients" value={form.moncashPhone} onChange={f('moncashPhone')} sx={fieldSx} />
        </Box>
      )}

      {/* ── Livraison ── */}
      <SecHead icon={<LocalShippingOutlined sx={{ fontSize: 14 }} />} label="Zones de livraison & tarifs" color="#3B82F6" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5 }}>
        {form.deliveryZones.map((z, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 90px 32px', gap: 1, alignItems: 'center' }}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel shrink>Département</InputLabel>
              <Select value={z.dept} label="Département" onChange={e => setZone(i, 'dept', e.target.value)} MenuProps={darkMenu}>
                <MenuItem value=""><em style={{ color: SUB, fontStyle: 'normal' }}>--</em></MenuItem>
                {DEPTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Prix HTG" type="number" value={z.priceHTG}
              onChange={e => setZone(i, 'priceHTG', Number(e.target.value))} sx={fieldSx} />
            <TextField size="small" label="Jours" type="number" value={z.estimatedDays}
              onChange={e => setZone(i, 'estimatedDays', Number(e.target.value))} sx={fieldSx} />
            <Box onClick={() => removeZone(i)} sx={{ width: 32, height: 32, borderRadius: '9px', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(239,68,68,0.25)', bgcolor: 'rgba(239,68,68,0.06)',
              '&:hover': { bgcolor: 'rgba(239,68,68,0.14)' } }}>
              <Close sx={{ fontSize: 14, color: RED }} />
            </Box>
          </Box>
        ))}
        <Box onClick={addZone} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, cursor: 'pointer', width: 'fit-content' }}>
          <Add sx={{ fontSize: 15, color: OR }} />
          <Typography fontSize={12.5} color={OR} fontWeight={700}>Ajouter une zone</Typography>
        </Box>
      </Box>

      {/* ── Points de retrait ── */}
      <SecHead icon={<LocationOnOutlined sx={{ fontSize: 14 }} />} label="Points de retrait" color="#EC4899" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 0.5 }}>
        {form.pickupPoints.map((pt, i) => (
          <Box key={i} sx={{ p: 1.8, borderRadius: '12px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}`, position: 'relative' }}>
            <Box onClick={() => removePickup(i)} sx={{ position: 'absolute', top: 12, right: 12, width: 26, height: 26, borderRadius: '7px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(239,68,68,0.25)', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
              <Close sx={{ fontSize: 13, color: RED }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.2, pr: 4 }}>
              <TextField size="small" label="Nom du point" value={pt.name} onChange={e => setPickup(i, 'name', e.target.value)} sx={fieldSx} />
              <TextField size="small" label="Téléphone" value={pt.phone} onChange={e => setPickup(i, 'phone', e.target.value)} sx={fieldSx} />
              <TextField size="small" label="Adresse" value={pt.address} onChange={e => setPickup(i, 'address', e.target.value)} sx={{ ...fieldSx, gridColumn: '1/-1' }} />
              <FormControl size="small" sx={fieldSx} disabled={!form.department}>
                <InputLabel shrink>Ville</InputLabel>
                <Select value={pt.city} label="Ville" onChange={e => setPickup(i, 'city', e.target.value as string)} MenuProps={darkMenu}>
                  <MenuItem value="">--</MenuItem>
                  {(CITIES[form.department] ?? []).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>
        ))}
        <Box onClick={addPickup} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, cursor: 'pointer', width: 'fit-content' }}>
          <Add sx={{ fontSize: 15, color: OR }} />
          <Typography fontSize={12.5} color={OR} fontWeight={700}>Ajouter un point de retrait</Typography>
        </Box>
      </Box>
    </Box>
  );
}

function StoreDialog({ open, title, initial, onClose, onSave, loading }: {
  open: boolean; title: string; initial?: any; onClose: () => void; onSave: (d: any) => void; loading: boolean;
}) {
  const [formData, setFormData] = useState<any>(null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper"
      PaperProps={{ sx: {
        bgcolor: '#F7F8FA', border: `1px solid ${BORD}`, borderRadius: '20px',
        display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}}>
      {/* Sticky header */}
      <Box sx={{
        px: 3, py: 2.5, borderBottom: `1px solid ${BORD}`, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(180deg,rgba(255,107,0,0.06) 0%,transparent 100%)',
      }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <StorefrontOutlined sx={{ fontSize: 18, color: OR }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={900} fontSize={17} color={TXT}>{title}</Typography>
          <Typography fontSize={12} color={SUB}>{initial ? 'Modifiez les informations de votre boutique' : 'Remplissez les informations pour créer votre boutique'}</Typography>
        </Box>
        <Box onClick={onClose} sx={{ width: 32, height: 32, borderRadius: '9px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORD}`,
          '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } }}>
          <Close sx={{ fontSize: 16, color: SUB }} />
        </Box>
      </Box>

      {/* Scrollable content */}
      <DialogContent sx={{ px: 3, py: 2.5, overflowY: 'auto', flex: 1,
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(15,23,42,0.09)', borderRadius: 3 },
      }}>
        <StoreForm initial={initial} onSave={d => setFormData(d)} loading={loading} _onDataChange={setFormData} />
      </DialogContent>

      {/* Sticky footer */}
      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${BORD}`, flexShrink: 0,
        display: 'flex', gap: 1.5, alignItems: 'center',
        bgcolor: '#FFFFFF' }}>
        <Button onClick={onClose} sx={{ color: SUB2, borderRadius: '11px', px: 2.5, fontWeight: 600 }}>
          Annuler
        </Button>
        <Button onClick={() => formData && onSave(formData)} disabled={loading || !formData?.name?.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ flex: 1, py: 1.3, borderRadius: '12px', fontWeight: 800, fontSize: 14,
            bgcolor: OR, color: '#fff', boxShadow: '0 4px 14px rgba(255,107,0,0.3)',
            '&:hover': { bgcolor: '#E05A00' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
          {loading ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Créer la boutique'}
        </Button>
      </Box>
    </Dialog>
  );
}

function StoreCard({ store, onEdit, onDelete, onCopy }: any) {
  const hue = (store.name?.charCodeAt(0) ?? 65) * 53 % 360;
  return (
    <Box sx={{
      borderRadius: '16px', bgcolor: CARD, overflow: 'hidden', transition: 'all 0.18s',
      border: `1px solid ${store.isPrimary ? 'rgba(255,107,0,0.28)' : BORD}`,
      '&:hover': { borderColor: store.isPrimary ? 'rgba(255,107,0,0.45)' : 'rgba(15,23,42,0.09)', transform: 'translateY(-1px)' },
    }}>
      {store.isPrimary && <Box sx={{ height: 2.5, background: `linear-gradient(90deg,${OR},#D95500)` }} />}

      <Box sx={{ p: 2 }}>
        {/* Row 1: avatar + info + actions */}
        <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0,
            background: `linear-gradient(135deg,hsl(${hue},50%,25%),hsl(${hue},40%,16%))`,
            border: `1.5px solid hsl(${hue},40%,30%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography fontWeight={900} fontSize={17} color={`hsl(${hue},80%,72%)`}>{store.name?.[0]?.toUpperCase()}</Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.2 }}>
              <Typography fontWeight={800} fontSize={14} color={TXT} noWrap>{store.name}</Typography>
              {store.isPrimary && (
                <Box sx={{ px: 0.8, py: 0.1, borderRadius: '5px', bgcolor: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.22)' }}>
                  <Typography fontSize={9.5} fontWeight={800} color={OR}>PRINCIPALE</Typography>
                </Box>
              )}
              {store.isVerified && <Verified sx={{ fontSize: 13, color: GRN }} />}
              {!store.isActive && (
                <Box sx={{ px: 0.8, py: 0.1, borderRadius: '5px', bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Typography fontSize={9.5} fontWeight={800} color={RED}>INACTIVE</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <LocationOnOutlined sx={{ fontSize: 11, color: SUB }} />
              <Typography fontSize={11.5} color={SUB} noWrap>
                {[store.city, store.department].filter(Boolean).join(', ') || 'Localisation non définie'}
              </Typography>
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {[
              { icon: <ContentCopy sx={{ fontSize: 13 }} />, action: () => onCopy(store.slug), col: SUB2, hov: 'rgba(15,23,42,0.06)', bc: '#64748B' },
              { icon: <Edit sx={{ fontSize: 13 }} />, action: () => onEdit(store), col: OR, hov: 'rgba(255,107,0,0.08)', bc: 'rgba(255,107,0,0.38)' },
              ...(!store.isPrimary ? [{ icon: <Delete sx={{ fontSize: 13 }} />, action: () => onDelete(store), col: RED, hov: 'rgba(239,68,68,0.08)', bc: 'rgba(239,68,68,0.38)' }] : []),
            ].map(({ icon, action, col, hov, bc }, i) => (
              <Box key={i} onClick={action} sx={{ width: 28, height: 28, borderRadius: '7px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: col,
                border: `1px solid ${BORD}`, transition: 'all 0.13s',
                '&:hover': { bgcolor: hov, borderColor: bc } }}>
                {icon}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Row 2: stats inline + link */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: '10px', overflow: 'hidden',
          border: `1px solid ${BORD}`, bgcolor: 'rgba(15,23,42,0.09)', mb: 1.2 }}>
          {[
            { icon: <Inventory2Outlined sx={{ fontSize: 12, color: OR }} />, val: store._count?.products ?? 0, lbl: 'produits' },
            { icon: <Star sx={{ fontSize: 12, color: '#F59E0B' }} />, val: (store.avgRating ?? 0).toFixed(1), lbl: `(${store.totalReviews ?? 0})` },
            { icon: <ShoppingBagOutlined sx={{ fontSize: 12, color: BLU }} />, val: store.totalSales ?? 0, lbl: 'ventes' },
          ].map(({ icon, val, lbl }, i) => (
            <Box key={i} sx={{ flex: 1, py: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
              borderRight: i < 2 ? `1px solid ${BORD}` : 'none' }}>
              {icon}
              <Typography fontSize={12.5} fontWeight={800} color={TXT}>{val}</Typography>
              <Typography fontSize={10.5} color={SUB}>{lbl}</Typography>
            </Box>
          ))}
        </Box>

        {/* Link */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.2, py: 0.7, borderRadius: '8px',
          bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
          <Typography fontSize={11} color={SUB} sx={{ flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            dealpam.com/store/{store.slug}
          </Typography>
          <Box onClick={() => window.open(`/store/${store.slug}`, '_blank')}
            sx={{ flexShrink: 0, cursor: 'pointer', display: 'flex', '&:hover': { color: TXT } }}>
            <OpenInNew sx={{ fontSize: 12, color: SUB }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function SellerStoresPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteStore, setDeleteStore] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myStores'],
    queryFn: () => api.get('/stores/me/all').then(r => r.data),
  });
  const showSkel = useDelayedLoading(isLoading);

  const stores: any[]      = data?.stores   ?? [];
  const maxStores: number  = data?.maxStores ?? 1;
  const canCreate: boolean = data?.canCreate ?? false;

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/stores/me', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myStores'] }); qc.invalidateQueries({ queryKey: ['sellerStats'] }); setCreateOpen(false); enqueueSnackbar('Boutique créée !', { variant: 'success' }); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/stores/me/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myStores'] }); setDeleteStore(null); enqueueSnackbar('Boutique supprimée', { variant: 'info' }); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://dealpam.com/store/${slug}`);
    enqueueSnackbar('Lien copié !', { variant: 'info' });
  };

  const dialogPaper = { sx: { bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', color: TXT } };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Hero header — fusionne titre + statut du quota + CTA unique (plus de bouton dupliqué) */}
      <Box sx={{
        mb: 3, p: { xs: 2.5, md: 3 }, borderRadius: '20px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1E293B 100%)',
        display: 'flex', flexDirection: 'column', gap: canCreate ? 0 : 2,
      }}>
        <Box sx={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle,${(canCreate ? OR : BLU)}30,transparent 70%)` }} />

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${OR}22`, border: `1px solid ${OR}44` }}>
              <StorefrontOutlined sx={{ color: OR, fontSize: 26 }} />
            </Box>
            <Box>
              <Typography fontWeight={900} fontSize={{ xs: 19, md: 23 }} color="#fff" letterSpacing="-0.4px">Mes boutiques</Typography>
              <Typography fontSize={12.5} color="rgba(255,255,255,0.55)">
                {stores.length} / {maxStores} boutique{maxStores > 1 ? 's' : ''} utilisée{maxStores > 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          {canCreate ? (
            <Button onClick={() => setCreateOpen(true)} startIcon={<Add sx={{ fontSize: 18 }} />}
              sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2,
                boxShadow: '0 4px 14px rgba(255,107,0,0.35)', '&:hover': { bgcolor: '#E05A00' } }}>
              Nouvelle boutique
            </Button>
          ) : (
            <Button onClick={() => navigate('/seller/subscription')} endIcon={<ArrowForward sx={{ fontSize: 15 }} />}
              sx={{ bgcolor: BLU, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2,
                boxShadow: '0 4px 14px rgba(59,130,246,0.35)', '&:hover': { bgcolor: '#2563EB' } }}>
              Voir les plans
            </Button>
          )}
        </Box>

        {!canCreate && (
          <Box sx={{ position: 'relative', mt: 0.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography fontSize={12.5} color="rgba(255,255,255,0.6)">
              <strong style={{ color: '#fff' }}>Limite de {maxStores} boutique{maxStores > 1 ? 's' : ''} atteinte</strong> — passez
              au plan supérieur pour en créer davantage et développer votre activité.
            </Typography>
          </Box>
        )}
      </Box>

      {isLoading ? (
        showSkel ? (
          <Grid container spacing={2.5}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}><StoreCardSkeleton /></Grid>
            ))}
          </Grid>
        ) : null
      ) : stores.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, borderRadius: '20px', bgcolor: CARD, border: `1px dashed rgba(15,23,42,0.09)` }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '24px', bgcolor: 'rgba(255,107,0,0.1)',
            border: '1px solid rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <StorefrontOutlined sx={{ fontSize: 36, color: OR }} />
          </Box>
          <Typography fontWeight={800} fontSize={17} color={TXT} mb={0.8}>Aucune boutique créée</Typography>
          <Typography fontSize={13.5} color={SUB} mb={3.5}>Créez votre première boutique pour commencer à vendre sur DealPam</Typography>
          <Button startIcon={<Add />} onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 3, py: 1.2,
              boxShadow: '0 4px 14px rgba(255,107,0,0.3)', '&:hover': { bgcolor: '#E05A00' } }}>
            Créer ma première boutique
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {stores.map((store: any) => (
            <Grid item xs={12} md={6} key={store.id}>
              <StoreCard store={store} onEdit={() => navigate('/seller/store')} onDelete={setDeleteStore} onCopy={copyLink} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create dialog */}
      <StoreDialog
        open={createOpen}
        title="Nouvelle boutique"
        onClose={() => setCreateOpen(false)}
        onSave={(d) => createMut.mutate(d)}
        loading={createMut.isPending}
      />

      <Dialog open={!!deleteStore} onClose={() => setDeleteStore(null)} maxWidth="xs" fullWidth PaperProps={dialogPaper}>
        <DialogTitle sx={{ color: TXT, fontWeight: 900, fontSize: 17 }}>Supprimer la boutique ?</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, borderRadius: '14px', bgcolor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Typography fontSize={13.5} color={SUB2} lineHeight={1.6}>
              La boutique <strong style={{ color: TXT }}>"{deleteStore?.name}"</strong> sera définitivement supprimée.
              Les produits associés doivent d'abord être déplacés.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteStore(null)} sx={{ color: SUB2, borderRadius: '10px' }}>Annuler</Button>
          <Button onClick={() => deleteMut.mutate(deleteStore?.id)} disabled={deleteMut.isPending}
            startIcon={deleteMut.isPending ? <CircularProgress size={14} color="inherit" /> : <Delete sx={{ fontSize: 16 }} />}
            sx={{ bgcolor: RED, color: '#fff', borderRadius: '10px', fontWeight: 700, px: 2.5, '&:hover': { bgcolor: '#DC2626' } }}>
            {deleteMut.isPending ? 'Suppression…' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
