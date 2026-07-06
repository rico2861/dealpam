import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container, Grid, Box, Typography, Button, Chip, Avatar, Rating,
  Tabs, Tab, Skeleton, alpha, IconButton, Tooltip,
  Card, CardMedia, CardContent, CardActionArea,
} from '@mui/material';
import {
  Verified, Star, Store, LocationOn, Phone, WhatsApp, Email,
  ContentCopy, CheckCircle, ShoppingBag, Inventory,
  ArrowBack, Favorite, FavoriteBorder, Diamond, AccessTime, Security, FlashOn,
  Description, Gavel, BusinessCenter, Badge, OpenInNew,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const ORANGE = '#FF6B00';
const BLUE  = '#FF6B00';
const RED   = '#EF4444';
const GREEN = '#10B981';
const GOLD  = '#F59E0B';

const DOC_ICONS: Record<string, any> = {
  ID: Badge, BUSINESS_REGISTRATION: BusinessCenter, TAX: Gavel, OTHER: Description,
};
const DOC_LABELS: Record<string, string> = {
  ID: 'Pièce d\'identité', BUSINESS_REGISTRATION: 'Registre de commerce', TAX: 'Patente', OTHER: 'Document officiel',
};

const fmtHTG = (v: number) => `${v.toLocaleString('fr-HT')} HTG`;

const PAYMENT_ICONS: Record<string, string> = {
  MONCASH: '📱', NATCASH: '📲', CASH: '💵', BANK_TRANSFER: '🏦', OTHER: '💳',
};

const PLAN_COLORS: Record<string, { color: string; label: string }> = {
  STARTER:  { color: '#64748B', label: 'Starter'  },
  BUSINESS: { color: '#3B82F6', label: 'Business' },
  PREMIUM:  { color: '#F59E0B', label: 'Premium'  },
  ELITE:    { color: '#A855F7', label: 'Elite'    },
};

// â"€â"€â"€ Product card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function ProductCard({ p }: { p: any }) {
  const [liked,  setLiked]  = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const imgs  = p.images ?? [];
  const img   = imgs[imgIdx]?.urlMedium || imgs[0]?.urlThumb;
  const sale  = p.salePrice && Number(p.salePrice) < Number(p.price);
  const disc  = sale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  const price = Number(p.salePrice || p.price);

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      {sale && (
        <Chip label={`-${disc}%`} size="small"
          sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2,
            bgcolor: RED, color: 'white', fontWeight: 900, height: 20, fontSize: 10.5 }} />
      )}
      <IconButton size="small" onClick={() => setLiked(l => !l)}
        sx={{ position: 'absolute', top: 6, right: 6, zIndex: 2,
          bgcolor: 'rgba(255,255,255,0.9)', width: 28, height: 28, '&:hover': { bgcolor: 'white' } }}>
        {liked
          ? <Favorite sx={{ fontSize: 14, color: RED }} />
          : <FavoriteBorder sx={{ fontSize: 14, color: '#94A3B8' }} />}
      </IconButton>

      <Card sx={{ height: '100%', borderRadius: 2.5, border: '1px solid #E5E7EB', boxShadow: 'none',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.1)', transform: 'translateY(-2px)', borderColor: BLUE } }}>
        <CardActionArea component={Link} to={`/products/${p.slug}`}
          sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'stretch' }}>
          <Box sx={{ height: 196, overflow: 'hidden', bgcolor: '#F8FAFC' }}
            onMouseEnter={() => imgs.length > 1 && setImgIdx(1)}
            onMouseLeave={() => setImgIdx(0)}>
            <CardMedia component="img"
              image={img || 'https://placehold.co/400x300/F1F5F9/94A3B8?text=Photo'}
              alt={p.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover',
                transition: 'transform 0.4s', '&:hover': { transform: 'scale(1.06)' } }} />
          </Box>
          <CardContent sx={{ flex: 1, p: 1.5 }}>
            <Typography fontSize={13} fontWeight={500} color="#0F1111" lineHeight={1.4}
              sx={{ mb: 0.5, overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {p.name}
            </Typography>
            <Typography fontWeight={800} fontSize={15} color={RED}>{fmtHTG(price)}</Typography>
            {sale && (
              <Typography fontSize={11} color="#94A3B8" sx={{ textDecoration: 'line-through' }}>
                {fmtHTG(Number(p.price))}
              </Typography>
            )}
            {p.avgRating > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.4 }}>
                <Star sx={{ fontSize: 12, color: GOLD }} />
                <Typography fontSize={11.5} color="#64748B">{p.avgRating.toFixed(1)} ({p.totalReviews})</Typography>
              </Box>
            )}
          </CardContent>
        </CardActionArea>
      </Card>
    </Box>
  );
}

