import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Container, IconButton, alpha,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  ArrowForwardIos, ArrowBackIos, FavoriteBorder, Favorite,
  SupportAgent, Verified, LocalShipping,
  FlashOn, LocationOn, KeyboardArrowRight, Person,
  WorkspacePremium, Stars, CheckCircle, Store, Star,
  Handshake, StorefrontOutlined,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { getSessionId } from '../../hooks/useEventTracker';
import { useLocationState } from '../../hooks/useLocationState';
import LocationModal from '../../components/location/LocationModal';
import { useGeoDetect } from '../../hooks/useGeoDetect';
import { useEventsStore } from '../../store/events.store';

/* ─── Wishlist context (évite prop drilling) ────────────────────────────── */
const LikedCtx = createContext<Set<string>>(new Set());
const useLikedIds = () => useContext(LikedCtx);

/* ─── Location context (badge "Près de chez moi") ───────────────────────── */
interface UserLoc { city?: string; department?: string }
const LocationCtx = createContext<UserLoc>({});
const useUserLoc  = () => useContext(LocationCtx);

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const OR  = '#FF6B00';
const ORD = '#E05A00';
const BG  = '#0F172A';
const PG  = '#FAFAFA';

/* ─── CSS ─────────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes dp-shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes dp-fadeSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes dp-heartPop{0%{transform:scale(1)}50%{transform:scale(1.5)}100%{transform:scale(1)}}
@keyframes dp-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.18)}}
@media(prefers-reduced-motion:reduce){*{animation-duration:0ms!important;transition-duration:0ms!important;}}
`;
function injectCss(id: string, css: string) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const el = document.createElement('style'); el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const fmtP = (n: number) => new Intl.NumberFormat('fr-HT').format(Math.round(n)) + ' HTG';
const pct  = (p: number, s: number) => Math.round((1 - s / p) * 100);

/* ─── FlashTimer ──────────────────────────────────────────────────────────── */
function FlashTimer({ endsAt }: { endsAt: Date | null }) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setDiff(Math.max(0, endsAt.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const totalS = diff / 1000;
  const days  = Math.floor(totalS / 86400);
  const hours = Math.floor((totalS % 86400) / 3600);
  const mins  = Math.floor((totalS % 3600) / 60);
  const secs  = Math.floor(totalS % 60);

  const segments = days > 0
    ? [{ v: pad(days), label: 'J' }, { v: pad(hours), label: 'H' }, { v: pad(mins), label: 'M' }]
    : [{ v: pad(hours), label: 'H' }, { v: pad(mins), label: 'M' }, { v: pad(secs), label: 'S' }];

  if (diff === 0) {
    return (
      <Box sx={{ px: 1.5, py: 0.5, borderRadius: '6px', bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <Typography color="#FF6B6B" fontWeight={800} fontSize={11} letterSpacing={1.5}>TERMINÉ</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {segments.map(({ v, label }, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Digit pill */}
          <Box sx={{
            display: 'flex', alignItems: 'baseline', gap: '1px',
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            px: { xs: '8px', md: '10px' },
            py: { xs: '5px', md: '6px' },
            backdropFilter: 'blur(8px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <Typography sx={{
              color: '#fff',
              fontWeight: 700,
              fontSize: { xs: 15, md: 17 },
              fontFamily: '"SF Mono","Fira Code",monospace',
              lineHeight: 1,
              letterSpacing: '1px',
            }}>
              {v}
            </Typography>
            <Typography sx={{
              color: 'rgba(255,255,255,0.35)',
              fontWeight: 600,
              fontSize: { xs: 9, md: 10 },
              lineHeight: 1,
              letterSpacing: '0.5px',
              ml: '3px',
              alignSelf: 'flex-end',
              pb: '1px',
            }}>
              {label}
            </Typography>
          </Box>

          {/* Separator */}
          {i < segments.length - 1 && (
            <Typography sx={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: { xs: 12, md: 14 },
              fontWeight: 300,
              lineHeight: 1,
              mx: '1px',
              animation: 'ft-blink 1.4s ease-in-out infinite',
              '@keyframes ft-blink': { '0%,100%': { opacity: 0.4 }, '50%': { opacity: 0.1 } },
            }}>
              /
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

/* ─── MiniCard ─────────────────────────────────────────────────────────────── */
function MiniCard({ p, visible, isMobile }: { p: any; visible: boolean; isMobile: boolean }) {
  const img     = p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium || p.images?.[0]?.url
                || p.imageUrl || p.coverUrl || '';
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const price   = Number(hasSale ? p.salePrice : p.price);
  const slug    = p.slug || 'products';

  if (isMobile) {
    /* ── Mobile / tablet : fond blanc, photo + badge prix rouge (Shein) ── */
    return (
      <Box component={Link} to={`/products/${slug}`}
        sx={{
          textDecoration: 'none', cursor: 'pointer',
          bgcolor: 'white', borderRadius: '10px', overflow: 'hidden',
          position: 'relative', display: 'block', height: '100%',
          boxShadow: '0 2px 12px rgba(0,0,0,0.22)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          '&:hover img': { transform: 'scale(1.05)' },
        }}>
        <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', bgcolor: '#F5F5F5' }}>
          {img
            ? <img src={img} alt={p.name} loading="lazy" decoding="async"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  transition: 'transform 0.35s ease' }} />
            : <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', bgcolor: '#EBEBEB' }}>
                <FlashOn sx={{ fontSize: 36, color: '#CCC' }} />
              </Box>}
        </Box>
        {price > 0 && (
          <Box sx={{
            position: 'absolute', bottom: 8, right: 6,
            bgcolor: 'white', borderRadius: '20px',
            px: '7px', py: '3px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'baseline', gap: '1px',
          }}>
            <Typography component="span" sx={{ fontSize: 9, fontWeight: 900, color: '#E53935', lineHeight: 1 }}>HTG</Typography>
            <Typography component="span" sx={{ fontSize: 13, fontWeight: 900, color: '#E53935', lineHeight: 1 }}>{price.toLocaleString()}</Typography>
          </Box>
        )}
        {hasSale && (
          <Box sx={{ position: 'absolute', top: 7, left: 7, bgcolor: '#E53935', color: 'white',
            fontSize: 10, fontWeight: 900, borderRadius: '6px', px: '6px', py: '2px', lineHeight: 1.4 }}>
            -{pct(Number(p.price), Number(p.salePrice))}%
          </Box>
        )}
      </Box>
    );
  }

  /* ── Desktop : full-bleed sombre avec gradient (meilleur rendu grand écran) ── */
  return (
    <Box component={Link} to={`/products/${slug}`}
      sx={{
        textDecoration: 'none', cursor: 'pointer',
        borderRadius: '14px', overflow: 'hidden', position: 'relative',
        display: 'block', height: '100%',
        boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
        transition: 'opacity 0.38s ease, transform 0.38s ease',
        '&:hover img': { transform: 'scale(1.06)' },
      }}>
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', bgcolor: '#111' }}>
        {img
          ? <img src={img} alt={p.name} loading="lazy" decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                transition: 'transform 0.4s ease' }} />
          : <Box sx={{ width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${alpha(OR, 0.3)} 0%, ${alpha(BG, 0.8)} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlashOn sx={{ fontSize: 40, color: alpha(OR, 0.5) }} />
            </Box>}
      </Box>
      <Box sx={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(8,15,35,0.95) 0%, rgba(8,15,35,0.45) 48%, transparent 100%)' }} />
      {hasSale && (
        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 2,
          bgcolor: OR, color: 'white', fontWeight: 900, fontSize: 11,
          borderRadius: '8px', px: 1, py: 0.3, letterSpacing: 0.3,
          boxShadow: `0 2px 8px ${alpha(OR, 0.5)}` }}>
          -{pct(Number(p.price), Number(p.salePrice))}%
        </Box>
      )}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, p: 1.5 }}>
        <Typography fontSize={12} fontWeight={700} color="white" lineHeight={1.3} mb={0.6}
          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {p.name}
        </Typography>
        {price > 0 && (
          <Typography fontSize={13.5} fontWeight={900} color={OR} lineHeight={1} noWrap>
            {fmtP(price)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/* ─── Side banners ────────────────────────────────────────────────────────── */
const LEFT_BANNERS = [
  { label: 'Ventes Flash', img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=80', to: '/ventes-flash' },
  { label: 'Nouveautés',   img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80', to: '/products?sort=latest' },
  { label: 'Tendances',    img: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80', to: '/products?sort=views' },
];
const RIGHT_BANNERS = [
  { label: 'Smartphones',    img: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80', to: '/products?category=smartphones' },
  { label: 'Collection Auto',img: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80', to: '/products?category=vehicules' },
  { label: 'Maison & Déco', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', to: '/products?category=meubles' },
];

function SideBanners({ banners }: { banners: typeof LEFT_BANNERS }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: 180, flexShrink: 0 }}>
      {banners.map((b, i) => (
        <Box key={i} component={Link} to={b.to}
          sx={{
            flex: 1, borderRadius: '12px', overflow: 'hidden', position: 'relative',
            cursor: 'pointer', textDecoration: 'none', minHeight: 0,
            transition: 'filter 0.18s ease, transform 0.18s ease',
            '&:hover': { filter: 'brightness(1.08)', transform: 'scale(1.01)' },
          }}>
          <img src={b.img} alt={b.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <Box sx={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(15,23,42,0.82) 0%, rgba(15,23,42,0.15) 50%, transparent 100%)' }} />
          <Typography sx={{ position: 'absolute', bottom: 10, left: 10, right: 10,
            color: 'white', fontWeight: 800, fontSize: 13.5, lineHeight: 1.25 }}>
            {b.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/* ─── Hero carousel — slides par défaut (fallback si aucune bannière admin) ── */
const DEFAULT_SLIDES = [
  { img: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=85',
    tag: 'NOUVEAUTÉS', title: 'Tout ce que vous\naimez, enfin local',
    sub: 'Des milliers de produits de vendeurs haïtiens vérifiés',
    cta: 'Découvrir', to: '/products', catFilter: null },
  { img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1400&q=85',
    tag: 'MODE & STYLE', title: 'Tendances Mode\nÉté 2025',
    sub: 'Vêtements, chaussures et accessoires tendance',
    cta: 'Shopper', to: '/products?category=vetements', catFilter: 'vetements' },
  { img: 'https://images.unsplash.com/photo-1611186871525-4cf23d23c4ca?w=1400&q=85',
    tag: 'HIGH-TECH', title: 'Smartphones &\nÉlectronique',
    sub: "iPhone, Samsung, MacBook — jusqu'à -35%",
    cta: 'Voir les offres', to: '/products?category=smartphones', catFilter: 'smartphones' },
  { img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1400&q=85',
    tag: 'VÉHICULES', title: 'Voitures &\nAccessoires Auto',
    sub: 'Toyota, Honda, Hyundai — meilleurs prix en Haïti',
    cta: 'Explorer', to: '/products?category=vehicules', catFilter: 'vehicules' },
];

/* ─── Central carousel — moderne, responsive, swipe tactile ──────────────── */
function CentralCarousel({ allProducts, slides }: { allProducts: any[]; slides: typeof DEFAULT_SLIDES }) {
  const [idx,     setIdx]     = useState(0);
  const [prog,    setProg]    = useState(0);
  const [miniIdx, setMiniIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dir,     setDir]     = useState<1 | -1>(1); // direction anim
  const mainRef  = useRef<any>(null);
  const miniRef  = useRef<any>(null);
  const touchX   = useRef<number | null>(null);
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const goTo = useCallback((i: number, direction: 1 | -1 = 1) => {
    setDir(direction);
    setIdx(i); setProg(0);
    clearInterval(mainRef.current);
    mainRef.current = setInterval(() => {
      setProg(p => {
        if (p >= 100) { setIdx(c => { const next = (c + 1) % slides.length; return next; }); return 0; }
        return p + (100 / (5000 / 50));
      });
    }, 50);
  }, [slides.length]);

  useEffect(() => { goTo(0); return () => clearInterval(mainRef.current); }, []);

  useEffect(() => {
    clearInterval(miniRef.current);
    if (allProducts.length < 2) return;
    miniRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMiniIdx(prev => {
          const pool = getSlideProducts(allProducts, idx);
          return (prev + 2) % Math.max(pool.length, 2);
        });
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(miniRef.current);
  }, [allProducts, idx]);

  useEffect(() => { setMiniIdx(0); setVisible(true); }, [idx]);

  function getSlideProducts(products: any[], slideIdx: number) {
    const cat = slides[slideIdx]?.catFilter;
    if (!cat || products.length === 0) return products;
    const m = products.filter((p: any) =>
      p.category?.slug?.includes(cat) || p.categorySlug?.includes(cat));
    return m.length >= 2 ? m : products;
  }

  const slide = slides[idx];
  const pool  = getSlideProducts(allProducts, idx);
  const mp    = pool.length >= 2
    ? [pool[miniIdx % pool.length], pool[(miniIdx + 1) % pool.length]]
    : pool.slice(0, 2);

  const prev = () => goTo((idx - 1 + slides.length) % slides.length, -1);
  const next = () => goTo((idx + 1) % slides.length, 1);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchX.current = null;
  };

  return (
    <Box
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      sx={{ flex: 1, position: 'relative', overflow: 'hidden',
        borderRadius: { xs: 0, md: '16px' }, height: '100%',
        userSelect: 'none', cursor: 'grab', '&:active': { cursor: 'grabbing' } }}>

      {/* ── Slides images avec crossfade ── */}
      {slides.map((s, i) => (
        <Box key={s.img} sx={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${s.img})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === idx ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }} />
      ))}

      {/* ── Overlay gradient — adapté mobile/desktop ── */}
      <Box sx={{ position: 'absolute', inset: 0, background: {
        xs: 'linear-gradient(to right, rgba(8,15,35,0.92) 0%, rgba(8,15,35,0.75) 55%, rgba(8,15,35,0.45) 100%)',
        md: 'linear-gradient(105deg, rgba(8,15,35,0.97) 0%, rgba(8,15,35,0.82) 42%, rgba(8,15,35,0.5) 65%, rgba(8,15,35,0.65) 100%)',
      }}} />

      {/* ── Contenu principal ── */}
      <Box sx={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex',
        alignItems: { xs: 'flex-end', md: 'center' },
        pb: { xs: 5, md: 0 },
        pt: { xs: '60px', md: 0 },
        px: { xs: 2.5, md: 4 },
        gap: { xs: 1.5, md: 2.5 },
      }}>

        {/* Texte gauche */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Tag badge */}
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.6,
            bgcolor: OR, borderRadius: '20px',
            px: '10px', py: '4px', mb: { xs: 1.2, md: 1.8 },
          }}>
            <FlashOn sx={{ fontSize: 11, color: 'white' }} />
            <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: 'white', letterSpacing: 1.5, lineHeight: 1 }}>
              {slide.tag}
            </Typography>
          </Box>

          {/* Titre */}
          <Typography key={`t-${idx}`} sx={{
            fontSize: { xs: 22, sm: 28, md: 34, lg: 40 },
            fontWeight: 900, color: 'white', lineHeight: 1.05,
            mb: { xs: 1, md: 1.5 }, whiteSpace: 'pre-line',
            animation: 'dp-fadeSlide 0.4s ease both',
            letterSpacing: '-0.5px',
          }}>
            {slide.title}
          </Typography>

          {/* Sous-titre */}
          <Typography key={`s-${idx}`} sx={{
            fontSize: { xs: 12, md: 14 }, color: 'rgba(255,255,255,0.6)',
            mb: { xs: 2, md: 3 }, lineHeight: 1.5,
            display: { xs: 'none', sm: 'block' },
            animation: 'dp-fadeSlide 0.5s 0.08s ease both',
          }}>
            {slide.sub}
          </Typography>

          {/* CTA */}
          <Button component={Link} to={slide.to}
            sx={{
              bgcolor: 'white', color: BG, fontWeight: 800,
              borderRadius: '30px',
              px: { xs: 2.5, md: 3.5 }, py: { xs: 0.85, md: 1.1 },
              fontSize: { xs: 12.5, md: 14 }, textTransform: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              '&:hover': { bgcolor: OR, color: 'white', transform: 'translateY(-1px)',
                boxShadow: `0 8px 28px ${alpha(OR, 0.5)}` },
              transition: 'all 0.22s ease',
            }}>
            {slide.cta} →
          </Button>
        </Box>

        {/* Cartes produit droite */}
        {mp.length > 0 && (
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            gap: { xs: 1, md: 1.5 },
            flexShrink: 0,
            width: { xs: '42%', sm: '38%', md: 240, lg: 280 },
            height: { xs: 'calc(100% - 65px)', md: '80%' },
            alignSelf: { xs: 'flex-end', md: 'center' },
            mb: { xs: 5, md: 0 },
          }}>
            {mp.map((p: any, i: number) => (
              <Box key={`${p.id}-${miniIdx}-${i}`} sx={{ flex: 1, minHeight: 0 }}>
                <MiniCard p={p} visible={visible} isMobile={isMobile} />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ── Flèches desktop ── */}
      {[
        { fn: prev, Icon: ArrowBackIos,    side: 'left',  off: 12 },
        { fn: next, Icon: ArrowForwardIos, side: 'right', off: 16 },
      ].map(({ fn, Icon, side, off }) => (
        <IconButton key={side} onClick={fn} sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'absolute', top: '50%', [side]: off,
          transform: 'translateY(-50%)', zIndex: 6,
          bgcolor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white', p: 1,
          '&:hover': { bgcolor: OR, borderColor: OR },
          transition: 'all 0.2s',
        }}>
          <Icon sx={{ fontSize: 12 }} />
        </IconButton>
      ))}

      {/* ── Indicateurs (dots pill) ── */}
      <Box sx={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 0.7, zIndex: 6,
        bgcolor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(6px)',
        borderRadius: '20px', px: 1.2, py: 0.6,
      }}>
        {slides.map((_, i) => (
          <Box key={i} onClick={() => goTo(i, i > idx ? 1 : -1)}
            sx={{
              height: 5, borderRadius: '3px', cursor: 'pointer',
              bgcolor: i === idx ? 'white' : 'rgba(255,255,255,0.35)',
              width: i === idx ? 20 : 5,
              transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: i === idx ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
            }} />
        ))}
      </Box>

      {/* ── Barre de progression ── */}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, zIndex: 6,
        bgcolor: 'rgba(255,255,255,0.06)' }}>
        <Box sx={{ height: '100%', bgcolor: OR, width: `${Math.min(prog, 100)}%`,
          transition: 'width 0.05s linear',
          boxShadow: `0 0 8px ${alpha(OR, 0.8)}` }} />
      </Box>
    </Box>
  );
}

/* ─── Hero wrapper ───────────────────────────────────────────────────────── */
function HeroSection({ allProducts, slides }: { allProducts: any[]; slides: typeof DEFAULT_SLIDES }) {
  return (
    <Box sx={{
      bgcolor: { xs: '#0F172A', md: PG },
      mt: { xs: '-60px', md: 0 },
      pt: { xs: 0, md: 1.5 },
      pb: { xs: 0, md: 1.5 },
    }}>
      <Container maxWidth="xl" sx={{ px: { xs: 0, md: 2 } }}>
        <Box sx={{
          display: 'flex', gap: { xs: 0, md: 1 },
          height: { xs: 320, sm: 360, md: 340, lg: 400 },
          alignItems: 'stretch',
        }}>
          {/* Left banners — large desktop only */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
            <SideBanners banners={LEFT_BANNERS} />
          </Box>
          {/* Carousel */}
          <CentralCarousel allProducts={allProducts} slides={slides} />
          {/* Right banners — large desktop only */}
          <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
            <SideBanners banners={RIGHT_BANNERS} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

/* ─── Trust bar ──────────────────────────────────────────────────────────── */
function TrustBar() {
  const items = [
    { Icon: Verified,          title: 'Vendeurs verifies',  sub: 'Profils certifies par DealPam' },
    { Icon: Handshake,         title: 'Mise en relation',   sub: 'Contact direct acheteur-vendeur' },
    { Icon: StorefrontOutlined,title: '100% haitien',       sub: 'Produits et boutiques locaux' },
    { Icon: SupportAgent,      title: 'Support 7j/7',       sub: 'Aide acheteurs et vendeurs' },
  ];
  return (
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #F0F0F0' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2 } }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' },
          gap: 0,
        }}>
          {items.map(({ Icon, title, sub }, i) => (
            <Box key={i} sx={{
              display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.2 },
              px: { xs: 1, md: 2.5 }, py: { xs: 1.2, md: 1.8 },
              borderRight: { xs: i % 2 === 0 ? '1px solid #F0F0F0' : 'none', md: i < 3 ? '1px solid #F0F0F0' : 'none' },
              borderBottom: { xs: i < 2 ? '1px solid #F0F0F0' : 'none', md: 'none' },
            }}>
              <Box sx={{ width: { xs: 34, md: 42 }, height: { xs: 34, md: 42 }, borderRadius: { xs: 2, md: 2.5 }, bgcolor: alpha(OR, 0.09), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon sx={{ fontSize: { xs: 18, md: 22 }, color: OR }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={{ xs: 12, md: 13.5 }} color={BG} lineHeight={1.3}>{title}</Typography>
                <Typography fontSize={{ xs: 10.5, md: 12 }} color="#64748B" lineHeight={1.3}>{sub}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ─── Tier badge ─────────────────────────────────────────────────────────── */
const TIER_META: Record<string, { Icon: any; color: string; bg: string; label: string }> = {
  ELITE:    { Icon: WorkspacePremium, color: '#F59E0B', bg: '#FEF3C7', label: 'Elite'    },
  BUSINESS: { Icon: Stars,            color: OR,        bg: alpha(OR, 0.1), label: 'Business' },
  STARTER:  { Icon: CheckCircle,      color: '#10B981', bg: '#D1FAE5', label: 'Starter'  },
};

/* ─── Store initials avatar ──────────────────────────────────────────────── */
function StoreAvatar({ name, sz }: { name: string; sz: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <Box sx={{ width: sz, height: sz, borderRadius: '50%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', bgcolor: alpha(OR, 0.12),
      fontSize: sz * 0.28, fontWeight: 800, color: OR }}>
      {initials || <Store sx={{ fontSize: sz * 0.4, color: OR }} />}
    </Box>
  );
}

/* ─── Tier config ────────────────────────────────────────────────────────── */
const CARD_PALETTES = [
  { banner: 'linear-gradient(135deg,#FF6B00 0%,#FF9F56 100%)', avatarBg: 'linear-gradient(135deg,#FF4500,#FF8C42)' },
  { banner: 'linear-gradient(135deg,#1565C0 0%,#42A5F5 100%)', avatarBg: 'linear-gradient(135deg,#0D47A1,#1976D2)' },
  { banner: 'linear-gradient(135deg,#6A1B9A 0%,#CE93D8 100%)', avatarBg: 'linear-gradient(135deg,#4A148C,#8E24AA)' },
  { banner: 'linear-gradient(135deg,#1B5E20 0%,#66BB6A 100%)', avatarBg: 'linear-gradient(135deg,#1B5E20,#388E3C)' },
  { banner: 'linear-gradient(135deg,#B71C1C 0%,#EF9A9A 100%)', avatarBg: 'linear-gradient(135deg,#880E4F,#C62828)' },
  { banner: 'linear-gradient(135deg,#004D40 0%,#4DB6AC 100%)', avatarBg: 'linear-gradient(135deg,#00251A,#00695C)' },
];

/* ─── Carte vendeur moderne ──────────────────────────────────────────────── */
function SellerCard({ s, idx }: { s: any; idx: number }) {
  const palette  = CARD_PALETTES[idx % CARD_PALETTES.length];
  const initials = s.store.name.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();
  const isVerif  = s.store.isVerified;
  const name     = s.store.name;
  const city     = s.store.city;
  const dept     = s.store.department;
  const rating   = s.store.avgRating ? Number(s.store.avgRating).toFixed(1) : null;

  return (
    <Box component={Link} to={`/boutique/${s.store.slug}`}
      sx={{
        flexShrink: 0,
        width: { xs: 160, sm: 180, md: 200 },
        textDecoration: 'none',
        borderRadius: '18px',
        overflow: 'hidden',
        bgcolor: 'white',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'transform 0.22s cubic-bezier(.4,0,.2,1), box-shadow 0.22s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.13)',
        },
        '&:hover .sc-name': { color: OR },
      }}>

      {/* Bannière colorée */}
      <Box sx={{
        height: { xs: 64, md: 72 },
        background: palette.banner,
        position: 'relative',
      }}>
        {/* Motif décoratif */}
        <Box sx={{
          position: 'absolute', top: -20, right: -20,
          width: 90, height: 90, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.1)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -14, left: -10,
          width: 60, height: 60, borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.08)',
        }} />
      </Box>

      {/* Avatar flottant */}
      <Box sx={{ px: 2, pb: 0, mt: '-26px', position: 'relative', zIndex: 1 }}>
        <Box sx={{
          width: 52, height: 52, borderRadius: '14px',
          background: palette.avatarBg,
          border: '3px solid white',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 900, color: 'white', letterSpacing: '-0.5px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {s.store.logoUrl
            ? <Box component="img" src={s.store.logoUrl} alt={name}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
          {/* Badge vérifié sur avatar */}
          {isVerif && (
            <Box sx={{
              position: 'absolute', bottom: 0, right: 0,
              width: 16, height: 16, borderRadius: '50%',
              bgcolor: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white',
            }}>
              <Verified sx={{ fontSize: 9, color: 'white' }} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Infos */}
      <Box sx={{ px: 2, pt: 1, pb: 2 }}>
        <Typography className="sc-name"
          fontSize={13} fontWeight={800} color={BG} lineHeight={1.3}
          sx={{
            transition: 'color 0.18s',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', mb: 0.5,
          }}>
          {name}
        </Typography>

        {/* Ville + département */}
        {(city || dept) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 1 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: OR, flexShrink: 0 }} />
            <Typography fontSize={10.5} color="#6B7280" noWrap fontWeight={500}>
              {city || dept}
            </Typography>
          </Box>
        )}

        {/* Footer : rating + badge vérifié */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {rating && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Star sx={{ fontSize: 11, color: '#F59E0B' }} />
              <Typography fontSize={11} fontWeight={700} color="#374151">{rating}</Typography>
            </Box>
          )}
          {isVerif && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.3,
              bgcolor: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: '20px', px: 0.8, py: 0.2,
              ml: 'auto',
            }}>
              <Verified sx={{ fontSize: 9, color: '#2563EB' }} />
              <Typography fontSize={9} fontWeight={700} color="#1D4ED8">Vérifié</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Section vendeurs vedettes ──────────────────────────────────────────── */
function FeaturedSellersSection({ sellers }: { sellers: any[] }) {
  const SCROLL_STEP = 420;
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x0: 0, sl0: 0 });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollTo = (dir: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'next' ? SCROLL_STEP : -SCROLL_STEP, behavior: 'smooth' });
  };

  const onDown  = (e: React.MouseEvent) => { drag.current = { on: true, x0: e.pageX, sl0: scrollRef.current?.scrollLeft ?? 0 }; };
  const onMove  = (e: React.MouseEvent) => { if (!drag.current.on || !scrollRef.current) return; e.preventDefault(); scrollRef.current.scrollLeft = drag.current.sl0 - (e.pageX - drag.current.x0); };
  const onUp    = () => { drag.current.on = false; };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    updateArrows();
    const onWheel = (e: WheelEvent) => { e.preventDefault(); el.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' }); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('scroll', updateArrows);
      el.removeEventListener('wheel', onWheel);
    };
  }, [updateArrows]);

  if (!sellers.length) return null;

  return (
    <Box sx={{
      background: 'linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%)',
      borderTop: '1px solid #FED7AA',
      borderBottom: '1px solid #F3F4F6',
      py: { xs: 2.5, md: 3.5 },
    }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, md: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 4, height: 22, background: `linear-gradient(180deg,${OR},${ORD})`, borderRadius: 2 }} />
            <Box>
              <Typography fontSize={{ xs: 15, md: 17 }} fontWeight={900} color={BG} letterSpacing="-0.4px" lineHeight={1.2}>
                Boutiques vedettes
              </Typography>
              <Typography fontSize={11} color="#9CA3AF" fontWeight={400}>
                Vendeurs certifiés, service de qualité
              </Typography>
            </Box>
            <Box sx={{
              display: { xs: 'none', sm: 'inline-flex' },
              alignItems: 'center', gap: 0.4,
              bgcolor: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: '20px', px: 1, py: 0.35, ml: 0.5,
            }}>
              <Verified sx={{ fontSize: 11, color: '#3B82F6' }} />
              <Typography fontSize={10} fontWeight={700} color="#1D4ED8">Vérifiés</Typography>
            </Box>
          </Box>

          {/* Right side : voir tout */}
          <Button component={Link} to="/stores"
            endIcon={<KeyboardArrowRight sx={{ fontSize: 14 }} />}
            sx={{
              color: OR, fontWeight: 700, fontSize: { xs: 11.5, md: 12.5 },
              textTransform: 'none', borderRadius: '10px', px: 1.4, py: 0.5,
              border: `1.5px solid ${alpha(OR, 0.25)}`,
              '&:hover': { bgcolor: alpha(OR, 0.06), borderColor: OR },
            }}>
            Voir tout
          </Button>
        </Box>

        {/* Carousel avec boutons flottants sur les côtés */}
        <Box sx={{ position: 'relative' }}>

          {/* Bouton Précédent — flottant gauche */}
          {!isMobile && (
            <Box sx={{
              position: 'absolute', left: -18, top: '50%',
              transform: 'translateY(-60%)',
              zIndex: 10,
              opacity: canPrev ? 1 : 0,
              pointerEvents: canPrev ? 'auto' : 'none',
              transition: 'opacity 0.2s',
            }}>
              <IconButton
                onClick={() => scrollTo('prev')}
                sx={{
                  width: 38, height: 38, borderRadius: '12px',
                  bgcolor: 'white',
                  border: `1.5px solid ${alpha(OR, 0.25)}`,
                  color: OR,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  transition: 'all 0.18s',
                  '&:hover': {
                    bgcolor: OR, color: 'white',
                    borderColor: OR,
                    boxShadow: `0 6px 20px ${alpha(OR, 0.4)}`,
                    transform: 'scale(1.08)',
                  },
                }}>
                <ArrowBackIos sx={{ fontSize: 14, ml: '3px' }} />
              </IconButton>
            </Box>
          )}

          {/* Bouton Suivant — flottant droite */}
          {!isMobile && (
            <Box sx={{
              position: 'absolute', right: -18, top: '50%',
              transform: 'translateY(-60%)',
              zIndex: 10,
              opacity: canNext ? 1 : 0,
              pointerEvents: canNext ? 'auto' : 'none',
              transition: 'opacity 0.2s',
            }}>
              <IconButton
                onClick={() => scrollTo('next')}
                sx={{
                  width: 38, height: 38, borderRadius: '12px',
                  bgcolor: OR,
                  border: `1.5px solid ${OR}`,
                  color: 'white',
                  boxShadow: `0 4px 16px ${alpha(OR, 0.4)}`,
                  transition: 'all 0.18s',
                  '&:hover': {
                    bgcolor: ORD,
                    boxShadow: `0 6px 20px ${alpha(OR, 0.55)}`,
                    transform: 'scale(1.08)',
                  },
                }}>
                <ArrowForwardIos sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}

          {/* Cartes scrollables */}
          <Box ref={scrollRef}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onScroll={updateArrows}
            sx={{
              display: 'flex', gap: { xs: '12px', md: '16px' }, alignItems: 'stretch',
              overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
              pb: 1, cursor: 'grab', '&:active': { cursor: 'grabbing' }, userSelect: 'none',
              px: 0.5,
            }}>
            {sellers.map((s: any, idx: number) => <SellerCard key={s.id} s={s} idx={idx} />)}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

/* ─── Product Card — design clean moderne ─────────────────────────────────── */
function ProductCard({ p, flash = false, compact = false }: { p: any; flash?: boolean; compact?: boolean }) {
  const likedIds  = useLikedIds();
  const userLoc   = useUserLoc();
  const isNearCity: boolean = p.isNearCity || !!(userLoc.city && p.city && p.city.toLowerCase() === userLoc.city.toLowerCase());
  const isNearDept: boolean = !isNearCity && (p.isNearDept || !!(userLoc.department && p.department && p.department.toLowerCase() === userLoc.department.toLowerCase()));
  const nearLabel = isNearCity ? (p.city || userLoc.city) : isNearDept ? (p.department || userLoc.department) : null;

  const [liked, setLiked]  = useState(() => likedIds.has(p.id));
  const [anim,  setAnim]   = useState(false);
  const [busy,  setBusy]   = useState(false);
  const [toast, setToast]  = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const imgUrl = p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium || p.images?.[0]?.url || p.imageUrl || p.coverUrl || '';
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const off = hasSale ? pct(Number(p.price), Number(p.salePrice)) : 0;
  const displayPrice = Number(hasSale ? p.salePrice : p.price);

  useEffect(() => { setLiked(likedIds.has(p.id)); }, [likedIds, p.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user || !localStorage.getItem('accessToken')) { navigate('/login?next=/account/wishlist'); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (liked) { await api.delete(`/wishlist/${p.id}`); setLiked(false); }
      else {
        await api.post('/wishlist', { productId: p.id });
        setLiked(true); setAnim(true); setToast(true);
        setTimeout(() => setAnim(false), 600);
        setTimeout(() => setToast(false), 2200);
      }
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['wishlist-count'] });
    } catch (err: any) {
      if (err?.response?.data?.message !== 'Produit déja dans les favoris') console.error(err);
    } finally { setBusy(false); }
  };

  const sz = compact ? 'sm' : 'md';
  const radius = compact ? '12px' : '14px';

  return (
    <Box sx={{ position: 'relative', borderRadius: radius, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      transition: 'box-shadow 0.22s, transform 0.22s',
      bgcolor: 'white',
      contain: 'layout style',
      '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.13)', transform: 'translateY(-3px)' },
      '&:hover .pc-img': { transform: 'scale(1.05)' },
    }}>

      {/* Link wrapper */}
      <Box component={Link} to={`/products/${p.slug}`} sx={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}>

        {/* ── Image ── */}
        <Box sx={{ position: 'relative', paddingTop: compact ? '100%' : '108%', bgcolor: '#F5F5F7', overflow: 'hidden', flexShrink: 0 }}>
          {imgUrl
            ? <Box component="img" src={imgUrl} alt={p.name} className="pc-img"
                loading="lazy" decoding="async"
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                  transition: 'transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94)',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                }} />
            : <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Store sx={{ fontSize: compact ? 26 : 34, color: '#D1D5DB' }} />
              </Box>
          }

          {/* Gradient bas pour lisibilité des badges */}
          {(nearLabel || flash) && (
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.38) 0%, transparent 100%)',
              pointerEvents: 'none' }} />
          )}

          {/* Badge réduction — top left */}
          {hasSale && (
            <Box sx={{
              position: 'absolute', top: compact ? 6 : 8, left: compact ? 6 : 8,
              bgcolor: flash ? '#EF4444' : OR,
              color: 'white', fontWeight: 800,
              fontSize: compact ? 9 : 10.5,
              lineHeight: 1,
              borderRadius: '6px',
              px: compact ? '5px' : '6px', py: compact ? '3px' : '4px',
              letterSpacing: 0.2,
              ...(flash ? { animation: 'dp-pulse 1.8s ease infinite' } : {}),
            }}>-{off}%</Box>
          )}

          {/* Badge FLASH — sous le % */}
          {flash && (
            <Box sx={{
              position: 'absolute',
              top: hasSale ? (compact ? 30 : 36) : (compact ? 6 : 8),
              left: compact ? 6 : 8,
              bgcolor: '#111827', color: '#FBBF24', fontWeight: 800,
              fontSize: compact ? 8.5 : 9.5,
              borderRadius: '6px', px: compact ? '4px' : '5px', py: compact ? '2.5px' : '3px',
              display: 'flex', alignItems: 'center', gap: '2px', lineHeight: 1,
            }}>
              <FlashOn sx={{ fontSize: compact ? 8 : 9 }} />FLASH
            </Box>
          )}

          {/* Badge SERVICE — top right, jamais confondu avec un produit physique */}
          {p.productType && p.productType !== 'PHYSICAL' && (
            <Box sx={{
              position: 'absolute', top: compact ? 6 : 8, right: compact ? 6 : 8,
              bgcolor: 'rgba(99,102,241,0.92)', color: 'white', fontWeight: 800,
              fontSize: compact ? 8.5 : 9.5, lineHeight: 1,
              borderRadius: '6px', px: compact ? '5px' : '6px', py: compact ? '3px' : '4px',
              letterSpacing: 0.2, textTransform: 'uppercase',
            }}>
              {p.productType === 'SERVICE' ? 'Service' : p.productType === 'RENTAL' ? 'Location' : p.productType === 'VEHICLE' ? 'Véhicule' : 'Service'}
            </Box>
          )}

          {/* Badge localisation — bottom left */}
          {nearLabel && (
            <Box sx={{
              position: 'absolute', bottom: compact ? 6 : 8, left: compact ? 6 : 8,
              display: 'flex', alignItems: 'center', gap: '3px',
              bgcolor: isNearCity ? 'rgba(5,150,105,0.9)' : 'rgba(14,165,233,0.85)',
              backdropFilter: 'blur(8px)',
              color: 'white', fontWeight: 700,
              fontSize: compact ? 7.5 : 8.5,
              borderRadius: '100px',
              px: compact ? '5px' : '7px', py: '2.5px',
              lineHeight: 1.2,
              letterSpacing: 0.3,
            }}>
              <Box component="span" sx={{ fontSize: compact ? 7 : 8 }}>📍</Box>
              {nearLabel}
            </Box>
          )}
        </Box>

        {/* ── Info produit ── */}
        <Box sx={{
          p: compact ? '8px 9px 10px' : '10px 12px 13px',
          display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '5px',
          bgcolor: 'white',
        }}>
          {/* Nom */}
          <Typography fontSize={compact ? 11 : 12.5} color="#111827" fontWeight={500} lineHeight={1.4}
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.name}
          </Typography>

          {/* Prix */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '1px' }}>
            <Typography fontSize={compact ? 13 : 15} fontWeight={800}
              color={flash ? '#EF4444' : OR} lineHeight={1} noWrap>
              {fmtP(displayPrice)}
            </Typography>
            {hasSale && (
              <Typography fontSize={compact ? 9.5 : 10.5} color="#C4C9D4" fontWeight={400}
                sx={{ textDecoration: 'line-through', lineHeight: 1 }} noWrap>
                {fmtP(Number(p.price))}
              </Typography>
            )}
          </Box>

          {/* Vendeur */}
          <Typography fontSize={compact ? 9 : 10} color="#9CA3AF" fontWeight={500} noWrap letterSpacing={0.1}>
            {p.store?.name || p.storeName || ''}
          </Typography>
        </Box>
      </Box>

      {/* ── Bouton favori ── */}
      <Box component="button" type="button" onClick={handleLike} disabled={busy}
        sx={{
          position: 'absolute', top: compact ? 6 : 8, right: compact ? 6 : 8, zIndex: 10,
          width: compact ? 28 : 32, height: compact ? 28 : 32,
          borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: liked ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(6px)',
          boxShadow: liked ? '0 2px 8px rgba(239,68,68,0.25)' : '0 1px 6px rgba(0,0,0,0.14)',
          transition: 'transform 0.18s, background 0.18s, box-shadow 0.18s',
          '&:hover': { transform: 'scale(1.15)', bgcolor: liked ? 'rgba(239,68,68,0.18)' : 'white' },
          '&:disabled': { cursor: 'wait', opacity: 0.6 },
        }}>
        {liked
          ? <Favorite sx={{ fontSize: compact ? 13 : 15, color: '#EF4444', pointerEvents: 'none',
              transform: anim ? 'scale(1.5)' : 'scale(1)',
              transition: 'transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)' }} />
          : <FavoriteBorder sx={{ fontSize: compact ? 13 : 15, color: '#9CA3AF', pointerEvents: 'none' }} />}
      </Box>

      {/* Toast favoris */}
      {toast && (
        <Box component={Link} to="/account/wishlist" sx={{
          position: 'absolute', top: compact ? 40 : 46, right: compact ? 6 : 8,
          zIndex: 11, whiteSpace: 'nowrap',
          bgcolor: '#EF4444', color: 'white', borderRadius: '8px',
          px: 1.1, py: 0.35, fontSize: 9.5, fontWeight: 700,
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.3,
          boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
          animation: 'dp-pulse .2s ease',
        }}>
          <Favorite sx={{ fontSize: 9 }} /> Favoris →
        </Box>
      )}
    </Box>
  );
}

