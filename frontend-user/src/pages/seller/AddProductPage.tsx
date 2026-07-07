import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, IconButton, Collapse,
  CircularProgress, Alert, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  ArrowBack, AddPhotoAlternate, Close, Add, Delete,
  LocationOn, LocalShipping, Storefront, ExpandMore, ExpandLess,
  CheckCircle, Inventory, Star,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

// ── Palette ────────────────────────────────────────────────────────────────

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
const GRN  = '#10B981';
const RED  = '#EF4444';

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
    bgcolor: '#F7F8FA', borderRadius: '10px', fontSize: 13.5, color: TXT,
    '& fieldset': { borderColor: BORD },
    '&:hover fieldset': { borderColor: 'rgba(15,23,42,0.09)' },
    '&.Mui-focused fieldset': { borderColor: OR },
  },
  '& .MuiInputLabel-root': { color: SUB, fontSize: 13 },
  '& .MuiInputLabel-root.Mui-focused': { color: OR },
  '& .MuiFormHelperText-root': { color: SUB, fontSize: 11 },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function detectCategoryType(name: string): string {
  const n = name?.toLowerCase() ?? '';
  if (/phone|smartphone|t[eé]l[eé]phone|mobile|iphone|android/.test(n)) return 'phone';
  if (/v[eê]tement|habit|cloth|mode|robe|chemise|pantalon|shoe|chaussure/.test(n)) return 'clothing';
  if (/v[eé]hicule|voiture|moto|camion|auto|car|truck/.test(n)) return 'vehicle';
  if (/aliment|nourriture|food|boisson|drink|cuisine/.test(n)) return 'food';
  if (/cosm[eé]tique|beaut[eé]|parfum|cr[eè]me|skincare/.test(n)) return 'cosmetics';
  if (/[eé]lectronique|tv|laptop|ordinateur|tablet|console/.test(n)) return 'electronics';
  return 'generic';
}

const CONDITION_MAP: Record<string, { value: string; label: string }[]> = {
  phone: [
    { value: 'new',         label: 'Neuf — boîte scellée' },
    { value: 'refurbished', label: 'Très bon état' },
    { value: 'used',        label: 'Bon état' },
    { value: 'damaged',     label: 'Correct — défauts à préciser' },
  ],
  clothing: [
    { value: 'new',         label: 'Neuf avec étiquette' },
    { value: 'refurbished', label: 'Neuf sans étiquette' },
    { value: 'used',        label: 'Très bon état' },
    { value: 'damaged',     label: 'Bon état / Utilisé' },
  ],
  _: [
    { value: 'new',         label: 'Neuf' },
    { value: 'refurbished', label: 'Reconditionné' },
    { value: 'used',        label: 'Occasion — bon état' },
    { value: 'damaged',     label: 'Endommagé' },
  ],
};
function conditionOptions(ct: string) { return CONDITION_MAP[ct] ?? CONDITION_MAP['_']; }

const COLOR_PRESETS = [
  { name: 'Noir',   hex: '#000000' }, { name: 'Blanc',  hex: '#FFFFFF' },
  { name: 'Rouge',  hex: '#EF4444' }, { name: 'Bleu',   hex: '#3B82F6' },
  { name: 'Vert',   hex: '#10B981' }, { name: 'Jaune',  hex: '#F59E0B' },
  { name: 'Rose',   hex: '#EC4899' }, { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Orange', hex: '#F97316' }, { name: 'Gris',   hex: '#6B7280' },
];

const DEPTS_HT = ['Ouest','Nord','Nord-Est','Nord-Ouest','Sud','Sud-Est','Grand-Anse','Nippes','Centre','Artibonite'];
const SIZES_CLOTHING = ['XS','S','M','L','XL','XXL','3XL'];

interface Variant { id: string; color: string; colorHex: string; size: string; stock: number; priceOverride: string; imageFile: File | null; imagePreview: string | null; }
function newVariant(): Variant { return { id: crypto.randomUUID(), color: '', colorHex: '', size: '', stock: 1, priceOverride: '', imageFile: null, imagePreview: null }; }

// ── Dark section card ──────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', overflow: 'hidden', mb: 2 }}>
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 1.2 }}>
        {icon && <Box sx={{ color: OR, display: 'flex', alignItems: 'center' }}>{icon}</Box>}
        <Typography fontSize={13} fontWeight={700} color={TXT} sx={{ textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</Typography>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Box>
  );
}

