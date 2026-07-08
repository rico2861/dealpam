import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, TextField, Button, Grid, Box, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem, Chip, IconButton, Switch, FormControlLabel, Collapse } from '@mui/material';
import { Add, Close, PhotoCamera, Delete as DeleteIcon } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { parsePriceTiers } from '../../utils/priceTiers';

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
      deliveryZones.forEach(z => fd.append('deliveryDepts', z.city ? `${z.city}, ${z.dept}` : z.dept));
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
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="error">
          Impossible de charger ce produit (introuvable ou vous n'y avez pas accès).
        </Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/seller/products')}>Retour</Button>
      </Container>
    );
  }
  if (isLoading || !form) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Modifier le produit</Typography>
      {product?.hasPendingEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Une modification précédente est déjà en attente de validation — la version actuellement en ligne reste
          affichée aux clients. Enregistrer un nouveau changement ici remplacera cette modification en attente.
        </Alert>
      )}
      {product?.pendingRejectionReason && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Votre dernière modification a été refusée : {product.pendingRejectionReason}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <TextField fullWidth label="Nom du produit *" value={form.name} onChange={f('name')} margin="dense" required />
                <TextField fullWidth label="Description *" value={form.description} onChange={f('description')} margin="dense" multiline rows={5} required />
                <TextField fullWidth label="SKU" value={form.sku} onChange={f('sku')} margin="dense" />
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography fontSize={14} fontWeight={700} mb={1.5}>Photos</Typography>
                <input type="file" ref={fileInputRef} accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddImages} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {images.map(img => (
                    <Box key={img.id} sx={{ position: 'relative', width: 88, height: 88, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(15,23,42,0.09)' }}>
                      <Box component="img" src={img.urlThumb || img.urlMedium} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton size="small" onClick={() => handleDeleteExistingImage(img.id)}
                        disabled={deletingImageId === img.id}
                        sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', width: 22, height: 22, '&:hover': { bgcolor: 'rgba(220,38,38,0.85)' } }}>
                        {deletingImageId === img.id ? <CircularProgress size={12} color="inherit" /> : <DeleteIcon sx={{ fontSize: 13 }} />}
                      </IconButton>
                    </Box>
                  ))}
                  {newImages.map((file, i) => (
                    <Box key={i} sx={{ position: 'relative', width: 88, height: 88, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.4)' }}>
                      <Box component="img" src={URL.createObjectURL(file)} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <IconButton size="small" onClick={() => removeNewImage(i)}
                        sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', width: 22, height: 22, '&:hover': { bgcolor: 'rgba(220,38,38,0.85)' } }}>
                        <Close sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                  ))}
                  <Box onClick={() => fileInputRef.current?.click()}
                    sx={{ width: 88, height: 88, borderRadius: 2, border: '2px dashed rgba(15,23,42,0.2)', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748B',
                      '&:hover': { borderColor: '#FF6B00', color: '#FF6B00' } }}>
                    <PhotoCamera sx={{ fontSize: 20 }} />
                    <Typography fontSize={10.5} mt={0.5}>Ajouter</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography fontSize={14} fontWeight={700} mb={1.5}>Localisation</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="dense">
                      <InputLabel shrink>Département</InputLabel>
                      <Select value={form.department} label="Département" onChange={f('department')}>
                        {DEPTS_HT.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Ville / Quartier" value={form.city} onChange={f('city')} margin="dense" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <FormControlLabel
                  control={<Switch checked={form.hasDelivery} onChange={e => setForm({ ...form, hasDelivery: e.target.checked })} />}
                  label={<Typography fontSize={14} fontWeight={700}>Livraison disponible</Typography>} />
                <Collapse in={form.hasDelivery}>
                  <Box sx={{ pt: 1.5 }}>
                    <TextField fullWidth label="Frais de livraison (HTG — laisser vide si gratuit)" type="number"
                      value={form.deliveryPriceHTG} onChange={f('deliveryPriceHTG')} margin="dense" inputProps={{ min: 0 }} />
                    <Typography fontSize={12.5} fontWeight={600} color="text.secondary" mt={1} mb={1}>
                      Zones de livraison (ville + département)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <TextField size="small" label="Ville (optionnel)" value={zoneInput.city}
                        onChange={e => setZoneInput(z => ({ ...z, city: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addZone(); } }}
                        sx={{ flex: '1 1 160px' }} />
                      <FormControl size="small" sx={{ flex: '1 1 130px' }}>
                        <InputLabel shrink>Département</InputLabel>
                        <Select value={zoneInput.dept} label="Département"
                          onChange={e => setZoneInput(z => ({ ...z, dept: e.target.value }))}>
                          {DEPTS_HT.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <Button variant="contained" onClick={addZone} sx={{ minWidth: 44 }}><Add sx={{ fontSize: 18 }} /></Button>
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
                </Collapse>
              </CardContent>
            </Card>

            <Card sx={{ mt: 2 }}>
              <CardContent>
                <FormControlLabel
                  control={<Switch checked={form.allowOffers} onChange={e => setForm({ ...form, allowOffers: e.target.checked })} />}
                  label={<Typography fontSize={14} fontWeight={700}>Accepter les offres de prix</Typography>} />
                <Typography fontSize={12.5} color="text.secondary" mb={0.5}>
                  Les clients pourront vous proposer leur propre prix
                </Typography>
                <Collapse in={form.allowOffers}>
                  <Box sx={{ pt: 1.5 }}>
                    <TextField fullWidth label="Prix minimum accepté (HTG) — laisser vide pour accepter toute offre" type="number"
                      value={form.minOfferPriceHTG} onChange={f('minOfferPriceHTG')} margin="dense" inputProps={{ min: 0 }} />
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <FormControl fullWidth margin="dense">
                  <InputLabel shrink>Catégorie</InputLabel>
                  <Select value={form.categoryId} label="Catégorie" onChange={f('categoryId')}>
                    {(categories || []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel shrink>Marque</InputLabel>
                  <Select value={form.brandId} label="Marque" onChange={f('brandId')}>
                    <MenuItem value="">Aucune</MenuItem>
                    {(brands || []).map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField fullWidth label="Prix (HTG)" type="number" value={form.price} onChange={f('price')} margin="dense" />
                <TextField fullWidth label="Prix promo (HTG)" type="number" value={form.salePrice} onChange={f('salePrice')} margin="dense" />
                <TextField fullWidth label="Stock" type="number" value={form.stock} onChange={f('stock')} margin="dense" />
                <TextField fullWidth label="Quantité minimum de commande" type="number" value={form.minOrderQty}
                  onChange={f('minOrderQty')} margin="dense" inputProps={{ min: 1 }} />
              </CardContent>
            </Card>

            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography fontSize={13} fontWeight={700} mb={0.5}>Prix dégressifs par quantité (optionnel)</Typography>
                <Typography fontSize={12} color="text.secondary" mb={1.2}>
                  Ex: si le produit coûte 1000 HTG l'unité, un lot de 3 peut être vendu 2500 HTG au total (au lieu de 3000), un lot de 6 pour 4500 HTG, etc. — le prix indiqué est le total du lot, pas un prix unitaire.
                </Typography>
                {priceTiers.map((t, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                    <TextField size="small" label="À partir de (qté)" type="number" value={t.minQty}
                      onChange={e => setPriceTiers(p => p.map((x, j) => j === i ? { ...x, minQty: e.target.value } : x))}
                      inputProps={{ min: 1 }} sx={{ flex: 1 }} />
                    <TextField size="small" label="Prix total du lot (HTG)" type="number" value={t.price}
                      onChange={e => setPriceTiers(p => p.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      inputProps={{ min: 0 }} sx={{ flex: 1 }} />
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
              </CardContent>
            </Card>

            <Button fullWidth variant="contained" type="submit" size="large" disabled={loading} sx={{ py: 1.5, fontWeight: 700 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : '💾 Enregistrer'}
            </Button>
            <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => navigate('/seller/products')}>Annuler</Button>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}
