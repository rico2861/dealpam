import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, TextField, Button, Grid, Box, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState<any>(null);
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
      });
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.patch(`/products/${id}`, form);
      enqueueSnackbar('Produit mis à jour !', { variant: 'success' });
      navigate('/seller/products');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !form) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const f = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Modifier le produit</Typography>
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
                  <InputLabel>Catégorie</InputLabel>
                  <Select value={form.categoryId} label="Catégorie" onChange={f('categoryId')}>
                    {(categories || []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Marque</InputLabel>
                  <Select value={form.brandId} label="Marque" onChange={f('brandId')}>
                    <MenuItem value="">Aucune</MenuItem>
                    {(brands || []).map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField fullWidth label="Prix (HTG)" type="number" value={form.price} onChange={f('price')} margin="dense" />
                <TextField fullWidth label="Prix promo (HTG)" type="number" value={form.salePrice} onChange={f('salePrice')} margin="dense" />
                <TextField fullWidth label="Stock" type="number" value={form.stock} onChange={f('stock')} margin="dense" />
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
