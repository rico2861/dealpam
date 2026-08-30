import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Select, MenuItem, InputLabel, FormControl,
} from '@mui/material';
import {
  Add, Close, StorefrontOutlined, PlaceOutlined, PhoneOutlined,
  AccessTimeOutlined, AccountBalanceWalletOutlined, LocalShippingOutlined, LocationOnOutlined,
} from '@mui/icons-material';

// Formulaire de configuration boutique (localisation, contact, horaires,
// paiement, livraison, retrait) partagé entre plusieurs pages : "Configurer
// la boutique" (StoresPage), inscription vendeur (RegisterPage) et conversion
// acheteur → vendeur (BecomeSellerPage). Vit dans un fichier à part (pas dans
// une page elle-même lazy-chargée) pour éviter tout souci de découpage de
// chunks Vite quand plusieurs pages l'importent en même temps.

const OR   = '#FF6B00';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
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
    color: TXT, borderRadius: '12px', bgcolor: '#FFFFFF',
    '& fieldset': { borderColor: 'rgba(15,23,42,0.14)' },
    '&:hover fieldset': { borderColor: alphaHex(OR, 0.5) },
    '&.Mui-focused fieldset': { borderColor: OR, borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root': { color: '#334155', fontWeight: 600 },
  '& .MuiInputLabel-root.Mui-focused': { color: OR },
  '& .MuiFormHelperText-root': { color: SUB },
  '& .MuiSelect-icon': { color: SUB },
};

// Petit helper local (évite d'importer alpha() de @mui/material juste pour ça)
function alphaHex(hex: string, opacity: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${opacity})`;
}

// Carte de section — sépare visuellement chaque bloc de configuration au lieu
// d'un long flux continu, pour une présentation plus professionnelle.
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ borderRadius: '16px', border: `1px solid ${BORD}`, bgcolor: '#FFFFFF', p: { xs: 2, sm: 2.5 }, mb: 2 }}>
      {children}
    </Box>
  );
}

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

export function StoreForm({ initial, onSave, loading, _onDataChange, hideBasicInfo }: {
  initial?: any; onSave?: (data: any) => void; loading: boolean; _onDataChange?: (data: any) => void; hideBasicInfo?: boolean;
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
      {!hideBasicInfo && (
        <SectionCard>
          <SecHead icon={<StorefrontOutlined sx={{ fontSize: 14 }} />} label="Informations générales" />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField fullWidth label="Nom de la boutique *" value={form.name} onChange={f('name')} sx={fieldSx} />
            <TextField fullWidth label="Description" value={form.description} onChange={f('description')} multiline rows={2} sx={fieldSx} />
          </Box>
        </SectionCard>
      )}

      {/* ── Localisation ── */}
      <SectionCard>
      <SecHead icon={<PlaceOutlined sx={{ fontSize: 14 }} />} label="Localisation" color={BLU} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
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
        <TextField fullWidth label="Adresse complète" value={form.address} onChange={f('address')} sx={{ ...fieldSx, gridColumn: { sm: '1/-1' } }} />
      </Box>
      </SectionCard>

      {/* ── Contact ── */}
      <SectionCard>
      <SecHead icon={<PhoneOutlined sx={{ fontSize: 14 }} />} label="Contact" color="#10B981" />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        <TextField fullWidth label="Téléphone" value={form.phone} onChange={f('phone')} sx={fieldSx} />
        <TextField fullWidth label="WhatsApp" value={form.whatsapp} onChange={f('whatsapp')} sx={fieldSx} />
        <TextField fullWidth label="Email de la boutique" type="email" value={form.email} onChange={f('email')} sx={{ ...fieldSx, gridColumn: { sm: '1/-1' } }} />
      </Box>
      </SectionCard>

      {/* ── Horaires ── */}
      <SectionCard>
      <SecHead icon={<AccessTimeOutlined sx={{ fontSize: 14 }} />} label="Horaires d'ouverture" color="#8B5CF6" />
      <Box sx={{ borderRadius: '12px', border: `1px solid ${BORD}`, overflow: 'hidden' }}>
        {DAYS.map((d, i) => {
          const day = form.schedule[d.key] ?? { open: '08:00', close: '18:00', closed: false };
          return (
            <Box key={d.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.8, py: 1,
              borderBottom: i < DAYS.length - 1 ? `1px solid ${BORD}` : 'none',
              bgcolor: day.closed ? '#FAFAFA' : 'transparent' }}>
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
      </SectionCard>

      {/* ── Paiement ── */}
      <SectionCard>
      <SecHead icon={<AccountBalanceWalletOutlined sx={{ fontSize: 14 }} />} label="Moyens de paiement" color="#F59E0B" />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: form.acceptedPaymentMethods.includes('MONCASH') ? 1.5 : 0 }}>
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
        <Box sx={{ mt: 2 }}>
          <TextField fullWidth label="Numéro MonCash visible par les clients" value={form.moncashPhone} onChange={f('moncashPhone')} sx={fieldSx} />
        </Box>
      )}
      </SectionCard>

      {/* ── Livraison ── */}
      <SectionCard>
      <SecHead icon={<LocalShippingOutlined sx={{ fontSize: 14 }} />} label="Zones de livraison & tarifs" color="#3B82F6" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
      </SectionCard>

      {/* ── Points de retrait ── */}
      <SectionCard>
      <SecHead icon={<LocationOnOutlined sx={{ fontSize: 14 }} />} label="Points de retrait" color="#EC4899" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {form.pickupPoints.map((pt, i) => (
          <Box key={i} sx={{ p: 1.8, borderRadius: '12px', bgcolor: '#FAFAFA', border: `1px solid ${BORD}`, position: 'relative' }}>
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
      </SectionCard>
    </Box>
  );
}
