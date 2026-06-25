import { Container, Typography, Grid, Card, CardContent, Box, Button, IconButton, TextField, Divider, CircularProgress, Alert } from '@mui/material';
import { Add, Remove, Delete, ShoppingBag } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useCartStore } from '../../store/cart.store';

export default function CartPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { fetchCount } = useCartStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: any) => api.patch(`/cart/items/${itemId}`, { quantity }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cart'] }); fetchCount(); },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/cart/items/${itemId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cart'] }); fetchCount(); enqueueSnackbar('Article retiré', { variant: 'info' }); },
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const items = cart?.items || [];
  const total = cart?.total || 0;

  if (items.length === 0) return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <ShoppingBag sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" fontWeight={700} mb={1}>Votre panier est vide</Typography>
      <Typography color="text.secondary" mb={3}>Découvrez nos produits et ajoutez-en à votre panier</Typography>
      <Button variant="contained" component={Link} to="/products" size="large">Voir les produits</Button>
    </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Mon panier ({items.length} article{items.length > 1 ? 's' : ''})</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {items.map((item: any) => {
            const price = Number(item.product?.salePrice || item.product?.price);
            const image = item.product?.images?.[0]?.url;
            return (
              <Card key={item.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ width: 80, height: 80, borderRadius: 1, overflow: 'hidden', flexShrink: 0 }}>
                      <img src={image || 'https://via.placeholder.com/80'} alt={item.product?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={600} noWrap>{item.product?.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{item.product?.store?.name}</Typography>
                      <Typography variant="body1" color="primary" fontWeight={700}>{price.toLocaleString()} HTG</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" onClick={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 })} disabled={item.quantity <= 1}><Remove /></IconButton>
                      <Typography variant="body1" fontWeight={600} sx={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                      <IconButton size="small" onClick={() => updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}><Add /></IconButton>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="subtitle1" fontWeight={700}>{(price * item.quantity).toLocaleString()} HTG</Typography>
                      <IconButton color="error" size="small" onClick={() => removeMutation.mutate(item.id)}><Delete /></IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ position: 'sticky', top: 80 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Récapitulatif</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Sous-total</Typography>
                <Typography>{total.toLocaleString()} HTG</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography>Livraison</Typography>
                <Typography color="success.main">À calculer</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>Total</Typography>
                <Typography variant="h6" fontWeight={800} color="primary">{total.toLocaleString()} HTG</Typography>
              </Box>
              <Button fullWidth variant="contained" size="large" onClick={() => navigate('/account/checkout')} sx={{ py: 1.5, fontWeight: 700 }}>
                Commander maintenant
              </Button>
              <Button fullWidth variant="outlined" component={Link} to="/products" sx={{ mt: 1 }}>
                Continuer mes achats
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
