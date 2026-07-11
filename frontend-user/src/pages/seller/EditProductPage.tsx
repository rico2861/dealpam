import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, FormControl,
  InputLabel, Select, MenuItem, Chip, IconButton, Collapse,
} from '@mui/material';
import { Add, Close, PhotoCamera, Delete as DeleteIcon, ArrowBack, Inventory } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { parsePriceTiers } from '../../utils/priceTiers';

// ── Palette (identique aux autres pages vendeur redesignées) ────────────────

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '16px', overflow: 'hidden', mb: 2 }}>
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${BORD}` }}>
        <Typography fontSize={13} fontWeight={700} color={TXT} sx={{ textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</Typography>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Box>
  );
}

function DarkToggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <Box onClick={() => onChange(!checked)}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', py: 0.5 }}>
      <Box>
        <Typography fontSize={13.5} fontWeight={500} color={TXT}>{label}</Typography>
        {sub && <Typography fontSize={12} color={SUB} mt={0.2}>{sub}</Typography>}
      </Box>
      <Box sx={{
        width: 44, height: 24, borderRadius: '12px', flexShrink: 0, ml: 2,
        bgcolor: checked ? OR : 'rgba(15,23,42,0.12)', border: `1.5px solid ${checked ? OR : BORD}`,
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

const DEPTS_HT = ['Ouest','Nord','Nord-Est','Nord-Ouest','Sud','Sud-Est','Grand-Anse','Nippes','Centre','Artibonite'];

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState<any>(null);
  const [priceTiers, setPriceTiers] = useState<{ minQty: string; price: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [zoneInput, setZoneInput] = useState({ city: '', dept: 'Ouest' });
  const [deliveryZones, setDeliveryZones] = useState<{ city: string; dept: string }[]>([]);
  const [pickupPointNames, setPickupPointNames] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product-edit', id],
    // /products/:slug (findOne) attend un slug, pas l'id du produit — utiliser
    // /products/me/:id (scoped vendeur) qui résout par id et vérifie la
    // propriété. L'ancien appel renvoyait un 404 silencieux → spinner infini.
    queryFn: () => api.get(`/products/me/${id}`).then(r => r.data),
    enabled: !!id,
    retry: false,
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/brands').then(r => r.data) });
  const { data: storesData } = useQuery({ queryKey: ['myStores'], queryFn: () => api.get('/stores/me/all').then(r => r.data) });

  const storeList: any[] = storesData?.stores ?? [];
  const productStore = storeList.find((s: any) => s.id === product?.storeId);
  const storePickupPoints: any[] = (() => {
    if (!productStore?.pickupPoints) return [];
    try { const p = JSON.parse(productStore.pickupPoints); return Array.isArray(p) ? p : []; } catch { return []; }
  })();
  const showCurrencyPanel = productStore?.currency === 'USD' && Number(productStore?.exchangeRate) > 0;
  const usdEquivalent = showCurrencyPanel && form?.price ? (Number(form.price) / Number(productStore.exchangeRate)).toFixed(2) : null;

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        categoryId: product.categoryId || '',
        brandId: product.brandId || '',
        price: product.price || '',
        salePrice: product.salePrice || '',
        stock: product.stock || 0,
        sku: product.sku || '',
        minOrderQty: product.minOrderQty || 1,
        city: product.city || '',
        department: product.department || '',
        hasDelivery: !!product.hasDelivery,
        deliveryPriceHTG: product.deliveryPriceHTG ?? '',
        allowOffers: !!product.allowOffers,
        minOfferPriceHTG: product.minOfferPriceHTG ?? '',
        isLimitedEdition: !!product.isLimitedEdition,
      });
      setPriceTiers(
        parsePriceTiers(product.priceTiers).map(t => ({ minQty: String(t.minQty), price: String(t.price) })),
      );
      setImages(product.images || []);
      try {
        const depts: string[] = JSON.parse(product.deliveryDepts || '[]');
        setDeliveryZones(depts.map(d => {
          const [city, dept] = d.includes(',') ? d.split(',').map((s: string) => s.trim()) : ['', d.trim()];
          return { city, dept };
        }));
      } catch { setDeliveryZones([]); }
      try {
        const names = JSON.parse(product.pickupPointNames || '[]');
        setPickupPointNames(Array.isArray(names) ? names : []);
      } catch { setPickupPointNames([]); }
    }
  }, [product]);

  const addZone = () => {
    const label = zoneInput.city.trim()
      ? `${zoneInput.city.trim()}, ${zoneInput.dept}`
      : zoneInput.dept;
    if (deliveryZones.some(z => `${z.city}, ${z.dept}` === label || z.dept === label)) return;
    setDeliveryZones(p => [...p, { city: zoneInput.city.trim(), dept: zoneInput.dept }]);
    setZoneInput(z => ({ ...z, city: '' }));
  };
  const removeZone = (i: number) => setDeliveryZones(p => p.filter((_, j) => j !== i));
  const togglePickupPoint = (name: string) => setPickupPointNames(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name]);

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewImages(p => [...p, ...files]);
    e.target.value = '';
  };
  const removeNewImage = (i: number) => setNewImages(p => p.filter((_, j) => j !== i));

  const handleDeleteExistingImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      await api.delete(`/products/images/${imageId}`);
      setImages(p => p.filter(img => img.id !== imageId));
      enqueueSnackbar('Photo supprimée', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e.response?.data?.message || 'Erreur lors de la suppression', { variant: 'error' });
    } finally { setDeletingImageId(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.salePrice && Number(form.salePrice) >= Number(form.price)) {
      setError('Le prix normal doit être supérieur au prix promo');
      return;
    }
    setLoading(true); setError('');
    try {
      // @IsOptional() de class-validator ne traite que `undefined` comme absent —
      // une chaîne vide ('') échoue encore la validation (@IsUUID/@IsNumber).
      // On nettoie donc le payload avant envoi au lieu de forwarder le form tel quel.
      const cleanTiers = priceTiers
        .filter(t => t.minQty !== '' && t.price !== '')
        .map(t => ({ minQty: Number(t.minQty), price: Number(t.price) }));
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      if (form.categoryId) fd.append('categoryId', form.categoryId);
      if (form.brandId) fd.append('brandId', form.brandId);
      if (form.price !== '') fd.append('price', String(Number(form.price)));
      if (form.salePrice !== '') fd.append('salePrice', String(Number(form.salePrice)));
      if (form.stock !== '') fd.append('stock', String(Number(form.stock)));
      if (form.sku) fd.append('sku', form.sku);
      if (form.minOrderQty !== '') fd.append('minOrderQty', String(Number(form.minOrderQty)));
      if (cleanTiers.length) fd.append('priceTiers', JSON.stringify(cleanTiers));
      if (form.city) fd.append('city', form.city);
      if (form.department) fd.append('department', form.department);
      fd.append('hasDelivery', String(form.hasDelivery));
      if (form.hasDelivery && form.deliveryPriceHTG !== '') fd.append('deliveryPriceHTG', String(Number(form.deliveryPriceHTG)));
      fd.append('allowOffers', String(form.allowOffers));
      if (form.allowOffers && form.minOfferPriceHTG !== '') fd.append('minOfferPriceHTG', String(Number(form.minOfferPriceHTG)));
      fd.append('isLimitedEdition', String(form.isLimitedEdition));
      deliveryZones.forEach(z => fd.append('deliveryDepts', z.city ? `${z.city}, ${z.dept}` : z.dept));
      fd.append('pickupPointNames', JSON.stringify(pickupPointNames));
      newImages.forEach(img => fd.append('images', img));
      await api.patch(`/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries({ queryKey: ['sellerProducts'] });
      enqueueSnackbar(
        'Produit mis à jour — il repasse en vérification avant d\'être republié',
        { variant: 'success', autoHideDuration: 5000 },
      );
      navigate('/seller/products');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la mise a jour');
    } finally {
      setLoading(false);
    }
  };

  if (isError) {
    return (
      <Box sx={{ bgcolor: BG, minHeight: '100vh', py: 6, px: 2 }}>
        <Box sx={{ maxWidth: 480, mx: 'auto' }}>
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            Impossible de charger ce produit (introuvable ou vous n'y avez pas accès).
          </Alert>
          <Button onClick={() => navigate('/seller/products')}>Retour</Button>
        </Box>
      </Box>
    );
  }
  if (isLoading || !form) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, bgcolor: BG, minHeight: '100vh' }}><CircularProgress sx={{ color: OR }} /></Box>;

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

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
          <Typography fontWeight={800} fontSize={16} color={TXT}>Modifier le produit</Typography>
        </Box>
        <Button type="submit" form="edit-product-form" disabled={loading}
          sx={{ bgcolor: OR, color: '#fff', borderRadius: '10px', fontWeight: 700, fontSize: 13.5, px: 3, py: 1, textTransform: 'none', '&:hover': { bgcolor: '#E05A00' }, '&.Mui-disabled': { bgcolor: 'rgba(255,107,0,0.3)', color: '#64748B' } }}>
          {loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Enregistrer'}
        </Button>
      </Box>

      <form id="edit-product-form" onSubmit={handleSubmit}>
        <Box sx={{ maxWidth: 780, mx: 'auto', px: { xs: 2, md: 3 }, pt: 3 }}>

          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}

          {/* ── PHOTOS ── */}
          <SectionCard title="Photos">
            <input type="file" ref={fileInputRef} accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddImages} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {images.map(img => (
                <Box key={img.id} sx={{ position: 'relative', width: 88, height: 88, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${BORD}` }}>
                  <Box component="img" src={img.urlThumb || img.urlMedium} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" onClick={() => handleDeleteExistingImage(img.id)}
                    disabled={deletingImageId === img.id}
                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', width: 22, height: 22, '&:hover': { bgcolor: 'rgba(220,38,38,0.85)' } }}>
                    {deletingImageId === img.id ? <CircularProgress size={12} color="inherit" /> : <DeleteIcon sx={{ fontSize: 13 }} />}
                  </IconButton>
                </Box>
              ))}
              {newImages.map((file, i) => (
                <Box key={i} sx={{ position: 'relative', width: 88, height: 88, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(16,185,129,0.4)' }}>
                  <Box component="img" src={URL.createObjectURL(file)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <IconButton size="small" onClick={() => removeNewImage(i)}
                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', width: 22, height: 22, '&:hover': { bgcolor: 'rgba(220,38,38,0.85)' } }}>
                    <Close sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>
              ))}
              <Box onClick={() => fileInputRef.current?.click()}
                sx={{ width: 88, height: 88, borderRadius: '12px', border: `2px dashed ${BORD}`, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: SUB,
                  '&:hover': { borderColor: OR, color: OR, bgcolor: `${OR}08` } }}>
                <PhotoCamera sx={{ fontSize: 20 }} />
                <Typography fontSize={10.5} mt={0.5}>Ajouter</Typography>
              </Box>
            </Box>
          </SectionCard>

          {/* ── INFORMATIONS ── */}
          <SectionCard title="Informations">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField fullWidth label="Nom du produit *" value={form.name} onChange={f('name')} required sx={fieldSx} />
              <TextField fullWidth label="Description *" value={form.description} onChange={f('description')} multiline rows={5} required sx={fieldSx} />
              <TextField fullWidth label="SKU" value={form.sku} onChange={f('sku')} sx={fieldSx} />
            </Box>
          </SectionCard>

          {/* ── PRIX & CATÉGORIE ── */}
          <SectionCard title="Prix & Catégorie">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel shrink>Catégorie</InputLabel>
                <Select value={form.categoryId} label="Catégorie" MenuProps={darkMenu} onChange={f('categoryId')}>
                  {(categories || []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel shrink>Marque</InputLabel>
                <Select value={form.brandId} label="Marque" MenuProps={darkMenu} onChange={f('brandId')}>
                  <MenuItem value="">Aucune</MenuItem>
                  {(brands || []).map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField fullWidth label="Prix (HTG)" type="number" value={form.price} onChange={f('price')} sx={fieldSx} />
                <TextField fullWidth label="Prix promo (HTG)" type="number" value={form.salePrice} onChange={f('salePrice')} sx={fieldSx} />
              </Box>

              {showCurrencyPanel && (
                <Box sx={{ p: 1.6, borderRadius: '10px', bgcolor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <Typography fontSize={12.5} color="#3B82F6" fontWeight={600}>
                    {usdEquivalent ? `≈ ${usdEquivalent} USD` : 'Aperçu en devise boutique'} (taux de change de la boutique : {Number(productStore.exchangeRate).toFixed(2)} HTG/USD)
                  </Typography>
                  <Typography fontSize={11.5} color={SUB} mt={0.3}>
                    Le prix est toujours enregistré et facturé en HTG — cette conversion est juste un aperçu d'affichage.
                  </Typography>
                  <Button component={Link} to="/seller/store" size="small"
                    sx={{ mt: 0.5, color: '#3B82F6', fontWeight: 700, fontSize: 12, textTransform: 'none', px: 0 }}>
                    Modifier la devise / le taux →
                  </Button>
                </Box>
              )}

              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                <TextField fullWidth label="Stock" type="number" value={form.stock} onChange={f('stock')} sx={fieldSx} />
                <TextField fullWidth label="Quantité minimum de commande" type="number" value={form.minOrderQty}
                  onChange={f('minOrderQty')} inputProps={{ min: 1 }} sx={fieldSx} />
              </Box>

              {/* Paliers de prix dégressifs (bundles) */}
              <Box>
                <Typography fontSize={13} fontWeight={600} color={TXT} mb={0.8}>Prix dégressifs par quantité (optionnel)</Typography>
                <Typography fontSize={12} color={SUB} mb={1.2}>
                  Ex: si le produit coûte 1000 HTG l'unité, un lot de 3 peut être vendu 2500 HTG au total (au lieu de 3000), un lot de 6 pour 4500 HTG, etc. — le prix indiqué est le total du lot, pas un prix unitaire.
                </Typography>
                {priceTiers.map((t, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <TextField size="small" label="À partir de (qté)" type="number" value={t.minQty}
                      onChange={e => setPriceTiers(p => p.map((x, j) => j === i ? { ...x, minQty: e.target.value } : x))}
                      inputProps={{ min: 1 }} sx={{ ...fieldSx, flex: 1 }} />
                    <TextField size="small" label="Prix total du lot (HTG)" type="number" value={t.price}
                      onChange={e => setPriceTiers(p => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      inputProps={{ min: 0 }} sx={{ ...fieldSx, flex: 1 }} />
                    <IconButton size="small" onClick={() => setPriceTiers(p => p.filter((_, j) => j !== i))}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button size="small" startIcon={<Add />}
                  onClick={() => setPriceTiers(p => [...p, { minQty: '', price: '' }])}
                  sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Ajouter un palier
                </Button>
              </Box>
            </Box>
          </SectionCard>

          {/* ── LOCALISATION ── */}
          <SectionCard title="Localisation">
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <FormControl fullWidth sx={fieldSx}>
                <InputLabel shrink>Département</InputLabel>
                <Select value={form.department} label="Département" MenuProps={darkMenu} onChange={f('department')}>
                  {DEPTS_HT.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField fullWidth label="Ville / Quartier" value={form.city} onChange={f('city')} sx={fieldSx} />
            </Box>
          </SectionCard>

          {/* ── OPTIONS DE VENTE ── */}
          <SectionCard title="Options de vente">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <DarkToggle checked={form.hasDelivery} onChange={v => setForm({ ...form, hasDelivery: v })}
                label="Livraison disponible" sub="Proposer la livraison aux acheteurs" />

              <Collapse in={form.hasDelivery}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}>
                  <TextField fullWidth label="Frais de livraison (HTG — laisser vide si gratuit)" type="number"
                    value={form.deliveryPriceHTG} onChange={f('deliveryPriceHTG')} inputProps={{ min: 0 }} sx={fieldSx} />
                  <Box>
                    <Typography fontSize={12.5} fontWeight={600} color={SUB2} mb={1.2}>
                      Zones de livraison <Typography component="span" fontSize={11} color={SUB}>(ville + département)</Typography>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <TextField size="small" label="Ville (optionnel)" value={zoneInput.city}
                        onChange={e => setZoneInput(z => ({ ...z, city: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addZone(); } }}
                        sx={{ ...fieldSx, flex: '1 1 160px' }} />
                      <FormControl size="small" sx={{ ...fieldSx, flex: '1 1 130px' }}>
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
                    {deliveryZones.length > 0 && (
                      <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {deliveryZones.map((z, i) => (
                          <Chip key={i} label={z.city ? `${z.city}, ${z.dept}` : z.dept}
                            onDelete={() => removeZone(i)} size="small" />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Collapse>

              {/* Points de retrait spécifiques au produit */}
              <Box>
                <Typography fontSize={13} fontWeight={600} color={TXT} mb={0.4}>
                  Points de retrait pour ce produit (optionnel)
                </Typography>
                {storePickupPoints.length > 0 ? (
                  <>
                    <Typography fontSize={12} color={SUB} mb={1.2}>
                      Aucune sélection = disponible à tous les points de retrait de votre boutique.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {storePickupPoints.map((pt: any) => {
                        const active = pickupPointNames.includes(pt.name);
                        return (
                          <Box key={pt.name} onClick={() => togglePickupPoint(pt.name)}
                            sx={{ px: 1.5, py: 0.7, borderRadius: '8px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, bgcolor: active ? 'rgba(255,107,0,0.12)' : 'rgba(15,23,42,0.09)', color: active ? OR : SUB2, border: `1px solid ${active ? `${OR}40` : BORD}` }}>
                            {pt.name}{pt.city ? ` — ${pt.city}` : ''}
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                ) : (
                  <Box sx={{ p: 1.6, borderRadius: '10px', bgcolor: 'rgba(15,23,42,0.04)', border: `1px solid ${BORD}` }}>
                    <Typography fontSize={12.5} color={SUB}>
                      Configurez des points de retrait dans les paramètres de votre boutique pour les associer à vos produits.
                    </Typography>
                    <Button component={Link} to="/seller/store" size="small"
                      sx={{ mt: 0.5, color: OR, fontWeight: 700, fontSize: 12, textTransform: 'none', px: 0 }}>
                      Configurer mes points de retrait →
                    </Button>
                  </Box>
                )}
              </Box>

              <DarkToggle checked={form.allowOffers} onChange={v => setForm({ ...form, allowOffers: v })}
                label="Accepter les offres de prix" sub="Les clients pourront vous proposer leur propre prix" />

              <Collapse in={form.allowOffers}>
                <Box sx={{ pt: 0.5 }}>
                  <TextField fullWidth label="Prix minimum accepté (HTG) — laisser vide pour accepter toute offre" type="number"
                    value={form.minOfferPriceHTG} onChange={f('minOfferPriceHTG')} inputProps={{ min: 0 }} sx={fieldSx} />
                </Box>
              </Collapse>

              <DarkToggle checked={form.isLimitedEdition} onChange={v => setForm({ ...form, isLimitedEdition: v })}
                label="Édition limitée" sub="Affiche un badge distinctif sur la fiche produit — à réserver aux produits vraiment rares/exclusifs" />
            </Box>
          </SectionCard>

          {/* Bottom submit */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button fullWidth type="submit" disabled={loading}
              sx={{ py: 1.6, borderRadius: '14px', fontWeight: 800, fontSize: 15, bgcolor: OR, color: '#fff', textTransform: 'none', '&:hover': { bgcolor: '#E05A00' }, '&.Mui-disabled': { bgcolor: 'rgba(255,107,0,0.3)', color: '#64748B' } }}>
              {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Enregistrer'}
            </Button>
            <Button fullWidth variant="outlined" onClick={() => navigate('/seller/products')}
              sx={{ py: 1.6, borderRadius: '14px', fontWeight: 700, fontSize: 15, textTransform: 'none', borderColor: BORD, color: SUB2 }}>
              Annuler
            </Button>
          </Box>

        </Box>
      </form>
    </Box>
  );
}
