import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, MenuItem, Select, InputLabel,
  FormControl, FormControlLabel, Checkbox, Button, CircularProgress, Alert,
} from '@mui/material';
import {
  MedicalServices, Home, DesignServices, RestaurantMenu,
  Add, ArrowBack, CheckCircle, Schedule, AddPhotoAlternate, Close,
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { compressImages } from '../../utils/compressImage';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
const GRN  = '#10B981';
const BLU  = '#3B82F6';
const PUR  = '#8B5CF6';

const darkMenu = {
  PaperProps: {
    sx: {
      bgcolor: '#FFFFFF', border: `1px solid ${BORD}`, borderRadius: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      '& .MuiMenuItem-root': {
        fontSize: 13, color: TXT, py: 1,
        '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' },
        '&.Mui-selected': { bgcolor: 'rgba(255,107,0,0.14)', color: OR, fontWeight: 700 },
      },
    },
  },
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F7F8FA', borderRadius: '10px', fontSize: 13, color: TXT,
    '& fieldset': { borderColor: BORD },
    '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' },
    '&.Mui-focused fieldset': { borderColor: OR },
  },
  '& .MuiInputLabel-root': { color: SUB, fontSize: 13 },
  '& .MuiInputLabel-root.Mui-focused': { color: OR },
};

// ── Listing types ──────────────────────────────────────────────────────────

const LISTING_TYPES = [
  { key: 'SERVICE',     label: 'Service / Rendez-vous', desc: 'Clinique, coiffeur, massage, consultation… Les clients prennent RDV en ligne.', icon: MedicalServices, color: GRN },
  { key: 'REAL_ESTATE', label: 'Immobilier',            desc: 'Vente ou location de maison, appartement, terrain, bureau…',                    icon: Home,           color: BLU },
  { key: 'FREELANCE',   label: 'Freelance / Prestation', desc: 'Design, programmation, rédaction, marketing… Comme Fiverr.',                   icon: DesignServices,  color: PUR },
  { key: 'FOOD',        label: 'Restaurant / Plat',      desc: 'Plats, menus… Le client commande directement, pas de rendez-vous.',            icon: RestaurantMenu, color: '#F97316' },
];

const SERVICE_CATEGORIES = [
  'Clinique dentaire','Médecine générale','Gynécologie','Pédiatrie',
  'Kinésithérapie','Ophtalmologie','Dermatologie','Psychologie',
  'Coiffure femme','Coiffure homme','Barbier','Manucure / Pédicure',
  'Massage / Spa','Esthétique','Coaching sportif','Photographie','Autre service',
];
const RE_TYPES        = ['Maison','Appartement','Terrain','Bureau / Local commercial','Villa','Studio'];
const RE_TRANSACTIONS = ['Vente','Location','Location saisonnière'];
const FREELANCE_CATS  = [
  'Design graphique','Développement web','Développement mobile','UI/UX Design',
  'Rédaction / Traduction','Marketing digital','Vidéo / Montage',
  'Musique / Audio','Photographie','Consulting','Autre',
];
const DEPTS = ['Ouest','Nord','Nord-Est','Nord-Ouest','Artibonite','Centre','Sud','Sud-Est','Grande-Anse','Nippes'];

// ── Image picker ───────────────────────────────────────────────────────────

