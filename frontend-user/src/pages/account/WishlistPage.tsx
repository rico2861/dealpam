import { useState, useMemo } from 'react';
import { Box, Typography, alpha, Skeleton, IconButton } from '@mui/material';
import {
  FavoriteBorderOutlined, DeleteOutlineRounded, ShoppingCartOutlined,
  FilterListOutlined, ArrowForward, StorefrontOutlined, TrendingDownOutlined,
  IosShareOutlined, Check,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useSnackbar } from 'notistack';

const ORANGE = '#FF6B00';
const RED    = '#EF4444';
const GREEN  = '#10B981';

function fmt(p: number) {
  return new Intl.NumberFormat('fr-FR').format(p) + ' HTG';
}

export default function WishlistPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [catFilter, setCatFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = (slug: string, id: string) => {
    navigator.clipboard?.writeText(`${window.location.origin}/products/${slug}`);
    setCopiedId(id);
    enqueueSnackbar('Lien copié !', { variant: 'info', autoHideDuration: 1800 });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data as any[]),
    enabled: !!user,
    staleTime: 0,
    // Le favori peut avoir été ajouté/retiré sur une autre page (fiche produit, liste...) :
    // il faut toujours revérifier au montage, sinon un résultat vide mis en cache plus tôt
    // (ex: avant tout ajout) resterait affiché indéfiniment malgré le paramètre global
    // refetchOnMount:false défini dans main.tsx.
    refetchOnMount: 'always',
  });

  const remove = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['wishlist-count'] });
    },
  });

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => { if (i.product?.category) map.set(i.product.category.slug, i.product.category.name); });
    return Array.from(map.entries());
  }, [items]);

  const filtered = useMemo(() =>
    catFilter === 'all' ? items : items.filter(i => i.product?.category?.slug === catFilter),
    [items, catFilter],
  );

  if (!user) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, px: 3, textAlign: 'center' }}>
      <Box sx={{ width: 64, height: 64, borderRadius: '18px', bgcolor: alpha(RED, 0.1), border: `1px solid ${alpha(RED, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        <FavoriteBorderOutlined sx={{ fontSize: 28, color: RED }} />
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>Connectez-vous pour voir vos favoris</Typography>
      <Box onClick={() => navigate('/login')} sx={{ mt: 1, px: 3, py: 1.2, borderRadius: '14px', bgcolor: ORANGE, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Se connecter
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F8FA', py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3, lg: 4 } }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>

        {/* ── Header ── */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 26 }, color: '#0F172A', letterSpacing: '-0.5px' }}>
              Mes favoris
            </Typography>
            {!isLoading && (
              <Box sx={{ px: 1.2, py: 0.3, borderRadius: '20px', bgcolor: alpha(RED, 0.12), border: `1px solid ${alpha(RED, 0.25)}` }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: RED }}>{items.length}</Typography>
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: 13.5, color: '#94A3B8' }}>
            Retrouvez tous vos articles sauvegardés
          </Typography>
        </Box>

        {/* ── Filters ── */}
        {categories.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterListOutlined sx={{ fontSize: 17, color: '#94A3B8', mr: 0.5 }} />
            {[['all', `Tout (${items.length})`], ...categories.map(([slug, name]) => [slug, `${name} (${items.filter(i => i.product?.category?.slug === slug).length})`])].map(([key, label]) => (
              <Box key={key} onClick={() => setCatFilter(key)} sx={{
                px: 1.6, py: 0.65, borderRadius: '20px', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700,
                bgcolor: catFilter === key ? ORANGE : '#FFFFFF',
                color: catFilter === key ? 'white' : '#475569',
                border: catFilter === key ? `1.5px solid ${ORANGE}` : '1.5px solid rgba(15,23,42,0.09)',
                transition: 'all 0.18s',
                '&:hover': catFilter === key ? {} : { bgcolor: 'rgba(15,23,42,0.04)', color: '#0F172A' },
              }}>
                {label}
              </Box>
            ))}
          </Box>
        )}

        {/* ── Skeletons ── */}
        {isLoading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={300} sx={{ borderRadius: '18px', bgcolor: '#F1F5F9' }} />
            ))}
          </Box>
        )}

        {/* ── Empty ── */}
        {!isLoading && filtered.length === 0 && (
          <Box sx={{
            textAlign: 'center', py: { xs: 8, sm: 12 }, borderRadius: '24px',
            background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
          }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '22px', mx: 'auto', mb: 3,
              background: `linear-gradient(135deg, ${alpha(RED, 0.15)}, ${alpha(RED, 0.05)})`,
              border: `1.5px solid ${alpha(RED, 0.2)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 24px ${alpha(RED, 0.1)}` }}>
              <FavoriteBorderOutlined sx={{ fontSize: 32, color: alpha(RED, 0.7) }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#0F172A', mb: 1 }}>
              {catFilter === 'all' ? 'Aucun favori pour l\'instant' : 'Aucun article dans cette catégorie'}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#94A3B8', mb: 3.5 }}>
              Appuyez sur le cœur d'un produit pour le sauvegarder ici
            </Typography>
            <Box component={Link} to="/products" sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none',
              px: 3, py: 1.2, borderRadius: '14px',
              background: `linear-gradient(135deg, ${ORANGE}, #e05e00)`,
              color: 'white', fontSize: 14, fontWeight: 800,
              boxShadow: `0 6px 20px ${alpha(ORANGE, 0.4)}`,
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 10px 28px ${alpha(ORANGE, 0.5)}` },
            }}>
              Explorer les produits <ArrowForward sx={{ fontSize: 17 }} />
            </Box>
          </Box>
        )}

        {/* ── Grid ── */}
        {!isLoading && filtered.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)' }, gap: { xs: 1.5, sm: 2 } }}>
            {filtered.map(item => {
              const p = item.product;
              if (!p) return null;
              const img = p.images?.[0]?.urlMedium ?? p.images?.[0]?.urlThumb ?? p.images?.[0]?.urlFull;
              const hasDiscount = p.salePrice && p.salePrice < p.price;
              const discountPct = hasDiscount ? Math.round((1 - p.salePrice / p.price) * 100) : 0;
              const displayPrice = hasDiscount ? p.salePrice : p.price;

              return (
                <Box key={item.id} sx={{
                  borderRadius: '18px', overflow: 'hidden',
                  background: '#FFFFFF',
                  border: '1px solid rgba(15,23,42,0.09)',
                  boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
                  display: 'flex', flexDirection: 'column',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: '#FFFFFF',
                    borderColor: 'rgba(15,23,42,0.15)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
                  },
                }}>
                  {/* Image */}
                  <Box component={Link} to={`/products/${p.slug}`} sx={{ display: 'block', position: 'relative', textDecoration: 'none' }}>
                    <Box sx={{
                      height: { xs: 140, sm: 180 }, overflow: 'hidden',
                      bgcolor: '#F1F5F9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {img
                        ? <Box component="img" src={img} alt={p.name} sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.04)' } }} />
                        : <ShoppingCartOutlined sx={{ fontSize: 36, color: '#CBD5E1' }} />
                      }
                    </Box>
                    {/* Discount badge */}
                    {hasDiscount && (
                      <Box sx={{ position: 'absolute', top: 10, left: 10,
                        px: 1, py: 0.25, borderRadius: '8px', bgcolor: RED,
                        display: 'flex', alignItems: 'center', gap: 0.4 }}>
                        <TrendingDownOutlined sx={{ fontSize: 11, color: 'white' }} />
                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'white' }}>-{discountPct}%</Typography>
                      </Box>
                    )}
                    {/* Copy link */}
                    <IconButton onClick={e => { e.preventDefault(); e.stopPropagation(); copyLink(p.slug, item.id); }} sx={{
                      position: 'absolute', top: 8, right: 8,
                      width: 32, height: 32, p: 0,
                      bgcolor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: copiedId === item.id ? '#10B981' : 'white',
                      transition: 'all 0.18s',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.65)', borderColor: 'rgba(255,255,255,0.3)' },
                    }}>
                      {copiedId === item.id
                        ? <Check sx={{ fontSize: 15 }} />
                        : <IosShareOutlined sx={{ fontSize: 15 }} />
                      }
                    </IconButton>
                  </Box>

                  {/* Content */}
                  <Box sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Store */}
                    {p.store?.name && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.6 }}>
                        <StorefrontOutlined sx={{ fontSize: 11, color: '#94A3B8' }} />
                        <Typography noWrap sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{p.store.name}</Typography>
                      </Box>
                    )}

                    {/* Name */}
                    <Typography sx={{
                      fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 700, color: '#0F172A',
                      lineHeight: 1.35, mb: 1, flex: 1,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {p.name}
                    </Typography>

                    {/* Price */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.8, mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: 14, sm: 15 }, color: hasDiscount ? GREEN : ORANGE }}>
                        {fmt(displayPrice)}
                      </Typography>
                      {hasDiscount && (
                        <Typography sx={{ fontSize: 11, color: '#94A3B8', textDecoration: 'line-through' }}>
                          {fmt(p.price)}
                        </Typography>
                      )}
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Box component={Link} to={`/products/${p.slug}`} sx={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.7,
                        py: 0.9, borderRadius: '12px', textDecoration: 'none',
                        background: `linear-gradient(135deg, ${ORANGE}, #e05e00)`,
                        color: 'white', fontSize: 12.5, fontWeight: 800,
                        boxShadow: `0 4px 12px ${alpha(ORANGE, 0.35)}`,
                        transition: 'all 0.18s',
                        '&:hover': { boxShadow: `0 6px 18px ${alpha(ORANGE, 0.5)}` },
                      }}>
                        <ShoppingCartOutlined sx={{ fontSize: 15 }} />
                        Voir
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => remove.mutate(p.id)}
                        disabled={remove.isPending}
                        sx={{
                          width: 36, height: 36, borderRadius: '12px',
                          color: RED,
                          border: `1.5px solid ${alpha(RED, 0.25)}`,
                          bgcolor: alpha(RED, 0.06),
                          transition: 'all 0.18s',
                          '&:hover': { bgcolor: alpha(RED, 0.15), borderColor: alpha(RED, 0.5) },
                          '&.Mui-disabled': { opacity: 0.4 },
                        }}>
                        <DeleteOutlineRounded sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

      </Box>
    </Box>
  );
}