// ── Dark toggle switch ─────────────────────────────────────────────────────

function DarkToggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <Box onClick={() => onChange(!checked)}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', py: 0.5,
        '&:hover .track': { borderColor: 'rgba(15,23,42,0.09)' } }}>
      <Box>
        <Typography fontSize={13.5} fontWeight={500} color={TXT}>{label}</Typography>
        {sub && <Typography fontSize={12} color={SUB} mt={0.2}>{sub}</Typography>}
      </Box>
      <Box className="track" sx={{
        width: 44, height: 24, borderRadius: '12px', flexShrink: 0, ml: 2,
        bgcolor: checked ? OR : '#1A2540', border: `1.5px solid ${checked ? OR : BORD}`,
        position: 'relative', transition: 'all 0.2s',
      }}>
        <Box sx={{
          width: 18, height: 18, borderRadius: '50%', bgcolor: '#fff', position: 'absolute',
          top: '50%', transform: `translateY(-50%) translateX(${checked ? 22 : 2}px)`,
          transition: 'transform 0.2s', boxShadow: '0 1px 4px rgba(15,23,42,0.15)',
        }} />
      </Box>
    </Box>
  );
}

// ── Attribute panels ───────────────────────────────────────────────────────

function DarkSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <FormControl fullWidth sx={fieldSx}>
      <InputLabel shrink>{label}</InputLabel>
      <Select value={value} label={label} MenuProps={darkMenu} onChange={e => onChange(e.target.value)}>
        <MenuItem value=""><em style={{ color: SUB, fontStyle: 'normal' }}>Choisir…</em></MenuItem>
        {options.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function PhoneFields({ attrs, onChange }: { attrs: any; onChange: (k: string, v: string) => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField fullWidth label="Marque (Samsung, Apple…)" sx={fieldSx} value={attrs.brand || ''} onChange={e => onChange('brand', e.target.value)} />
        <TextField fullWidth label="Modèle" sx={fieldSx} value={attrs.model || ''} onChange={e => onChange('model', e.target.value)} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <DarkSelect label="Stockage" value={attrs.storage || ''} onChange={v => onChange('storage', v)} options={['16 GB','32 GB','64 GB','128 GB','256 GB','512 GB']} />
        <DarkSelect label="RAM" value={attrs.ram || ''} onChange={v => onChange('ram', v)} options={['2 GB','3 GB','4 GB','6 GB','8 GB','12 GB','16 GB']} />
        <DarkSelect label="Réseau" value={attrs.network || ''} onChange={v => onChange('network', v)} options={['3G','4G','5G']} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField fullWidth label="IMEI (optionnel)" sx={fieldSx} value={attrs.imei || ''} onChange={e => onChange('imei', e.target.value)} inputProps={{ maxLength: 20 }} />
        <TextField fullWidth label="Couleur (ex: Noir Titane)" sx={fieldSx} value={attrs.color || ''} onChange={e => onChange('color', e.target.value)} />
      </Box>
      <TextField fullWidth label="Problèmes connus (optionnel)" multiline rows={2} sx={fieldSx} value={attrs.knownIssues || ''} onChange={e => onChange('knownIssues', e.target.value)} />
    </Box>
  );
}

function ClothingFields({ attrs, onChange }: { attrs: any; onChange: (k: string, v: string) => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <DarkSelect label="Genre" value={attrs.gender || ''} onChange={v => onChange('gender', v)} options={['Homme','Femme','Enfant','Unisexe']} />
        <DarkSelect label="Matière" value={attrs.material || ''} onChange={v => onChange('material', v)} options={['Coton','Polyester','Lin','Laine','Soie','Denim','Cuir','Synthétique']} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField fullWidth label="Marque (optionnel)" sx={fieldSx} value={attrs.brand || ''} onChange={e => onChange('brand', e.target.value)} />
        <TextField fullWidth label="Style (décontracté, élégant…)" sx={fieldSx} value={attrs.style || ''} onChange={e => onChange('style', e.target.value)} />
      </Box>
    </Box>
  );
}

function VehicleFields({ attrs, onChange }: { attrs: any; onChange: (k: string, v: string) => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField fullWidth label="Marque (Toyota, Honda…)" sx={fieldSx} value={attrs.brand || ''} onChange={e => onChange('brand', e.target.value)} />
        <TextField fullWidth label="Modèle" sx={fieldSx} value={attrs.model || ''} onChange={e => onChange('model', e.target.value)} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <TextField fullWidth label="Année" type="number" sx={fieldSx} value={attrs.year || ''} onChange={e => onChange('year', e.target.value)} inputProps={{ min: 1950, max: 2030 }} />
        <TextField fullWidth label="Kilométrage (km)" type="number" sx={fieldSx} value={attrs.mileage || ''} onChange={e => onChange('mileage', e.target.value)} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <DarkSelect label="Carburant" value={attrs.fuel || ''} onChange={v => onChange('fuel', v)} options={['Essence','Diesel','Électrique','Hybride','GPL']} />
        <DarkSelect label="Transmission" value={attrs.transmission || ''} onChange={v => onChange('transmission', v)} options={['Manuelle','Automatique']} />
      </Box>
    </Box>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function AddProductPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const mainImgRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '', subtitle: '', description: '',
    categoryId: '', brandId: '', price: '', salePrice: '',
    stock: '1', sku: '', condition: 'new', conditionNote: '',
    city: '', department: 'Ouest', storeId: '',
    hasDelivery: false, deliveryPriceHTG: '',
  });
  const [deliveryZones, setDeliveryZones] = useState<{ city: string; dept: string }[]>([]);
  const [zoneInput, setZoneInput]         = useState({ city: '', dept: 'Ouest' });
  const [attrs, setAttrs]       = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<Variant[]>([]);
  const [mainImages, setMainImages]   = useState<File[]>([]);
  const [mainPreviews, setMainPreviews] = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showAttrs, setShowAttrs]     = useState(false);
  const [showVariants, setShowVariants] = useState(false);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: brands }     = useQuery({ queryKey: ['brands'],     queryFn: () => api.get('/brands').then(r => r.data) });
  const { data: storesData } = useQuery({ queryKey: ['myStores'],   queryFn: () => api.get('/stores/me/all').then(r => r.data) });
  const { data: sub }        = useQuery({ queryKey: ['sellerSub'],  queryFn: () => api.get('/subscriptions/me').then(r => r.data) });

  const maxImages = sub?.plan?.maxImages ?? 5;
  const storeList: any[] = storesData?.stores ?? [];
  const selectedCatName = (categories ?? []).find((c: any) => c.id === form.categoryId)?.name ?? '';
  const catType = detectCategoryType(selectedCatName);
  const condOpts = conditionOptions(catType === 'electronics' ? 'phone' : catType);

  const set = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setAttr = (k: string, v: string) => setAttrs(p => ({ ...p, [k]: v }));

  // Photos
  const addPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.slice(0, maxImages - mainImages.length).filter(f => f.size <= 8 * 1024 * 1024);
    setMainImages(p => [...p, ...valid]);
    setMainPreviews(p => [...p, ...valid.map(f => URL.createObjectURL(f))]);
    e.target.value = '';
  };
  const removePhoto = (i: number) => {
    URL.revokeObjectURL(mainPreviews[i]);
    setMainImages(p => p.filter((_, j) => j !== i));
    setMainPreviews(p => p.filter((_, j) => j !== i));
  };

  // Variants
  const addVariant = () => setVariants(p => [...p, newVariant()]);
  const delVariant = (id: string) => { const v = variants.find(x => x.id === id); if (v?.imagePreview) URL.revokeObjectURL(v.imagePreview); setVariants(p => p.filter(x => x.id !== id)); };
  const changeVariant = (id: string, k: keyof Variant, val: any) => setVariants(p => p.map(v => v.id === id ? { ...v, [k]: val } : v));
  const addQuickSize = (size: string) => { if (!variants.some(v => v.size === size)) setVariants(p => [...p, { ...newVariant(), size }]); };

  // Delivery zones
  const addZone = () => {
    const label = zoneInput.city.trim()
      ? `${zoneInput.city.trim()}, ${zoneInput.dept}`
      : zoneInput.dept;
    if (deliveryZones.some(z => `${z.city}, ${z.dept}` === label || z.dept === label)) return;
    setDeliveryZones(p => [...p, { city: zoneInput.city.trim(), dept: zoneInput.dept }]);
    setZoneInput(z => ({ ...z, city: '' }));
  };
  const removeZone = (i: number) => setDeliveryZones(p => p.filter((_, j) => j !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.categoryId || !form.price) { setError('Remplissez titre, description, catégorie et prix'); return; }
    if (!mainImages.length) { setError('Ajoutez au moins une photo'); return; }
    if (form.salePrice && Number(form.salePrice) >= Number(form.price)) {
      setError('Le prix normal doit être supérieur au prix promo');
      return;
    }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      if (form.subtitle) fd.append('subtitle', form.subtitle);
      fd.append('description', form.description);
      fd.append('categoryId', form.categoryId);
      if (form.brandId) fd.append('brandId', form.brandId);
      fd.append('price', form.price);
      if (form.salePrice) fd.append('salePrice', form.salePrice);
      const totalStock = variants.length > 0 ? variants.reduce((s, v) => s + v.stock, 0) : parseInt(form.stock) || 1;
      fd.append('stock', String(totalStock));
      if (form.sku) fd.append('sku', form.sku);
      fd.append('condition', form.condition);
      if (form.conditionNote) fd.append('conditionNote', form.conditionNote);
      if (form.city) fd.append('city', form.city);
      if (form.department) fd.append('department', form.department);
      fd.append('hasDelivery', String(form.hasDelivery));
      if (form.hasDelivery && form.deliveryPriceHTG) fd.append('deliveryPriceHTG', form.deliveryPriceHTG);
      // deliveryDepts: send each zone as "Ville, Département" or just "Département"
      deliveryZones.forEach(z => fd.append('deliveryDepts', z.city ? `${z.city}, ${z.dept}` : z.dept));
      if (form.storeId) fd.append('storeId', form.storeId);
      if (Object.keys(attrs).length) fd.append('attributes', JSON.stringify(attrs));
      const variantImageFiles: File[] = [];
      const variantData = variants.map(v => { let imageFileIndex: number | undefined; if (v.imageFile) { imageFileIndex = variantImageFiles.length; variantImageFiles.push(v.imageFile); } return { color: v.color, colorHex: v.colorHex, size: v.size, stock: v.stock, priceOverride: v.priceOverride || undefined, imageFileIndex }; });
      if (variantData.length) fd.append('variants', JSON.stringify(variantData));
      mainImages.forEach(img => fd.append('images', img));
      variantImageFiles.forEach(img => fd.append('variantImages', img));
      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      enqueueSnackbar('Produit soumis pour validation !', { variant: 'success' });
      navigate('/seller/products');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la création');
    } finally { setLoading(false); }
  };

  // sub === null → no subscription
  if (sub === null) return (
    <Box sx={{ p: 3, maxWidth: 500, mx: 'auto', textAlign: 'center', mt: 8, bgcolor: BG, minHeight: '100vh' }}>
      <Box sx={{ p: 3.5, borderRadius: '20px', bgcolor: CARD, border: '1px solid rgba(245,158,11,0.25)' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2.5, bgcolor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Star sx={{ color: '#F59E0B', fontSize: 28 }} />
        </Box>
        <Typography fontWeight={800} fontSize={17} color={TXT} mb={1}>Abonnement requis</Typography>
        <Typography fontSize={13.5} color={SUB} mb={3} lineHeight={1.6}>Vous devez avoir un abonnement actif pour ajouter des produits.</Typography>
        <Button component={Link} to="/seller/subscription" sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 800, px: 4, py: 1.3, textTransform: 'none', '&:hover': { bgcolor: '#E05A00' } }}>
          Choisir un abonnement
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', pb: 6 }}>

      {/* ── Sticky header ── */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 100, bgcolor: '#FFFFFF', borderBottom: `1px solid ${BORD}`, px: { xs: 2, md: 3 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, backdropFilter: 'blur(10px)' }}>
        <Box component={Link} to="/seller/products"
          sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: CARD, border: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } }}>
          <ArrowBack sx={{ fontSize: 18, color: SUB }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flex: 1 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: `${OR}18`, border: `1px solid ${OR}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Inventory sx={{ fontSize: 17, color: OR }} />
          </Box>
          <Typography fontWeight={800} fontSize={16} color={TXT}>Nouveau produit</Typography>
        </Box>
        <Button type="submit" form="listing-form" disabled={loading}
          sx={{ bgcolor: OR, color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: 13.5, px: 3, py: 1, textTransform: 'none', '&:hover': { bgcolor: '#E05A00' }, '&.Mui-disabled': { bgcolor: 'rgba(255,107,0,0.3)', color: '#64748B' } }}>
          {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Publier'}
        </Button>
      </Box>

      <form id="listing-form" onSubmit={handleSubmit}>
        <Box sx={{ maxWidth: 780, mx: 'auto', px: { xs: 2, md: 3 }, pt: 3 }}>

          {error && (
            <Alert severity="error" onClose={() => setError('')}
              sx={{ mb: 2.5, bgcolor: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: '12px', '& .MuiAlert-icon': { color: RED } }}>
              {error}
            </Alert>
          )}

          {/* ── PHOTOS ── */}
          <SectionCard title="Photos" icon={<AddPhotoAlternate sx={{ fontSize: 17 }} />}>
            <Typography fontSize={12} color={SUB} mb={2}>La première photo sera l'image principale. Max {maxImages} photos, 8 Mo chacune.</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {mainImages.length < maxImages && (
                <Box onClick={() => mainImgRef.current?.click()}
                  sx={{ width: 96, height: 96, borderRadius: '12px', border: `2px dashed ${BORD}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.8, cursor: 'pointer', bgcolor: 'rgba(15,23,42,0.09)', transition: 'all 0.15s', '&:hover': { borderColor: OR, bgcolor: `${OR}08` } }}>
                  <AddPhotoAlternate sx={{ fontSize: 28, color: SUB }} />
                  <Typography fontSize={10.5} color={SUB} textAlign="center">{mainImages.length === 0 ? 'Photo\nprincipale' : 'Ajouter'}</Typography>
                </Box>
              )}
              {mainPreviews.map((src, i) => (
                <Box key={i} sx={{ width: 96, height: 96, borderRadius: '12px', overflow: 'hidden', position: 'relative', border: `2px solid ${i === 0 ? OR : BORD}`, flexShrink: 0 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {i === 0 && (
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(255,107,0,0.88)', py: 0.4, textAlign: 'center' }}>
                      <Typography fontSize={9} fontWeight={800} color="#fff">PRINCIPALE</Typography>
                    </Box>
                  )}
                  <IconButton size="small" onClick={() => removePhoto(i)}
                    sx={{ position: 'absolute', top: 3, right: 3, bgcolor: 'rgba(0,0,0,0.6)', p: '3px', '&:hover': { bgcolor: 'rgba(239,68,68,0.85)' } }}>
                    <Close sx={{ fontSize: 11, color: '#fff' }} />
                  </IconButton>
                </Box>
              ))}
              {mainImages.length === 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,107,0,0.06)', border: `1px solid ${OR}20`, flex: 1, minWidth: 200 }}>
                  <Typography fontSize={12.5} color={SUB2}>Cliquez sur le cadre pour ajouter votre première photo</Typography>
                </Box>
              )}
            </Box>
            <input type="file" ref={mainImgRef} hidden accept="image/*" multiple onChange={addPhotos} />
          </SectionCard>

          {/* ── TITRE & DESCRIPTION ── */}
          <SectionCard title="Informations" icon={<Inventory sx={{ fontSize: 17 }} />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField fullWidth label="Titre de l'annonce *" value={form.name} onChange={set('name')}
                required inputProps={{ maxLength: 200 }} sx={fieldSx}
                helperText={`${form.name.length}/200`} />
              <TextField fullWidth label="Sous-titre (optionnel)" value={form.subtitle} onChange={set('subtitle')}
                inputProps={{ maxLength: 80 }} sx={fieldSx}
                placeholder="Ex: Livraison rapide · Garantie incluse"
                helperText={`${(form.subtitle || '').length}/80`} />
              <TextField fullWidth multiline rows={4} label="Description *" value={form.description}
                onChange={set('description')} required sx={fieldSx}
                placeholder="Décrivez votre produit : matériaux, dimensions, état, utilisation…"
                helperText="Recommandé — améliore la visibilité" />
            </Box>
          </SectionCard>

          {/* ── PRIX & CATÉGORIE ── */}
          <SectionCard title="Prix & Catégorie">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField fullWidth label="Prix (HTG) *" type="number" value={form.price} onChange={set('price')}
                  required inputProps={{ min: 0 }} sx={fieldSx} />
                <TextField fullWidth label="Prix promo (optionnel)" type="number" value={form.salePrice}
                  onChange={set('salePrice')} inputProps={{ min: 0 }} sx={{ ...fieldSx, '& .MuiInputLabel-root.Mui-focused': { color: '#F59E0B' }, '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#F59E0B' } }} />
              </Box>

              <FormControl fullWidth sx={fieldSx}>
                <InputLabel shrink>Catégorie *</InputLabel>
                <Select value={form.categoryId} label="Catégorie *" MenuProps={darkMenu}
                  onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}>
                  <MenuItem value=""><em style={{ color: SUB, fontStyle: 'normal' }}>Choisir une catégorie</em></MenuItem>
                  {(categories ?? []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>

              {(catType === 'phone' || catType === 'electronics' || catType === 'vehicle') && (
                <FormControl fullWidth sx={fieldSx}>
                  <InputLabel shrink>Marque</InputLabel>
                  <Select value={form.brandId} label="Marque" MenuProps={darkMenu}
                    onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))}>
                    <MenuItem value="">Sans marque spécifique</MenuItem>
                    {(brands ?? []).map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                  </Select>
                </FormControl>
              )}

              <FormControl fullWidth sx={fieldSx}>
                <InputLabel shrink>État *</InputLabel>
                <Select value={form.condition} label="État *" MenuProps={darkMenu}
                  onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}>
                  {condOpts.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>

              {(form.condition === 'used' || form.condition === 'damaged') && (
                <TextField fullWidth multiline rows={2} label="Décrivez les défauts *" value={form.conditionNote}
                  onChange={set('conditionNote')} required sx={fieldSx}
                  helperText="Les acheteurs apprécient la transparence" />
              )}

              {/* Caractéristiques spécifiques */}
              {form.categoryId && catType !== 'generic' && catType !== 'food' && catType !== 'cosmetics' && (
                <Box sx={{ border: `1px solid ${BORD}`, borderRadius: '12px', overflow: 'hidden' }}>
                  <Box onClick={() => setShowAttrs(p => !p)}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } }}>
                    <Typography fontSize={13} fontWeight={600} color={TXT}>
                      {catType === 'phone' || catType === 'electronics' ? '📱 Caractéristiques téléphone / électronique'
                        : catType === 'clothing' ? '👕 Caractéristiques vêtement'
                        : catType === 'vehicle' ? '🚗 Caractéristiques véhicule'
                        : '📋 Caractéristiques'}
                    </Typography>
                    {showAttrs ? <ExpandLess sx={{ color: SUB, fontSize: 18 }} /> : <ExpandMore sx={{ color: SUB, fontSize: 18 }} />}
                  </Box>
                  <Collapse in={showAttrs}>
                    <Box sx={{ p: 2, pt: 0, borderTop: `1px solid ${BORD}` }}>
                      <Box sx={{ pt: 2 }}>
                        {(catType === 'phone' || catType === 'electronics') && <PhoneFields attrs={attrs} onChange={setAttr} />}
                        {catType === 'clothing' && <ClothingFields attrs={attrs} onChange={setAttr} />}
                        {catType === 'vehicle'  && <VehicleFields  attrs={attrs} onChange={setAttr} />}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
          </SectionCard>

          {/* ── LOCALISATION ── */}
          <SectionCard title="Localisation" icon={<LocationOn sx={{ fontSize: 17 }} />}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel shrink>Département</InputLabel>
                <Select value={form.department} label="Département" MenuProps={darkMenu}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                  {DEPTS_HT.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField fullWidth label="Ville / Quartier" value={form.city} onChange={set('city')} sx={fieldSx} />
            </Box>
          </SectionCard>

          {/* ── OPTIONS DE VENTE ── */}
          <SectionCard title="Options de vente" icon={<LocalShipping sx={{ fontSize: 17 }} />}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

              <DarkToggle checked={form.hasDelivery} onChange={v => setForm(p => ({ ...p, hasDelivery: v }))}
                label="Livraison disponible" sub="Proposer la livraison aux acheteurs" />

              <Collapse in={form.hasDelivery}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
                  <TextField fullWidth label="Frais de livraison (HTG — laisser vide si gratuit)" type="number"
                    value={form.deliveryPriceHTG} onChange={set('deliveryPriceHTG')} inputProps={{ min: 0 }} sx={fieldSx} />

                  {/* Zone adder */}
                  <Box>
                    <Typography fontSize={12.5} fontWeight={600} color={SUB2} mb={1.2}>
                      Zones de livraison <Typography component="span" fontSize={11} color={SUB}>(ville + département)</Typography>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <TextField
                        label="Ville (ex: Port-au-Prince)" value={zoneInput.city}
                        onChange={e => setZoneInput(z => ({ ...z, city: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addZone(); } }}
                        sx={{ ...fieldSx, flex: '1 1 160px' }} size="small" />
                      <FormControl sx={{ ...fieldSx, flex: '1 1 130px' }} size="small">
                        <InputLabel shrink>Département</InputLabel>
                        <Select value={zoneInput.dept} label="Département" MenuProps={darkMenu}
                          onChange={e => setZoneInput(z => ({ ...z, dept: e.target.value }))}>
                          {DEPTS_HT.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Box onClick={addZone}
                        sx={{ height: 40, px: 1.8, borderRadius: '10px', bgcolor: OR, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, '&:hover': { bgcolor: '#E05A00' } }}>
                        <Add sx={{ fontSize: 18, color: '#fff' }} />
                      </Box>
                    </Box>

                    {/* Added zones */}
                    {deliveryZones.length > 0 && (
                      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {deliveryZones.map((z, i) => (
                          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.2, py: 0.6, borderRadius: '8px', bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)' }}>
                            <Typography fontSize={12} fontWeight={600} color={OR}>
                              {z.city ? `${z.city}, ${z.dept}` : z.dept}
                            </Typography>
                            <Close onClick={() => removeZone(i)} sx={{ fontSize: 13, color: OR, cursor: 'pointer', opacity: 0.7, '&:hover': { opacity: 1 } }} />
                          </Box>
                        ))}
                      </Box>
                    )}
                    {deliveryZones.length === 0 && (
                      <Typography fontSize={11.5} color={SUB} mt={1}>Aucune zone ajoutée — les clients verront ces zones lors de la commande.</Typography>
                    )}
                  </Box>
                </Box>
              </Collapse>

              {/* Boutique */}
              {storeList.length > 1 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                    <Storefront sx={{ fontSize: 16, color: SUB }} />
                    <Typography fontSize={13} fontWeight={600} color={SUB2}>Boutique</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {storeList.map((s: any) => {
                      const active = form.storeId === s.id || (!form.storeId && s.isPrimary);
                      return (
                        <Box key={s.id} onClick={() => setForm(p => ({ ...p, storeId: s.id }))}
                          sx={{ px: 1.5, py: 0.7, borderRadius: '8px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, transition: 'all 0.15s', bgcolor: active ? 'rgba(255,107,0,0.12)' : 'rgba(15,23,42,0.09)', color: active ? OR : SUB2, border: `1px solid ${active ? `${OR}40` : BORD}` }}>
                          {s.name}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Stock & SKU */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField fullWidth label="Stock" type="number" value={form.stock}
                  onChange={set('stock')} inputProps={{ min: 1 }} sx={fieldSx} />
                <TextField fullWidth label="Référence / SKU (optionnel)" value={form.sku}
                  onChange={set('sku')} sx={fieldSx} />
              </Box>
            </Box>
          </SectionCard>

          {/* ── VARIANTES ── */}
          <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', mb: 2, overflow: 'hidden' }}>
            <Box onClick={() => setShowVariants(p => !p)}
              sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography fontSize={13} fontWeight={700} color={TXT} sx={{ textTransform: 'uppercase', letterSpacing: '0.6px' }}>Variantes couleur / taille</Typography>
                {variants.length > 0 && (
                  <Box sx={{ px: 1.2, py: 0.2, borderRadius: '6px', bgcolor: `${GRN}15`, border: `1px solid ${GRN}30` }}>
                    <Typography fontSize={11} fontWeight={700} color={GRN}>{variants.length} variante{variants.length > 1 ? 's' : ''}</Typography>
                  </Box>
                )}
              </Box>
              {variants.length > 0 ? <CheckCircle sx={{ color: GRN, fontSize: 20 }} /> : showVariants ? <ExpandLess sx={{ color: SUB, fontSize: 18 }} /> : <ExpandMore sx={{ color: SUB, fontSize: 18 }} />}
            </Box>

            <Collapse in={showVariants}>
              <Box sx={{ borderTop: `1px solid ${BORD}`, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Quick sizes for clothing */}
                {catType === 'clothing' && (
                  <Box>
                    <Typography fontSize={12} color={SUB} mb={1}>Ajouter des tailles rapidement :</Typography>
                    <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                      {SIZES_CLOTHING.map(s => {
                        const active = variants.some(v => v.size === s);
                        return (
                          <Box key={s} onClick={() => addQuickSize(s)}
                            sx={{ px: 1.5, py: 0.6, borderRadius: '8px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, bgcolor: active ? OR : 'rgba(15,23,42,0.09)', color: active ? '#fff' : SUB2, border: `1px solid ${active ? OR : BORD}` }}>
                            {s}
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {/* Variant cards */}
                {variants.map((v, i) => (
                  <Box key={v.id} sx={{ p: 2, bgcolor: '#F7F8FA', borderRadius: '12px', border: `1px solid ${BORD}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography fontSize={12.5} fontWeight={700} color={SUB2}>Variante {i + 1}</Typography>
                      <IconButton size="small" onClick={() => delVariant(v.id)}
                        sx={{ bgcolor: 'rgba(239,68,68,0.1)', p: '5px', borderRadius: '7px', '&:hover': { bgcolor: 'rgba(239,68,68,0.2)' } }}>
                        <Delete sx={{ fontSize: 14, color: RED }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TextField size="small" label="Couleur" value={v.color} onChange={e => changeVariant(v.id, 'color', e.target.value)} sx={{ ...fieldSx, flex: '1 1 100px' }} />
                      <input type="color" value={v.colorHex || '#FFFFFF'} onChange={e => changeVariant(v.id, 'colorHex', e.target.value)}
                        style={{ width: 38, height: 38, borderRadius: '10px', border: `1.5px solid ${BORD}`, cursor: 'pointer', padding: 3, background: 'transparent' }} />
                      <TextField size="small" label="Taille" value={v.size} onChange={e => changeVariant(v.id, 'size', e.target.value)} sx={{ ...fieldSx, flex: '1 1 70px' }} />
                      <TextField size="small" label="Stock" type="number" value={v.stock} onChange={e => changeVariant(v.id, 'stock', parseInt(e.target.value) || 0)} inputProps={{ min: 0 }} sx={{ ...fieldSx, flex: '1 1 70px' }} />
                      <TextField size="small" label="Prix spécial (HTG)" type="number" value={v.priceOverride} onChange={e => changeVariant(v.id, 'priceOverride', e.target.value)} sx={{ ...fieldSx, flex: '1 1 110px' }} />
                    </Box>
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                      {COLOR_PRESETS.map(p => (
                        <Box key={p.hex} onClick={() => { changeVariant(v.id, 'color', p.name); changeVariant(v.id, 'colorHex', p.hex); }}
                          title={p.name}
                          sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: p.hex, cursor: 'pointer', border: v.colorHex === p.hex ? `2.5px solid ${OR}` : `1.5px solid ${BORD}`, '&:hover': { transform: 'scale(1.25)', transition: 'transform 0.1s' }, transition: 'transform 0.1s' }} />
                      ))}
                    </Box>
                  </Box>
                ))}

                <Box onClick={addVariant}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 1.5, borderRadius: '12px', border: `1.5px dashed ${BORD}`, cursor: 'pointer', '&:hover': { borderColor: OR, bgcolor: `${OR}06` }, transition: 'all 0.15s' }}>
                  <Add sx={{ fontSize: 18, color: SUB }} />
                  <Typography fontSize={13} color={SUB} fontWeight={600}>Ajouter une variante</Typography>
                </Box>
              </Box>
            </Collapse>
          </Box>

          {/* Bottom submit */}
          <Button fullWidth type="submit" disabled={loading}
            sx={{ py: 1.6, borderRadius: '14px', fontWeight: 800, fontSize: 15, bgcolor: OR, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#E05A00' }, '&.Mui-disabled': { bgcolor: 'rgba(255,107,0,0.3)', color: '#64748B' }, mb: 2 }}>
            {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Publier le produit'}
          </Button>

        </Box>
      </form>
    </Box>
  );
}