/* ─── Section header ─────────────────────────────────────────────────────── */
function SectionHeader({ title, count, to }: { title: string; count?: number; to: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 4, height: 26, bgcolor: OR, borderRadius: 2 }} />
        <Typography fontSize={{ xs: 16, md: 19 }} fontWeight={700} color={BG}>{title}</Typography>
        {count != null && count > 0 && (
          <Chip label={`${count} produits`} size="small"
            sx={{ fontSize: 11, fontWeight: 600, bgcolor: alpha(OR, 0.09), color: OR,
              border: `1px solid ${alpha(OR, 0.2)}`, height: 20 }} />
        )}
      </Box>
      <Button component={Link} to={to} endIcon={<KeyboardArrowRight />}
        sx={{ color: OR, fontWeight: 700, fontSize: 13, textTransform: 'none',
          '&:hover': { bgcolor: alpha(OR, 0.07) }, borderRadius: 2 }}>
        Voir tout
      </Button>
    </Box>
  );
}

/* ─── Grid multi-rangées ────────────────────────────────────────────────── */
function ProductRow({ products, flash = false, title }: { products: any[]; flash?: boolean; title?: string }) {
  return (
    <Box sx={{
      display: 'grid',
      gap: { xs: '10px', sm: '12px', md: '14px' },
      gridTemplateColumns: {
        xs: 'repeat(2, 1fr)',
        sm: 'repeat(3, 1fr)',
        md: 'repeat(4, 1fr)',
        lg: 'repeat(6, 1fr)',
        xl: 'repeat(7, 1fr)',
      },
    }}>
      {products.slice(0, 28).map((p: any) => (
        <ProductCard key={p.id} p={p} flash={flash} />
      ))}
    </Box>
  );
}

