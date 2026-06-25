import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container, Grid, Typography, Box, Button, Card, CardMedia,
  CardContent, CardActionArea, Chip, Skeleton, alpha, IconButton,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowForward, Star, Checkroom, PhoneAndroid, Home as HomeIcon,
  LocalFlorist, Diamond, SportsEsports, DirectionsRun, WorkOutline,
  FitnessCenter, LocalShipping, Headset, Verified, Security,
  ChevronLeft, ChevronRight, FlashOn, Favorite, FavoriteBorder,
  BabyChangingStation, WomanOutlined, ManOutlined, Replay,
} from '@mui/icons-material';
import api from '../../api/axios';

const ORANGE = '#FF9900';
const DARK = '#131921';

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

const CATS = [
  { name: 'Femmes', slug: 'femmes', Icon: WomanOutlined, color: '#EC4899', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=160&h=160&fit=crop' },
  { name: 'Hommes', slug: 'hommes', Icon: ManOutlined, color: '#3B82F6', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=160&h=160&fit=crop' },
  { name: 'Enfants', slug: 'enfants', Icon: BabyChangingStation, color: '#F59E0B', img: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=160&h=160&fit=crop' },
  { name: 'Electronique', slug: 'electronique', Icon: PhoneAndroid, color: '#6366F1', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&h=160&fit=crop' },
  { name: 'Maison', slug: 'maison', Icon: HomeIcon, color: '#10B981', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=160&h=160&fit=crop' },
  { name: 'Beaute', slug: 'beaute', Icon: LocalFlorist, color: '#F43F5E', img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=160&h=160&fit=crop' },
  { name: 'Bijoux', slug: 'bijoux', Icon: Diamond, color: '#8B5CF6', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=160&h=160&fit=crop' },
  { name: 'Sport', slug: 'sport', Icon: FitnessCenter, color: '#EF4444', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=160&h=160&fit=crop' },
  { name: 'Chaussures', slug: 'chaussures', Icon: DirectionsRun, color: '#14B8A6', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=160&h=160&fit=crop' },
  { name: 'Sacs', slug: 'sacs', Icon: WorkOutline, color: '#F97316', img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=160&h=160&fit=crop' },
  { name: 'Mode', slug: 'mode', Icon: Checkroom, color: '#A855F7', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=160&h=160&fit=crop' },
  { name: 'Jeux', slug: 'jeux', Icon: SportsEsports, color: '#06B6D4', img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=160&h=160&fit=crop' },
];

// ─── LEFT BANNERS ─────────────────────────────────────────────────────────────

const LEFT_BANNERS = [
  { label: 'Meilleures Ventes', link: '/products?sort=popular', img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=360&fit=crop&q=80' },
  { label: 'Nouvelles Arrivées', link: '/products?sort=latest', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=360&fit=crop&q=80' },
  { label: 'Plage & Été', link: '/products?category=mode', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=360&fit=crop&q=80' },
];

// ─── RIGHT BANNERS (brands/stores) ────────────────────────────────────────────

const RIGHT_BANNERS = [
  { label: 'Mode Femme', link: '/products?category=femmes', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=360&fit=crop&q=80' },
  { label: 'Tendances', link: '/products?featured=true', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=360&fit=crop&q=80' },
  { label: 'Premium', link: '/products?sort=popular', img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=360&fit=crop&q=80' },
];

// ─── FALLBACK PROMO PRODUCTS (shown when backend offline) ─────────────────────

const FALLBACK_PROMO = [
  { id: 'f1', slug: 'robe-ete', name: 'Robe Été Fleurie', price: '1500', salePrice: '950', images: [{ urlMedium: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=500&fit=crop' }] },
  { id: 'f2', slug: 'sneakers', name: 'Sneakers Sport', price: '4200', salePrice: '2800', images: [{ urlMedium: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop' }] },
  { id: 'f3', slug: 'sac-main', name: 'Sac à Main Tendance', price: '3500', salePrice: '2100', images: [{ urlMedium: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=500&fit=crop' }] },
  { id: 'f4', slug: 'montre', name: 'Montre Classique', price: '8500', salePrice: '5200', images: [{ urlMedium: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=500&fit=crop' }] },
  { id: 'f5', slug: 'parfum', name: 'Parfum Luxe', price: '2800', salePrice: '1900', images: [{ urlMedium: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=500&fit=crop' }] },
  { id: 'f6', slug: 'lunettes', name: 'Lunettes Soleil', price: '1200', salePrice: '750', images: [{ urlMedium: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&h=500&fit=crop' }] },
  { id: 'f7', slug: 'chemise', name: 'Chemise Homme Premium', price: '2200', salePrice: '1400', images: [{ urlMedium: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop' }] },
  { id: 'f8', slug: 'bijoux', name: 'Collier Or', price: '5500', salePrice: '3800', images: [{ urlMedium: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=500&fit=crop' }] },
  { id: 'f9', slug: 'jean', name: 'Jean Slim Fit', price: '3200', salePrice: '1950', images: [{ urlMedium: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop' }] },
  { id: 'f10', slug: 'robe-soiree', name: 'Robe Soirée', price: '6800', salePrice: '4200', images: [{ urlMedium: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&h=500&fit=crop' }] },
  { id: 'f11', slug: 'casquette', name: 'Casquette Tendance', price: '900', salePrice: '550', images: [{ urlMedium: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=500&fit=crop' }] },
  { id: 'f12', slug: 'veste', name: 'Veste Légère', price: '5200', salePrice: '3100', images: [{ urlMedium: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=500&fit=crop' }] },
];

// ─── HERO FALLBACK SLIDES ─────────────────────────────────────────────────────

const FALLBACK_SLIDES = [
  {
    tag: 'Marques Tendances',
    title: "JUSQU'A 60% DE REDUCTION",
    sub: 'Semaine de lancement ete',
    link: '/products',
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&h=420&fit=crop',
    cta: 'VOIR LES OFFRES',
    accent: '#FF9900',
  },
  {
    tag: 'Nouveautes 2025',
    title: 'STYLE & QUALITE',
    sub: 'Livraison partout en Haiti',
    link: '/products?sort=latest',
    img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&h=420&fit=crop',
    cta: 'DECOUVRIR',
    accent: '#EC4899',
  },
  {
    tag: 'Electronique',
    title: 'TECH AU MEILLEUR PRIX',
    sub: 'Smartphones, Accessoires, Audio',
    link: '/products?category=electronique',
    img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&h=420&fit=crop',
    cta: 'VOIR TOUT',
    accent: '#6366F1',
  },
];

// ─── COUNTDOWN ────────────────────────────────────────────────────────────────

function useCountdown(h = 4) {
  const end = useRef(Date.now() + h * 3600000);
  const [t, setT] = useState({ h, m: 59, s: 59 });
  useEffect(() => {
    const id = setInterval(() => {
      const d = Math.max(0, end.current - Date.now());
      setT({ h: Math.floor(d / 3600000), m: Math.floor((d % 3600000) / 60000), s: Math.floor((d % 60000) / 1000) });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────

function ProductCard({ p, compact }: { p: any; compact?: boolean }) {
  const [liked, setLiked] = useState(false);
  const img = p.images?.[0]?.urlMedium || p.images?.[0]?.urlFull || p.images?.[0]?.url;
  const isOnSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const discount = isOnSale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  const price = Number(p.salePrice || p.price);

  return (
    <Card sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      border: '1px solid #DDD', borderRadius: 1.5, boxShadow: 'none', bgcolor: 'white',
      transition: 'box-shadow 0.2s, transform 0.2s',
      '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.12)', transform: 'translateY(-2px)', borderColor: ORANGE },
      '&:hover .pimg': { transform: 'scale(1.04)' },
      position: 'relative',
    }}>
      {isOnSale && (
        <Box sx={{ position: 'absolute', top: 6, left: 6, zIndex: 2, bgcolor: '#CC0C39', color: 'white',
          fontWeight: 900, fontSize: 10, px: 0.7, py: 0.2, borderRadius: 0.5 }}>
          -{discount}%
        </Box>
      )}
      <IconButton size="small" onClick={() => setLiked(l => !l)}
        sx={{ position: 'absolute', top: 4, right: 4, zIndex: 3, bgcolor: 'rgba(255,255,255,0.85)', width: 26, height: 26 }}>
        {liked ? <Favorite sx={{ fontSize: 13, color: '#CC0C39' }} /> : <FavoriteBorder sx={{ fontSize: 13, color: '#888' }} />}
      </IconButton>
      <CardActionArea component={Link} to={`/products/${p.slug}`}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Box sx={{ overflow: 'hidden', height: compact ? { xs: 150, md: 180 } : { xs: 170, md: 220 }, bgcolor: '#F7F7F7' }}>
          <CardMedia className="pimg" component="img"
            image={img || 'https://placehold.co/400x300/F7F7F7/AAAAAA?text=Photo'}
            alt={p.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s' }} />
        </Box>
        <CardContent sx={{ p: { xs: 1, sm: 1.3 }, flex: 1 }}>
          <Typography sx={{ fontSize: { xs: 11.5, sm: 13 }, lineHeight: 1.4, mb: 0.6, color: '#0F1111',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {p.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6, flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 15.5 }, color: '#CC0C39' }}>
              {price.toLocaleString()} HTG
            </Typography>
            {isOnSale && (
              <Typography fontSize={11} color="#888" sx={{ textDecoration: 'line-through' }}>
                {Number(p.price).toLocaleString()}
              </Typography>
            )}
          </Box>
          {p.avgRating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, mt: 0.3 }}>
              {[1,2,3,4,5].map(s => <Star key={s} sx={{ fontSize: 10.5, color: s <= Math.round(p.avgRating) ? ORANGE : '#DDD' }} />)}
              <Typography fontSize={10.5} color="#007185" ml={0.3}>({p.totalReviews || 0})</Typography>
            </Box>
          )}
          {p.store?.name && (
            <Typography fontSize={10.5} color="#007185" mt={0.2} noWrap>par {p.store.name}</Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function CardSkeleton({ h = 240 }: { h?: number }) {
  return <Box><Skeleton variant="rectangular" height={h} sx={{ borderRadius: 1.5, mb: 0.8 }} /><Skeleton width="75%" height={14} sx={{ mb: 0.4 }} /><Skeleton width="45%" height={14} /></Box>;
}

// ─── MINI PRODUCT CARD (inside slider) ───────────────────────────────────────

function MiniPromoCard({ p, showSponsor = false }: { p: any; showSponsor?: boolean }) {
  const img = p?.images?.[0]?.urlMedium || p?.images?.[0]?.urlFull;
  const price = p ? Number(p.salePrice || p.price) : 0;
  const origPrice = p ? Number(p.price) : 0;
  const isOnSale = p && p.salePrice && Number(p.salePrice) < Number(p.price);
  const disc = isOnSale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  return (
    <Box component={Link} to={`/products/${p.slug}`}
      sx={{ width: 130, flexShrink: 0, textDecoration: 'none', display: 'flex', flexDirection: 'column',
        bgcolor: 'white', border: '1px solid #E8E8E8', borderRadius: 1, overflow: 'hidden',
        transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 18px rgba(0,0,0,0.13)' },
        '&:hover .mpc-img': { transform: 'scale(1.05)' } }}>
      <Box sx={{ position: 'relative', overflow: 'hidden', height: 150 }}>
        <Box className="mpc-img" component="img"
          src={img || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop'}
          alt={p.name}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }} />
        {isOnSale && (
          <Box sx={{ position: 'absolute', top: 6, left: 6,
            bgcolor: '#FF3333', color: 'white', borderRadius: '3px', px: 0.6, py: 0.2 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 800, lineHeight: 1 }}>-{disc}%</Typography>
          </Box>
        )}
        {(showSponsor || p._isSponsored) && (
          <Box sx={{ position: 'absolute', bottom: 6, right: 6,
            bgcolor: 'rgba(0,0,0,0.55)', color: 'white', borderRadius: '3px', px: 0.6, py: 0.2 }}>
            <Typography sx={{ fontSize: 8.5, fontWeight: 600, lineHeight: 1 }}>Sponsorisé</Typography>
          </Box>
        )}
      </Box>
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
          <Typography sx={{ color: '#E53935', fontWeight: 900, fontSize: 15, lineHeight: 1 }}>
            {price.toLocaleString()}
          </Typography>
          <Typography sx={{ color: '#E53935', fontWeight: 700, fontSize: 9 }}>HTG</Typography>
        </Box>
        {isOnSale && (
          <Typography sx={{ color: '#999', fontSize: 10, textDecoration: 'line-through', lineHeight: 1.2 }}>
            {origPrice.toLocaleString()}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── SIDE BANNER STACK ────────────────────────────────────────────────────────

function SidePromoColumn({ products }: { products: any[] }) {
  const items = products.slice(0, 3);
  return (
    <Box sx={{ width: 148, flexShrink: 0, display: { xs: 'none', lg: 'flex' },
      flexDirection: 'column', gap: '2px', bgcolor: '#F0F0F0', height: '100%' }}>
      {items.map((p: any, i: number) => {
        const img = p?.images?.[0]?.urlMedium || p?.images?.[0]?.urlFull;
        const price = Number(p.salePrice || p.price);
        const isOnSale = p.salePrice && Number(p.salePrice) < Number(p.price);
        const disc = isOnSale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
        return (
          <Box key={p.id || i} component={Link} to={`/products/${p.slug}`}
            sx={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'block',
              textDecoration: 'none', bgcolor: 'white',
              '&:hover .sp-img': { transform: 'scale(1.06)' } }}>
            <Box className="sp-img" component="img"
              src={img || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop'}
              alt={p.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s', display: 'block' }} />
            {/* dark bottom overlay */}
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)' }} />
            {/* discount badge */}
            {isOnSale && (
              <Box sx={{ position: 'absolute', top: 6, left: 6,
                bgcolor: '#FF3333', color: 'white', borderRadius: '3px', px: 0.6, py: 0.2 }}>
                <Typography sx={{ fontSize: 9.5, fontWeight: 900, lineHeight: 1 }}>-{disc}%</Typography>
              </Box>
            )}
            {/* price */}
            <Box sx={{ position: 'absolute', bottom: 6, left: 8, right: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
                <Typography sx={{ color: '#FF9900', fontWeight: 900, fontSize: 14, lineHeight: 1 }}>
                  {price.toLocaleString()}
                </Typography>
                <Typography sx={{ color: '#FF9900', fontSize: 9, fontWeight: 700 }}>HTG</Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ─── HERO SLIDER ──────────────────────────────────────────────────────────────

function HeroSlider({ slides, promoProducts, leftProds, rightProds }: { slides: typeof FALLBACK_SLIDES; promoProducts: any[]; leftProds: any[]; rightProds: any[] }) {
  const [idx, setIdx] = useState(0);
  const [vis, setVis] = useState(true);
  const timer = useRef<any>(null);

  const go = useCallback((n: number) => {
    setVis(false);
    setTimeout(() => { setIdx(n); setVis(true); }, 150);
  }, []);

  useEffect(() => {
    timer.current = setInterval(() => go((idx + 1) % slides.length), 5000);
    return () => clearInterval(timer.current);
  }, [idx, go, slides.length]);

  const s = slides[Math.min(idx, slides.length - 1)];
  // 2 product cards shown per slide inside the banner
  const len = promoProducts.length;
  const pA = len > 0 ? promoProducts[idx * 2 % len] : null;
  const pB = len > 1 ? promoProducts[(idx * 2 + 1) % len] : (len === 1 ? promoProducts[0] : null);

  return (
    <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #E8E8E8' }}>
      <Box sx={{ display: 'flex', height: { xs: 240, md: 360 } }}>

        {/* Left promo products */}
        <SidePromoColumn products={leftProds} />

        {/* Center: promo slide */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
          {/* bg image */}
          <Box component="img" src={s.img} alt={s.title}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              opacity: vis ? 1 : 0, transition: 'opacity 0.4s' }} />
          <Box sx={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)' }} />

          {/* text content — top left */}
          <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, display: 'flex', flexDirection: 'column',
            justifyContent: 'center', pl: { xs: 2, md: 4 }, pr: 1, py: 2, maxWidth: '55%',
            opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(8px)', transition: 'all 0.4s' }}>
            {s.tag && (
              <Typography sx={{ color: s.accent || ORANGE, fontWeight: 800, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: 2, mb: 0.8, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Verified sx={{ fontSize: 13 }} /> {s.tag}
              </Typography>
            )}
            <Typography fontWeight={900} color="white"
              sx={{ fontSize: { xs: '1.1rem', md: '2rem' }, lineHeight: 1.05,
                mb: 0.8, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              {s.title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: { xs: 11, md: 13 }, mb: 2 }}>
              {s.sub}
            </Typography>
            <Button component={Link} to={s.link}
              sx={{ alignSelf: 'flex-start', bgcolor: 'white', color: '#111', fontWeight: 800,
                px: 2.5, py: 0.7, fontSize: 12, borderRadius: '2px', letterSpacing: 0.5,
                border: '2px solid white', minWidth: 0,
                '&:hover': { bgcolor: 'transparent', color: 'white' }, transition: 'all 0.2s' }}>
              {s.cta || 'VOIR LES OFFRES'}
            </Button>
          </Box>

          {/* product cards — right side inside banner */}
          <Box sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            display: { xs: 'none', md: 'flex' }, gap: 1.5,
            opacity: vis ? 1 : 0, transition: 'opacity 0.4s' }}>
            {pA && <MiniPromoCard p={pA} />}
            {pB && <MiniPromoCard p={pB} />}
          </Box>

          {/* Dots */}
          <Box sx={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 0.6 }}>
            {slides.map((_, i) => (
              <Box key={i} onClick={() => go(i)} sx={{
                width: i === idx ? 20 : 6, height: 6, borderRadius: 3, cursor: 'pointer',
                bgcolor: i === idx ? 'white' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s',
              }} />
            ))}
          </Box>
        </Box>

        {/* Right promo products */}
        <SidePromoColumn products={rightProds} />
      </Box>
    </Box>
  );
}

// ─── SECTION BOX ─────────────────────────────────────────────────────────────

function SectionBox({ title, sub, linkTo, linkLabel = 'Voir tout', children }: any) {
  return (
    <Box sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid #DDD', p: { xs: 1.5, md: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography fontWeight={800} fontSize={{ xs: 16, md: 18 }} color="#0F1111">{title}</Typography>
          {sub && <Typography fontSize={12} color="#565959">{sub}</Typography>}
        </Box>
        {linkTo && (
          <Button component={Link} to={linkTo} size="small"
            sx={{ color: '#007185', fontWeight: 600, fontSize: 12.5, '&:hover': { color: '#C7511F', bgcolor: 'transparent' } }}>
            {linkLabel} &rsaquo;
          </Button>
        )}
      </Box>
      {children}
    </Box>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function HomePage() {
  // Geo-location: city chosen by user (empty = no filter, show all)
  const city = localStorage.getItem('dealpam_city') || '';
  const geoParam = city ? `&department=${encodeURIComponent(city)}` : '';

  const { data: featured, isLoading: featLoading } = useQuery({
    queryKey: ['featured', city],
    queryFn: () => api.get(`/products/featured${city ? `?department=${encodeURIComponent(city)}` : ''}`).then(r => r.data).catch(() => []),
  });
  const { data: latest, isLoading: latLoading } = useQuery({
    queryKey: ['latest', city],
    queryFn: () => api.get(`/products?sort=latest&limit=20${geoParam}`).then(r => r.data).catch(() => ({ data: [] })),
  });
  const { data: trending } = useQuery({
    queryKey: ['trending', city],
    queryFn: () => api.get(`/products?sort=popular&limit=10${geoParam}`).then(r => r.data?.data || []).catch(() => []),
  });
  const { data: heroProducts } = useQuery({
    queryKey: ['hero-products', city],
    queryFn: () => api.get(`/products?featured=true&limit=6${geoParam}`).then(r => r.data?.data || []).catch(() => []),
  });
  const { data: sponsored } = useQuery({
    queryKey: ['sponsored', city],
    // Use ads/serve algorithm for smart targeting, fallback to sponsored products
    queryFn: () => api.get(`/ads/serve?limit=12${city ? `&department=${encodeURIComponent(city)}` : ''}`)
      .then(r => Array.isArray(r.data) ? r.data : [])
      .catch(() => api.get(`/products?sponsored=true&limit=12${geoParam}`).then(r => r.data?.data || []).catch(() => [])),
  });

  const featList: any[] = Array.isArray(featured) ? featured : featured?.data || [];
  const latestList: any[] = latest?.data || [];
  const trendList: any[] = Array.isArray(trending) ? trending : [];
  const sponsoredList: any[] = Array.isArray(sponsored) ? sponsored : [];
  const flashList = trendList.length ? trendList : featList.length ? featList.slice(0, 8) : FALLBACK_PROMO;
  const promoList = sponsoredList.length ? sponsoredList : featList.length ? featList.slice(0, 8) : FALLBACK_PROMO;

  // Products shown in hero slider cards (left/right side, Shein style)
  const heroProds: any[] = (Array.isArray(heroProducts) && heroProducts.length > 0)
    ? heroProducts
    : sponsoredList.length > 0 ? sponsoredList : FALLBACK_PROMO;

  // Build hero slides from real products or fallback
  const heroSlides = FALLBACK_SLIDES;

  const { h, m, s } = useCountdown(4);
  const [catScroll, setCatScroll] = useState(0);
  const catRef = useRef<HTMLDivElement>(null);
  const scrollCats = (dir: number) => {
    if (catRef.current) {
      catRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
      setCatScroll(catRef.current.scrollLeft + dir * 200);
    }
  };

  return (
    <Box sx={{ bgcolor: '#F5F5F5', minHeight: '100vh' }}>

      {/* ══ HERO SLIDER ══════════════════════════════════════════════════ */}
      <HeroSlider
        slides={heroSlides}
        promoProducts={heroProds}
        leftProds={heroProds.slice(0, 3).length ? heroProds.slice(0, 3) : FALLBACK_PROMO.slice(0, 3)}
        rightProds={heroProds.slice(3, 6).length ? heroProds.slice(3, 6) : FALLBACK_PROMO.slice(3, 6)}
      />


      {/* ══ TRUST STRIP ══════════════════════════════════════════════════ */}
      <Box sx={{ bgcolor: 'white', borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #EBEBEB' }}>
        <Box sx={{ maxWidth: 1400, mx: 'auto', display: 'flex', overflowX: 'auto',
          scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          {([
            { label: 'Livraison gratuite', sub: 'Commandes > 2 500 HTG', Icon: LocalShipping, color: '#FF9900', bg: '#FFF8EC' },
            { label: 'Paiement sécurisé', sub: 'MonCash · NatCash · Visa', Icon: Security, color: '#059669', bg: '#ECFDF5' },
            { label: 'Retour facile', sub: '30 jours sans questions', Icon: Replay, color: '#6366F1', bg: '#EEF2FF' },
            { label: 'Support 24/7', sub: 'Chat & WhatsApp', Icon: Headset, color: '#D97706', bg: '#FFFBEB' },
            { label: 'Vendeurs vérifiés', sub: '5 000+ boutiques certifiées', Icon: Verified, color: '#DB2777', bg: '#FDF2F8' },
          ] as const).map(({ label, sub, Icon, color, bg }, i, arr) => (
            <Box key={label} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: { xs: 2.5, md: 3.5 }, py: 1.6, flexShrink: 0, flex: 1, minWidth: 190,
              borderRight: i < arr.length - 1 ? '1px solid #F0F0F0' : 'none',
              transition: 'background 0.18s',
              '&:hover': { bgcolor: bg },
            }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: 2.5, bgcolor: bg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${color}28`,
                boxShadow: `0 2px 8px ${color}18`,
              }}>
                <Icon sx={{ fontSize: 22, color }} />
              </Box>
              <Box>
                <Typography fontSize={13} fontWeight={700} color="#1a1a1a" lineHeight={1.3}>{label}</Typography>
                <Typography fontSize={11.5} color="#999" lineHeight={1.4} mt={0.2}>{sub}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ══ CATEGORIES ROW ════════════════════════════════════════════════ */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #E8E8E8', mt: 0, position: 'relative',
        /* overflow must stay visible so hover scale isn't clipped */
        overflowX: 'hidden', overflowY: 'visible' }}>
        <Container maxWidth="xl" sx={{ position: 'relative' }}>
          <IconButton onClick={() => scrollCats(-1)}
            sx={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
              bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: 32, height: 32,
              '&:hover': { bgcolor: '#F5F5F5' } }}>
            <ChevronLeft fontSize="small" />
          </IconButton>

          {/* Scroll wrapper: overflowX auto but overflowY visible so hover isn't clipped */}
          <Box ref={catRef}
            sx={{ display: 'flex', gap: { xs: 1.5, md: 2.5 },
              overflowX: 'auto', overflowY: 'visible',
              scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
              /* top/bottom padding so scale(1.08) shadow isn't clipped */
              pt: { xs: 2, md: 2.5 }, pb: { xs: 2, md: 2.5 }, px: 2 }}>
            {CATS.map(({ name, slug, img, color }) => (
              <Box key={slug} component={Link} to={`/products?category=${slug}`}
                sx={{ textDecoration: 'none', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', flexShrink: 0, gap: 0.8,
                  '&:hover .cat-img': {
                    transform: 'translateY(-4px) scale(1.08)',
                    borderColor: color,
                    boxShadow: `0 8px 24px ${color}44`,
                  },
                  '&:hover .cat-label': { color, fontWeight: 700 },
                }}>
                <Box className="cat-img" sx={{
                  width: { xs: 64, md: 80 }, height: { xs: 64, md: 80 }, borderRadius: '50%',
                  overflow: 'hidden', border: `2.5px solid #E8E8E8`,
                  transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                  bgcolor: '#F5F5F5', flexShrink: 0,
                }}>
                  <Box component="img" src={img} alt={name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                <Typography className="cat-label" fontSize={{ xs: 11, md: 12 }} fontWeight={500} color="#444"
                  textAlign="center" sx={{ transition: 'all 0.2s', maxWidth: 80, lineHeight: 1.2 }}>
                  {name}
                </Typography>
              </Box>
            ))}
          </Box>

          <IconButton onClick={() => scrollCats(1)}
            sx={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
              bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: 32, height: 32,
              '&:hover': { bgcolor: '#F5F5F5' } }}>
            <ChevronRight fontSize="small" />
          </IconButton>
        </Container>
      </Box>


      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════ */}
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Grid container spacing={2}>

          {/* ── CATEGORY BANNER CARDS ── */}
          {[
            { title: 'Mode & Vetements', sub: 'Nouvelles collections', badge: 'NOUVEAUTE', link: '/products?category=mode',
              bg: 'linear-gradient(135deg, #BE185D 0%, #EC4899 100%)',
              img: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=520&h=320&fit=crop' },
            { title: 'Electronique', sub: "Jusqu'a -50%", badge: 'PROMO', link: '/products?category=electronique',
              bg: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=520&h=320&fit=crop' },
            { title: 'Maison & Deco', sub: 'Collection 2025', badge: 'TOP', link: '/products?category=maison',
              bg: 'linear-gradient(135deg, #065F46 0%, #10B981 100%)',
              img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=520&h=320&fit=crop' },
            { title: 'Beaute & Soin', sub: 'Livraison offerte', badge: 'GRATUIT', link: '/products?category=beaute',
              bg: 'linear-gradient(135deg, #92400E 0%, #F59E0B 100%)',
              img: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=520&h=320&fit=crop' },
          ].map(({ title, sub, badge, link, bg, img }) => (
            <Grid item xs={6} md={3} key={title}>
              <Box component={Link} to={link} sx={{
                textDecoration: 'none', display: 'block', position: 'relative',
                borderRadius: 1.5, overflow: 'hidden', height: { xs: 130, md: 165 }, background: bg,
                transition: 'transform 0.22s, box-shadow 0.22s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 32px rgba(0,0,0,0.22)' },
                '&:hover .cover': { opacity: 0.55, transform: 'scale(1.05)' },
              }}>
                <Box className="cover" component="img" src={img} alt={title} sx={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'cover', opacity: 0.4, transition: 'opacity 0.35s, transform 0.35s' }} />
                <Box sx={{ position: 'absolute', inset: 0, p: { xs: 1.5, md: 2 }, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'inline-flex' }}>
                    <Box sx={{ bgcolor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', color: 'white',
                      fontSize: 9.5, fontWeight: 900, letterSpacing: 1, px: 0.9, py: 0.3, borderRadius: 0.5 }}>
                      {badge}
                    </Box>
                  </Box>
                  <Box>
                    <Typography fontWeight={900} color="white" sx={{ fontSize: { xs: 14.5, md: 16 }, lineHeight: 1.2, mb: 0.3, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                      {title}
                    </Typography>
                    <Typography sx={{ fontSize: { xs: 11, md: 12.5 }, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      {sub} <ArrowForward sx={{ fontSize: 12, verticalAlign: 'middle' }} />
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          ))}

          {/* ── PROMOTIONS DU MOMENT ── */}
          {promoList.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #E8E8E8' }}>
                {/* Header gradient */}
                <Box sx={{ background: 'linear-gradient(135deg, #CC0C39 0%, #FF4757 100%)', px: 3, py: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FlashOn sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography fontWeight={900} fontSize={18} color="white" lineHeight={1.1}>
                        Promotions du Moment
                      </Typography>
                      <Typography fontSize={12} color="rgba(255,255,255,0.7)">
                        Produits sponsorisés · Offres exclusives
                      </Typography>
                    </Box>
                  </Box>
                  <Button component={Link} to="/products?sponsored=true"
                    sx={{ color: 'white', fontWeight: 700, fontSize: 12.5, border: '1.5px solid rgba(255,255,255,0.5)',
                      borderRadius: 5, px: 2, py: 0.6,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.15)', borderColor: 'white' } }}>
                    Voir tout &rsaquo;
                  </Button>
                </Box>
                {/* Products */}
                <Box sx={{ bgcolor: '#FAFAFA', p: { xs: 1.5, md: 2.5 } }}>
                  <Grid container spacing={{ xs: 1.5, md: 2 }}>
                    {promoList.slice(0, 12).map((p: any) => (
                      <Grid item xs={6} sm={4} md={3} lg={2} key={p.id}>
                        <ProductCard p={p} compact />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Box>
            </Grid>
          )}

          {/* ── FLASH SALE ── */}
          <Grid item xs={12}>
            <Box sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid #DDD', p: { xs: 1.5, md: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <FlashOn sx={{ color: '#CC0C39', fontSize: 24 }} />
                  <Typography fontWeight={900} fontSize={20} color="#CC0C39">Ventes Flash</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography fontSize={13} color="#565959" fontWeight={500}>Fin dans</Typography>
                  {[h, m, s].map((v, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ bgcolor: DARK, color: 'white', px: 0.9, py: 0.3, borderRadius: 0.5,
                        fontWeight: 900, fontSize: 17, lineHeight: 1.3, minWidth: 30, textAlign: 'center' }}>
                        {String(v).padStart(2, '0')}
                      </Box>
                      {i < 2 && <Typography fontWeight={900} fontSize={16} color={DARK} mx={0.3}>:</Typography>}
                    </Box>
                  ))}
                </Box>
                <Button component={Link} to="/products?sale=true" size="small"
                  sx={{ ml: 'auto', color: '#007185', fontWeight: 700, '&:hover': { color: '#C7511F', bgcolor: 'transparent' } }}>
                  Voir toutes les offres &rsaquo;
                </Button>
              </Box>
              <Grid container spacing={{ xs: 1, md: 1.5 }}>
                {flashList.length === 0
                  ? Array(6).fill(0).map((_, i) => (
                      <Grid item xs={6} sm={4} md={2} key={i}><CardSkeleton h={200} /></Grid>
                    ))
                  : flashList.slice(0, 6).map((p: any, i) => (
                      <Grid item xs={6} sm={4} md={2} key={p.id}>
                        <Box>
                          <ProductCard p={p} compact />
                          <Box sx={{ mt: 0.6, px: 0.3 }}>
                            <Box sx={{ height: 3, bgcolor: '#FECACA', borderRadius: 1 }}>
                              <Box sx={{ height: '100%', width: `${40 + i * 9}%`, bgcolor: '#CC0C39', borderRadius: 1 }} />
                            </Box>
                            <Typography fontSize={10.5} color="#CC0C39" fontWeight={600} mt={0.3}>
                              {40 + i * 9}% vendus
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
              </Grid>
            </Box>
          </Grid>

          {/* ── FEATURED PRODUCTS ── */}
          <Grid item xs={12}>
            <SectionBox title="Produits vedettes" sub="Selectionnes pour vous" linkTo="/products?featured=true">
              <Grid container spacing={{ xs: 1, md: 1.5 }}>
                {featLoading
                  ? Array(8).fill(0).map((_, i) => <Grid item xs={6} sm={4} md={2} key={i}><CardSkeleton h={200} /></Grid>)
                  : featList.slice(0, 8).map((p: any) => (
                      <Grid item xs={6} sm={4} md={2} key={p.id}><ProductCard p={p} compact /></Grid>
                    ))}
              </Grid>
            </SectionBox>
          </Grid>

          {/* ── SELL BANNER ── */}
          <Grid item xs={12}>
            <Box sx={{ bgcolor: DARK, borderRadius: 1, p: { xs: 3, md: 4 },
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography fontWeight={900} fontSize={{ xs: 18, md: 24 }} color="white" mb={0.5}>
                  Vendez sur Deal<span style={{ color: ORANGE }}>Pam</span>
                </Typography>
                <Typography fontSize={14} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  Des 500 HTG/mois · Zero commission · 100 000+ clients potentiels
                </Typography>
              </Box>
              <Button component={Link} to="/register?role=SELLER"
                sx={{ bgcolor: ORANGE, color: '#111', fontWeight: 800, px: 3.5, py: 1.3,
                  borderRadius: 0.5, fontSize: 14.5, '&:hover': { bgcolor: '#FFB703' } }}>
                Creer ma boutique
              </Button>
            </Box>
          </Grid>

          {/* ── LATEST PRODUCTS ── */}
          <Grid item xs={12}>
            <SectionBox title="Nouveaux produits" sub="Ajoutes recemment" linkTo="/products">
              <Grid container spacing={{ xs: 1, md: 1.5 }}>
                {latLoading
                  ? Array(10).fill(0).map((_, i) => <Grid item xs={6} sm={4} md={2} key={i}><CardSkeleton /></Grid>)
                  : latestList.slice(0, 12).map((p: any) => (
                      <Grid item xs={6} sm={4} md={2} key={p.id}><ProductCard p={p} /></Grid>
                    ))}
              </Grid>
            </SectionBox>
          </Grid>

          {/* ── TRUST BAR ── */}
          <Grid item xs={12}>
            <Box sx={{ bgcolor: 'white', borderRadius: 1, border: '1px solid #DDD' }}>
              <Grid container>
                {[
                  { Icon: LocalShipping, title: 'Livraison Haiti', desc: 'Tous departements · 48h', color: '#007185' },
                  { Icon: Verified, title: 'Vendeurs certifies', desc: '5 000+ boutiques verifiees', color: '#007600' },
                  { Icon: Security, title: 'Paiement securise', desc: 'MonCash · NatCash · Visa', color: '#C7511F' },
                  { Icon: Headset, title: 'Support 7j/7', desc: 'Toujours disponible', color: '#565959' },
                ].map(({ Icon, title, desc, color }, i) => (
                  <Grid item xs={6} md={3} key={title}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: { xs: 1.5, md: 2.5 },
                      borderRight: { md: i < 3 ? '1px solid #DDD' : 'none' },
                      borderBottom: { xs: i < 2 ? '1px solid #DDD' : 'none', md: 'none' } }}>
                      <Icon sx={{ color, fontSize: 28, flexShrink: 0 }} />
                      <Box>
                        <Typography fontWeight={700} fontSize={13} color="#0F1111">{title}</Typography>
                        <Typography fontSize={11.5} color="#565959">{desc}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
}
