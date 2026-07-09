import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container, Grid, Box, Typography, Button, Chip, IconButton,
  alpha, Alert,
} from '@mui/material';
import {
  Favorite, Delete, ShoppingCart, ArrowBack, Star,
  Inventory, FavoriteBorder,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useCartStore } from '../../store/cart.store';
import { ProductCardSkeletonGrid } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const RED  = '#EF4444';
const BLUE = '#2563EB';
const GOLD = '#F59E0B';

const fmtHTG = (v: number) => `${v.toLocaleString('fr-HT')} HTG`;

export default function WishlistPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { fetchCount } = useCartStore();
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn:  () => api.get('/wishlist').then(r => r.data),
  });
  const showSkel = useDelayedLoading(isLoading);

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      enqueueSnackbar('Retiré des favoris', { variant: 'info' });
    },
  });

  const addToCart = async (item: any) => {
    const pid = item.productId;
    setAddingIds(s => new Set(s).add(pid));
    try {
      await api.post('/cart/items', { productId: pid, quantity: 1 });
      await fetchCount();
      qc.invalidateQueries({ queryKey: ['cart'] });
      enqueueSnackbar(`"${item.product.name}" ajouté au panier !`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Erreur lors de l\'ajout', { variant: 'error' });
    } finally {
      setAddingIds(s => { const n = new Set(s); n.delete(pid); return n; });
    }
  };

  const clearAll = async () => {
    try {
      await api.delete('/wishlist');
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      enqueueSnackbar('Favoris vidés', { variant: 'info' });
    } catch {}
  };

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 6 }}>
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #E5E7EB', py: 2 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate(-1)} size="small">
              <ArrowBack fontSize="small" />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Favorite sx={{ color: RED, fontSize: 22 }} />
              <Typography fontWeight={800} fontSize={20} color="#0F1111">
                Mes Favoris
              </Typography>
              {items.length > 0 && (
                <Chip label={items.length} size="small"
                  sx={{ bgcolor: RED, color: 'white', fontWeight: 700, height: 22, fontSize: 12 }} />
              )}
            </Box>
            {items.length > 0 && (
              <Button onClick={clearAll} size="small"
                sx={{ ml: 'auto', color: '#64748B', fontSize: 12,
                  '&:hover': { color: RED, bgcolor: alpha(RED, 0.06) } }}>
                Tout supprimer
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 3 }}>
        {isLoading ? (
          showSkel ? <ProductCardSkeletonGrid count={6} /> : null
        ) : items.length === 0 ? (
          <Box sx={{ py: 10, textAlign: 'center' }}>
            <FavoriteBorder sx={{ fontSize: 80, color: '#E5E7EB', mb: 2 }} />
            <Typography fontWeight={800} fontSize={22} color="#0F1111" mb={1}>
              Aucun favori pour l'instant
            </Typography>
            <Typography color="#64748B" fontSize={15} mb={3}>
              Cliquez sur ❤️ sur un produit pour l'ajouter a vos favoris
            </Typography>
            <Button component={Link} to="/products" variant="contained"
              sx={{ bgcolor: BLUE, borderRadius: 2.5, px: 3.5, fontWeight: 700,
                '&:hover': { bgcolor: '#1D4ED8' } }}>
              Découvrir des produits
            </Button>
          </Box>
        ) : (
          <>
            <Alert severity="info" icon={<Favorite sx={{ fontSize: 18, color: RED }} />}
              sx={{ mb: 3, borderRadius: 2.5, '& .MuiAlert-message': { fontSize: 13.5 } }}>
              <strong>{items.length} produit{items.length > 1 ? 's' : ''}</strong> dans vos favoris
            </Alert>

            <Grid container spacing={2}>
              {items.map((item: any) => {
                const p = item.product;
                const img = p.images?.[0]?.urlMedium || p.images?.[0]?.urlThumb;
                const sale = p.salePrice && Number(p.salePrice) < Number(p.price);
                const disc = sale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
                const price = Number(p.salePrice || p.price);
                const isAdding = addingIds.has(item.productId);

                return (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={item.id}>
                    <Box sx={{ position: 'relative', bgcolor: 'white', borderRadius: 2.5,
                      border: '1px solid #E5E7EB', overflow: 'hidden',
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.1)', borderColor: BLUE, transform: 'translateY(-2px)' } }}>

                      {/* Remove button */}
                      <IconButton onClick={() => removeMutation.mutate(item.productId)} size="small"
                        sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2,
                          bgcolor: 'rgba(255,255,255,0.9)', width: 28, height: 28,
                          '&:hover': { bgcolor: alpha(RED, 0.1), color: RED } }}>
                        <Delete sx={{ fontSize: 15 }} />
                      </IconButton>

                      {/* Discount badge */}
                      {sale && (
                        <Chip label={`-${disc}%`} size="small"
                          sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2,
                            bgcolor: RED, color: 'white', fontWeight: 900, height: 20, fontSize: 10.5 }} />
                      )}

                      {/* Image */}
                      <Box component={Link} to={`/products/${p.slug}`}
                        sx={{ display: 'block', height: 180, overflow: 'hidden', bgcolor: '#F8FAFC' }}>
                        <Box component="img"
                          src={img || 'https://placehold.co/400x300/F1F5F9/94A3B8?text=Photo'}
                          alt={p.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover',
                            transition: 'transform 0.4s', '&:hover': { transform: 'scale(1.07)' } }} />
                      </Box>

                      {/* Info */}
                      <Box sx={{ p: 1.5 }}>
                        <Typography component={Link} to={`/products/${p.slug}`} fontSize={13}
                          fontWeight={500} color="#0F1111" lineHeight={1.4}
                          sx={{ textDecoration: 'none', overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', mb: 0.5, minHeight: 36,
                            '&:hover': { color: BLUE } }}>
                          {p.name}
                        </Typography>

                        <Typography fontWeight={800} fontSize={15} color={RED} mb={0.3}>
                          {fmtHTG(price)}
                        </Typography>
                        {sale && (
                          <Typography fontSize={11} color="#64748B" sx={{ textDecoration: 'line-through', mb: 0.5 }}>
                            {fmtHTG(Number(p.price))}
                          </Typography>
                        )}

                        {p.avgRating > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.7 }}>
                            <Star sx={{ fontSize: 11, color: GOLD }} />
                            <Typography fontSize={11} color="#64748B">{p.avgRating.toFixed(1)}</Typography>
                          </Box>
                        )}

                        {p.store?.name && (
                          <Typography fontSize={11} color="#64748B" mb={0.8} noWrap>
                            par {p.store.name}
                          </Typography>
                        )}

                        {/* Stock */}
                        {p.stock === 0 ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                            <Inventory sx={{ fontSize: 13, color: RED }} />
                            <Typography fontSize={11.5} color={RED} fontWeight={600}>Rupture de stock</Typography>
                          </Box>
                        ) : p.stock <= 5 ? (
                          <Typography fontSize={11.5} color={GOLD} fontWeight={600} mb={1}>
                            Plus que {p.stock} en stock !
                          </Typography>
                        ) : null}

                        <Button fullWidth variant="contained" size="small"
                          disabled={isAdding || p.stock === 0}
                          onClick={() => addToCart(item)}
                          startIcon={<ShoppingCart sx={{ fontSize: 14 }} />}
                          sx={{ bgcolor: p.stock === 0 ? '#E5E7EB' : BLUE, fontWeight: 700, fontSize: 12,
                            borderRadius: 2, py: 0.8, color: p.stock === 0 ? '#64748B' : 'white',
                            '&:hover': { bgcolor: p.stock === 0 ? '#E5E7EB' : '#1D4ED8' } }}>
                          {isAdding ? 'Ajout...' : p.stock === 0 ? 'Indisponible' : 'Ajouter'}
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
}
