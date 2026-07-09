import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Container, Typography, Button,
  alpha, IconButton,
} from '@mui/material';
import { FlashOn, Favorite, FavoriteBorder, Store, KeyboardArrowUp, Home, ChevronRight, LocalFireDepartment, NewReleases, TrendingDown } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import { ProductCardSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const LikedCtx = createContext<Set<string>>(new Set());
const useLikedIds = () => useContext(LikedCtx);

const NAVY   = '#0F1B2E';
const ORANGE = '#F5711A';
const ORANGE_HOV = '#DB5E0F';
const RED    = '#E8432E';
const MUTED  = '#64748B';
const BG_PG  = '#F7F8FA';
const SURFACE1 = '#F5F5F3';

const fmtP = (n: number) => n.toLocaleString('fr-HT') + ' HTG';
const pct  = (orig: number, sale: number) => Math.round((1 - sale / orig) * 100);

/* ─── Timer serveur — jamais un délai fixe côté client ───────────────────── */
function useServerCountdown(endsAt: Date | null) {
  const [diff, setDiff] = useState(() => (endsAt ? Math.max(0, endsAt.getTime() - Date.now()) : 0));
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setDiff(Math.max(0, endsAt.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return { h, m, s, ended: endsAt !== null && diff <= 0 };
}

function TimeBlock({ v, label }: { v: string; label: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{
        bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: '8px', px: { xs: '8px', md: '11px' }, py: { xs: '4px', md: '6px' },
        minWidth: { xs: 30, md: 40 },
      }}>
        <Typography sx={{ fontSize: { xs: 16, md: 21 }, fontWeight: 800, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {v}
        </Typography>
      </Box>
      <Typography fontSize={9} color="rgba(255,255,255,0.45)" mt={0.4} textTransform="uppercase" letterSpacing={0.5} fontWeight={600}>
        {label}
      </Typography>
    </Box>
  );
}

/* ─── Carte produit flash ─────────────────────────────────────────────────── */
function FlashCard({ p }: { p: any }) {
  const likedIds = useLikedIds();
  const [liked, setLiked] = useState(() => likedIds.has(p.id));
  const [busy,  setBusy]  = useState(false);
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const imgUrl = p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium || p.images?.[0]?.url || p.imageUrl || '';
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const off = hasSale ? pct(Number(p.price), Number(p.salePrice)) : 0;
  const sold = Number(p.totalSold) || 0;
  const stockLeft = Number(p.stock) || 0;
  const soldPct = (sold + stockLeft) > 0 ? Math.min(100, Math.max(0, Math.round((sold / (sold + stockLeft)) * 100))) : null;
  const almostGone = soldPct !== null && soldPct >= 90;

  useEffect(() => { setLiked(likedIds.has(p.id)); }, [likedIds, p.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { navigate(`/login?next=${encodeURIComponent('/ventes-flash')}`); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (liked) { await api.delete(`/wishlist/${p.id}`); setLiked(false); }
      else { await api.post('/wishlist', { productId: p.id }); setLiked(true); }
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['wishlist-count'] });
    } catch { /* déjà en favoris ou hors-ligne — pas bloquant */ } finally { setBusy(false); }
  };

  return (
    <Box component={Link} to={`/products/${p.slug}`}
      sx={{
        textDecoration: 'none', bgcolor: 'white', borderRadius: '12px',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: '1px solid rgba(15,27,46,0.08)',
        boxShadow: '0 2px 10px rgba(15,27,46,0.06)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 10px 28px rgba(15,27,46,0.12)',
          borderColor: alpha(ORANGE, 0.35),
        },
        '&:hover .fc-img': { transform: 'scale(1.06)' },
      }}>

      {/* Image */}
      <Box sx={{ position: 'relative', paddingTop: '100%', bgcolor: SURFACE1, overflow: 'hidden', flexShrink: 0 }}>
        {imgUrl && !imgError
          ? <Box component="img" src={imgUrl} alt={p.name} className="fc-img"
              loading="lazy" decoding="async" onError={() => setImgError(true)}
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', transition: 'transform 0.3s ease' }} />
          : <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#D1D5DB' }}>
              <Store sx={{ fontSize: 36 }} />
            </Box>
        }

        {hasSale && (
          <Box sx={{ position: 'absolute', top: 8, left: 8, bgcolor: RED, borderRadius: '6px', px: '7px', py: '3px' }}>
            <Typography fontSize={11} fontWeight={800} color="white" lineHeight={1}>-{off}%</Typography>
          </Box>
        )}

        <Box
          component="button" type="button" onClick={handleLike} disabled={busy}
          sx={{
            position: 'absolute', top: 8, right: 8, zIndex: 2,
            cursor: 'pointer', border: 'none', padding: 0,
            width: 30, height: 30, borderRadius: '50%',
            bgcolor: liked ? alpha(RED, 0.12) : 'rgba(255,255,255,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 5px rgba(0,0,0,0.12)',
            transition: 'transform 0.15s ease, background 0.15s ease',
            '&:hover': { transform: 'scale(1.12)' },
            '&:disabled': { cursor: 'wait' },
          }}>
          {liked
            ? <Favorite sx={{ fontSize: 14, color: RED, pointerEvents: 'none' }} />
            : <FavoriteBorder sx={{ fontSize: 14, color: MUTED, pointerEvents: 'none' }} />}
        </Box>
      </Box>

      {/* Info */}
      <Box sx={{ p: '10px 11px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <Typography fontSize={12.5} color="#1F2937" fontWeight={500} lineHeight={1.35}
          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.7em' }}>
          {p.name}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
          <Typography fontSize={14.5} fontWeight={700} color={NAVY} noWrap sx={{ flexShrink: 0 }}>
            {fmtP(Number(hasSale ? p.salePrice : p.price))}
          </Typography>
          {hasSale && (
            <Typography fontSize={10.5} color={MUTED} noWrap sx={{ textDecoration: 'line-through', flexShrink: 1 }}>
              {fmtP(Number(p.price))}
            </Typography>
          )}
        </Box>

        {soldPct !== null && soldPct > 0 ? (
          <Box sx={{ mt: '2px' }}>
            <Box sx={{ height: 3, bgcolor: SURFACE1, borderRadius: '2px', overflow: 'hidden', mb: '4px' }}>
              <Box sx={{ height: '100%', width: `${soldPct}%`, bgcolor: RED, transition: 'width 0.3s ease' }} />
            </Box>
            <Typography sx={{ fontSize: 10, color: RED, fontWeight: 700, textTransform: almostGone ? 'uppercase' : 'none',
              animation: almostGone ? 'dp-pulse 1.4s ease-in-out infinite' : 'none' }}>
              {almostGone ? 'plus que quelques unités' : `déjà ${soldPct}% vendu`}
            </Typography>
          </Box>
        ) : (
          <Typography fontSize={10.5} color={MUTED} noWrap>{p.store?.name || ''}</Typography>
        )}
      </Box>
    </Box>
  );
}

const SORTS = [
  { key: 'discount', label: 'Meilleures remises', Icon: TrendingDown },
  { key: 'newest',   label: 'Nouveautés',         Icon: NewReleases },
  { key: 'ending',   label: 'Presque épuisé',     Icon: LocalFireDepartment },
] as const;
type SortKey = typeof SORTS[number]['key'];

export default function FlashSalePage() {
  const [showTop, setShowTop] = useState(false);
  const [sort, setSort] = useState<SortKey>('discount');

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { data: flashConfig } = useQuery({
    queryKey: ['flash-config-public'],
    queryFn: () => api.get('/flash-sale/active').then(r => r.data).catch(() => null),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const endAt = flashConfig?.endAt ? new Date(flashConfig.endAt) : null;
  const { h, m, s, ended: timerEnded } = useServerCountdown(endAt);
  const showTimer = !!endAt && !timerEnded;

  const { data: productsRaw = [], isLoading } = useQuery({
    queryKey: ['flash-sale-all'],
    queryFn: () => api.get('/products?hasSale=true&sort=discount&limit=100').then(r => {
      const list = r.data?.data || r.data || [];
      return list.filter((p: any) => p.salePrice && Number(p.salePrice) < Number(p.price));
    }).catch(() => []),
    staleTime: 120_000,
  });
  const showSkel = useDelayedLoading(isLoading);

  // Tri client — réellement fonctionnel, recalculé à chaque changement de filtre.
  const products = useMemo(() => {
    const arr = [...(productsRaw as any[])];
    if (sort === 'discount') {
      arr.sort((a, b) => pct(Number(b.price), Number(b.salePrice)) - pct(Number(a.price), Number(a.salePrice)));
    } else if (sort === 'newest') {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'ending') {
      arr.sort((a, b) => {
        const pctSold = (p: any) => {
          const sold = Number(p.totalSold) || 0, stock = Number(p.stock) || 0;
          return (sold + stock) > 0 ? sold / (sold + stock) : 0;
        };
        return pctSold(b) - pctSold(a);
      });
    }
    return arr;
  }, [productsRaw, sort]);

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
    <Box sx={{ bgcolor: BG_PG, minHeight: '100vh', pb: 8 }}>

      {/* Hero — palette de marque, pas d'effets criards */}
      <Box sx={{ position: 'relative', bgcolor: NAVY, pt: { xs: 3, md: 4.5 }, pb: { xs: 3.5, md: 5 } }}>
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)` }} />

        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2.5 }}>
            <Home component={Link} to="/home" sx={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', '&:hover': { color: 'white' } }} />
            <ChevronRight sx={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }} />
            <Typography fontSize={12} color="rgba(255,255,255,0.65)">Ventes Flash</Typography>
          </Box>

          {/* Titre + timer */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: { xs: 2.5, md: 3 } }}>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
              <Box sx={{
                width: { xs: 48, md: 58 }, height: { xs: 48, md: 58 }, borderRadius: '14px',
                bgcolor: alpha(ORANGE, 0.14), border: `1.5px solid ${alpha(ORANGE, 0.3)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <FlashOn sx={{ color: ORANGE, fontSize: { xs: 26, md: 32 } }} />
              </Box>
              <Box>
                <Typography fontSize={{ xs: 22, md: 30 }} fontWeight={800} color="white" letterSpacing="-0.6px" lineHeight={1.1}>
                  Ventes flash
                </Typography>
                <Typography fontSize={{ xs: 12, md: 13.5 }} color="rgba(255,255,255,0.5)" mt={0.5}>
                  {isLoading ? 'Chargement des offres…' : products.length > 0 ? `${products.length} offre${products.length > 1 ? 's' : ''} à prix cassé, pour une durée limitée` : 'Prix cassés pour une durée limitée'}
                </Typography>
              </Box>
            </Box>

            {showTimer && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6,
                bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', px: { xs: 1.8, md: 2.4 }, py: { xs: 1, md: 1.4 } }}>
                <Typography fontSize={10} color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={0.8} fontWeight={600}>
                  fin dans
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  <TimeBlock v={h} label="h" />
                  <Typography color="rgba(255,255,255,0.35)" fontWeight={700} fontSize={18} mt="-14px">:</Typography>
                  <TimeBlock v={m} label="min" />
                  <Typography color="rgba(255,255,255,0.35)" fontWeight={700} fontSize={18} mt="-14px">:</Typography>
                  <TimeBlock v={s} label="sec" />
                </Box>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      {/* Contenu */}
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2.5 }, pt: { xs: 2.5, md: 3 } }}>

        {/* Filtres de tri — réellement fonctionnels, pas juste décoratifs */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
          {SORTS.map(({ key, label, Icon }) => {
            const active = sort === key;
            return (
              <Box key={key} component="button" type="button" onClick={() => setSort(key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.6,
                  px: 1.6, py: 0.8, borderRadius: '100px', cursor: 'pointer',
                  border: `1.5px solid ${active ? ORANGE : 'rgba(15,27,46,0.12)'}`,
                  bgcolor: active ? alpha(ORANGE, 0.1) : 'white',
                  color: active ? ORANGE : MUTED,
                  fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                  '&:hover': active ? {} : { borderColor: 'rgba(15,27,46,0.24)', color: NAVY },
                }}>
                <Icon sx={{ fontSize: 15 }} />
                {label}
              </Box>
            );
          })}
        </Box>

        {/* Grille */}
        {isLoading ? (
          showSkel ? (
            <Box sx={{ display: 'grid', gap: { xs: '10px', md: '14px' },
              gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(5,1fr)', xl: 'repeat(6,1fr)' } }}>
              {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </Box>
          ) : null
        ) : products.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: { xs: 8, md: 10 }, bgcolor: 'white', borderRadius: '16px', border: '1px solid rgba(15,27,46,0.08)' }}>
            <Box sx={{
              width: 72, height: 72, mx: 'auto', mb: 2.5, borderRadius: '20px',
              bgcolor: alpha(ORANGE, 0.08), border: `1.5px solid ${alpha(ORANGE, 0.2)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FlashOn sx={{ fontSize: 32, color: ORANGE }} />
            </Box>
            <Typography color={NAVY} fontWeight={700} fontSize={18} mb={1}>Aucune vente flash pour le moment</Typography>
            <Typography color={MUTED} fontSize={14} mb={3}>Revenez bientôt pour profiter des prochaines offres.</Typography>
            <Button component={Link} to="/home"
              sx={{ bgcolor: ORANGE, color: 'white', fontWeight: 700, borderRadius: '10px',
                px: 3.5, py: 1.1, textTransform: 'none', transition: 'background 0.15s ease', '&:hover': { bgcolor: ORANGE_HOV } }}>
              Retour à l'accueil
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gap: { xs: '10px', md: '14px' },
            gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(4,1fr)', lg: 'repeat(5,1fr)', xl: 'repeat(6,1fr)' } }}>
            {products.map((p: any) => <FlashCard key={p.id} p={p} />)}
          </Box>
        )}
      </Container>

      {/* Bouton scroll top */}
      {showTop && (
        <IconButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 99,
            width: 44, height: 44, bgcolor: ORANGE, color: 'white',
            transition: 'background 0.15s ease',
            '&:hover': { bgcolor: ORANGE_HOV },
          }}>
          <KeyboardArrowUp />
        </IconButton>
      )}
    </Box>
    </LikedCtx.Provider>
  );
}