function ImagePicker({ images, onChange }: { images: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = images.map(f => URL.createObjectURL(f));

  return (
    <Box>
      <Typography fontSize={12} fontWeight={700} color={SUB} mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        Photos du service (max 5)
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2 }}>
        {previews.map((src, i) => (
          <Box key={i} sx={{ position: 'relative', width: 90, height: 90 }}>
            <Box component="img" src={src} sx={{ width: 90, height: 90, borderRadius: '10px', objectFit: 'cover', border: `1px solid ${BORD}` }} />
            <Box onClick={() => onChange(images.filter((_, j) => j !== i))}
              sx={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', bgcolor: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15,23,42,0.2)' }}>
              <Close sx={{ fontSize: 12, color: '#fff' }} />
            </Box>
          </Box>
        ))}
        {images.length < 5 && (
          <Box onClick={() => inputRef.current?.click()}
            sx={{ width: 90, height: 90, borderRadius: '10px', border: `1.5px dashed ${BORD}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 0.5, '&:hover': { borderColor: OR, bgcolor: 'rgba(255,107,0,0.06)' }, transition: 'all 0.15s' }}>
            <AddPhotoAlternate sx={{ fontSize: 22, color: SUB }} />
            <Typography fontSize={10} color={SUB}>Ajouter</Typography>
          </Box>
        )}
      </Box>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden
        onChange={async e => {
          const picked = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!picked.length) return;
          const compressed = await compressImages(picked);
          onChange([...images, ...compressed].slice(0, 5));
        }} />
    </Box>
  );
}

// ── Sub-forms ──────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { key: 'mon', label: 'Lun' }, { key: 'tue', label: 'Mar' }, { key: 'wed', label: 'Mer' },
  { key: 'thu', label: 'Jeu' }, { key: 'fri', label: 'Ven' }, { key: 'sat', label: 'Sam' }, { key: 'sun', label: 'Dim' },
];

// ── Disponibilités RDV : jours + plage horaire — utilisé par Service et Immobilier ──
function AvailabilityEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const avail = data.availability || { days: ['mon','tue','wed','thu','fri'], start: '09:00', end: '17:00' };
  const setAvail = (patch: any) => onChange({ ...data, availability: { ...avail, ...patch } });
  const toggleDay = (day: string) => {
    const days = avail.days.includes(day) ? avail.days.filter((d: string) => d !== day) : [...avail.days, day];
    setAvail({ days });
  };
  return (
    <Box sx={{ p: 2, borderRadius: '12px', bgcolor: `${BLU}08`, border: `1px solid ${BLU}25` }}>
      <Typography fontSize={13} fontWeight={700} color={TXT} mb={1.2}>Disponibilités pour les rendez-vous</Typography>
      <Typography fontSize={12} color={SUB} mb={1.2}>Jours où vous recevez des clients</Typography>
      <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 2 }}>
        {WEEKDAYS.map(d => {
          const active = avail.days.includes(d.key);
          return (
            <Box key={d.key} onClick={() => toggleDay(d.key)}
              sx={{ px: 1.6, py: 0.7, borderRadius: '8px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
                bgcolor: active ? BLU : '#fff', color: active ? '#fff' : SUB, border: `1.5px solid ${active ? BLU : BORD}`,
                transition: 'all 0.13s' }}>
              {d.label}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField fullWidth type="time" label="Ouverture" sx={fieldSx} InputLabelProps={{ shrink: true }}
          value={avail.start} onChange={e => setAvail({ start: e.target.value })} />
        <TextField fullWidth type="time" label="Fermeture" sx={fieldSx} InputLabelProps={{ shrink: true }}
          value={avail.end} onChange={e => setAvail({ end: e.target.value })} />
      </Box>
    </Box>
  );
}

// ── Sous-services : liste de prestations avec leur propre prix ──────────────
function SubServicesEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const list: any[] = data.subServices || [];
  const update = (next: any[]) => onChange({ ...data, subServices: next });
  const add = () => update([...list, { name: '', price: 0, description: '' }]);
  const remove = (i: number) => update(list.filter((_, j) => j !== i));
  const change = (i: number, k: string, v: any) => update(list.map((s, j) => j === i ? { ...s, [k]: v } : s));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
        <Typography fontSize={13} fontWeight={700} color={TXT}>Prestations proposées (optionnel)</Typography>
        <Button size="small" startIcon={<Add sx={{ fontSize: 15 }} />} onClick={add}
          sx={{ color: OR, fontWeight: 700, fontSize: 12.5 }}>Ajouter</Button>
      </Box>
      <Typography fontSize={12} color={SUB} mb={1.5}>
        Détaillez chaque prestation avec son prix — le client pourra choisir avant de prendre RDV.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {list.map((s, i) => (
          <Box key={i} sx={{ p: 1.5, borderRadius: '10px', border: `1px solid ${BORD}`, position: 'relative' }}>
            <Box onClick={() => remove(i)}
              sx={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', bgcolor: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Close sx={{ fontSize: 12, color: '#EF4444' }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.2, mb: 1, pr: 3 }}>
              <TextField fullWidth size="small" label="Nom de la prestation" sx={fieldSx}
                value={s.name} onChange={e => change(i, 'name', e.target.value)} placeholder="Ex: Blanchiment dentaire" />
              <TextField size="small" label="Prix (HTG)" type="number" sx={{ ...fieldSx, minWidth: 130 }}
                value={s.price || ''} onChange={e => change(i, 'price', Number(e.target.value))} />
            </Box>
            <TextField fullWidth size="small" label="Description (optionnel)" sx={fieldSx}
              value={s.description || ''} onChange={e => change(i, 'description', e.target.value)}
              placeholder="Ex: Blanchiment dentaire, blanchiment simple des dents" />
          </Box>
        ))}
        {list.length === 0 && (
          <Typography fontSize={12} color={SUB} sx={{ fontStyle: 'italic' }}>Aucune prestation ajoutée pour l'instant.</Typography>
        )}
      </Box>
    </Box>
  );
}

function ServiceForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth sx={fieldSx}>
        <InputLabel shrink>Catégorie de service</InputLabel>
        <Select value={data.serviceCategory || ''} label="Catégorie de service" MenuProps={darkMenu} onChange={e => set('serviceCategory', e.target.value)}>
          {SERVICE_CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField fullWidth label="Durée d'une séance (min)" type="number" sx={fieldSx}
          value={data.duration || ''} onChange={e => set('duration', Number(e.target.value))} inputProps={{ min: 15, max: 480, step: 15 }} />
        <TextField fullWidth label="Prix par séance (HTG)" type="number" sx={fieldSx}
          value={data.price || ''} onChange={e => set('price', Number(e.target.value))} />
      </Box>
      <TextField fullWidth label="Services proposés (détails, équipements, tarifs spéciaux…)" multiline rows={3} sx={fieldSx}
        value={data.servicesDetail || ''} onChange={e => set('servicesDetail', e.target.value)} />
      <FormControlLabel
        control={<Checkbox checked={!!data.homeVisit} onChange={e => set('homeVisit', e.target.checked)} sx={{ color: SUB, '&.Mui-checked': { color: OR } }} />}
        label={<Typography fontSize={13} color={SUB2}>Visite à domicile disponible</Typography>} />
      <SubServicesEditor data={data} onChange={onChange} />
      <AvailabilityEditor data={data} onChange={onChange} />
    </Box>
  );
}

function RealEstateForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <FormControl fullWidth sx={fieldSx}>
          <InputLabel shrink>Type de bien</InputLabel>
          <Select value={data.reType || ''} label="Type de bien" MenuProps={darkMenu} onChange={e => set('reType', e.target.value)}>
            {RE_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={fieldSx}>
          <InputLabel shrink>Transaction</InputLabel>
          <Select value={data.reTransaction || ''} label="Transaction" MenuProps={darkMenu} onChange={e => set('reTransaction', e.target.value)}>
            {RE_TRANSACTIONS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField fullWidth label="Chambres" type="number" sx={fieldSx} value={data.rooms || ''} onChange={e => set('rooms', Number(e.target.value))} />
        <TextField fullWidth label="Salles de bain" type="number" sx={fieldSx} value={data.bathrooms || ''} onChange={e => set('bathrooms', Number(e.target.value))} />
        <TextField fullWidth label="Superficie (m²)" type="number" sx={fieldSx} value={data.areaSqm || ''} onChange={e => set('areaSqm', Number(e.target.value))} />
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField fullWidth label="Prix (HTG)" type="number" sx={fieldSx} value={data.price || ''} onChange={e => set('price', Number(e.target.value))} />
        <FormControl fullWidth sx={fieldSx}>
          <InputLabel shrink>Unité de prix</InputLabel>
          <Select value={data.priceUnit || 'HTG'} label="Unité de prix" MenuProps={darkMenu} onChange={e => set('priceUnit', e.target.value)}>
            <MenuItem value="HTG">HTG (total)</MenuItem>
            <MenuItem value="HTG/mois">HTG / mois</MenuItem>
            <MenuItem value="HTG/nuit">HTG / nuit</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {[['furnished','Meublé'],['parking','Parking'],['generator','Groupe électrogène'],['security','Sécurité 24h']].map(([k,l]) => (
          <FormControlLabel key={k} control={<Checkbox checked={!!data[k]} onChange={e => set(k, e.target.checked)} sx={{ color: SUB, '&.Mui-checked': { color: OR } }} />}
            label={<Typography fontSize={13} color={SUB2}>{l}</Typography>} />
        ))}
      </Box>
      <FormControlLabel
        control={<Checkbox checked={!!data.requiresVisit} onChange={e => set('requiresVisit', e.target.checked)} sx={{ color: SUB, '&.Mui-checked': { color: OR } }} />}
        label={<Typography fontSize={13} color={SUB2}>Visite du bien uniquement sur rendez-vous</Typography>} />
      {data.requiresVisit && <AvailabilityEditor data={data} onChange={onChange} />}
    </Box>
  );
}

function FreelanceForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth sx={fieldSx}>
        <InputLabel shrink>Catégorie</InputLabel>
        <Select value={data.freelanceCat || ''} label="Catégorie" MenuProps={darkMenu} onChange={e => set('freelanceCat', e.target.value)}>
          {FREELANCE_CATS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField fullWidth label="Délai de livraison (jours)" type="number" sx={fieldSx} value={data.deliveryDays || ''} onChange={e => set('deliveryDays', Number(e.target.value))} />
        <TextField fullWidth label="Nombre de révisions" type="number" sx={fieldSx} value={data.revisions || ''} onChange={e => set('revisions', Number(e.target.value))} />
        <TextField fullWidth label="Prix (HTG)" type="number" sx={fieldSx} value={data.price || ''} onChange={e => set('price', Number(e.target.value))} />
      </Box>
      <TextField fullWidth label="Ce qui est inclus (liste séparée par virgule)" sx={fieldSx}
        value={data.includes || ''} onChange={e => set('includes', e.target.value)}
        placeholder="Ex: Logo vectoriel, fichiers sources, 3 versions couleurs" />
      <TextField fullWidth label="Compétences / Technologies utilisées" sx={fieldSx}
        value={data.skills || ''} onChange={e => set('skills', e.target.value)}
        placeholder="Ex: Photoshop, Illustrator, React, Figma…" />
    </Box>
  );
}

function FoodForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const set = (k: string, v: any) => onChange({ ...data, [k]: v });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField fullWidth label="Prix du plat (HTG)" type="number" sx={fieldSx}
        value={data.price || ''} onChange={e => set('price', Number(e.target.value))} />
      <TextField fullWidth label="Ingrédients (optionnel)" multiline rows={3} sx={fieldSx}
        value={data.ingredients || ''} onChange={e => set('ingredients', e.target.value)}
        placeholder="Ex: Riz, poulet grillé, bananes pesées, sauce créole…"
        helperText="Utile pour les clients allergiques ou avec des préférences alimentaires" />
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────

export default function AddServicePage() {
  const navigate = useNavigate();
  const [step, setStep]           = useState<'type' | 'form'>('type');
  const [listingType, setListingType] = useState('');
  const [storeId, setStoreId]     = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages]       = useState<File[]>([]);
  const [error, setError]         = useState('');

  const [base, setBase] = useState({
    title: '', description: '',
    address: '', city: '', department: '',
  });
  const [extra, setExtra] = useState<any>({});

  const { data: storesData } = useQuery({ queryKey: ['myStores'], queryFn: () => api.get('/stores/mine').then(r => r.data) });
  const { data: cats }       = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const stores: any[] = storesData?.stores ?? [];

  const mutation = useMutation({
    mutationFn: (fd: FormData) => api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
    onSuccess: () => navigate('/seller/services'),
    onError: (e: any) => {
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Erreur lors de la création'));
    },
  });

  const handleSubmit = () => {
    setError('');
    if (!base.title.trim())    return setError('Le titre est requis');
    if (!base.description.trim() || base.description.trim().length < 3) return setError('La description doit contenir au moins 3 caractères');
    if (!storeId)              return setError('Sélectionnez une boutique');
    if (!categoryId)           return setError('Sélectionnez une catégorie');

    const price    = extra.price ?? 0;
    const priceUnitMap: Record<string, string> = { SERVICE: 'HTG/séance', FREELANCE: 'HTG/projet' };
    const priceUnit = extra.priceUnit ?? priceUnitMap[listingType] ?? 'HTG';

    const fd = new FormData();
    fd.append('storeId',    storeId);
    fd.append('categoryId', categoryId);
    fd.append('name',        base.title.trim());
    fd.append('description', base.description.trim());
    fd.append('price',       String(price));
    fd.append('priceUnit',   priceUnit);
    fd.append('productType', listingType);
    fd.append('requiresAppointment', (listingType === 'SERVICE' || (listingType === 'REAL_ESTATE' && !!extra.requiresVisit)) ? 'true' : 'false');
    fd.append('serviceConfig', JSON.stringify(extra));
    fd.append('status', 'ACTIVE');
    if (base.address.trim()) fd.append('address', base.address.trim());
    if (base.city.trim())    fd.append('city',    base.city.trim());
    if (base.department)     fd.append('department', base.department);
    // Images
    images.forEach(img => fd.append('images', img));

    mutation.mutate(fd);
  };

  const selectedType = LISTING_TYPES.find(t => t.key === listingType);

  // ── Step 1 ────────────────────────────────────────────────────────────────

  if (step === 'type') {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: BG, p: { xs: 2, md: 4 } }}>
        <Box sx={{ maxWidth: 700, mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box onClick={() => navigate('/seller/products')}
              sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: CARD, border: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } }}>
              <ArrowBack sx={{ fontSize: 18, color: SUB }} />
            </Box>
            <Box>
              <Typography fontSize={20} fontWeight={800} color={TXT}>Nouvelle annonce</Typography>
              <Typography fontSize={12} color={SUB}>Quel type de service souhaitez-vous publier ?</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {LISTING_TYPES.map(t => {
              const Icon = t.icon;
              const active = listingType === t.key;
              return (
                <Box key={t.key} onClick={() => setListingType(t.key)}
                  sx={{ p: 3, borderRadius: '16px', cursor: 'pointer', transition: 'all 0.15s', bgcolor: active ? `${t.color}14` : CARD, border: `1.5px solid ${active ? t.color : BORD}`, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { border: `1.5px solid ${active ? t.color : 'rgba(15,23,42,0.09)'}` } }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: `${t.color}18`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.color}30` }}>
                    <Icon sx={{ fontSize: 26, color: t.color }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize={16} fontWeight={700} color={TXT}>{t.label}</Typography>
                    <Typography fontSize={12.5} color={SUB} mt={0.3}>{t.desc}</Typography>
                  </Box>
                  {active && <CheckCircle sx={{ color: t.color, fontSize: 22, flexShrink: 0 }} />}
                </Box>
              );
            })}
          </Box>

          <Button fullWidth disabled={!listingType} onClick={() => setStep('form')}
            sx={{ mt: 3, py: 1.5, borderRadius: '12px', fontWeight: 700, fontSize: 14, bgcolor: listingType ? OR : 'rgba(15,23,42,0.09)', color: listingType ? '#fff' : SUB, textTransform: 'none', '&:hover': { bgcolor: listingType ? '#E05A00' : undefined }, '&.Mui-disabled': { bgcolor: 'rgba(15,23,42,0.09)', color: SUB } }}>
            Continuer →
          </Button>
        </Box>
      </Box>
    );
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 780, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box onClick={() => setStep('type')}
            sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: CARD, border: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } }}>
            <ArrowBack sx={{ fontSize: 18, color: SUB }} />
          </Box>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: `${selectedType?.color}18`, border: `1px solid ${selectedType?.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selectedType && <selectedType.icon sx={{ fontSize: 20, color: selectedType.color }} />}
          </Box>
          <Box>
            <Typography fontSize={18} fontWeight={800} color={TXT}>{selectedType?.label}</Typography>
            <Typography fontSize={11.5} color={SUB}>Remplissez les informations de votre annonce</Typography>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px' }}>
            {error}
          </Alert>
        )}

        {/* Informations générales */}
        <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', p: 3, mb: 2.5 }}>
          <Typography fontSize={12} fontWeight={700} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', mb: 2 }}>Informations générales</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            <FormControl fullWidth sx={fieldSx}>
              <InputLabel shrink>Boutique</InputLabel>
              <Select value={storeId} label="Boutique" MenuProps={darkMenu} onChange={e => setStoreId(e.target.value)}>
                {stores.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField fullWidth label="Titre de l'annonce *" sx={fieldSx}
              value={base.title} onChange={e => setBase(b => ({ ...b, title: e.target.value }))}
              placeholder={listingType === 'SERVICE' ? 'Ex: Consultation dentaire + détartrage' : listingType === 'REAL_ESTATE' ? 'Ex: Villa 4 chambres, Pétion-Ville' : 'Ex: Création logo professionnel'} />

            <TextField fullWidth label="Description *" multiline rows={4} sx={fieldSx}
              value={base.description} onChange={e => setBase(b => ({ ...b, description: e.target.value }))}
              placeholder="Décrivez votre service, ce qui est inclus, vos qualifications…" />

            <FormControl fullWidth sx={fieldSx}>
              <InputLabel shrink>Catégorie</InputLabel>
              <Select value={categoryId} label="Catégorie" MenuProps={darkMenu} onChange={e => setCategoryId(e.target.value)}>
                {(cats ?? []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>

          </Box>
        </Box>

        {/* Localisation */}
        <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', p: 3, mb: 2.5 }}>
          <Typography fontSize={12} fontWeight={700} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', mb: 2 }}>Localisation du service</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            <TextField fullWidth label="Adresse complète" sx={fieldSx}
              value={base.address} onChange={e => setBase(b => ({ ...b, address: e.target.value }))}
              placeholder="Ex: 45 Rue Lamartinière, Bois Verna" />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel shrink>Département</InputLabel>
                <Select value={base.department} label="Département" MenuProps={darkMenu} onChange={e => setBase(b => ({ ...b, department: e.target.value }))}>
                  {DEPTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField fullWidth label="Ville / Commune" sx={fieldSx}
                value={base.city} onChange={e => setBase(b => ({ ...b, city: e.target.value }))}
                placeholder="Ex: Port-au-Prince" />
            </Box>

          </Box>
        </Box>

        {/* Photos */}
        <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', p: 3, mb: 2.5 }}>
          <ImagePicker images={images} onChange={setImages} />
          <Typography fontSize={11} color={SUB} mt={1}>Ajoutez des photos claires de votre service, local, ou réalisations antérieures.</Typography>
        </Box>

        {/* Type-specific */}
        <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', p: 3, mb: 2.5 }}>
          <Typography fontSize={12} fontWeight={700} color={SUB} sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', mb: 2 }}>
            {listingType === 'SERVICE' ? 'Détails du service' : listingType === 'REAL_ESTATE' ? 'Caractéristiques du bien' : listingType === 'FOOD' ? 'Détails du plat' : 'Offre freelance'}
          </Typography>
          {listingType === 'SERVICE'     && <ServiceForm     data={extra} onChange={setExtra} />}
          {listingType === 'REAL_ESTATE' && <RealEstateForm  data={extra} onChange={setExtra} />}
          {listingType === 'FREELANCE'   && <FreelanceForm   data={extra} onChange={setExtra} />}
          {listingType === 'FOOD'        && <FoodForm        data={extra} onChange={setExtra} />}
        </Box>

        {/* RDV info banner */}
        {listingType === 'SERVICE' && (
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: `${GRN}10`, border: `1px solid ${GRN}25`, display: 'flex', gap: 1.5, mb: 2.5 }}>
            <Schedule sx={{ color: GRN, fontSize: 18, flexShrink: 0, mt: 0.2 }} />
            <Box>
              <Typography fontSize={12.5} fontWeight={600} color={GRN}>Rendez-vous en ligne activé</Typography>
              <Typography fontSize={11.5} color={SUB} mt={0.3}>Les clients pourront réserver directement depuis la page de votre service. Vous recevrez une notification par email à chaque nouvelle demande.</Typography>
            </Box>
          </Box>
        )}

        {/* Submit */}
        <Button fullWidth onClick={handleSubmit} disabled={mutation.isPending}
          sx={{ py: 1.6, borderRadius: '12px', fontWeight: 800, fontSize: 14, bgcolor: OR, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#E05A00' }, '&.Mui-disabled': { bgcolor: 'rgba(255,107,0,0.3)', color: '#64748B' } }}>
          {mutation.isPending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Publier l\'annonce'}
        </Button>

      </Box>
    </Box>
  );
}