/* ─── Carousel horizontal avec flèches (Flash / Promo) ──────────────────── */
function ProductCarousel({ products, flash = false }: { products: any[]; flash?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x0: 0, sl0: 0 });

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 900, behavior: 'smooth' });
  };
  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { on: true, x0: e.pageX, sl0: scrollRef.current?.scrollLeft ?? 0 };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current.on || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = drag.current.sl0 - (e.pageX - drag.current.x0);
  };
  const stopDrag = () => { drag.current.on = false; };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); el.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' }); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Largeur carte = ~170px sur desktop
  const CARD_W = 170;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Flèche gauche — PC seulement */}
      <IconButton onClick={() => scroll(-1)} sx={{
        display: { xs: 'none', md: 'flex' },
        position: 'absolute', left: -18, top: '40%', transform: 'translateY(-50%)', zIndex: 10,
        width: 36, height: 36, bgcolor: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        border: '1px solid rgba(0,0,0,0.08)',
        '&:hover': { bgcolor: OR, color: 'white', borderColor: OR },
        transition: 'all 0.18s',
      }}>
        <ArrowBackIos sx={{ fontSize: 13, ml: '3px' }} />
      </IconButton>

      {/* Conteneur scroll */}
      <Box ref={scrollRef}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={stopDrag} onMouseLeave={stopDrag}
        sx={{
          display: 'flex', gap: { xs: '8px', md: '10px' },
          overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          scrollSnapType: 'x mandatory', pb: 1,
          cursor: 'grab', '&:active': { cursor: 'grabbing' }, userSelect: 'none',
          WebkitOverflowScrolling: 'touch',
          willChange: 'scroll-position',
        }}>
        {products.slice(0, 30).map((p: any) => (
          <Box key={p.id} sx={{
            flexShrink: 0, scrollSnapAlign: 'start',
            width: { xs: 140, sm: 155, md: CARD_W },
          }}>
            <ProductCard p={p} flash={flash} compact />
          </Box>
        ))}
      </Box>

      {/* Flèche droite — PC seulement */}
      <IconButton onClick={() => scroll(1)} sx={{
        display: { xs: 'none', md: 'flex' },
        position: 'absolute', right: -18, top: '40%', transform: 'translateY(-50%)', zIndex: 10,
        width: 36, height: 36, bgcolor: 'white',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        border: '1px solid rgba(0,0,0,0.08)',
        '&:hover': { bgcolor: OR, color: 'white', borderColor: OR },
        transition: 'all 0.18s',
      }}>
        <ArrowForwardIos sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  );
}

