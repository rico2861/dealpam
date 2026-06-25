import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Box, Typography, Button, Chip, Rating, Divider, CircularProgress, Alert, Tabs, Tab, Avatar } from '@mui/material';
import { ShoppingCart, Favorite, Store, Verified } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchCount } = useCartStore();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedImage, setSelectedImage] = useState(0);
  const [tab, setTab] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  const { data: product, isLoading } = useQuery({ queryKey: ['product', slug], queryFn: () => api.get(`/products/${slug}`).then(r => r.data) });

  const addToCart = async () => {
    if (!user) { navigate('/login'); return; }
    setAddingToCart(true);
    try {
      await api.post('/cart/items', { productId: product.id, quantity: 1 });
      await fetchCount();
      enqueueSnackbar('Ajouté au panier !', { variant: 'success' });
    } catch {
      enqueueSnackbar('Erreur lors de l\'ajout', { variant: 'error' });
    } finally {
      setAddingToCart(false);
    }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!product) return <Alert severity="error" sx={{ m: 4 }}>Produit introuvable</Alert>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Images */}
        <Grid item xs={12} md={6}>
          <Box sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: '#f5f5f5', mb: 1, aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={product.images?.[selectedImage]?.url || 'https://via.placeholder.com/600?text=Produit'} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
          {product.images?.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {product.images.map((img: any, i: number) => (
                <Box key={img.id} onClick={() => setSelectedImage(i)} sx={{ width: 64, height: 64, borderRadius: 1, overflow: 'hidden', border: selectedImage === i ? '2px solid #c41230' : '2px solid transparent', cursor: 'pointer' }}>
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          )}
        </Grid>

        {/* Info */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
            {product.category && <Chip label={product.category.name} size="small" />}
            {product.brand && <Chip label={product.brand.name} size="small" variant="outlined" />}
            {product.isFeatured && <Chip label="⭐ Vedette" size="small" color="warning" />}
          </Box>

          <Typography variant="h4" fontWeight={800} gutterBottom>{product.name}</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Rating value={product.avgRating} readOnly precision={0.5} size="small" />
            <Typography variant="body2" color="text.secondary">({product.totalReviews} avis)</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            {product.salePrice ? (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="h4" color="error" fontWeight={800}>{Number(product.salePrice).toLocaleString()} HTG</Typography>
                <Typography variant="h6" color="text.secondary" sx={{ textDecoration: 'line-through' }}>{Number(product.price).toLocaleString()} HTG</Typography>
              </Box>
            ) : (
              <Typography variant="h4" color="primary" fontWeight={800}>{Number(product.price).toLocaleString()} HTG</Typography>
            )}
          </Box>

          <Typography variant="body2" color={product.stock > 0 ? 'success.main' : 'error.main'} mb={2}>
            {product.stock > 0 ? `✓ En stock (${product.stock} disponibles)` : '✗ Rupture de stock'}
          </Typography>

          {product.sizes?.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" mb={1}>Tailles disponibles</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {product.sizes.map((s: string) => <Chip key={s} label={s} size="small" variant="outlined" sx={{ cursor: 'pointer' }} />)}
              </Box>
            </Box>
          )}

          {product.colors?.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" mb={1}>Couleurs</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {product.colors.map((c: string) => <Chip key={c} label={c} size="small" variant="outlined" />)}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" startIcon={<ShoppingCart />} onClick={addToCart} disabled={product.stock === 0 || addingToCart} sx={{ flex: 1, minWidth: 200 }}>
              {addingToCart ? <CircularProgress size={20} color="inherit" /> : 'Ajouter au panier'}
            </Button>
            <Button variant="outlined" size="large"><Favorite /></Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Store info */}
          {product.store && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#c41230' }}><Store /></Avatar>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="subtitle2" fontWeight={700}>{product.store.name}</Typography>
                  {product.store.isVerified && <Verified sx={{ color: '#c41230', fontSize: 16 }} />}
                </Box>
                <Button size="small" href={`/store/${product.store.slug}`}>Voir la boutique</Button>
              </Box>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Tabs: description + reviews */}
      <Box sx={{ mt: 4 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Description" />
          <Tab label={`Avis (${product.totalReviews})`} />
        </Tabs>
        <Divider />
        <Box sx={{ py: 2 }}>
          {tab === 0 && <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{product.description}</Typography>}
          {tab === 1 && (
            <Box>
              {(product.reviews || []).map((r: any) => (
                <Box key={r.id} sx={{ mb: 2, p: 2, bgcolor: '#f9f9f9', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{r.user.firstName[0]}</Avatar>
                    <Typography variant="subtitle2">{r.user.firstName} {r.user.lastName}</Typography>
                    <Rating value={r.rating} readOnly size="small" />
                  </Box>
                  <Typography variant="body2">{r.comment}</Typography>
                </Box>
              ))}
              {product.reviews?.length === 0 && <Typography color="text.secondary">Aucun avis pour l'instant.</Typography>}
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
}
