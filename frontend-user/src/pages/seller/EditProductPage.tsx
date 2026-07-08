import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, TextField, Button, Grid, Box, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem, Chip, IconButton } from '@mui/material';
import { Add, Close } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { parsePriceTiers } from '../../utils/priceTiers';

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState<any>(null);
  const [priceTiers, setPriceTiers] = useState<{ minQty: string; price: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product-edit', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
    enabled: !!id,
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
      });
      setPriceTiers(
        parsePriceTiers(product.priceTiers).map(t => ({ minQty: String(t.minQty), price: String(t.price) })),
      );
    }
  }, [product]);

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
      const payload = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId || undefined,
        brandId: form.brandId || undefined,
        price: form.price !== '' ? Number(form.price) : undefined,
        salePrice: form.salePrice !== '' ? Number(form.salePrice) : undefined,
        stock: form.stock !== '' ? Number(form.stock) : undefined,
        sku: form.sku || undefined,
        minOrderQty: form.minOrderQty !== '' ? Number(form.minOrderQty) : undefined,
        priceTiers: cleanTiers.length ? JSON.stringify(cleanTiers) : undefined,
      };
      await api.patch(`/products/${id}`, payload);
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
