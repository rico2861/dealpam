import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Card, CardContent, TextField, Button, Grid, Box, Alert, CircularProgress, FormControl, InputLabel, Select, MenuItem, Chip, IconButton, LinearProgress } from '@mui/material';
import { CloudUpload, Close, Add } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function AddProductPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: '', description: '', categoryId: '', brandId: '', price: '', salePrice: '', stock: '', sku: '', sizes: [] as string[], colors: [] as string[] });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/brands').then(r => r.data) });
  const { data: sub } = useQuery({ queryKey: ['sellerSub'], queryFn: () => api.get('/subscriptions/me').then(r => r.data) });

  const maxImages = sub?.plan?.maxImages || 5;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      if (!f.type.startsWith('image/')) { enqueueSnackbar(`${f.name} n'est pas une image`, { variant: 'warning' }); return false; }
      if (f.size > MAX_FILE_SIZE) { enqueueSnackbar(`${f.name} dépasse 5MB`, { variant: 'warning' }); return false; }
      return true;
    });

    if (images.length + valid.length > maxImages) {
      enqueueSnackbar(`Maximum ${maxImages} images autorisées pour votre plan`, { variant: 'warning' });
      return;
    }

    const newPreviews = valid.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...valid]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addSize = () => { if (sizeInput.trim() && !form.sizes.includes(sizeInput.trim())) { setForm({ ...form, sizes: [...form.sizes, sizeInput.trim()] }); setSizeInput(''); } };
  const addColor = () => { if (colorInput.trim() && !form.colors.includes(colorInput.trim())) { setForm({ ...form, colors: [...form.colors, colorInput.trim()] }); setColorInput(''); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.categoryId || !form.price) { setError('Remplissez tous les champs obligatoires'); return; }
    if (images.length === 0) { setError('Ajoutez au moins une image'); return; }

    setLoading(true); setError(''); setUploadProgress(10);

    try {
      // Use FormData to send images + product data in one request
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('categoryId', form.categoryId);
      if (form.brandId) formData.append('brandId', form.brandId);
      formData.append('price', form.price);
      if (form.salePrice) formData.append('salePrice', form.salePrice);
      formData.append('stock', form.stock || '0');
      if (form.sku) formData.append('sku', form.sku);
      form.sizes.forEach(s => formData.append('sizes', s));
      form.colors.forEach(c => formData.append('colors', c));

      // Append each image file — these will be uploaded to Cloudinary by the backend
      images.forEach(img => formData.append('images', img));

      setUploadProgress(30);

      await api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 70) / (e.total || 1)) + 30;
          setUploadProgress(Math.min(pct, 99));
        },
      });

      setUploadProgress(100);
      enqueueSnackbar('Produit soumis pour validation !', { variant: 'success' });
      navigate('/seller/products');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  if (!sub) return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Alert severity="warning" sx={{ mb: 2 }}>Vous devez avoir un abonnement actif pour ajouter des produits.</Alert>
      <Button variant="contained" href="/seller/subscription">Choisir un abonnement</Button>
    </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Ajouter un produit</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Left column */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Informations générales</Typography>
                <TextField fullWidth label="Nom du produit *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} margin="dense" required />
                <TextField fullWidth label="Description *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} margin="dense" multiline rows={4} required helperText="Décrivez votre produit en détail : matière, dimensions, utilisation..." />
                <TextField fullWidth label="SKU / Référence" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} margin="dense" />
              </CardContent>
            </Card>

            {/* Image upload - THE KEY SECTION */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>Photos du produit</Typography>
                  <Chip label={`${images.length}/${maxImages} images`} color={images.length >= maxImages ? 'error' : 'primary'} size="small" />
                </Box>

                <Alert severity="info" sx={{ mb: 2 }}>
                  Les images sont automatiquement optimisées et hébergées sur Cloudinary (CDN mondial). Formats acceptés : JPG, PNG, WebP. Max 5MB par image.
                </Alert>

                {/* Upload zone */}
                <Box
                  onClick={() => images.length < maxImages && fileInputRef.current?.click()}
                  sx={{
                    border: '2px dashed', borderColor: images.length < maxImages ? 'primary.main' : 'divider',
                    borderRadius: 2, p: 3, textAlign: 'center', cursor: images.length < maxImages ? 'pointer' : 'not-allowed',
                    bgcolor: images.length < maxImages ? 'action.hover' : 'action.disabledBackground',
                    transition: '0.2s', '&:hover': { bgcolor: images.length < maxImages ? 'primary.50' : undefined },
                    mb: 2,
                  }}
                >
                  <CloudUpload sx={{ fontSize: 40, color: images.length < maxImages ? 'primary.main' : 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" fontWeight={600} color={images.length < maxImages ? 'primary' : 'text.disabled'}>
                    {images.length < maxImages ? 'Cliquez pour ajouter des photos' : `Limite de ${maxImages} images atteinte`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Glissez-déposez ou cliquez · JPG, PNG, WebP · Max 5MB</Typography>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleImageSelect} />
                </Box>

                {/* Image previews */}
                {imagePreviews.length > 0 && (
                  <Grid container spacing={1}>
                    {imagePreviews.map((preview, i) => (
                      <Grid item xs={4} sm={3} key={i}>
                        <Box sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: i === 0 ? '3px solid #c41230' : '2px solid #eee' }}>
                          <img src={preview} alt={`Preview ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {i === 0 && (
                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, bgcolor: 'rgba(196,18,48,0.85)', textAlign: 'center', py: 0.5 }}>
                              <Typography variant="caption" color="white" fontWeight={600}>Photo principale</Typography>
                            </Box>
                          )}
                          <IconButton size="small" onClick={() => removeImage(i)} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', p: 0.5, '&:hover': { bgcolor: 'rgba(196,18,48,0.9)' } }}>
                            <Close fontSize="small" />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {loading && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" mb={0.5}>Upload vers Cloudinary… {uploadProgress}%</Typography>
                    <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 1 }} />
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Variants */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Variantes</Typography>
                <Box mb={2}>
                  <Typography variant="subtitle2" mb={1}>Tailles disponibles</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    {form.sizes.map(s => <Chip key={s} label={s} onDelete={() => setForm({ ...form, sizes: form.sizes.filter(x => x !== s) })} size="small" />)}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" placeholder="Ex: S, M, L, 42..." value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSize())} />
                    <Button variant="outlined" onClick={addSize} startIcon={<Add />}>Ajouter</Button>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" mb={1}>Couleurs disponibles</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    {form.colors.map(c => <Chip key={c} label={c} onDelete={() => setForm({ ...form, colors: form.colors.filter(x => x !== c) })} size="small" />)}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField size="small" placeholder="Ex: Rouge, Bleu, Noir..." value={colorInput} onChange={(e) => setColorInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())} />
                    <Button variant="outlined" onClick={addColor} startIcon={<Add />}>Ajouter</Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right column */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Catégorie & Marque</Typography>
                <FormControl fullWidth margin="dense" required>
                  <InputLabel>Catégorie *</InputLabel>
                  <Select value={form.categoryId} label="Catégorie *" onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    {(categories || []).map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Marque</InputLabel>
                  <Select value={form.brandId} label="Marque" onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                    <MenuItem value="">Sans marque</MenuItem>
                    {(brands || []).map((b: any) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>Prix & Stock</Typography>
                <TextField fullWidth label="Prix (HTG) *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} margin="dense" required inputProps={{ min: 0 }} />
                <TextField fullWidth label="Prix promo (HTG)" type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} margin="dense" helperText="Laissez vide si pas en promotion" inputProps={{ min: 0 }} />
                <TextField fullWidth label="Stock disponible" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} margin="dense" inputProps={{ min: 0 }} />
              </CardContent>
            </Card>

            <Button fullWidth variant="contained" type="submit" size="large" disabled={loading} sx={{ py: 2, fontSize: 16, fontWeight: 800 }}>
              {loading ? <CircularProgress size={24} color="inherit" /> : '🚀 Soumettre le produit'}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Votre produit sera examiné par notre équipe avant publication.
            </Typography>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}