/* ─── Carte carousel premium (Flash / Promo) ─────────────────────────────── */
function DealCard({ p, flash = false }: { p: any; flash?: boolean }) {
  const likedIds   = useLikedIds();
  const userLoc    = useUserLoc();
  const isNearCity: boolean = p.isNearCity || !!(userLoc.city && p.city && p.city.toLowerCase() === userLoc.city.toLowerCase());
  const isNearDept: boolean = !isNearCity && (p.isNearDept || !!(userLoc.department && p.department && p.department.toLowerCase() === userLoc.department.toLowerCase()));
  const nearLabel = isNearCity ? (p.city || userLoc.city) : isNearDept ? (p.department || userLoc.department) : null;
  const [liked, setLiked] = useState(() => likedIds.has(p.id));
  const [busy,  setBusy]  = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const imgUrl = p.images?.[0]?.urlThumb || p.images?.[0]?.urlMedium || p.images?.[0]?.url || p.imageUrl || '';
  const hasSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const off     = hasSale ? pct(Number(p.price), Number(p.salePrice)) : 0;

  useEffect(() => { setLiked(likedIds.has(p.id)); }, [likedIds, p.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.nativeEvent as any).stopImmediatePropagation?.();
    const hasToken = !!localStorage.getItem('accessToken');
    if (!user || !hasToken) { navigate('/login?next=/account/wishlist'); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (liked) {
        await api.delete(`/wishlist/${p.id}`);
        setLiked(false);
      } else {
        await api.post('/wishlist', { productId: p.id });
        setLiked(true);
      }
      qc.invalidateQueries({ queryKey: ['wishlist'] });
      qc.invalidateQueries({ queryKey: ['wishlist-count'] });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg !== 'Produit déja dans les favoris') console.error('Wishlist error:', err);
    } finally { setBusy(false); }
  };

  return (
    /* Wrapper — cœur et Link sont FRÈRES */
    <Box sx={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', contain: 'layout style' }}>

      {/* ── LIEN ── */}
      <Box component={Link} to={`/products/${p.slug}`}
        sx={{
          textDecoration: 'none', bgcolor: 'white', borderRadius: '12px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' },
          '&:hover .dc-img': { transform: 'scale(1.06)' },
        }}>

        {/* Image */}
        <Box sx={{ position: 'relative', paddingTop: '105%', bgcolor: '#F3F4F6', overflow: 'hidden', flexShrink: 0 }}>
          {imgUrl
            ? <Box component="img" src={imgUrl} alt={p.name} className="dc-img"
                loading="lazy" decoding="async"
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
              minWidth: 42, height: 42, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: flash ? '#EF4444' : OR,
              boxShadow: flash ? '0 2px 8px rgba(239,68,68,0.5)' : `0 2px 8px ${alpha(OR, 0.5)}`,
              flexDirection: 'column',
            }}>
              <Typography fontSize={11} fontWeight={900} color="white" lineHeight={1}>-{off}%</Typography>
            </Box>
          )}
          {/* Badge localisation */}
          {nearLabel && (
            <Box sx={{
              position: 'absolute', bottom: 7, left: 7,
              display: 'flex', alignItems: 'center', gap: '3px',
              bgcolor: isNearCity ? 'rgba(5,150,105,0.92)' : 'rgba(14,165,233,0.88)',
              backdropFilter: 'blur(6px)',
              color: 'white', fontWeight: 700, fontSize: 9,
              borderRadius: '20px', px: '7px', py: '2.5px',
              lineHeight: 1.3, letterSpacing: 0.2,
              boxShadow: isNearCity ? '0 2px 8px rgba(5,150,105,0.45)' : '0 2px 8px rgba(14,165,233,0.35)',
            }}>
              <Box component="span" sx={{ fontSize: 9, lineHeight: 1 }}>📍</Box>
              {nearLabel}
            </Box>
          )}
        </Box>

        {/* Info */}
        <Box sx={{ p: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <Typography fontSize={12} color="#1F2937" fontWeight={500} lineHeight={1.35}
            sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
            <Typography fontSize={14} fontWeight={900} color={flash ? '#EF4444' : OR} noWrap sx={{ flexShrink: 0 }}>
              {fmtP(Number(hasSale ? p.salePrice : p.price))}
            </Typography>
            {hasSale && (
              <Typography fontSize={10} color="#9CA3AF" noWrap sx={{ textDecoration: 'line-through', flexShrink: 1 }}>
                {fmtP(Number(p.price))}
              </Typography>
            )}
          </Box>
          <Typography fontSize={10.5} color="#9CA3AF" noWrap>{p.store?.name || ''}</Typography>
        </Box>
      </Box>

      {/* ── CŒUR — FRÈRE du Link ── */}
      <Box
        component="button"
        type="button"
        onClick={handleLike}
        disabled={busy}
        sx={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          cursor: 'pointer', border: 'none', padding: 0,
          width: 36, height: 36, borderRadius: '50%',
          bgcolor: liked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
          transition: 'transform 0.18s, background 0.15s',
          '&:hover': { transform: 'scale(1.18)' },
          '&:disabled': { cursor: 'wait' },
        }}>
        {liked
          ? <Favorite sx={{ fontSize: 17, color: '#EF4444', pointerEvents: 'none' }} />
          : <FavoriteBorder sx={{ fontSize: 17, color: '#9CA3AF', pointerEvents: 'none' }} />}
      </Box>
    </Box>
  );
}

