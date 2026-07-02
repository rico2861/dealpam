import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Typography, Grid, Chip, Button, Skeleton,
  alpha, IconButton,
} from '@mui/material';
import { FlashOn, Favorite, FavoriteBorder, Store, KeyboardArrowUp, Home, ChevronRight } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';

const LikedCtx = createContext<Set<string>>(new Set());
const useLikedIds = () => useContext(LikedCtx);

const OR  = '#FF6B00';
const ORD = '#E05A00';
const BG  = '#0F172A';

const fmtP = (n: number) => n.toLocaleString('fr-HT') + ' HTG';
const pct  = (orig: number, sale: number) => Math.round((1 - sale / orig) * 100);

/* â"€â"€â"€ FlashTimer â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
function useCountdown(endsAt: Date) {
  const [diff, setDiff] = useState(Math.max(0, endsAt.getTime() - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setDiff(Math.max(0, endsAt.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return { h, m, s };
}

function TimeBlock({ v, label }: { v: string; label: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{
        bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '6px', px: { xs: '8px', md: '12px' }, py: { xs: '4px', md: '6px' },
        minWidth: { xs: 32, md: 42 },
      }}>
        <Typography fontSize={{ xs: 16, md: 22 }} fontWeight={900} color="white" lineHeight={1} fontFamily="monospace">
          {v}
        </Typography>
      </Box>
      <Typography fontSize={9} color="rgba(255,255,255,0.5)" mt={0.3} textTransform="uppercase" letterSpacing={0.5}>
        {label}
      </Typography>
    </Box>
  );
}

/* â"€â"€â"€ Carte produit flash â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
function FlashCard({ p }: { p: any }) {
  const likedIds = useLikedIds();
  const [liked, setLiked] = useState(() => likedIds.has(p.id));
  const [busy,  setBusy]  = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const imgUrl = p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium || p.images?.[0]?.url || p.imageUrl || '';
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const off = hasSale ? pct(Number(p.price), Number(p.salePrice)) : 0;

  useEffect(() => { setLiked(likedIds.has(p.id)); }, [likedIds, p.id]);

  return (
    <Box component={Link} to={`/products/${p.slug}`}
      sx={{
        textDecoration: 'none', bgcolor: 'white', borderRadius: '14px',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: '1px solid rgba(239,68,68,0.12)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 16px 40px rgba(239,68,68,0.18)',
          borderColor: '#EF4444',
        },
        '&:hover .fc-img': { transform: 'scale(1.07)' },
      }}>

      {/* Image */}
      <Box sx={{ position: 'relative', paddingTop: '100%', bgcolor: '#F8F8F8', overflow: 'hidden', flexShrink: 0 }}>
        {imgUrl
          ? <Box component="img" src={imgUrl} alt={p.name} className="fc-img"
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', transition: 'transform 0.35s ease' }} />
          : <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#D1D5DB' }}>
              <Store sx={{ fontSize: 40 }} />
            </Box>
        }

        {/* Badge % */}
        {hasSale && (
          <Box sx={{
            position: 'absolute', top: 10, left: 10,
            bgcolor: '#EF4444', borderRadius: '8px',
            px: 1, py: 0.4,
            boxShadow: '0 2px 8px rgba(239,68,68,0.45)',
          }}>
            <Typography fontSize={12} fontWeight={900} color="white" lineHeight={1}>
              -{off}%
            </Typography>
          </Box>
        )}

        {/* Badge FLASH */}
        <Box sx={{
          position: 'absolute', bottom: 8, left: 8,
          bgcolor: 'rgba(15,10,30,0.85)', borderRadius: '6px',
          px: 0.8, py: 0.3, display: 'flex', alignItems: 'center', gap: 0.3,
        }}>
          <FlashOn sx={{ color: '#FBBF24', fontSize: 11 }} />
          <Typography fontSize={9.5} fontWeight={700} color="#FBBF24" lineHeight={1}>FLASH</Typography>
        </Box>

        {/* Coeur */}
        <IconButton onClick={async (e) => {
          e.preventDefault(); e.stopPropagation();
          if (!user) { navigate('/login'); return; }
          if (busy) return;
          setBusy(true);
          try {
            if (liked) { await api.delete(`/wishlist/${p.id}`); setLiked(false); }
            else { await api.post('/wishlist', { productId: p.id }); setLiked(true); }
            qc.invalidateQueries({ queryKey: ['wishlist'] });
            qc.invalidateQueries({ queryKey: ['wishlist-count'] });
          } catch { } finally { setBusy(false); }
        }}
          sx={{
            position: 'absolute', top: 8, right: 8,
            width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.92)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
            '&:hover': { transform: 'scale(1.15)', bgcolor: 'white' },
            transition: 'all 0.18s',
          }}>
          {liked
            ? <Favorite sx={{ fontSize: 15, color: '#EF4444' }} />
            : <FavoriteBorder sx={{ fontSize: 15, color: '#6B7280' }} />}
        </IconButton>
      </Box>

      {/* Info */}
      <Box sx={{ p: '10px 12px 13px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
        <Typography fontSize={12.5} color="#1F2937" fontWeight={500} lineHeight={1.35}
          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {p.name}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
          <Typography fontSize={14} fontWeight={900} color="#EF4444" noWrap sx={{ flexShrink: 0 }}>
            {fmtP(Number(hasSale ? p.salePrice : p.price))}
          </Typography>
          {hasSale && (
            <Typography fontSize={10.5} color="#9CA3AF" noWrap sx={{ textDecoration: 'line-through', flexShrink: 1 }}>
              {fmtP(Number(p.price))}
            </Typography>
          )}
        </Box>

        <Typography fontSize={10.5} color="#9CA3AF" noWrap>{p.store?.name || ''}</Typography>
      </Box>
    </Box>
  );
}