// â"€â"€â"€ Main â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export default function StoreDetailPage() {
  const { slug }  = useParams<{ slug: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const navigate  = useNavigate();

  const [tab,        setTab]       = useState(0);
  const [catFilter,  setCatFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('latest');
  const [copied,     setCopied]    = useState(false);

  // â"€â"€ Fetch store (enriched: includes seller.stores + reviews) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', slug],
    queryFn:  () => api.get(`/stores/${slug}`).then(r => r.data),
    staleTime: 60_000,
  });

  const { data: productsData, isLoading: prodsLoading } = useQuery({
    queryKey: ['storeProducts', store?.id, catFilter, sortFilter],
    queryFn:  () => api.get(`/products?storeId=${store.id}&limit=24&sort=${sortFilter}${catFilter ? `&category=${catFilter}` : ''}`).then(r => r.data),
    enabled:  !!store?.id,
  });

  const products: any[]    = productsData?.data ?? [];
  const seller             = store?.seller;
  const allStores: any[]   = seller?.stores ?? [];
  const reviews: any[]     = store?.reviews ?? [];

  // Derive category list from products already loaded
  const cats: { slug: string; name: string }[] = [];
  products.forEach((p: any) => {
    if (p.category && !cats.find(c => c.slug === p.category.slug)) {
      cats.push({ slug: p.category.slug, name: p.category.name });
    }
  });

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    enqueueSnackbar('Lien copié !', { variant: 'info' });
  };

  let paymentMethods: string[] = [];
  try {
    const parsed = JSON.parse(store?.acceptedPaymentMethods || '[]');
    if (Array.isArray(parsed)) paymentMethods = parsed;
  } catch { /* ignore malformed data */ }

  const memberSince = seller?.createdAt
    ? new Date(seller.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
    : null;

  const planName  = seller?.subscriptions?.[0]?.plan?.tier ?? 'STARTER';
  const planInfo  = PLAN_COLORS[planName] ?? PLAN_COLORS.STARTER;

  // â"€â"€ Loading â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

  if (isLoading) return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      <Skeleton variant="rectangular" height={260} />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}><Skeleton variant="rectangular" height={360} sx={{ borderRadius: 3 }} /></Grid>
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              {Array(8).fill(0).map((_, i) => (
                <Grid item xs={6} sm={4} md={3} key={i}>
                  <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2.5 }} />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );

  if (!store) return (
    <Container sx={{ py: 8, textAlign: 'center' }}>
      <Store sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
      <Typography variant="h5" fontWeight={800} mb={1}>Boutique introuvable</Typography>
      <Button component={Link} to="/home" variant="contained" sx={{ borderRadius: 2.5 }}>Accueil</Button>
    </Container>
  );

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', pb: 6 }}>

      {/* â"€â"€ Banner â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
      <Box sx={{ position: 'relative', height: { xs: 180, md: 260 }, overflow: 'hidden' }}>
        {store.bannerUrl ? (
          <Box component="img" src={store.bannerUrl} alt={store.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)' }}>
            {[220, 340, 150, 90].map((size, i) => (
              <Box key={i} sx={{ position: 'absolute', width: size, height: size, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.07)',
                top:  `${15 + i * 14}%`,
                left: i < 2 ? `${4 + i * 22}%` : `${58 + i * 9}%` }} />
            ))}
          </Box>
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 55%)' }} />

        <IconButton onClick={() => navigate(-1)}
          sx={{ position: 'absolute', top: 12, left: 12,
            bgcolor: 'rgba(0,0,0,0.4)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
          <ArrowBack fontSize="small" />
        </IconButton>

        <Tooltip title={copied ? 'Copié !' : 'Copier le lien'}>
          <IconButton onClick={copyLink}
            sx={{ position: 'absolute', top: 12, right: 12,
              bgcolor: 'rgba(0,0,0,0.4)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Logo overlapping banner */}
        <Box sx={{ position: 'absolute', bottom: -38, left: { xs: 20, md: 40 } }}>
          {store.logoUrl ? (
            <Box component="img" src={store.logoUrl} alt={store.name}
              sx={{ width: { xs: 76, md: 96 }, height: { xs: 76, md: 96 }, borderRadius: 3,
                border: '3px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', objectFit: 'cover', bgcolor: 'white' }} />
          ) : (
            <Avatar sx={{ width: { xs: 76, md: 96 }, height: { xs: 76, md: 96 }, fontSize: 36, fontWeight: 900,
              bgcolor: BLUE, border: '3px solid white', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', borderRadius: 3 }}>
              {store.name?.[0]?.toUpperCase()}
            </Avatar>
          )}
        </Box>
      </Box>

      <Container maxWidth="xl">

        {/* â"€â"€ Header row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        <Box sx={{ pt: { xs: 7, md: 7.5 }, pb: 2, pl: { md: '120px' },
          display: 'flex', alignItems: { md: 'flex-end' }, justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography fontWeight={900} fontSize={{ xs: 22, md: 28 }} color="#0F1111">{store.name}</Typography>
              {store.isVerified && (
                <Tooltip title="Boutique vérifiée par DealPam">
                  <Verified sx={{ fontSize: 22, color: BLUE }} />
                </Tooltip>
              )}
              <Chip label={planInfo.label} size="small"
                sx={{ height: 20, fontSize: 10.5, fontWeight: 700,
                  bgcolor: alpha(planInfo.color, 0.1), color: planInfo.color }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
              {store.avgRating > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Rating value={store.avgRating} readOnly precision={0.5} size="small" sx={{ color: GOLD }} />
                  <Typography fontSize={13} fontWeight={700} color="#64748B">{store.avgRating.toFixed(1)}</Typography>
                  <Typography fontSize={12.5} color="#94A3B8">({store._count?.reviews ?? 0} avis)</Typography>
                </Box>
              )}
              {(store.city || store.department) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <LocationOn sx={{ fontSize: 14, color: '#94A3B8' }} />
                  <Typography fontSize={12.5} color="#64748B">
                    {[store.city, store.department].filter(Boolean).join(', ')}
                  </Typography>
                </Box>
              )}
              {memberSince && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <AccessTime sx={{ fontSize: 14, color: '#94A3B8' }} />
                  <Typography fontSize={12.5} color="#64748B">Membre depuis {memberSince}</Typography>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
            {store.whatsapp && (
              <Button variant="contained" startIcon={<WhatsApp />}
                component="a" target="_blank"
                href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=Bonjour, je visite votre boutique ${store.name} sur DealPam !`}
                sx={{ bgcolor: '#25D366', fontWeight: 700, px: 2.5, borderRadius: 2.5, '&:hover': { bgcolor: '#16A34A' } }}>
                WhatsApp
              </Button>
            )}
            {store.phone && (
              <Button variant="outlined" startIcon={<Phone />} component="a" href={`tel:${store.phone}`}
                sx={{ borderColor: '#E5E7EB', color: '#374151', fontWeight: 600, px: 2, borderRadius: 2.5,
                  '&:hover': { borderColor: BLUE, color: BLUE, bgcolor: alpha(BLUE, 0.04) } }}>
                Appeler
              </Button>
            )}
          </Box>
        </Box>

        {/* â"€â"€ Trust badges â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          {store.isVerified && (
            <Chip icon={<CheckCircle sx={{ fontSize: 14, color: `${GREEN} !important` }} />}
              label="Boutique vérifiée" size="small"
              sx={{ bgcolor: alpha(GREEN, 0.08), color: GREEN, fontWeight: 600, border: `1px solid ${alpha(GREEN, 0.2)}` }} />
          )}
          <Chip icon={<ShoppingBag sx={{ fontSize: 14, color: `${BLUE} !important` }} />}
            label={`${store._count?.products ?? 0} produits`} size="small"
            sx={{ bgcolor: alpha(BLUE, 0.07), color: BLUE, fontWeight: 600, border: `1px solid ${alpha(BLUE, 0.15)}` }} />
          {(store.totalSales ?? 0) > 0 && (
            <Chip icon={<FlashOn sx={{ fontSize: 14, color: `${RED} !important` }} />}
              label={`${store.totalSales} ventes`} size="small"
              sx={{ bgcolor: alpha(RED, 0.07), color: RED, fontWeight: 600, border: `1px solid ${alpha(RED, 0.15)}` }} />
          )}
          {paymentMethods.map((m: string) => (
            <Chip key={m} label={PAYMENT_ICONS[m] ? `${PAYMENT_ICONS[m]} ${m}` : m} size="small"
              sx={{ bgcolor: '#F8FAFC', color: '#475569', fontSize: 11.5, border: '1px solid #E5E7EB' }} />
          ))}
          {store.email && (
            <Chip icon={<Email sx={{ fontSize: 13, color: '#64748B !important' }} />}
              label={store.email} size="small" clickable onClick={() => window.open(`mailto:${store.email}`)}
              sx={{ bgcolor: '#F8FAFC', color: '#475569', fontSize: 11, border: '1px solid #E5E7EB',
                '&:hover': { bgcolor: '#E2E8F0' } }} />
          )}
        </Box>

        <Grid container spacing={3}>

          {/* â"€â"€ Sidebar â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
          <Grid item xs={12} md={3}>

            {store.description && (
              <Box sx={{ bgcolor: 'white', borderRadius: 3, p: 2.5, border: '1px solid #E5E7EB', mb: 2,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <Typography fontWeight={700} fontSize={14} mb={1} color="#0F1111">À propos</Typography>
                <Typography fontSize={13} color="#64748B" lineHeight={1.7}>{store.description}</Typography>
              </Box>
            )}

            {/* Other stores of this seller */}
            {allStores.length > 1 && (
              <Box sx={{ bgcolor: 'white', borderRadius: 3, p: 2.5, border: '1px solid #E5E7EB', mb: 2,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <Typography fontWeight={700} fontSize={14} mb={1.5} color="#0F1111">
                  Autres boutiques
                </Typography>
                {allStores.map((s: any) => (
                  <Box key={s.id} component={Link} to={`/store/${s.slug}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.2, borderRadius: 2,
                      mb: 1, textDecoration: 'none',
                      border: `1.5px solid ${s.slug === slug ? BLUE : '#E5E7EB'}`,
                      bgcolor: s.slug === slug ? alpha(BLUE, 0.04) : 'white',
                      transition: 'all 0.15s', '&:hover': { borderColor: BLUE, bgcolor: alpha(BLUE, 0.04) } }}>
                    {s.logoUrl ? (
                      <Box component="img" src={s.logoUrl} alt={s.name}
                        sx={{ width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <Avatar sx={{ width: 36, height: 36, bgcolor: BLUE, fontWeight: 700, fontSize: 15,
                        borderRadius: 1.5, flexShrink: 0 }}>
                        {s.name?.[0]}
                      </Avatar>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography fontSize={13} fontWeight={600} color="#0F1111" noWrap>{s.name}</Typography>
                        {s.slug === slug && (
                          <Chip label="Ici" size="small"
                            sx={{ height: 16, fontSize: 9.5, bgcolor: alpha(BLUE, 0.1), color: BLUE }} />
                        )}
                      </Box>
                      <Typography fontSize={11.5} color="#94A3B8">{s._count?.products ?? 0} produits</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Seller trust card */}
            <Box sx={{ bgcolor: 'white', borderRadius: 3, p: 2.5, border: '1px solid #E5E7EB',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <Typography fontWeight={700} fontSize={14} mb={1.5} color="#0F1111">Vendeur</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: '#1E293B', fontWeight: 800 }}>
                  {seller?.businessName?.[0] || seller?.firstName?.[0]}
                </Avatar>
                <Box>
                  <Typography fontWeight={700} fontSize={13.5}>
                    {seller?.businessName || `${seller?.firstName || ''} ${seller?.lastName || ''}`.trim()}
                  </Typography>
                  {seller?.businessCity && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      <LocationOn sx={{ fontSize: 12, color: '#94A3B8' }} />
                      <Typography fontSize={12} color="#94A3B8">{seller.businessCity}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {([
                { Icon: CheckCircle, text: 'Identité vérifiée',   show: !!seller?.isVerified,    color: GREEN },
                { Icon: Diamond,     text: 'Vendeur Premium',     show: planName !== 'STARTER',  color: GOLD  },
                { Icon: Security,    text: 'Paiements sécurisés', show: true,                    color: BLUE  },
              ] as const).filter(b => b.show).map(({ Icon, text, color }) => (
                <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                  <Icon sx={{ fontSize: 15, color, flexShrink: 0 }} />
                  <Typography fontSize={12.5} color="#374151">{text}</Typography>
                </Box>
              ))}

              {store.address && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #F1F5F9' }}>
                  <Typography fontSize={12} color="#64748B">{store.address}</Typography>
                </Box>
              )}
              {(store as any).storeCode && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography fontSize={11.5} color="#94A3B8">ID boutique :</Typography>
                  <Typography fontSize={11.5} fontWeight={700} color="#475569" sx={{ fontFamily: 'monospace' }}>
                    {(store as any).storeCode}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* â"€â"€ Documents officiels â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
            {(seller?.documents ?? []).length > 0 && (
              <Box sx={{ bgcolor: 'white', borderRadius: 3, p: 2.5, border: '1px solid #E5E7EB',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5 }}>
                  <CheckCircle sx={{ fontSize: 16, color: GREEN }} />
                  <Typography fontWeight={700} fontSize={14} color="#0F1111">Documents officiels</Typography>
                </Box>
                <Typography fontSize={11.5} color="#94A3B8" mb={1.5} lineHeight={1.5}>
                  Ces documents ont été soumis par le vendeur pour attester de son identité et son activité commerciale.
                </Typography>
                {(seller.documents as any[]).map((doc: any) => {
                  const Icon = DOC_ICONS[doc.type] ?? Description;
                  const label = DOC_LABELS[doc.type] ?? doc.type;
                  return (
                    <Box key={doc.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2,
                      borderRadius: 2, mb: 0.8,
                      bgcolor: doc.isValid ? alpha(GREEN, 0.04) : '#F8FAFC',
                      border: `1px solid ${doc.isValid ? alpha(GREEN, 0.2) : '#E5E7EB'}`,
                    }}>
                      <Box sx={{
                        width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                        bgcolor: doc.isValid ? alpha(GREEN, 0.12) : '#F1F5F9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon sx={{ fontSize: 16, color: doc.isValid ? GREEN : '#94A3B8' }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography fontSize={12.5} fontWeight={600} color="#334155" noWrap>{label}</Typography>
                          {doc.isValid && <Verified sx={{ fontSize: 13, color: GREEN }} />}
                        </Box>
                        <Typography fontSize={11} color="#94A3B8" noWrap>{doc.fileName}</Typography>
                      </Box>
                      <IconButton size="small" component="a" href={doc.url} target="_blank" rel="noopener noreferrer"
                        sx={{ width: 26, height: 26, color: '#64748B', '&:hover': { color: ORANGE } }}>
                        <OpenInNew sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Grid>

          {/* â"€â"€ Products + Reviews â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
          <Grid item xs={12} md={9}>
            <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #E5E7EB',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)}
                sx={{ px: 2, borderBottom: '1px solid #F1F5F9',
                  '& .MuiTab-root': { fontWeight: 600, fontSize: 13.5, textTransform: 'none', minWidth: 'auto', px: 2.5 },
                  '& .Mui-selected': { color: BLUE },
                  '& .MuiTabs-indicator': { bgcolor: BLUE, height: 3, borderRadius: '3px 3px 0 0' } }}>
                <Tab label={`Produits (${store._count?.products ?? 0})`} />
                <Tab label={`Avis (${store._count?.reviews ?? 0})`} />
              </Tabs>

              {/* Products tab */}
              {tab === 0 && (
                <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                  {/* Filters */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 0.7, flexWrap: 'wrap', flex: 1 }}>
                      {(['', ...cats.map(c => c.slug)] as string[]).map((s, i) => {
                        const label = i === 0 ? 'Tous' : (cats[i - 1]?.name ?? s);
                        const active = catFilter === s;
                        return (
                          <Chip key={s} label={label} clickable onClick={() => setCatFilter(s)}
                            variant={active ? 'filled' : 'outlined'}
                            sx={{ fontWeight: 600, height: 28,
                              ...(active ? { bgcolor: BLUE, color: 'white' } : { color: '#64748B', borderColor: '#E5E7EB' }) }} />
                        );
                      })}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.7 }}>
                      {[['latest', 'Recents'], ['popular', 'Populaires'], ['price-asc', 'Prix ↑'], ['price-desc', 'Prix ↓']].map(([v, l]) => (
                        <Chip key={v} label={l} clickable onClick={() => setSortFilter(v)}
                          size="small" variant={sortFilter === v ? 'filled' : 'outlined'}
                          sx={{ height: 26, fontSize: 11.5, fontWeight: 600,
                            ...(sortFilter === v ? { bgcolor: '#0F1111', color: 'white' } : { color: '#64748B', borderColor: '#E5E7EB' }) }} />
                      ))}
                    </Box>
                  </Box>

                  {prodsLoading ? (
                    <Grid container spacing={1.5}>
                      {Array(8).fill(0).map((_, i) => (
                        <Grid item xs={6} sm={4} md={3} key={i}>
                          <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2.5 }} />
                        </Grid>
                      ))}
                    </Grid>
                  ) : products.length === 0 ? (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <Inventory sx={{ fontSize: 52, color: '#CBD5E1', mb: 1.5 }} />
                      <Typography color="#94A3B8" fontSize={14}>
                        Aucun produit{catFilter ? ' dans cette catégorie' : ''}
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={1.5}>
                      {products.map((p: any) => (
                        <Grid item xs={6} sm={4} md={3} key={p.id}>
                          <ProductCard p={p} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}

              {/* Reviews tab */}
              {tab === 1 && (
                <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
                  {reviews.length === 0 ? (
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                      <Star sx={{ fontSize: 48, color: '#E2E8F0', mb: 1 }} />
                      <Typography color="#94A3B8">Aucun avis pour cette boutique</Typography>
                    </Box>
                  ) : (
                    <>
                      {store.avgRating > 0 && (
                        <Box sx={{ display: 'flex', gap: 4, mb: 3, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                            <Typography sx={{ fontSize: 52, fontWeight: 900, color: '#0F1111', lineHeight: 1 }}>
                              {store.avgRating.toFixed(1)}
                            </Typography>
                            <Rating value={store.avgRating} readOnly precision={0.5} sx={{ color: GOLD, mt: 0.5 }} />
                            <Typography fontSize={12.5} color="#64748B" mt={0.5}>
                              {store._count?.reviews} avis
                            </Typography>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 160 }}>
                            {[5, 4, 3, 2, 1].map(star => (
                              <Box key={star} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.7 }}>
                                <Typography fontSize={12.5} color={BLUE} width={32} fontWeight={600}>{star} â˜…</Typography>
                                <Box sx={{ flex: 1, height: 8, bgcolor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                                  <Box sx={{ width: `${Math.min(100, 20 * star)}%`, height: '100%', bgcolor: GOLD, borderRadius: 4 }} />
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                      {reviews.map((r: any) => (
                        <Box key={r.id} sx={{ py: 2, borderTop: '1px solid #F1F5F9' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: BLUE, fontWeight: 700, fontSize: 14 }}>
                              {r.user?.firstName?.[0]}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography fontWeight={700} fontSize={13.5}>
                                {r.user?.firstName} {r.user?.lastName?.[0]}.
                              </Typography>
                              <Rating value={r.rating} readOnly size="small" sx={{ color: GOLD }} />
                            </Box>
                            <Typography fontSize={11.5} color="#94A3B8">
                              {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                            </Typography>
                          </Box>
                          {r.comment && (
                            <Typography fontSize={13.5} color="#374151" lineHeight={1.7}>{r.comment}</Typography>
                          )}
                        </Box>
                      ))}
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