/* ─── Carousel horizontal avec flèches PC ───────────────────────────────── */
function DealCarousel({ products, flash = false }: { products: any[]; flash?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x0: 0, sl0: 0 });

  const scroll = (dir: number) => scrollRef.current?.scrollBy({ left: dir * 860, behavior: 'smooth' });
  const onDown = (e: React.MouseEvent) => {
    drag.current = { on: true, x0: e.pageX, sl0: scrollRef.current?.scrollLeft ?? 0 };
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current.on || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = drag.current.sl0 - (e.pageX - drag.current.x0);
  };
  const onUp = () => { drag.current.on = false; };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); el.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' }); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const arrowSx = (side: 'left' | 'right') => ({
    position: 'absolute' as const,
    [side]: { xs: side === 'left' ? 2 : 2, md: -18 },
    top: '38%', transform: 'translateY(-50%)',
    zIndex: 10,
    width: { xs: 30, md: 40 }, height: { xs: 30, md: 40 },
    bgcolor: flash ? 'rgba(30,5,5,0.75)' : 'rgba(255,255,255,0.92)',
    border: flash ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(0,0,0,0.08)',
    color: flash ? 'rgba(255,255,255,0.8)' : 'text.primary',
    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
    backdropFilter: 'blur(6px)',
    '&:hover': {
      bgcolor: flash ? '#EF4444' : OR,
      color: 'white',
      borderColor: 'transparent',
      boxShadow: flash ? '0 4px 18px rgba(239,68,68,0.5)' : `0 4px 18px ${alpha(OR, 0.5)}`,
    },
    transition: 'all 0.2s',
  });

  return (
    <Box sx={{ position: 'relative', mx: { xs: 0, md: '20px' } }}>
      <IconButton onClick={() => scroll(-1)} sx={arrowSx('left')}>
        <ArrowBackIos sx={{ fontSize: { xs: 11, md: 14 }, ml: '3px' }} />
      </IconButton>

      <Box ref={scrollRef}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        sx={{
          display: 'flex', gap: { xs: '8px', md: '12px' },
          overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          scrollSnapType: 'x mandatory',
          px: { xs: 4.5, md: 0 },
          cursor: 'grab', '&:active': { cursor: 'grabbing' }, userSelect: 'none',
          pb: 1,
          WebkitOverflowScrolling: 'touch',
          willChange: 'scroll-position',
        }}>
        {products.slice(0, 30).map((p: any) => (
          <Box key={p.id} sx={{
            flexShrink: 0, scrollSnapAlign: 'start',
            width: { xs: 150, sm: 165, md: 185, lg: 200 },
          }}>
            <DealCard p={p} flash={flash} />
          </Box>
        ))}
      </Box>

      <IconButton onClick={() => scroll(1)} sx={arrowSx('right')}>
        <ArrowForwardIos sx={{ fontSize: { xs: 11, md: 14 } }} />
      </IconButton>
    </Box>
  );
}