/* â"€â"€â"€ Squelette carte â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
function CardSkeleton() {
  return (
    <Box sx={{ borderRadius: '14px', overflow: 'hidden', bgcolor: 'white' }}>
      <Skeleton variant="rectangular" sx={{ paddingTop: '100%' }} />
      <Box sx={{ p: 1.5 }}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="50%" height={14} sx={{ mt: 0.5 }} />
        <Skeleton width="60%" height={18} sx={{ mt: 0.5 }} />
      </Box>
    </Box>
  );
}

/* â"€â"€â"€ Page principale â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */
export default function FlashSalePage() {
  const endsAt = useRef(new Date(Date.now() + 4 * 3600 * 1000)).current;
  const { h, m, s } = useCountdown(endsAt);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['flash-sale-all'],
    queryFn: () => api.get('/products?hasSale=true&sort=discount&limit=100').then(r => {
      const list = r.data?.data || r.data || [];
      return list.filter((p: any) => p.salePrice && Number(p.salePrice) < Number(p.price));
    }).catch(() => []),
    staleTime: 120_000,
  });

  const { user } = useAuthStore();
  const { data: wishlistRaw = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data as any[]),
    enabled: !!user && !!localStorage.getItem('accessToken'),
    staleTime: 60_000,
  });
  const likedIds = useMemo(() => new Set((wishlistRaw as any[]).map((w: any) => w.productId)), [wishlistRaw]);

  return (
    <LikedCtx.Provider value={likedIds}>
    <Box sx={{ bgcolor: '#F5F5F7', minHeight: '100vh', pb: 8 }}>

      {/* Hero banner */}
      <Box sx={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0F0A1E 0%, #1A0510 50%, #0D1117 100%)',
        pt: { xs: 3.5, md: 5 }, pb: { xs: 4, md: 6 },
      }}>
        {/* Effets lumineux */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <Box sx={{ position: 'absolute', top: '-20%', left: '-10%', width: '50%', height: '140%',
            background: 'radial-gradient(ellipse, rgba(239,68,68,0.18) 0%, transparent 70%)' }} />
          <Box sx={{ position: 'absolute', top: '-20%', right: '-10%', width: '50%', height: '140%',
            background: 'radial-gradient(ellipse, rgba(251,191,36,0.12) 0%, transparent 70%)' }} />
        </Box>

        {/* Barre animée top */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg,#EF4444,#FBBF24,#EF4444)',
          backgroundSize: '200% 100%',
          animation: 'dp-shimmer 2.4s linear infinite',
        }} />

        <Container maxWidth="xl" sx={{ position: 'relative' }}>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3, opacity: 0.6 }}>
            <Home sx={{ fontSize: 13, color: 'white' }} />
            <ChevronRight sx={{ fontSize: 13, color: 'white' }} />
            <Typography fontSize={12} color="white">Ventes Flash</Typography>
          </Box>

          {/* Titre + timer */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' }, gap: { xs: 2.5, md: 4 } }}>

            {/* Titre */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: { xs: 52, md: 64 }, height: { xs: 52, md: 64 }, borderRadius: '16px',
                background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 0 30px rgba(239,68,68,0.55)',
              }}>
                <FlashOn sx={{ color: '#FBBF24', fontSize: { xs: 30, md: 36 } }} />
              </Box>
              <Box>
                <Typography fontSize={{ xs: 26, md: 36 }} fontWeight={900} color="white"
                  letterSpacing="-1px" lineHeight={1} sx={{ textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                  VENTES FLASH
                </Typography>
                <Typography fontSize={{ xs: 12, md: 14 }} color="rgba(255,255,255,0.55)" mt={0.5}>
                  {products.length > 0 ? `${products.length} offres · Prix cassés pour une durée limitée` : 'Prix cassés pour une durée limitée'}
                </Typography>
              </Box>
            </Box>

            {/* Timer */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2,
              bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px', px: { xs: 2, md: 3 }, py: { xs: 1.2, md: 1.8 } }}>
              <Box>
                <Typography fontSize={10} color="rgba(255,255,255,0.45)" textTransform="uppercase" letterSpacing={1} mb={0.5}>
                  Fin dans
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <TimeBlock v={h} label="h" />
                  <Typography color="rgba(255,255,255,0.4)" fontWeight={900} fontSize={20} mt="-14px">:</Typography>
                  <TimeBlock v={m} label="min" />
                  <Typography color="rgba(255,255,255,0.4)" fontWeight={900} fontSize={20} mt="-14px">:</Typography>
                  <TimeBlock v={s} label="sec" />
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Grille produits */}
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2.5 }, pt: { xs: 2.5, md: 3.5 } }}>

        {/* Sous-header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 4, height: 22, background: 'linear-gradient(180deg,#EF4444,#B91C1C)', borderRadius: 2 }} />
            <Typography fontWeight={700} fontSize={{ xs: 15, md: 17 }} color={BG}>
              {isLoading ? 'Chargement…' : `${products.length} produit${products.length !== 1 ? 's' : ''} en promotion flash`}
            </Typography>
          </Box>
          <Chip
            icon={<FlashOn sx={{ fontSize: '14px !important', color: '#EF4444 !important' }} />}
            label="Stocks limités"
            size="small"
            sx={{ bgcolor: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 11,
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px' }}
          />
        </Box>

        {/* Grille */}
        {isLoading ? (
          <Box sx={{ display: 'grid', gap: { xs: '10px', md: '14px' },
            gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(5,1fr)', lg: 'repeat(6,1fr)', xl: 'repeat(7,1fr)' } }}>
            {Array.from({ length: 14 }).map((_, i) => <CardSkeleton key={i} />)}
          </Box>
        ) : products.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <FlashOn sx={{ fontSize: 56, color: '#E2E8F0', mb: 1.5 }} />
            <Typography color={BG} fontWeight={700} fontSize={18} mb={1}>Aucune vente flash pour le moment</Typography>
            <Typography color="#94A3B8" fontSize={14} mb={3}>Revenez bientôt pour profiter des offres flash !</Typography>
            <Button component={Link} to="/home" variant="contained"
              sx={{ bgcolor: '#EF4444', color: 'white', fontWeight: 700, borderRadius: 2.5,
                px: 4, py: 1.2, textTransform: 'none', '&:hover': { bgcolor: '#DC2626' } }}>
              Retour Ã  l'accueil
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: { xs: '10px', md: '14px' },
            gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(5,1fr)', lg: 'repeat(6,1fr)', xl: 'repeat(7,1fr)' } }}>
            {products.map((p: any) => <FlashCard key={p.id} p={p} />)}
          </Box>
        )}
      </Container>

      {/* Bouton scroll top */}
      {showTop && (
        <IconButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 99,
            width: 44, height: 44, bgcolor: '#EF4444', color: 'white',
            boxShadow: '0 4px 20px rgba(239,68,68,0.45)',
            '&:hover': { bgcolor: '#DC2626' },
          }}>
          <KeyboardArrowUp />
        </IconButton>
      )}
    </Box>
    </LikedCtx.Provider>
  );
}