/* ─── Section Ventes Flash — design premium ──────────────────────────────── */
function FlashSection({ products, to }: { products: any[]; to: string }) {
  const { data: flashConfig } = useQuery({
    queryKey: ['flash-config-public'],
    queryFn: () => api.get('/flash-sale/active').then(r => r.data).catch(() => null),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Fallback : si pas de date configurée, afficher un timer de 24h glissant
  const endAt = flashConfig?.endAt
    ? new Date(flashConfig.endAt)
    : new Date(Date.now() + 24 * 3600 * 1000);
  const title = flashConfig?.title || 'VENTES FLASH';

  if (!products.length) return null;

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0D0000 0%, #1A0505 40%, #0D0814 100%)' }}>

      {/* Bande shimmer top */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'linear-gradient(90deg, transparent, #EF4444, #FBBF24, #EF4444, transparent)',
        backgroundSize: '200% 100%',
        animation: 'dp-shimmer 2.4s linear infinite',
      }} />

      {/* Cercles lumineux déco */}
      <Box sx={{ position: 'absolute', top: -80, left: -40, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -60, right: '20%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 3 }, position: 'relative' }}>

        {/* ── Header row ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 2, md: 2.5 }, gap: 1, flexWrap: 'wrap' }}>

          {/* LEFT: icon + title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{
              width: { xs: 38, md: 46 }, height: { xs: 38, md: 46 }, borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg, #FF2424 0%, #8B0000 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px rgba(239,68,68,0.5)',
              animation: 'dp-pulse 2.5s ease-in-out infinite',
              '@keyframes dp-pulse': { '0%,100%': { boxShadow: '0 0 16px rgba(239,68,68,0.4)' }, '50%': { boxShadow: '0 0 32px rgba(239,68,68,0.75)' } },
            }}>
              <FlashOn sx={{ color: '#FBBF24', fontSize: { xs: 22, md: 26 } }} />
            </Box>
            <Box>
              <Typography fontSize={{ xs: 18, md: 24 }} fontWeight={900} lineHeight={1}
                sx={{ background: 'linear-gradient(90deg,#fff 30%,#FFAAAA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                {title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.3 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#EF4444',
                  animation: 'dp-live 1s step-start infinite', '@keyframes dp-live': { '50%': { opacity: 0 } } }} />
                <Typography fontSize={10.5} color="rgba(255,255,255,0.38)" letterSpacing="0.3px">
                  Offres limitées · Stocks réduits
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* RIGHT: timer + voir tout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, md: 2 }, flexWrap: 'wrap' }}>
            {/* Timer inline */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <Typography fontSize={9} color="rgba(255,255,255,0.28)" fontWeight={700} letterSpacing="1.5px" textTransform="uppercase">
                Se termine dans
              </Typography>
              <FlashTimer endsAt={endAt} />
            </Box>

            <Button component={Link} to={to} endIcon={<KeyboardArrowRight sx={{ fontSize: 14 }} />}
              sx={{
                color: '#FBBF24', fontWeight: 700, fontSize: { xs: 11.5, md: 13 }, textTransform: 'none',
                border: '1px solid rgba(251,191,36,0.25)', borderRadius: '10px',
                px: { xs: 1.5, md: 2 }, py: { xs: 0.6, md: 0.9 },
                '&:hover': { bgcolor: 'rgba(251,191,36,0.08)', borderColor: '#FBBF24' },
              }}>
              Voir tout
            </Button>
          </Box>
        </Box>

        <DealCarousel products={products} flash />
      </Container>
    </Box>
  );
}

/* ─── Section En promotion — design premium ──────────────────────────────── */
function PromoSection({ products, to }: { products: any[]; to: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x0: 0, sl0: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); el.scrollBy({ left: e.deltaY * 2.5, behavior: 'smooth' }); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onDown = (e: React.MouseEvent) => { drag.current = { on: true, x0: e.pageX, sl0: scrollRef.current?.scrollLeft ?? 0 }; };
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current.on || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = drag.current.sl0 - (e.pageX - drag.current.x0);
  };
  const onUp = () => { drag.current.on = false; };

  if (!products.length) return null;

  return (
    <Box sx={{
      background: 'linear-gradient(135deg, #0F0F0F 0%, #1A1A2E 60%, #16213E 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Déco: cercles lumineux */}
      <Box sx={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', bgcolor: alpha(OR, 0.08), filter: 'blur(60px)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -40, left: '30%', width: 200, height: 200, borderRadius: '50%', bgcolor: alpha('#EF4444', 0.07), filter: 'blur(50px)', pointerEvents: 'none' }} />

      <Box sx={{ px: { xs: 0, md: 3 }, py: { xs: 2, md: 3.5 }, position: 'relative', maxWidth: '1536px', mx: 'auto' }}>

        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, md: 2.5 }, px: { xs: 1.5, md: 0 }, gap: 1 }}>
          {/* Gauche : icône + titre + badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            <Box sx={{
              width: { xs: 34, md: 44 }, height: { xs: 34, md: 44 }, borderRadius: '12px', flexShrink: 0,
              background: 'linear-gradient(135deg, #FF4444, #FF6B00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: { xs: 17, md: 22 },
              boxShadow: '0 4px 16px rgba(255,107,0,0.45)',
              animation: 'dp-pulse 2s ease-in-out infinite',
              '@keyframes dp-pulse': { '0%,100%': { boxShadow: '0 4px 16px rgba(255,107,0,0.35)' }, '50%': { boxShadow: '0 4px 28px rgba(255,107,0,0.7)' } },
            }}>🔥</Box>

            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'nowrap' }}>
                <Typography fontSize={{ xs: 16, md: 21 }} fontWeight={900} color="white" letterSpacing="-0.4px" lineHeight={1} noWrap>
                  En promotion
                </Typography>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #EF4444, #FF6B00)',
                  borderRadius: '20px', px: { xs: '7px', md: '10px' }, py: '3px',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.45)',
                }}>
                  <Box component="span" sx={{ fontSize: { xs: 9, md: 10 } }}>⚡</Box>
                  <Typography fontSize={{ xs: 10, md: 11 }} fontWeight={900} color="white" lineHeight={1} noWrap>
                    {products.length} offres
                  </Typography>
                </Box>
              </Box>
              <Typography fontSize={{ xs: 10.5, md: 12 }} color="rgba(255,255,255,0.4)" fontWeight={400} mt={0.3} noWrap>
                Sélectionnées · Vérifiées · Limitées
              </Typography>
            </Box>
          </Box>

          {/* Bouton voir tout */}
          <Button component={Link} to={to} endIcon={<KeyboardArrowRight sx={{ fontSize: { xs: 13, md: 15 } }} />}
            sx={{
              color: OR, fontWeight: 700, fontSize: { xs: 11, md: 13 }, textTransform: 'none',
              border: `1.5px solid ${alpha(OR, 0.4)}`, borderRadius: '10px',
              px: { xs: 1.2, md: 2.2 }, py: { xs: 0.5, md: 0.9 }, flexShrink: 0,
              minWidth: 0,
              '&:hover': { bgcolor: alpha(OR, 0.1), borderColor: OR },
            }}>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Voir tout</Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Tout</Box>
          </Button>
        </Box>

        {/* ── Horizontal scroll + nav buttons ── */}
        <Box sx={{ position: 'relative' }}>
          {/* Flèche gauche */}
          <IconButton onClick={() => scrollRef.current?.scrollBy({ left: -520, behavior: 'smooth' })}
            sx={{
              position: 'absolute', left: { xs: 2, md: -18 }, top: '50%', transform: 'translateY(-60%)',
              zIndex: 10,
              width: { xs: 32, md: 40 }, height: { xs: 32, md: 40 },
              bgcolor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              '&:hover': { bgcolor: OR, borderColor: OR, boxShadow: `0 4px 18px ${alpha(OR, 0.55)}` },
              transition: 'all 0.2s',
            }}>
            <ArrowBackIos sx={{ fontSize: { xs: 11, md: 13 }, ml: '3px' }} />
          </IconButton>

          <Box ref={scrollRef}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            sx={{
              display: 'flex', gap: { xs: '8px', sm: '12px', md: '14px' },
              overflowX: 'auto', overflowY: 'visible',
              px: { xs: 5, md: 0 },
              pb: { xs: 1.5, md: 2 },
              scrollSnapType: 'x mandatory',
              cursor: 'grab', userSelect: 'none',
              '&:active': { cursor: 'grabbing' },
              '&::-webkit-scrollbar': { height: 3 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              '&::-webkit-scrollbar-thumb': { bgcolor: alpha(OR, 0.35), borderRadius: 2 },
            }}>
            {products.slice(0, 12).map((ad: any) => (
              <Box key={ad.id || ad._adCampaignId} sx={{
                width: { xs: 'calc(45vw - 16px)', sm: 175, md: 205 },
                maxWidth: { xs: 170, sm: 185, md: 210 },
                minWidth: { xs: 140 },
                flexShrink: 0, scrollSnapAlign: 'start',
              }}>
                <SponsoredDealCard ad={ad} dark />
              </Box>
            ))}
          </Box>

          {/* Flèche droite */}
          <IconButton onClick={() => scrollRef.current?.scrollBy({ left: 520, behavior: 'smooth' })}
            sx={{
              position: 'absolute', right: { xs: 2, md: -18 }, top: '50%', transform: 'translateY(-60%)',
              zIndex: 10,
              width: { xs: 32, md: 40 }, height: { xs: 32, md: 40 },
              bgcolor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              color: 'white',
              '&:hover': { bgcolor: OR, borderColor: OR, boxShadow: `0 4px 18px ${alpha(OR, 0.55)}` },
              transition: 'all 0.2s',
            }}>
            <ArrowForwardIos sx={{ fontSize: { xs: 11, md: 13 } }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}

/* ─── Section standard — grille ──────────────────────────────────────────── */
function Section({ title, count, to, products }: {
  title: string; count?: number; to: string; products: any[];
}) {
  if (!products.length) return null;
  return (
    <Box sx={{ bgcolor: 'white', py: { xs: 2, md: 3 }, borderBottom: '1px solid #F0F0F0' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2 } }}>
        <SectionHeader title={title} count={count} to={to} />
        <ProductRow products={products} />
      </Container>
    </Box>
  );
}

/* ─── Sign-in CTA ────────────────────────────────────────────────────────── */
function SignInCta() {
  return (
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #F0F0F0' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 2 }, py: 2 }}>
        <Box sx={{ bgcolor: alpha(BG, 0.03), border: `1px solid ${alpha(BG, 0.06)}`,
          borderRadius: 3, px: 3, py: 2.5, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: alpha(OR, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Person sx={{ color: OR, fontSize: 24 }} />
            </Box>
            <Box>
              <Typography fontWeight={700} fontSize={15} color={BG}>Voir des recommandations personnalisees</Typography>
              <Typography fontSize={12.5} color="#64748B">Connectez-vous pour des offres adaptees a vos gouts</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button component={Link} to="/login" variant="contained"
              sx={{ bgcolor: OR, color: 'white', fontWeight: 700, borderRadius: 2.5, px: 3, py: 0.9,
                textTransform: 'none', fontSize: 13, '&:hover': { bgcolor: ORD } }}>
              Se connecter
            </Button>
            <Button component={Link} to="/register" variant="outlined"
              sx={{ color: OR, borderColor: OR, fontWeight: 700, borderRadius: 2.5, px: 2.5, py: 0.9,
                textTransform: 'none', fontSize: 13, '&:hover': { bgcolor: alpha(OR, 0.06) } }}>
              Creer un compte
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

/* ─── Delivery estimate by geo level ────────────────────────────────────── */
function getDeliveryEstimate(level: 'city' | 'department' | 'national'): string {
  if (level === 'city')       return 'Livraison 1-2 jours';
  if (level === 'department') return 'Livraison 2-4 jours';
  return 'Livraison 5-7 jours';
}

/* ─── Distance badge by level ────────────────────────────────────────────── */
function LevelBadge({ level }: { level?: string }) {
  if (level === 'city') {
    return (
      <Chip label="Votre ville" size="small" icon={<LocationOn sx={{ fontSize: '12px !important', color: '#16A34A !important' }} />}
        sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: '#DCFCE7', color: '#16A34A',
          border: '1px solid #BBF7D0', height: 20 }} />
    );
  }
  if (level === 'department') {
    return (
      <Chip label="Votre departement" size="small" icon={<LocationOn sx={{ fontSize: '12px !important', color: '#2563EB !important' }} />}
        sx={{ fontSize: 10.5, fontWeight: 700, bgcolor: '#DBEAFE', color: '#2563EB',
          border: '1px solid #BFDBFE', height: 20 }} />
    );
  }
  return (
    <Chip label="Toute Haiti" size="small"
      sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: '#F1F5F9', color: '#64748B',
        border: '1px solid #E2E8F0', height: 20 }} />
  );
}

/* ─── Near-you section ────────────────────────────────────────────────────── */
function NearYouSection({ products, location, onModal, label, level }: {
  products: any[]; location: any; onModal: () => void; label?: string | null; level?: string;
}) {
  const city = location?.city || location?.department;
  const sectionTitle = label
    || (location?.city
      ? `Produits populaires à ${location.city}`
      : location?.department
        ? `Produits populaires en ${location.department}`
        : 'Produits près de vous');
  const isFallback = level === 'national';

  // No location chosen yet
  if (!location && products.length === 0) {
    return (
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #F0F0F0', py: { xs: 2.5, md: 3.5 } }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 2 } }}>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <LocationOn sx={{ fontSize: 44, color: '#E2E8F0', mb: 1 }} />
            <Typography color={BG} fontWeight={700} fontSize={16} mb={0.8}>Personnalisez votre expérience</Typography>
            <Typography color="#94A3B8" fontSize={13.5} mb={2.5}>
              Choisissez votre zone pour voir les produits disponibles près de vous
            </Typography>
            <Button variant="contained" onClick={onModal}
              sx={{ bgcolor: OR, color: 'white', fontWeight: 800, borderRadius: 3, px: 4, py: 1.2, textTransform: 'none', fontSize: 14, '&:hover': { bgcolor: '#E55A00' } }}>
              Choisir ma zone
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  // Location chosen but no local products → empty state + suggested fallback
  if (isFallback && city) {
    return (
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #F0F0F0' }}>
        {/* Empty state banner */}
        <Box sx={{
          background: 'linear-gradient(135deg, #0C1220 0%, #0F1A30 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          py: { xs: 3.5, md: 5 },
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow */}
          <Box sx={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', top: '-60%', right: '-5%', pointerEvents: 'none',
            background: `radial-gradient(circle, ${alpha(OR, 0.07)} 0%, transparent 65%)` }} />
          <Box sx={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', bottom: '-50%', left: '10%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)' }} />

          <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 }, position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: { xs: 3, md: 5 }, textAlign: { xs: 'center', md: 'left' } }}>

              {/* Icon */}
              <Box sx={{
                width: { xs: 72, md: 88 }, height: { xs: 72, md: 88 }, flexShrink: 0, borderRadius: '22px',
                background: `linear-gradient(135deg, ${alpha(OR, 0.18)}, ${alpha(OR, 0.06)})`,
                border: `1.5px solid ${alpha(OR, 0.22)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 32px ${alpha(OR, 0.15)}`,
              }}>
                <LocationOn sx={{ fontSize: { xs: 32, md: 40 }, color: OR }} />
              </Box>

              <Box sx={{ flex: 1 }}>
                {/* Zone badge */}
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, mb: 1.5,
                  px: 1.4, py: 0.5, borderRadius: '20px',
                  bgcolor: alpha(OR, 0.1), border: `1px solid ${alpha(OR, 0.22)}` }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: OR }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: OR }}>Zone · {city}</Typography>
                </Box>

                <Typography sx={{ fontSize: { xs: 19, md: 24 }, fontWeight: 900, color: 'white', lineHeight: 1.2, mb: 1, letterSpacing: '-0.5px' }}>
                  Aucun vendeur dans votre zone pour l'instant.
                </Typography>
                <Typography sx={{ fontSize: { xs: 13, md: 14 }, color: 'rgba(255,255,255,0.42)', mb: 3, maxWidth: 480, lineHeight: 1.75 }}>
                  Les boutiques de <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{city}</strong> arrivent bientôt. En attendant, explorez tous les produits disponibles partout en Haïti — ou soyez le premier vendeur de votre région.
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <Button variant="contained" onClick={onModal} sx={{
                    background: `linear-gradient(135deg, ${OR}, #e05e00)`,
                    color: 'white', fontWeight: 800, borderRadius: '12px',
                    textTransform: 'none', px: 3, py: 1.1, fontSize: 13.5,
                    boxShadow: `0 6px 20px ${alpha(OR, 0.4)}`,
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 10px 28px ${alpha(OR, 0.5)}` },
                    transition: 'all 0.2s',
                  }}>
                    Changer de zone
                  </Button>
                  <Button component={Link} to="/register?role=SELLER" sx={{
                    color: OR, fontWeight: 700, borderRadius: '12px',
                    textTransform: 'none', px: 3, py: 1.1, fontSize: 13.5,
                    border: `1.5px solid ${alpha(OR, 0.35)}`,
                    bgcolor: 'transparent',
                    '&:hover': { bgcolor: alpha(OR, 0.07), borderColor: OR },
                    transition: 'all 0.2s',
                  }}>
                    Vendre à {city}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Suggested products from all Haiti */}
        {products.length > 0 && (
          <Box sx={{ py: { xs: 2.5, md: 3.5 } }}>
            <Container maxWidth="xl" sx={{ px: { xs: 2, md: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 4, height: 26, bgcolor: '#6366F1', borderRadius: 2 }} />
                  <Box>
                    <Typography fontSize={{ xs: 15, md: 18 }} fontWeight={800} color="#111827">
                      Suggestions pour vous — Toute Haïti
                    </Typography>
                    <Typography fontSize={11.5} color="#9CA3AF" mt={0.2}>
                      Les produits les plus populaires de la plateforme
                    </Typography>
                  </Box>
                </Box>
                <Button component={Link} to="/products" endIcon={<KeyboardArrowRight />}
                  sx={{ color: OR, fontWeight: 700, fontSize: 13, textTransform: 'none', '&:hover': { bgcolor: alpha(OR, 0.07) }, borderRadius: 2, flexShrink: 0 }}>
                  Voir tout
                </Button>
              </Box>
              <ProductRow products={products} />
            </Container>
          </Box>
        )}
      </Box>
    );
  }

  // Normal — has local products
  return (
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #F0F0F0', py: { xs: 2.5, md: 3.5 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box sx={{ width: 4, height: 26, bgcolor: OR, borderRadius: 2 }} />
            <Typography fontSize={{ xs: 16, md: 19 }} fontWeight={700} color={BG}>{sectionTitle}</Typography>
            <LevelBadge level={level} />
            {level && level !== 'national' && (
              <Chip label={getDeliveryEstimate(level as 'city' | 'department' | 'national')} size="small"
                icon={<LocalShipping sx={{ fontSize: '12px !important', color: '#64748B !important' }} />}
                sx={{ fontSize: 10.5, fontWeight: 600, bgcolor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', height: 20 }} />
            )}
            <Chip label={city || 'Choisir zone'} size="small" onClick={onModal}
              icon={<LocationOn sx={{ fontSize: 13, color: `${OR}!important` }} />}
              sx={{ fontSize: 11.5, fontWeight: 600, bgcolor: alpha(OR, 0.09), color: OR, border: `1px solid ${alpha(OR, 0.22)}`, cursor: 'pointer', height: 22, '&:hover': { bgcolor: alpha(OR, 0.16) } }} />
          </Box>
          <Button component={Link}
            to={`/products${location?.department ? `?department=${encodeURIComponent(location.department)}` : ''}`}
            endIcon={<KeyboardArrowRight />}
            sx={{ color: OR, fontWeight: 700, fontSize: 13, textTransform: 'none', '&:hover': { bgcolor: alpha(OR, 0.07) }, borderRadius: 2, flexShrink: 0 }}>
            Voir tout
          </Button>
        </Box>
        <ProductRow products={products} />
      </Container>
    </Box>
  );
}

/* ─── Admin banner ───────────────────────────────────────────────────────── */
function AdminBanner({ banners }: { banners: any[] }) {
  if (!banners.length) return null;
  const b = banners[0];
  return (
    <Box sx={{ bgcolor: PG, py: 1.5 }}>
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 2 } }}>
        <Box component={Link} to={b.targetUrl || '/products'}
          sx={{ display: 'block', borderRadius: 2.5, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.09)', transition: 'transform 0.2s',
            '&:hover': { transform: 'scale(1.005)' } }}>
          <img src={b.imageUrl} alt={b.title || ''}
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
        </Box>
      </Container>
    </Box>
  );
}

/* ─── Deal Card — carte promotion vendeur ────────────────────────────────── */
function SponsoredDealCard({ ad, dark }: { ad: any; dark?: boolean }) {
  const navigate = useNavigate();
  const { location: locData } = useLocationState();
  const img     = ad.images?.[0]?.urlFull || ad.images?.[0]?.urlMedium || ad.images?.[0]?.url || '';
  const hasSale = ad.salePrice && Number(ad.salePrice) < Number(ad.price);
  const off     = hasSale ? Math.round((1 - Number(ad.salePrice) / Number(ad.price)) * 100) : 0;
  const price   = Number(hasSale ? ad.salePrice : ad.price);
  const orig    = Number(ad.price);
  // Strip seeding suffixes like "— FLASH" from display name
  const displayName = ad.name?.replace(/\s*[—–-]+\s*FLASH\s*$/i, '').trim();

  const userDept = locData?.department?.toLowerCase() || '';
  const userCity = locData?.city?.toLowerCase() || '';
  const adCity   = (ad.city || ad.store?.city || '').toLowerCase();
  const adDept   = (ad.department || ad.store?.department || '').toLowerCase();
  const isNearCity = userCity && adCity && adCity === userCity;
  const isNearDept = !isNearCity && userDept && adDept && adDept.includes(userDept);
  const nearLabel  = isNearCity ? (ad.city || ad.store?.city) : isNearDept ? (ad.department || ad.store?.department) : null;

  const handleClick = () => {
    if (ad._adCampaignId) api.post(`/ads/track/${ad._adCampaignId}/CLICK`).catch(() => {});
    navigate(`/products/${ad.slug}`);
  };

  return (
    <Box onClick={handleClick} sx={{
      bgcolor: dark ? 'rgba(255,255,255,0.06)' : 'white',
      borderRadius: '16px', overflow: 'hidden',
      cursor: 'pointer',
      border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #F0F0F0',
      display: 'flex', flexDirection: 'column',
      boxShadow: dark ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
      backdropFilter: dark ? 'blur(8px)' : 'none',
      transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s, background 0.2s',
      '&:hover': {
        boxShadow: dark ? `0 8px 32px rgba(0,0,0,0.4)` : '0 10px 32px rgba(0,0,0,0.11)',
        transform: 'translateY(-3px)',
        borderColor: dark ? alpha(OR, 0.6) : OR,
        bgcolor: dark ? 'rgba(255,255,255,0.1)' : 'white',
      },
      '&:hover .deal-img': { transform: 'scale(1.05)' },
    }}>
      {/* Image */}
      <Box sx={{ position: 'relative', aspectRatio: '1/1', bgcolor: '#F8F9FA', overflow: 'hidden', flexShrink: 0 }}>
        {img ? (
          <Box component="img" src={img} alt={displayName} loading="lazy" className="deal-img"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.38s ease' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 0.5, color: '#D1D5DB' }}>
            <Store sx={{ fontSize: 32 }} />
            <Typography fontSize={10} color="#CBD5E1">Pas d'image</Typography>
          </Box>
        )}

        {/* Discount pill — top left */}
        {off > 0 && (
          <Box sx={{
            position: 'absolute', top: 8, left: 8,
            bgcolor: '#EF4444', color: 'white', fontWeight: 900,
            fontSize: { xs: 10.5, md: 12 }, borderRadius: '8px',
            px: '7px', py: '2px', lineHeight: 1.5,
            boxShadow: '0 2px 8px rgba(239,68,68,0.45)',
          }}>-{off}%</Box>
        )}

        {/* Verified store badge — top right */}
        {ad.store?.isVerified && (
          <Box sx={{
            position: 'absolute', top: 8, right: 8,
            width: 26, height: 26, borderRadius: '50%', bgcolor: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            <Verified sx={{ fontSize: 15, color: '#3B82F6' }} />
          </Box>
        )}

        {/* Location badge — bottom left */}
        {nearLabel && (
          <Box sx={{
            position: 'absolute', bottom: 7, left: 7,
            display: 'flex', alignItems: 'center', gap: '3px',
            bgcolor: isNearCity ? 'rgba(5,150,105,0.9)' : 'rgba(14,165,233,0.9)',
            backdropFilter: 'blur(6px)', color: 'white', fontWeight: 700,
            fontSize: 9, borderRadius: '20px', px: '7px', py: '2.5px',
            maxWidth: '75%',
          }}>
            <Box component="span" sx={{ fontSize: 10 }}>📍</Box>
            <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nearLabel}
            </Box>
          </Box>
        )}

        {/* Savings amount — bottom right */}
        {hasSale && off >= 20 && (
          <Box sx={{
            position: 'absolute', bottom: 7, right: 7,
            bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            color: 'white', fontSize: 9, fontWeight: 700,
            borderRadius: '6px', px: '5px', py: '2px',
          }}>
            -{(orig - price).toLocaleString()} HTG
          </Box>
        )}
      </Box>

      {/* Info */}
      <Box sx={{ p: { xs: '9px 10px 11px', md: '11px 13px 13px' }, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography fontSize={{ xs: 9.5, md: 10.5 }} color={dark ? 'rgba(255,255,255,0.4)' : '#94A3B8'} fontWeight={600} noWrap mb={0.3}>
          {ad.store?.name}
        </Typography>
        <Typography fontSize={{ xs: 12, md: 13 }} color={dark ? 'rgba(255,255,255,0.92)' : '#111827'} fontWeight={700} lineHeight={1.35}
          sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, mb: '6px' }}>
          {displayName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'nowrap' }}>
          <Typography fontSize={{ xs: 13.5, md: 15 }} fontWeight={900} color={dark ? OR : '#CC0C39'} lineHeight={1} noWrap>
            {price.toLocaleString()} HTG
          </Typography>
          {hasSale && (
            <Typography fontSize={{ xs: 10, md: 11 }} color={dark ? 'rgba(255,255,255,0.25)' : '#C4C4C4'} sx={{ textDecoration: 'line-through', lineHeight: 1 }} noWrap>
              {orig.toLocaleString()}
            </Typography>
          )}
        </Box>
        {ad.avgRating > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: '5px' }}>
            <Box sx={{ display: 'flex' }}>
              {[1,2,3,4,5].map(s => (
                <Box key={s} component="span" sx={{ fontSize: 10, color: s <= Math.round(ad.avgRating) ? '#F59E0B' : (dark ? 'rgba(255,255,255,0.15)' : '#E5E7EB') }}>★</Box>
              ))}
            </Box>
            <Typography fontSize={9.5} color={dark ? 'rgba(255,255,255,0.35)' : '#9CA3AF'}>{ad.avgRating?.toFixed(1)}</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ─── Offres sponsorisées — grille propre ────────────────────────────────── */
function PromoAdSlider({ ads }: { ads: any[] }) {
  useEffect(() => {
    if (!ads.length) return;
    ads.forEach(a => {
      if (a._adCampaignId) api.post(`/ads/track/${a._adCampaignId}/IMPRESSION`).catch(() => {});
    });
  }, [ads]);

  if (ads.length === 0) return null;

  return (
    <Box sx={{ bgcolor: '#F8FAFC', py: { xs: 2, md: 2.5 }, borderBottom: '1px solid #EEF2F7' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2 } }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 4, height: 22, bgcolor: OR, borderRadius: 2 }} />
            <Typography fontSize={{ xs: 14, md: 16 }} fontWeight={800} color={BG}>
              Sélection pour vous
            </Typography>
          </Box>
          <Button component={Link} to="/products?sort=discount" endIcon={<KeyboardArrowRight sx={{ fontSize: 14 }} />}
            sx={{ color: OR, fontWeight: 700, fontSize: 12, textTransform: 'none',
              '&:hover': { bgcolor: alpha(OR, 0.06) }, borderRadius: 2 }}>
            Voir tout
          </Button>
        </Box>

        {/* Grid — scroll horizontal sur mobile */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: `repeat(${Math.min(ads.length, 2)}, 150px)`,
            sm: `repeat(${Math.min(ads.length, 4)}, 1fr)`,
            md: `repeat(${Math.min(ads.length, 6)}, 1fr)`,
          },
          gap: { xs: 1.5, md: 1.5 },
          overflowX: { xs: 'auto', sm: 'visible' },
          pb: { xs: 0.5, sm: 0 },
          '&::-webkit-scrollbar': { height: 3 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#E2E8F0', borderRadius: 2 },
        }}>
          {ads.slice(0, 6).map((ad: any) => (
            <SponsoredDealCard key={ad.id} ad={ad} />
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ─── Quick Categories Bar ───────────────────────────────────────────────── */
const HP_CATS = [
  { slug: 'mode',         label: 'Mode',          emoji: '👗', color: '#EC4899' },
  { slug: 'electronique', label: 'Électronique',  emoji: '💻', color: '#3B82F6' },
  { slug: 'smartphones',  label: 'Smartphones',   emoji: '📱', color: '#22C55E' },
  { slug: 'maison',       label: 'Maison & Déco', emoji: '🏠', color: '#F97316' },
  { slug: 'beaute',       label: 'Beauté',        emoji: '💄', color: '#A855F7' },
  { slug: 'sport',        label: 'Sport',         emoji: '⚽', color: '#10B981' },
  { slug: 'alimentaire',  label: 'Alimentation',  emoji: '🍎', color: '#059669' },
  { slug: 'chaussures',   label: 'Chaussures',    emoji: '👟', color: '#F59E0B' },
  { slug: 'vehicules',    label: 'Véhicules',     emoji: '🚗', color: '#EF4444' },
  { slug: 'bijoux',       label: 'Bijoux',        emoji: '💍', color: '#D97706' },
];

function QuickCategoriesBar() {
  return (
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #EEF2F7', py: { xs: 1.5, md: 2 } }}>
      <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 4, height: 22, bgcolor: OR, borderRadius: 2 }} />
            <Typography fontSize={{ xs: 14, md: 16 }} fontWeight={800} color={BG}>Catégories</Typography>
          </Box>
          <Button component={Link} to="/categories" endIcon={<KeyboardArrowRight sx={{ fontSize: 14 }} />}
            sx={{ color: OR, fontWeight: 700, fontSize: 12, textTransform: 'none',
              '&:hover': { bgcolor: alpha(OR, 0.06) }, borderRadius: 2 }}>
            Voir tout
          </Button>
        </Box>
        <Box sx={{
          display: 'flex', gap: { xs: 1.5, md: 2 },
          overflowX: 'auto', pb: 0.5,
          scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {HP_CATS.map(cat => (
            <Box key={cat.slug} component={Link}
              to={`/products?category=${cat.slug}`}
              sx={{
                flexShrink: 0, textDecoration: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                width: { xs: 68, md: 80 },
                transition: 'transform 0.18s',
                '&:hover': { transform: 'translateY(-2px)' },
                '&:hover .cat-icon-box': { boxShadow: `0 6px 20px ${alpha(cat.color, 0.35)}` },
              }}>
              <Box className="cat-icon-box" sx={{
                width: { xs: 52, md: 60 }, height: { xs: 52, md: 60 },
                borderRadius: '16px',
                bgcolor: alpha(cat.color, 0.1),
                border: `1.5px solid ${alpha(cat.color, 0.2)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: { xs: 22, md: 26 },
                transition: 'box-shadow 0.18s',
              }}>{cat.emoji}</Box>
              <Typography fontSize={{ xs: 10, md: 11 }} fontWeight={600} color="#374151"
                textAlign="center" lineHeight={1.2}>
                {cat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const { user }                        = useAuthStore();
  const sessionId                       = getSessionId();
  const { location, setLocation }       = useLocationState();
  const [hpSearchParams, setHpSearchParams] = useSearchParams();
  const locModal    = hpSearchParams.get('modal') === 'location';
  const openLocModal  = () => setHpSearchParams(p => { const n = new URLSearchParams(p); n.set('modal','location'); return n; }, { replace: true });
  const closeLocModal = () => setHpSearchParams(p => { const n = new URLSearchParams(p); n.delete('modal'); return n; }, { replace: true });

  useEffect(() => { injectCss('dp-hp-css', CSS); }, []);

  // Géolocalisation automatique au premier chargement
  useGeoDetect();

  // Tracking comportemental — top catégories sur 7 jours
  const topCategories = useEventsStore((s) => s.getTopCategories)(7);

  // ── Queries ──────────────────────────────────────────────────────────
  const q = (url: string) => api.get(url)
    .then(r => r.data?.data || r.data || [])
    .catch(() => []);

  const dept = location?.department;
  const deptParam = dept ? `&department=${encodeURIComponent(dept)}` : '';

  const { data: featuredSellers = [] } = useQuery({ queryKey: ['hp-featured-sellers', dept], queryFn: () => api.get(`/sellers/featured?limit=24${deptParam}`).then(r => r.data || []).catch(() => []), staleTime: 300_000 });

  // Tendances + fallback national si résultat local vide
  const { data: trendingRaw = [] }    = useQuery({ queryKey: ['hp-trending', dept],   queryFn: () => q(`/products?sort=views&limit=24${deptParam}`),                staleTime: 180_000 });
  const { data: trendingFb = [] }     = useQuery({ queryKey: ['hp-trending-fb'],       queryFn: () => q(`/products?sort=views&limit=24`),                           staleTime: 180_000, enabled: dept ? (trendingRaw as any[]).length === 0 : false });
  const trending = (trendingRaw as any[]).length > 0 ? trendingRaw : trendingFb;

  const { data: newArrivalsRaw = [] } = useQuery({ queryKey: ['hp-new', dept],        queryFn: () => q(`/products?sort=newest&limit=24${deptParam}`),               staleTime: 180_000 });
  const { data: newArrivalsFb = [] }  = useQuery({ queryKey: ['hp-new-fb'],            queryFn: () => q(`/products?sort=newest&limit=24`),                          staleTime: 180_000, enabled: dept ? (newArrivalsRaw as any[]).length === 0 : false });
  const newArrivals = (newArrivalsRaw as any[]).length > 0 ? newArrivalsRaw : newArrivalsFb;

  const { data: onSaleRaw = [] }      = useQuery({ queryKey: ['hp-sale', dept],       queryFn: () => q(`/products?hasSale=true&sort=discount&limit=40${deptParam}`), staleTime: 180_000 });
  const { data: onSaleFb = [] }       = useQuery({ queryKey: ['hp-sale-fb'],           queryFn: () => q(`/products?hasSale=true&sort=discount&limit=40`),            staleTime: 180_000, enabled: dept ? (onSaleRaw as any[]).length === 0 : false });
  const onSale = (onSaleRaw as any[]).length > 0 ? onSaleRaw : onSaleFb;

  const { data: topSellers = [] }  = useQuery({ queryKey: ['hp-top', dept],        queryFn: () => q(`/products?sort=popular&limit=24${deptParam}`),               staleTime: 180_000 });
  const { data: featured = [] }    = useQuery({ queryKey: ['hp-featured', dept],   queryFn: () => q(`/products?featured=true&limit=24${deptParam}`),              staleTime: 300_000 });

  // Categories — queryKey inclut dept pour invalider quand la localisation change
  const { data: phones = [] }      = useQuery({ queryKey: ['hp-phones', dept],     queryFn: () => q(`/products?category=smartphones&limit=24${deptParam}`),       staleTime: 180_000 });
  const { data: vehicles = [] }    = useQuery({ queryKey: ['hp-vehicles', dept],   queryFn: () => q(`/products?category=vehicules&limit=24${deptParam}`),         staleTime: 180_000 });
  const { data: clothes = [] }     = useQuery({ queryKey: ['hp-clothes', dept],    queryFn: () => q(`/products?category=vetements&limit=24${deptParam}`),         staleTime: 180_000 });
  const { data: furniture = [] }   = useQuery({ queryKey: ['hp-furniture', dept],  queryFn: () => q(`/products?category=meubles&limit=24${deptParam}`),           staleTime: 180_000 });
  const { data: electronics = [] } = useQuery({ queryKey: ['hp-elec', dept],       queryFn: () => q(`/products?category=electronique&limit=24${deptParam}`),      staleTime: 180_000 });
  const { data: beauty = [] }      = useQuery({ queryKey: ['hp-beauty', dept],     queryFn: () => q(`/products?category=beaute&limit=24${deptParam}`),            staleTime: 180_000 });
  const { data: shoes = [] }       = useQuery({ queryKey: ['hp-shoes', dept],      queryFn: () => q(`/products?category=chaussures&limit=24${deptParam}`),        staleTime: 180_000 });
  const { data: sport = [] }       = useQuery({ queryKey: ['hp-sport', dept],      queryFn: () => q(`/products?category=sport&limit=24${deptParam}`),             staleTime: 180_000 });
  const { data: food = [] }        = useQuery({ queryKey: ['hp-food', dept],       queryFn: () => q(`/products?category=alimentation&limit=24${deptParam}`),      staleTime: 180_000 });

  const { data: banners = [] }     = useQuery({ queryKey: ['hp-banners'],    queryFn: () => api.get('/banners').then(r => r.data || []).catch(() => []),           staleTime: 300_000 });
  const adParams = new URLSearchParams({ limit: '12' });
  if (dept) adParams.set('department', dept);
  if ((user as any)?.gender) adParams.set('gender', (user as any).gender);
  if ((user as any)?.birthDate) {
    const age = Math.floor((Date.now() - new Date((user as any).birthDate).getTime()) / (365.25 * 86400000));
    if (age > 0) adParams.set('age', String(age));
  }
  const { data: promoAds = [] } = useQuery({ queryKey: ['hp-promo-ads', dept, (user as any)?.gender, (user as any)?.birthDate], queryFn: () => api.get(`/ads/serve?${adParams}`).then(r => Array.isArray(r.data) ? r.data : []).catch(() => []), staleTime: 120_000 });

  // Wishlist IDs pour initialiser les coeurs sans appel supplémentaire par carte
  const { data: wishlistRaw = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn:  () => api.get('/wishlist').then(r => r.data as any[]),
    enabled:  !!user && !!localStorage.getItem('accessToken'),
    staleTime: 60_000,
  });
  const likedIds = useMemo(() => new Set((wishlistRaw as any[]).map((w: any) => w.productId)), [wishlistRaw]);
  const { data: personalized = [] }= useQuery({ queryKey: ['hp-pers', user?.id, sessionId], queryFn: () => api.get(`/products/personalized?sessionId=${sessionId}&limit=24`).then(r => r.data || []).catch(() => []), staleTime: 120_000 });

  // Recommandations comportementales — top 3 catégories des 7 derniers jours
  const { data: recCat0 = [] } = useQuery({
    queryKey: ['hp-rec-cat0', topCategories[0]],
    queryFn: () => topCategories[0] ? q(`/products?category=${encodeURIComponent(topCategories[0])}&limit=12`) : Promise.resolve([]),
    enabled: topCategories.length > 0,
    staleTime: 180_000,
  });
  const { data: recCat1 = [] } = useQuery({
    queryKey: ['hp-rec-cat1', topCategories[1]],
    queryFn: () => topCategories[1] ? q(`/products?category=${encodeURIComponent(topCategories[1])}&limit=12`) : Promise.resolve([]),
    enabled: topCategories.length > 1,
    staleTime: 180_000,
  });
  const { data: recCat2 = [] } = useQuery({
    queryKey: ['hp-rec-cat2', topCategories[2]],
    queryFn: () => topCategories[2] ? q(`/products?category=${encodeURIComponent(topCategories[2])}&limit=12`) : Promise.resolve([]),
    enabled: topCategories.length > 2,
    staleTime: 180_000,
  });
  // Tendances régionales (fallback si pas d'historique)
  const { data: regionalTrending = [] } = useQuery({
    queryKey: ['hp-regional', location?.department],
    queryFn: () => {
      const params = new URLSearchParams({ sort: 'views', limit: '16' });
      if (location?.department) params.set('department', location.department);
      return q(`/products?${params}`);
    },
    staleTime: 180_000,
  });

  const { data: nearRaw = null } = useQuery({
    queryKey: ['hp-near', location?.department, location?.city],
    queryFn: () => {
      if (!location?.department) return Promise.resolve(null);
      const params = new URLSearchParams({ department: location.department, limit: '24' });
      if (location.city) params.set('city', location.city);
      return api.get(`/products/near?${params}`).then(r => r.data || null).catch(() => null);
    },
    staleTime: 180_000,
  });
  const nearYou  = (nearRaw as any)?.products ?? [];
  const nearLabel = (nearRaw as any)?.label ?? null;
  const nearLevel = (nearRaw as any)?.level ?? 'national';

  // Flash = produits avec salePrice (déja filtré par hasSale=true côté API)
  // On garde seulement ceux où salePrice < price (sécurité)
  const saleProducts = (onSale as any[]).filter((p: any) => p.salePrice && Number(p.salePrice) < Number(p.price));
  const flashItems   = saleProducts.slice(0, 20);
  const promoItems   = saleProducts.slice(0, 30);

  // Pool carousel = toutes catégories combinées
  const apiPool = [
    ...(trending as any[]), ...(phones as any[]), ...(clothes as any[]),
    ...(electronics as any[]), ...(vehicles as any[]), ...(beauty as any[]),
  ].filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
  // Si pas assez de produits par catégorie, on complète avec les "Vedettes"
  // choisies par l'admin (isFeatured) — jamais de faux produits inventés.
  const carouselPool = apiPool.length >= 4 ? apiPool : (featured as any[]);

  // Grand carousel hero — piloté par l'admin (bannières homepage), avec repli
  // sur des slides marketing par défaut si aucune bannière n'est configurée.
  const heroSlides = (banners as any[]).length > 0
    ? (banners as any[]).map((b) => ({
        img: b.imageUrl,
        tag: b.tag || '',
        title: b.title || '',
        sub: b.subtitle || '',
        cta: b.ctaText || 'Découvrir',
        to: b.targetUrl,
        catFilter: b.catFilter || null,
      }))
    : DEFAULT_SLIDES;

  // Produits recommandés : mix des 3 catégories les plus vues, dédupliqués
  const recommendedProducts = (() => {
    if (topCategories.length === 0) return [];
    const combined = [
      ...(recCat0 as any[]),
      ...(recCat1 as any[]),
      ...(recCat2 as any[]),
    ];
    return combined.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
  })();

  return (
    <LikedCtx.Provider value={likedIds}>
    <LocationCtx.Provider value={{ city: location?.city, department: location?.department }}>
    <Box sx={{ bgcolor: PG, minHeight: '100vh', pb: 8 }}>
      <LocationModal open={locModal} onClose={closeLocModal} />


      {/* 1 — Hero */}
      <HeroSection allProducts={carouselPool} slides={heroSlides} />

      {/* 2 — Trust bar */}
      <TrustBar />

      {/* 3 — Boutiques vedettes */}
      <FeaturedSellersSection sellers={featuredSellers as any[]} />

      {/* 4 — En promotion : uniquement les produits sponsorisés (campagnes actives) */}
      {(promoAds as any[]).length > 0 && (
        <PromoSection to="/products?hasSale=true&sort=discount" products={promoAds as any[]} />
      )}

      {/* 5 — Produits pres de chez toi */}
      <NearYouSection products={nearYou as any[]} location={location}
        onModal={openLocModal} label={nearLabel} level={nearLevel} />

      {/* 6 — Ventes Flash (après produits locaux) */}
      {flashItems.length > 0 && (
        <FlashSection to="/ventes-flash" products={flashItems} />
      )}


      {/* 7 — Nouvelles arrivées */}
      {(newArrivals as any[]).length > 0 && (
        <Section title="Nouvelles arrivees" to="/products?sort=newest"
          products={newArrivals as any[]} count={(newArrivals as any[]).length} />
      )}

      {/* 8 — Sign-in CTA */}
      {!user && <SignInCta />}

      {/* 9 — Pour vous / Tendances */}
      {user && (personalized as any[]).length > 0
        ? <Section title="Selectionnes pour vous" to="/products" products={personalized as any[]} count={(personalized as any[]).length} />
        : <Section title="Les plus vus" to="/products?sort=views" products={trending as any[]} count={(trending as any[]).length} />}

      {/* 9b — Recommande pour vous (comportemental) */}
      {recommendedProducts.length > 0 ? (
        <Box sx={{ bgcolor: 'white', py: { xs: 2, md: 3 }, borderBottom: '1px solid #F0F0F0' }}>
          <Container maxWidth="xl" sx={{ px: { xs: 1.5, md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 4, height: 26, bgcolor: OR, borderRadius: 2 }} />
                <Typography fontSize={{ xs: 16, md: 19 }} fontWeight={700} color={BG}>
                  ✨ Recommande pour vous
                </Typography>
                <Chip label={`${recommendedProducts.length} produits`} size="small"
                  sx={{ fontSize: 11, fontWeight: 600, bgcolor: alpha(OR, 0.09), color: OR,
                    border: `1px solid ${alpha(OR, 0.2)}`, height: 20 }} />
              </Box>
              <Button component={Link} to="/products" endIcon={<KeyboardArrowRight />}
                sx={{ color: OR, fontWeight: 700, fontSize: 13, textTransform: 'none',
                  '&:hover': { bgcolor: alpha(OR, 0.07) }, borderRadius: 2 }}>
                Voir tout
              </Button>
            </Box>
            <ProductRow products={recommendedProducts} />
          </Container>
        </Box>
      ) : (
        /* Nouveau visiteur : tendances régionales */
        (regionalTrending as any[]).length > 0 && (
          <Section
            title={location?.department ? `Tendances en ${location.department}` : 'Tendances en Haiti'}
            to={location?.department ? `/products?sort=views&department=${encodeURIComponent(location.department)}` : '/products?sort=views'}
            products={regionalTrending as any[]}
            count={(regionalTrending as any[]).length}
          />
        )
      )}

      {/* 10 — Smartphones */}
      {(phones as any[]).length > 0 && (
        <Section title="Smartphones & Tablettes" to="/products?category=smartphones"
          products={phones as any[]} count={(phones as any[]).length} />
      )}

      {/* 11 — Admin banner */}
      <AdminBanner banners={banners as any[]} />

      {/* 12 — Top vendus */}
      {(topSellers as any[]).length > 0 && (
        <Section title="Top vendus" to="/products?sort=popular"
          products={topSellers as any[]} count={(topSellers as any[]).length} />
      )}

      {/* 13 — Mode */}
      {(clothes as any[]).length > 0 && (
        <Section title="Mode & Vetements" to="/products?category=vetements"
          products={clothes as any[]} count={(clothes as any[]).length} />
      )}

      {/* 14 — Electronique */}
      {(electronics as any[]).length > 0 && (
        <Section title="Electronique & Informatique" to="/products?category=electronique"
          products={electronics as any[]} count={(electronics as any[]).length} />
      )}

      {/* 15 — Chaussures */}
      {(shoes as any[]).length > 0 && (
        <Section title="Chaussures" to="/products?category=chaussures"
          products={shoes as any[]} count={(shoes as any[]).length} />
      )}

      {/* 16 — Vehicules */}
      {(vehicles as any[]).length > 0 && (
        <Section title="Vehicules & Motos" to="/products?category=vehicules"
          products={vehicles as any[]} count={(vehicles as any[]).length} />
      )}

      {/* 17 — Maison */}
      {(furniture as any[]).length > 0 && (
        <Section title="Maison & Meubles" to="/products?category=meubles"
          products={furniture as any[]} count={(furniture as any[]).length} />
      )}

      {/* 18 — Sport */}
      {(sport as any[]).length > 0 && (
        <Section title="Sport & Loisirs" to="/products?category=sport"
          products={sport as any[]} count={(sport as any[]).length} />
      )}

      {/* 19 — Beaute */}
      {(beauty as any[]).length > 0 && (
        <Section title="Beaute & Soins" to="/products?category=beaute"
          products={beauty as any[]} count={(beauty as any[]).length} />
      )}

      {/* 20 — Alimentation */}
      {(food as any[]).length > 0 && (
        <Section title="Alimentation & Boissons" to="/products?category=alimentation"
          products={food as any[]} count={(food as any[]).length} />
      )}

      {/* 21 — Vedettes (isFeatured) */}
      {(featured as any[]).length > 0 && (
        <Section title="Selections du moment" to="/products?featured=true"
          products={featured as any[]} count={(featured as any[]).length} />
      )}

      {/* 16 — CTA final */}
      <Box sx={{ bgcolor: 'white', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 2 }, textAlign: 'center' }}>
          <Typography fontSize={{ xs: 20, md: 26 }} fontWeight={800} color={BG} mb={1}>
            Explorez tout le marketplace
          </Typography>
          <Typography fontSize={14} color="#64748B" mb={3}>
            Plus de produits de vendeurs verifies partout en Haiti
          </Typography>
          <Button component={Link} to="/products" variant="contained" size="large"
            sx={{ bgcolor: OR, color: 'white', fontWeight: 800, borderRadius: 3, px: 5, py: 1.5,
              fontSize: 15, textTransform: 'none',
              boxShadow: `0 4px 20px ${alpha(OR, 0.4)}`,
              '&:hover': { bgcolor: ORD, boxShadow: `0 6px 24px ${alpha(OR, 0.5)}` } }}>
            Voir toutes les offres
          </Button>
        </Container>
      </Box>
    </Box>
    </LocationCtx.Provider>
    </LikedCtx.Provider>
  );
}
