import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams, useLocation as useRLocation } from 'react-router-dom';
import {
  Typography, IconButton, Box, Button,
  InputBase, Avatar, Drawer,
  useMediaQuery, useTheme, Divider, Paper, alpha, Chip, Badge,
  Fade, Grow, Tooltip,
} from '@mui/material';
import {
  Search, ShoppingCart, Menu as MenuIcon,
  Person, Logout, Close, KeyboardArrowDown, KeyboardArrowRight,
  Checkroom, PhoneAndroid, Home as HomeIcon,
  SportsEsports, FitnessCenter, LocalFlorist, Diamond,
  DirectionsCar, RestaurantMenu, WorkOutline, MiscellaneousServices,
  DirectionsRun, FlashOn, MyLocation, Dashboard,
  TrendingUp, FavoriteBorder, GridView, CheckCircle,
  ShoppingBag, Inventory, BarChart as BarChartIcon,
  GpsFixed, StorefrontOutlined, ArrowForward, ReceiptLongOutlined,
  ChatBubbleOutline,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { useGeolocation } from '../../hooks/useGeolocation';
import api from '../../api/axios';
import { useLocationState } from '../../hooks/useLocationState';
import LocationModal from '../location/LocationModal';

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const ORANGE   = '#FF6B00';
const ORANGE_D = '#E05A00';
const ORANGE_L = '#FFF4ED';
const BG       = '#0F172A';
const NAV_BG   = '#0F172A';
const BORDER   = 'rgba(255,255,255,0.07)';

// ─── Global keyframes (injected once) ─────────────────────────────────────────
const GLOBAL_CSS = `
@keyframes dp-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.25);opacity:0.7} }
@keyframes dp-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes dp-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
@keyframes dp-slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
@keyframes dp-fadeIn { from{opacity:0} to{opacity:1} }
@keyframes dp-scaleIn { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
@media (prefers-reduced-motion: reduce) {
  *,.dp-no-motion { animation-duration:0ms!important; transition-duration:0ms!important; }
}
/* iOS global fixes */
* { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
html { overflow-x: hidden; }
body { background-color: #0F172A; overscroll-behavior-y: none; -webkit-text-size-adjust: 100%; }
button, a, [role=button] { touch-action: manipulation; }
img { -webkit-user-drag: none; user-select: none; }
`;

const CATS = [
  { label: 'Vêtements',    sub: 'Mode, Robes',       icon: Checkroom,            color: '#EC4899', bg: '#2D1B2E', path: '/products?category=vetements' },
  { label: 'Électronique', sub: 'PC, TV, Audio',     icon: PhoneAndroid,          color: '#60A5FA', bg: '#1B2440', path: '/products?category=electronique' },
  { label: 'Maison',       sub: 'Déco, Mobilier',    icon: HomeIcon,              color: '#34D399', bg: '#1B2E2A', path: '/products?category=maison' },
  { label: 'Beauté',       sub: 'Soin, Maquillage',  icon: LocalFlorist,          color: '#FBBF24', bg: '#2D2510', path: '/products?category=beaute' },
  { label: 'Bijoux',       sub: 'Bagues, Colliers',  icon: Diamond,               color: '#A78BFA', bg: '#231B3A', path: '/products?category=bijoux' },
  { label: 'Sport',        sub: 'Fitness, Outdoor',  icon: FitnessCenter,         color: '#F87171', bg: '#2D1B1B', path: '/products?category=sport' },
  { label: 'Véhicules',    sub: 'Autos, Motos',      icon: DirectionsCar,         color: '#22D3EE', bg: '#1B2A30', path: '/products?category=vehicules' },
  { label: 'Alimentation', sub: 'Épicerie, Boisson', icon: RestaurantMenu,        color: '#86EFAC', bg: '#1A2D20', path: '/products?category=alimentation' },
  { label: 'Sacs',         sub: 'Pochettes, Valises',icon: WorkOutline,            color: '#FB923C', bg: '#2D2010', path: '/products?category=sacs' },
  { label: 'Chaussures',   sub: 'Sneakers, Sandales',icon: DirectionsRun,         color: '#2DD4BF', bg: '#1B2D2C', path: '/products?category=chaussures' },
  { label: 'Jeux & Jouets',sub: 'Console, Jouets',   icon: SportsEsports,         color: '#C084FC', bg: '#241B38', path: '/products?category=jeux' },
  { label: 'Santé',        sub: 'Bien-être, Clinique',icon: LocalFlorist,        color: '#34D399', bg: '#1B2E2A', path: '/products?category=sante' },
  { label: 'Livres',       sub: 'Romans, Scolaire',  icon: MiscellaneousServices, color: '#818CF8', bg: '#1E1B38', path: '/products?category=livres' },
  { label: 'Restaurants',  sub: 'Plats, Livraison',  icon: RestaurantMenu,        color: '#FB923C', bg: '#2D2010', path: '/products?category=restaurants' },
  { label: 'Immobilier',   sub: 'Vente, Location',   icon: HomeIcon,              color: '#22D3EE', bg: '#1B2A30', path: '/products?category=immobilier' },
  { label: 'Services',     sub: 'Pro, Artisanat',    icon: MiscellaneousServices, color: '#818CF8', bg: '#1E1B38', path: '/products?category=services' },
  { label: 'Autres',       sub: 'Tout le reste',     icon: MiscellaneousServices, color: '#64748B', bg: '#1E293B', path: '/products?category=autres' },
];

const NAV = [
  { label: 'Nouveautés',   path: '/products?sort=latest' },
  { label: 'Vêtements',    path: '/products?category=vetements' },
  { label: 'Électronique', path: '/products?category=electronique' },
  { label: 'Maison',       path: '/products?category=maison' },
  { label: 'Beauté',       path: '/products?category=beaute' },
  { label: 'Chaussures',   path: '/products?category=chaussures' },
  { label: 'Bijoux',       path: '/products?category=bijoux' },
  { label: 'Sport',        path: '/products?category=sport' },
  { label: 'Alimentation', path: '/products?category=alimentation' },
  { label: 'Restaurants',  path: '/products?category=restaurants' },
  { label: 'Immobilier',   path: '/products?category=immobilier' },
  { label: 'Services',     path: '/products?productType=SERVICE' },
];

const DEPTS = ['Ouest','Nord','Nord-Est','Nord-Ouest','Artibonite','Centre','Sud','Sud-Est',"Grand'Anse",'Nippes'];

// ─── Zone Dropdown ─────────────────────────────────────────────────────────────
function ZoneDropdown({ city, geoLoading, detectGeo, setCity, onClose }: {
  city: string; geoLoading: boolean; detectGeo: () => void; setCity: (v: string) => void; onClose: () => void;
}) {
  return (
    <Box sx={{
      position: 'absolute', top: 'calc(100% + 8px)', left: 0,
      width: 340, bgcolor: 'white', borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden', zIndex: 9999,
      animation: 'dp-slideDown 150ms ease forwards',
      border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {/* Detect position button */}
      <Box onClick={() => { detectGeo(); onClose(); }} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.6, cursor: 'pointer',
        background: geoLoading
          ? 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)'
          : 'linear-gradient(135deg, #FFF4E6 0%, #FFE8CC 100%)',
        borderBottom: '1px solid rgba(255,107,0,0.12)',
        transition: 'filter 0.15s',
        '&:hover': { filter: 'brightness(0.97)' },
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%',
          bgcolor: alpha(ORANGE, 0.15),
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <GpsFixed sx={{
            fontSize: 18, color: ORANGE,
            animation: geoLoading ? 'dp-pulse 1s ease-in-out infinite' : 'none',
          }} />
        </Box>
        <Box>
          <Typography fontWeight={700} fontSize={13.5} color={ORANGE} lineHeight={1.3}>
            Detecter ma position
          </Typography>
          <Typography fontSize={11.5} color="#D97706" lineHeight={1.4}>
            {geoLoading ? 'Localisation en cours...' : 'Via GPS automatique'}
          </Typography>
        </Box>
      </Box>

      {/* Clear */}
      <Box onClick={() => { setCity(''); onClose(); }} sx={{
        px: 2, py: 1.2, cursor: 'pointer', borderBottom: '1px solid #F5F5F5',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        '&:hover': { bgcolor: '#FAFAFA' }, transition: 'background 0.12s',
      }}>
        <Typography fontSize={13.5} color={!city ? '#0F172A' : '#64748B'} fontWeight={!city ? 700 : 400}>
          Tout Haiti
        </Typography>
        {!city && <CheckCircle sx={{ fontSize: 18, color: ORANGE }} />}
      </Box>

      {/* Departments – 2 columns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', p: 1.2, gap: 0.5 }}>
        {DEPTS.map(d => (
          <Box key={d} onClick={() => { setCity(d); onClose(); }} sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 1.4, py: 1, borderRadius: '10px', cursor: 'pointer',
            bgcolor: d === city ? alpha(ORANGE, 0.08) : 'transparent',
            border: `1.5px solid ${d === city ? alpha(ORANGE, 0.4) : 'transparent'}`,
            transition: 'all 0.13s',
            '&:hover': { bgcolor: d === city ? alpha(ORANGE, 0.1) : '#F8FAFC', border: `1.5px solid ${d === city ? alpha(ORANGE, 0.5) : '#E2E8F0'}` },
          }}>
            <Typography fontSize={13} fontWeight={d === city ? 700 : 400} color={d === city ? ORANGE : '#374151'} noWrap>
              {d}
            </Typography>
            {d === city && <CheckCircle sx={{ fontSize: 14, color: ORANGE, flexShrink: 0 }} />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function CatDropdown({ activeCat, onPick, onClose }: {
  activeCat: string; onPick: (label: string, path: string) => void; onClose: () => void;
}) {
  const CARD    = '#FFFFFF';
  const BORDER_COL = 'rgba(15,23,42,0.08)';
  const TXT     = '#0F1B2E';
  const SUB     = '#6B7280';
  const ACCENT  = '#0F1B2E'; // navy — un seul accent, pas de rainbow d'icônes

  return (
    <>
    {/* Backdrop */}
    <Box onClick={onClose} sx={{
      position: 'fixed', inset: 0, zIndex: 9998,
      bgcolor: 'rgba(15,27,46,0.35)',
      backdropFilter: 'blur(2px)',
      animation: 'dp-fadeIn 150ms ease forwards',
    }} />

    {/* Modal panel — fixed pour éviter le clipping du parent */}
    <Box sx={{
      position: 'fixed',
      top: 116,
      left: 16,
      right: { xs: 16, md: 'auto' },
      width: { xs: 'auto', md: 620 },
      maxHeight: 'calc(100vh - 130px)',
      overflowY: 'auto',
      bgcolor: CARD, borderRadius: '14px',
      boxShadow: '0 16px 48px rgba(15,27,46,0.16), 0 2px 8px rgba(15,27,46,0.08)',
      border: `1px solid ${BORDER_COL}`,
      zIndex: 9999,
      animation: 'dp-slideDown 160ms cubic-bezier(0.16,1,0.3,1) forwards',
      '&::-webkit-scrollbar': { display: 'none' },
      scrollbarWidth: 'none',
    }}>

      {/* Header */}
      <Box sx={{
        px: { xs: 2, sm: 2.5 }, pt: { xs: 1.8, sm: 2.2 }, pb: { xs: 1.6, sm: 1.8 },
        borderBottom: `1px solid ${BORDER_COL}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box>
          <Typography fontSize={{ xs: 14.5, sm: 15.5 }} fontWeight={600} color={TXT} letterSpacing={-0.2} lineHeight={1.2}>
            Toutes les catégories
          </Typography>
          <Typography fontSize={11.5} color={SUB} mt={0.3}>
            {CATS.length} catégories disponibles
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box component={Link} to="/products?sort=latest" onClick={onClose}
            sx={{
              fontSize: 12, fontWeight: 500, color: SUB,
              textDecoration: 'none', px: 1.3, py: 0.5, borderRadius: '8px',
              border: `1px solid ${BORDER_COL}`,
              '&:hover': { color: TXT, borderColor: 'rgba(15,27,46,0.18)', bgcolor: 'rgba(15,27,46,0.03)' },
              transition: 'all 0.15s',
            }}>
            Nouveautés
          </Box>
          <Box component={Link} to="/categories" onClick={onClose}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.2,
              fontSize: 12, fontWeight: 500, color: TXT, textDecoration: 'none',
              px: 1.3, py: 0.5, borderRadius: '8px',
              bgcolor: 'rgba(15,27,46,0.04)', border: `1px solid ${BORDER_COL}`,
              '&:hover': { bgcolor: 'rgba(15,27,46,0.07)' }, transition: 'all 0.15s',
            }}>
            Voir tout <KeyboardArrowRight sx={{ fontSize: 14 }} />
          </Box>
        </Box>
      </Box>

      {/* Category grid — 3 colonnes pour tout voir sans scroll */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' }, p: 1.5, gap: 0.75 }}>
        {CATS.map(({ label, sub, icon: Icon, path }) => {
          const active = activeCat === label;
          return (
            <Box key={label} onClick={() => { onPick(label, path); onClose(); }}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.2,
                px: { xs: 1, sm: 1.3 }, py: { xs: 0.9, sm: 1 },
                borderRadius: '10px', cursor: 'pointer',
                bgcolor: active ? 'rgba(15,27,46,0.05)' : 'transparent',
                border: `1px solid ${active ? BORDER_COL : 'transparent'}`,
                transition: 'background 0.15s ease, border-color 0.15s ease',
                '&:hover': {
                  bgcolor: 'rgba(15,27,46,0.035)',
                  border: `1px solid ${BORDER_COL}`,
                },
              }}>
              <Box sx={{
                width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
                borderRadius: '9px',
                bgcolor: active ? ACCENT : 'rgba(15,27,46,0.055)',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s ease',
              }}>
                <Icon sx={{ fontSize: { xs: 16, sm: 18 }, color: active ? '#FFFFFF' : ACCENT }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontSize={{ xs: 12.5, sm: 13.5 }} fontWeight={500}
                  color={TXT} lineHeight={1.25} noWrap>
                  {label}
                </Typography>
                <Typography fontSize={{ xs: 10, sm: 11 }} color={SUB} lineHeight={1.3} noWrap>
                  {sub}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Ventes Flash banner */}
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Box component={Link} to="/ventes-flash" onClick={onClose}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.8, py: 1.2, borderRadius: '10px',
            bgcolor: ORANGE,
            textDecoration: 'none',
            transition: 'filter 0.15s',
            '&:hover': { filter: 'brightness(1.05)' },
          }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: '8px',
            bgcolor: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <FlashOn sx={{ fontSize: 18, color: 'white' }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography fontSize={13} fontWeight={600} color="white" lineHeight={1.2}>Ventes Flash</Typography>
            <Typography fontSize={11} color="rgba(255,255,255,0.8)" lineHeight={1.3}>Offres du jour</Typography>
          </Box>
          <KeyboardArrowRight sx={{ fontSize: 18, color: 'rgba(255,255,255,0.8)' }} />
        </Box>
      </Box>
    </Box>
    </>
  );
}

// ─── Account Dropdown ──────────────────────────────────────────────────────────
function AccountDropdown({ user, isSeller, navigate, onClose, logout }: any) {
  const go = (path: string) => { navigate(path); onClose(); };

  const buyerItems = [
    { label: 'Mon profil',     path: '/account',          Icon: Person },
    { label: 'Mes commandes',  path: '/account/orders',   Icon: ReceiptLongOutlined },
    { label: 'Mes messages',   path: '/account/messages', Icon: ChatBubbleOutline },
    { label: 'Mes favoris',    path: '/account/wishlist', Icon: FavoriteBorder },
  ];

  const sellerItems = [
    { label: 'Dashboard',      path: '/seller' },
    { label: 'Produits',       path: '/seller/products' },
    { label: 'Commandes',      path: '/seller/orders' },
    { label: 'Ma boutique',    path: '/seller/store' },
    { label: 'Mes boutiques',  path: '/seller/stores' },
    { label: 'Statistiques',   path: '/seller/statistics' },
    { label: 'Abonnement',     path: '/seller/subscription' },
  ];

  const TXT  = '#0F172A';
  const SUB  = '#64748B';
  const BORD = 'rgba(15,23,42,0.08)';

  return (
    <Box sx={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
      width: 304,
      bgcolor: '#FFFFFF',
      borderRadius: '18px',
      border: `1px solid ${BORD}`,
      boxShadow: '0 20px 48px rgba(15,23,42,0.16), 0 4px 16px rgba(15,23,42,0.08)',
      overflow: 'hidden', zIndex: 9999,
      animation: 'dp-slideDown 160ms cubic-bezier(0.4,0,0.2,1) forwards',
    }}>

      {/* ── Header ── */}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 2, position: 'relative', bgcolor: alpha(ORANGE, 0.04) }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{
            width: 46, height: 46, bgcolor: ORANGE, color: 'white',
            fontSize: 18, fontWeight: 900,
            boxShadow: `0 4px 14px ${alpha(ORANGE, 0.35)}`,
          }}>
            {user?.firstName?.[0]}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.25 }}>
              <Typography fontWeight={800} color={TXT} fontSize={14.5} noWrap sx={{ flex: 1, letterSpacing: '-0.2px' }}>
                {user?.firstName} {user?.lastName}
              </Typography>
              {isSeller && (
                <Box sx={{ px: 1, py: 0.25, borderRadius: '8px', bgcolor: alpha(ORANGE, 0.12), border: `1px solid ${alpha(ORANGE, 0.3)}` }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: ORANGE, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Vendeur</Typography>
                </Box>
              )}
            </Box>
            <Typography fontSize={11.5} color={SUB} noWrap>{user?.email}</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── Buyer menu ── */}
      <Box sx={{ px: 1.5, py: 1 }}>
        {buyerItems.map(({ label, path, Icon }) => (
          <Box key={path} onClick={() => go(path)} sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1,
            borderRadius: '12px', cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': { bgcolor: 'rgba(15,23,42,0.04)', '& .dd-icon': { color: ORANGE }, '& .dd-label': { color: TXT } },
          }}>
            <Icon className="dd-icon" sx={{ fontSize: 17, color: SUB, transition: 'color 0.15s' }} />
            <Typography className="dd-label" fontSize={13.5} color={SUB} fontWeight={500} sx={{ flex: 1, transition: 'color 0.15s' }}>
              {label}
            </Typography>
            <KeyboardArrowRight sx={{ fontSize: 15, color: 'rgba(15,23,42,0.2)' }} />
          </Box>
        ))}
      </Box>

      {/* ── Seller section or Upgrade CTA ── */}
      {isSeller ? (
        <>
          <Box sx={{ mx: 2, height: '1px', bgcolor: BORD }} />
          <Box sx={{ px: 1.5, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2, px: 1 }}>
              <StorefrontOutlined sx={{ fontSize: 13, color: ORANGE }} />
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Espace Vendeur
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.7 }}>
              {sellerItems.map(({ label, path: p }) => (
                <Box key={p} onClick={() => go(p)} sx={{
                  px: 1.2, py: 0.9, borderRadius: '10px', cursor: 'pointer',
                  border: `1px solid ${BORD}`,
                  bgcolor: 'rgba(15,23,42,0.02)',
                  transition: 'all 0.15s',
                  '&:hover': { bgcolor: alpha(ORANGE, 0.08), borderColor: alpha(ORANGE, 0.35), '& .sl-label': { color: ORANGE } },
                }}>
                  <Typography className="sl-label" fontSize={12.5} fontWeight={600} color={SUB} sx={{ transition: 'color 0.15s' }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      ) : (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <Box onClick={() => go('/become-seller')} sx={{
            px: 1.5, py: 1.1, borderRadius: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 1.5,
            border: `1px solid ${alpha(ORANGE, 0.25)}`,
            bgcolor: alpha(ORANGE, 0.06),
            transition: 'all 0.15s',
            '&:hover': { bgcolor: alpha(ORANGE, 0.12), borderColor: alpha(ORANGE, 0.4) },
          }}>
            <StorefrontOutlined sx={{ fontSize: 17, color: ORANGE }} />
            <Typography fontSize={13.5} fontWeight={600} color={ORANGE} sx={{ flex: 1 }}>
              Devenir vendeur
            </Typography>
            <KeyboardArrowRight sx={{ fontSize: 15, color: alpha(ORANGE, 0.5) }} />
          </Box>
        </Box>
      )}

      {/* ── Logout ── */}
      <Box sx={{ px: 1.5, pb: 1.5 }}>
        <Box sx={{ height: '1px', bgcolor: BORD, mb: 1 }} />
        <Box onClick={() => { logout(); onClose(); navigate('/'); }} sx={{
          display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1,
          borderRadius: '12px', cursor: 'pointer',
          transition: 'all 0.15s',
          '&:hover': { bgcolor: 'rgba(239,68,68,0.06)' },
        }}>
          <Logout sx={{ fontSize: 17, color: '#EF4444' }} />
          <Typography fontSize={13.5} color="#EF4444" fontWeight={600} sx={{ flex: 1 }}>Déconnexion</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function Header() {
  const { user, logout } = useAuthStore();
  const { count } = useCartStore();
  const navigate    = useNavigate();
  const theme       = useTheme();
  const isMobile    = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileOnly = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet    = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600–899px
  const rLocationForBg = useRLocation();
  const isHeroPage = rLocationForBg.pathname === '/home' || rLocationForBg.pathname === '/';

  const [searchParams] = useSearchParams();
  const rLocation      = useRLocation();

  const { dept: city, loading: geoLoading, detect: detectGeo, setDept: setCity } = useGeolocation();
  const { location: dpLocation }                                                = useLocationState();
  const locationModalOpen = searchParams.get('modal') === 'location';
  const openLocationModal  = () => { const p = new URLSearchParams(searchParams.toString()); p.set('modal', 'location'); navigate('?' + p, { replace: true }); };
  const closeLocationModal = () => { const p = new URLSearchParams(searchParams.toString()); p.delete('modal'); navigate('?' + p, { replace: true }); };

  // Label affiché dans le chip (ville si dispo, sinon département)
  const displayCity = dpLocation?.city || dpLocation?.department || city;
  // Params API corrects — toujours utiliser les vrais champs
  const locDept = dpLocation?.department || '';
  const locCity = dpLocation?.city || '';

  // Sync header city pill avec le store Zustand (display seulement)
  useEffect(() => {
    if (dpLocation?.city) setCity(dpLocation.city);
    else if (dpLocation?.department) setCity(dpLocation.department);
  }, [dpLocation]);

  const [search,      setSearch]     = useState('');
  const [showCity,    setShowCity]   = useState(false);
  const [showCat,     setShowCat]    = useState(false);
  const [showAccount, setShowAccount]= useState(false);
  const [activeCat,   setActiveCat]  = useState('');
  const [sCat,        setSCat]       = useState('Tous');
  const [sCatOpen,    setSCatOpen]   = useState(false);
  const [drawerOpen,  setDrawerOpen] = useState(false);
  const [drawerShowAllCats, setDrawerShowAllCats] = useState(false);
  const [mSearch,     setMSearch]    = useState(false);
  const [suggs,       setSuggs]      = useState<any[]>([]);
  const [showSuggs,   setShowSuggs]  = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const isScrolled = window.scrollY > 10;
        setScrolled(prev => prev === isScrolled ? prev : isScrolled);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId); };
  }, []);

  // Sync URL params â†' search bar and active category chip
  useEffect(() => {
    const q   = searchParams.get('q') || searchParams.get('search') || '';
    const cat = searchParams.get('category') || '';
    setSearch(q);
    setActiveCategory(cat);
  }, [rLocation.search]);

  const debRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sBoxRef   = useRef<HTMLDivElement>(null);
  const cityRef   = useRef<HTMLDivElement>(null);
  const catRef    = useRef<HTMLDivElement>(null);
  const accountRef= useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [hH, setHH] = useState(0);

  // inject global keyframes once
  useEffect(() => {
    const id = 'dp-global-css';
    if (!document.getElementById(id)) {
      const s = document.createElement('style'); s.id = id; s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(e => setHH(e[0].contentRect.height));
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  const fetchSuggs = useCallback((q: string) => {
    if (q.length < 2) { setSuggs([]); setShowSuggs(false); return; }
    const p = new URLSearchParams({ search: q, limit: '6' });
    if (locDept) p.set('department', locDept);
    if (locCity) p.set('city', locCity);
    if (sCat !== 'Tous') p.set('category', sCat.toLowerCase());
    api.get('/products?' + p).then(r => { setSuggs(r.data?.data || []); setShowSuggs(true); }).catch(() => setSuggs([]));
  }, [locDept, locCity, sCat]);

  const onType = (v: string) => {
    setSearch(v);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => fetchSuggs(v), 280);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (sBoxRef.current && !sBoxRef.current.contains(t)) setShowSuggs(false);
      if (cityRef.current && !cityRef.current.contains(t)) setShowCity(false);
      if (catRef.current && !catRef.current.contains(t)) setShowCat(false);
      if (accountRef.current && !accountRef.current.contains(t)) setShowAccount(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (user && !localStorage.getItem('dealpam_city')) {
      const d = (user as any).department || (user as any).city || '';
      if (d) setCity(d);
    }
  }, [user]);

  const isSeller = user?.role === 'SELLER';

  const doSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = search.trim();
    setShowSuggs(false); setMSearch(false); setSCatOpen(false);
    if (q || sCat !== 'Tous') {
      const p = new URLSearchParams();
      if (q) p.set('q', q);
      if (sCat !== 'Tous') p.set('category', sCat.toLowerCase());
      if (locDept) p.set('department', locDept);
      if (locCity) p.set('city', locCity);
      navigate('/search?' + p); setDrawerOpen(false);
    }
  };

  const toProd = (slug: string) => { setShowSuggs(false); setSearch(''); setMSearch(false); navigate('/products/' + slug); };

  // SearchBox is rendered inline (not as a sub-component) to avoid focus loss on re-render

  return (
    <>
      <Box ref={headerRef} sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: theme.zIndex.appBar + 1, boxShadow: (isMobile && isHeroPage && !scrolled) ? 'none' : '0 1px 0 ' + BORDER, transform: 'translateZ(0)', willChange: 'transform', transition: 'box-shadow 0.3s, background-color 0.3s' }}>

        {/* â•â•â• MAIN BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* ══ MOBILE BAR (< 600px) ═══════════════════════════════════════════ */}
        {isMobileOnly && (
          <Box sx={{
            bgcolor: (isHeroPage && !scrolled) ? 'transparent' : BG,
            height: 58, display: 'flex', alignItems: 'center', px: 1.5, gap: 0.5, position: 'relative',
            transition: 'background-color 0.25s ease',
          }}>
            {mSearch ? (
              <>
                <IconButton onClick={() => { setMSearch(false); setSearch(''); setSuggs([]); }}
                  sx={{ color: 'rgba(255,255,255,0.8)', flexShrink: 0, borderRadius: '10px' }}>
                  <Close sx={{ fontSize: 20 }} />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                  <Box component="form" onSubmit={doSearch} sx={{
                    display: 'flex', alignItems: 'center', height: 40, borderRadius: '12px',
                    bgcolor: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.18)',
                    '&:focus-within': { bgcolor: 'white', border: `1.5px solid ${ORANGE}`, '& input': { color: '#0F172A' }, '& input::placeholder': { color: '#64748B' } },
                  }}>
                    <InputBase placeholder="Rechercher..." value={search} onChange={e => onType(e.target.value)}
                      onFocus={() => search.length >= 2 && setShowSuggs(true)} autoFocus
                      sx={{ flex: 1, px: 1.5, fontSize: 14, '& input': { color: 'rgba(255,255,255,0.9)' }, '& input::placeholder': { color: 'rgba(255,255,255,0.35)', opacity: 1 } }} />
                    <Button type="submit" disableElevation sx={{ bgcolor: ORANGE, color: 'white', borderRadius: '0 10px 10px 0', minWidth: 44, height: '100%', '&:hover': { bgcolor: ORANGE_D } }}>
                      <Search sx={{ fontSize: 17 }} />
                    </Button>
                  </Box>
                </Box>
                {showSuggs && suggs.length > 0 && (
                  // Positionné relativement à la barre entière (position:relative sur le
                  // Box parent ligne 615-619), pas seulement au champ de recherche — sinon
                  // la marge occupée par le bouton close n'est pas couverte et on voit la
                  // barre de catégories orange en dessous "percer" sur le bord gauche.
                  <Paper elevation={0} sx={{ position: 'absolute', top: 'calc(100% + 6px)', left: 12, right: 12, zIndex: 9999, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 16px 48px rgba(0,0,0,0.18)', animation: 'dp-slideDown 150ms ease forwards', bgcolor: '#fff' }}>
                    {suggs.map((p: any, i: number) => {
                      const img = p.images?.[0]?.urlMedium || p.images?.[0]?.url;
                      const price = p.salePrice ? Number(p.salePrice) : Number(p.price);
                      return (
                        <Box key={p.id} onClick={() => toProd(p.slug)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, cursor: 'pointer', borderBottom: i < suggs.length - 1 ? '1px solid #F8FAFC' : 'none', '&:hover': { bgcolor: '#F8FAFC' } }}>
                          <Box sx={{ width: 38, height: 38, borderRadius: '8px', overflow: 'hidden', bgcolor: '#F1F5F9', flexShrink: 0 }}>
                            {img && <Box component="img" src={img} alt={p.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontSize={12.5} fontWeight={600} color="#0F172A" noWrap>{p.name}</Typography>
                            <Typography fontSize={11} color="#64748B" noWrap>{p.store?.name}</Typography>
                          </Box>
                          <Typography fontSize={12} fontWeight={800} color={ORANGE} noWrap>{price.toLocaleString()} G</Typography>
                        </Box>
                      );
                    })}
                    <Box onClick={() => doSearch()} sx={{ px: 1.5, py: 1, bgcolor: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, borderTop: '1px solid #E2E8F0' }}>
                      <Search sx={{ fontSize: 13, color: '#64748B' }} />
                      <Typography fontSize={12} color="#475569" fontWeight={500}>Voir tous les résultats pour <strong style={{ color: '#0F172A' }}>"{search}"</strong></Typography>
                    </Box>
                  </Paper>
                )}
              </>
            ) : (
              <>
                <IconButton onClick={() => setDrawerOpen(true)}
                  sx={{ color: 'white', borderRadius: '10px', flexShrink: 0, width: 40, height: 40, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, '&:active': { bgcolor: 'rgba(255,255,255,0.14)', transform: 'scale(0.95)' }, transition: 'background 0.15s, transform 0.12s' }}
                  aria-label="Menu">
                  <MenuIcon sx={{ fontSize: 23 }} />
                </IconButton>

                {/* Logo centré */}
                <Box sx={{ position: 'absolute', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                  <Box component={Link} to="/home" sx={{ textDecoration: 'none', pointerEvents: 'auto' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.8px', lineHeight: 1, color: 'white' }}>
                      Deal<span style={{ color: ORANGE }}>Pam</span>
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0 }}>
                  <IconButton onClick={() => openLocationModal()} sx={{ borderRadius: '10px', width: 36, height: 36 }}>
                    <MyLocation sx={{ fontSize: 19, color: dpLocation ? ORANGE : 'rgba(255,255,255,0.45)', animation: dpLocation?.source === 'gps' ? 'dp-pulse 2s ease infinite' : 'none' }} />
                  </IconButton>
                  <IconButton onClick={() => setMSearch(true)} sx={{ color: 'rgba(255,255,255,0.8)', borderRadius: '10px', width: 36, height: 36 }}>
                    <Search sx={{ fontSize: 21 }} />
                  </IconButton>
                  <IconButton component={Link} to="/cart" sx={{ color: 'white', borderRadius: '10px', width: 36, height: 36 }}>
                    <Badge badgeContent={count > 99 ? '99+' : count} max={999}
                      sx={{ '& .MuiBadge-badge': { bgcolor: ORANGE, color: 'white', fontWeight: 900, fontSize: 9, minWidth: 17, height: 17, border: `2px solid ${BG}` } }}>
                      <ShoppingCart sx={{ fontSize: 21 }} />
                    </Badge>
                  </IconButton>
                </Box>
              </>
            )}
          </Box>
        )}

        {/* ══ TABLET BAR (600–899px) ════════════════════════════════════════════ */}
        {isTablet && (
          <Box sx={{
            bgcolor: (isHeroPage && !scrolled) ? 'transparent' : BG,
            height: 64, display: 'flex', alignItems: 'center', px: 2, gap: 1.5,
            transition: 'background-color 0.25s ease',
          }}>
            {/* Hamburger */}
            <IconButton onClick={() => setDrawerOpen(true)}
              sx={{ color: 'white', borderRadius: '12px', flexShrink: 0, width: 42, height: 42, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' }, '&:active': { transform: 'scale(0.93)' }, transition: 'background 0.15s, transform 0.12s' }}
              aria-label="Menu">
              <MenuIcon sx={{ fontSize: 22 }} />
            </IconButton>

            {/* Logo */}
            <Box component={Link} to="/home" sx={{ textDecoration: 'none', flexShrink: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.8px', lineHeight: 1, color: 'white' }}>
                Deal<span style={{ color: ORANGE }}>Pam</span>
              </Typography>
            </Box>

            {/* Search bar — inline visible sur tablette */}
            <Box ref={sBoxRef} sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <Box component="form" onSubmit={doSearch} sx={{
                display: 'flex', alignItems: 'center', height: 42, borderRadius: '12px',
                bgcolor: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)',
                transition: 'all 0.2s',
                '&:focus-within': { bgcolor: 'white', border: `1.5px solid ${ORANGE}`, boxShadow: `0 0 0 3px ${alpha(ORANGE, 0.15)}`, '& input': { color: '#0F172A' }, '& input::placeholder': { color: '#64748B' } },
              }}>
                <InputBase placeholder="Rechercher produits, boutiques..." value={search}
                  onChange={e => onType(e.target.value)}
                  onFocus={() => search.length >= 2 && setShowSuggs(true)}
                  sx={{ flex: 1, px: 1.5, fontSize: 13.5, '& input': { color: 'rgba(255,255,255,0.88)', transition: 'color 0.2s' }, '& input::placeholder': { color: 'rgba(255,255,255,0.28)', opacity: 1 } }} />
                <Button type="submit" disableElevation sx={{ bgcolor: ORANGE, color: 'white', borderRadius: '0 10px 10px 0', minWidth: 48, height: '100%', '&:hover': { bgcolor: ORANGE_D } }}>
                  <Search sx={{ fontSize: 18 }} />
                </Button>
              </Box>
              {showSuggs && suggs.length > 0 && (
                <Paper elevation={0} sx={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 9999, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 16px 48px rgba(0,0,0,0.18)', animation: 'dp-slideDown 150ms ease forwards' }}>
                  {suggs.map((p: any, i: number) => {
                    const img = p.images?.[0]?.urlMedium || p.images?.[0]?.url;
                    const price = p.salePrice ? Number(p.salePrice) : Number(p.price);
                    return (
                      <Box key={p.id} onClick={() => toProd(p.slug)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, cursor: 'pointer', borderBottom: i < suggs.length - 1 ? '1px solid #F8FAFC' : 'none', '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '8px', overflow: 'hidden', bgcolor: '#F1F5F9', flexShrink: 0 }}>
                          {img && <Box component="img" src={img} alt={p.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontSize={13} fontWeight={600} color="#0F172A" noWrap>{p.name}</Typography>
                          <Typography fontSize={11} color="#64748B" noWrap>{p.store?.name}</Typography>
                        </Box>
                        <Typography fontSize={12.5} fontWeight={800} color={ORANGE} noWrap>{price.toLocaleString()} G</Typography>
                      </Box>
                    );
                  })}
                  <Box onClick={() => doSearch()} sx={{ px: 1.5, py: 1, bgcolor: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, borderTop: '1px solid #E2E8F0' }}>
                    <Search sx={{ fontSize: 13, color: '#64748B' }} />
                    <Typography fontSize={12.5} color="#475569" fontWeight={500}>Voir tous les résultats pour <strong style={{ color: '#0F172A' }}>"{search}"</strong></Typography>
                  </Box>
                </Paper>
              )}
            </Box>

            {/* Right actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>
              {/* Location chip */}
              <Box onClick={() => openLocationModal()} sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, px: 1.2, py: 0.6, borderRadius: '10px',
                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', borderColor: ORANGE },
              }}>
                <MyLocation sx={{ fontSize: 14, color: dpLocation ? ORANGE : 'rgba(255,255,255,0.4)', animation: dpLocation?.source === 'gps' ? 'dp-pulse 2s ease infinite' : 'none', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: dpLocation ? 'white' : 'rgba(255,255,255,0.4)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dpLocation ? (dpLocation.city || dpLocation.department) : 'Zone'}
                </Typography>
              </Box>

              {/* Account */}
              {user ? (
                <Box ref={accountRef} sx={{ position: 'relative' }}>
                  <IconButton onClick={() => setShowAccount(o => !o)} sx={{ color: 'white', borderRadius: '10px', width: 40, height: 40, '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' } }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: ORANGE, fontSize: 12, fontWeight: 900 }}>{user.firstName?.[0]}</Avatar>
                  </IconButton>
                  {showAccount && <AccountDropdown user={user} isSeller={isSeller} navigate={navigate} onClose={() => setShowAccount(false)} logout={logout} />}
                </Box>
              ) : (
                <Button component={Link} to="/login" size="small" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '10px', fontSize: 12.5, fontWeight: 600, px: 1.5, border: '1px solid rgba(255,255,255,0.2)', '&:hover': { borderColor: ORANGE, color: ORANGE } }}>
                  Connexion
                </Button>
              )}

              {/* Cart */}
              <IconButton component={Link} to="/cart" sx={{ color: 'white', borderRadius: '10px', width: 42, height: 42 }}>
                <Badge badgeContent={count > 99 ? '99+' : count} max={999}
                  sx={{ '& .MuiBadge-badge': { bgcolor: ORANGE, color: 'white', fontWeight: 900, fontSize: 9, minWidth: 17, height: 17, border: `2px solid ${BG}` } }}>
                  <ShoppingCart sx={{ fontSize: 22 }} />
                </Badge>
              </IconButton>
            </Box>
          </Box>
        )}

        {/* ══ DESKTOP BAR ═══════════════════════════════════════════════════════ */}
        {!isMobile && (
        <Box sx={{
          bgcolor: BG,
          height: 72,
          display: 'flex', alignItems: 'center',
          px: { sm: 2, md: 3 },
          gap: 2,
        }}>
          {/* Logo */}
          <Box component={Link} to="/home" sx={{ textDecoration: 'none', flexShrink: 0 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 28, letterSpacing: '-1px', lineHeight: 1, color: 'white' }}>
              Deal<span style={{ color: ORANGE }}>Pam</span>
            </Typography>
          </Box>

          {/* Location */}
          <Box sx={{ flexShrink: 0 }}>
            <Box onClick={() => openLocationModal()} sx={{
              display: 'flex', flexDirection: 'column', cursor: 'pointer',
              px: 1.4, py: 0.9, borderRadius: '10px',
              border: '1px solid transparent', transition: 'all 0.15s',
              '&:hover': { border: `1px solid ${BORDER}`, bgcolor: 'rgba(255,255,255,0.04)' },
            }}>
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, letterSpacing: 0.3, textTransform: 'uppercase' }}>Livraison vers</Typography>
              <Tooltip title="Modifier votre zone de livraison" placement="bottom" arrow>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <MyLocation sx={{ fontSize: 13, color: dpLocation ? ORANGE : 'rgba(255,255,255,0.35)', animation: dpLocation?.source === 'gps' ? 'dp-pulse 2s ease infinite' : 'none' }} />
                  <Box sx={{ maxWidth: 140, overflow: 'hidden' }}>
                    {dpLocation ? (
                      <>
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dpLocation.city}</Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 10.5, lineHeight: 1, mt: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dpLocation.department}</Typography>
                      </>
                    ) : (
                      <Typography sx={{ color: ORANGE, fontWeight: 700, fontSize: 12.5, lineHeight: 1, whiteSpace: 'nowrap', animation: 'dp-pulse 2.5s ease infinite' }}>Choisir votre zone</Typography>
                    )}
                  </Box>
                  <KeyboardArrowDown sx={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} />
                </Box>
              </Tooltip>
            </Box>
          </Box>

          {/* Search bar */}
          <Box ref={sBoxRef} sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <Box component="form" onSubmit={doSearch} sx={{
              display: 'flex', alignItems: 'center', height: 46, borderRadius: '12px',
              bgcolor: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.1)', transition: 'all 0.2s',
              '&:focus-within': { bgcolor: 'white', border: `1.5px solid ${ORANGE}`, boxShadow: `0 0 0 4px ${alpha(ORANGE, 0.15)}`, '& input': { color: '#0F172A' }, '& input::placeholder': { color: '#64748B' } },
            }}>
              {activeCategory && !search && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1.5, pl: 1, pr: 0.5, py: 0.3, bgcolor: alpha(ORANGE, 0.18), borderRadius: '20px', border: `1px solid ${alpha(ORANGE, 0.35)}`, flexShrink: 0 }}>
                  <Typography fontSize={12} fontWeight={700} color={ORANGE} sx={{ textTransform: 'capitalize' }}>{activeCategory}</Typography>
                  <Box onClick={() => { setActiveCategory(''); navigate(rLocation.pathname, { replace: true }); }} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: ORANGE, ml: 0.3 }}>
                    <Close sx={{ fontSize: 13 }} />
                  </Box>
                </Box>
              )}
              <InputBase
                placeholder="Rechercher produits, boutiques, marques..."
                value={search}
                onChange={e => onType(e.target.value)}
                onFocus={() => search.length >= 2 && setShowSuggs(true)}
                sx={{ flex: 1, px: 1.5, fontSize: 14, '& input': { color: 'rgba(255,255,255,0.92)', transition: 'color 0.2s' }, '& input::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1, transition: 'color 0.2s' } }}
              />
              <Button type="submit" disableElevation sx={{ bgcolor: ORANGE, color: 'white', borderRadius: '0 10px 10px 0', minWidth: 52, height: '100%', '&:hover': { bgcolor: ORANGE_D } }}>
                <Search sx={{ fontSize: 20 }} />
              </Button>
            </Box>
            {showSuggs && suggs.length > 0 && (
              <Paper elevation={0} sx={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 9999, borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'dp-slideDown 150ms ease forwards' }}>
                {suggs.map((p: any, i: number) => {
                  const img = p.images?.[0]?.urlMedium || p.images?.[0]?.url;
                  const price = p.salePrice ? Number(p.salePrice) : Number(p.price);
                  return (
                    <Box key={p.id} onClick={() => toProd(p.slug)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.2, cursor: 'pointer', borderBottom: i < suggs.length - 1 ? '1px solid #F8FAFC' : 'none', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 0.1s' }}>
                      <Box sx={{ width: 46, height: 46, borderRadius: '10px', overflow: 'hidden', bgcolor: '#F1F5F9', flexShrink: 0 }}>
                        {img && <Box component="img" src={img} alt={p.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontSize={13.5} fontWeight={600} color="#0F172A" noWrap>{p.name}</Typography>
                        <Typography fontSize={11.5} color="#64748B" noWrap>{p.store?.name}</Typography>
                      </Box>
                      <Typography fontSize={13.5} fontWeight={800} color={ORANGE}>{price.toLocaleString()} HTG</Typography>
                    </Box>
                  );
                })}
                <Box onClick={() => doSearch()} sx={{ px: 2, py: 1.2, bgcolor: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, borderTop: '1px solid #E2E8F0', '&:hover': { bgcolor: '#F1F5F9' } }}>
                  <Search sx={{ fontSize: 14, color: '#64748B' }} />
                  <Typography fontSize={13} color="#475569" fontWeight={500}>Voir tous les résultats pour <strong style={{ color: '#0F172A' }}>"{search}"</strong></Typography>
                </Box>
              </Paper>
            )}
          </Box>

          {/* Account */}
          {user ? (
            <Box ref={accountRef} sx={{ position: 'relative', flexShrink: 0 }}>
              <Box onClick={() => setShowAccount(o => !o)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.2, py: 0.8, borderRadius: '10px', border: `1px solid ${showAccount ? alpha(ORANGE, 0.3) : 'transparent'}`, bgcolor: showAccount ? alpha(ORANGE, 0.06) : 'transparent', transition: 'all 0.15s', '&:hover': { border: `1px solid ${BORDER}`, bgcolor: 'rgba(255,255,255,0.04)' } }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: ORANGE, fontSize: 13, fontWeight: 900, color: 'white' }}>{user.firstName?.[0]}</Avatar>
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.2 }}>{isSeller ? 'Espace vendeur' : 'Mon compte'}</Typography>
                  <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{user.firstName}</Typography>
                </Box>
                <KeyboardArrowDown sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: showAccount ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </Box>
              {showAccount && <AccountDropdown user={user} isSeller={isSeller} navigate={navigate} onClose={() => setShowAccount(false)} logout={logout} />}
            </Box>
          ) : (
            <Button component={Link} to="/login" variant="outlined" size="small" sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '10px', fontSize: 13, fontWeight: 600, px: 2, flexShrink: 0, '&:hover': { borderColor: ORANGE, color: ORANGE, bgcolor: alpha(ORANGE, 0.06) } }}>
              Connexion
            </Button>
          )}

          {/* Messages */}
          {user && (
            <Tooltip title="Mes messages">
              <IconButton component={Link} to={isSeller ? '/seller/chat' : '/account/messages'}
                sx={{ color: 'rgba(255,255,255,0.6)', borderRadius: '10px', border: '1px solid transparent', flexShrink: 0, '&:hover': { color: ORANGE, border: `1px solid ${BORDER}`, bgcolor: 'rgba(255,255,255,0.04)' } }}>
                <ChatBubbleOutline sx={{ fontSize: 21 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Wishlist */}
          {user && (
            <IconButton component={Link} to="/account/wishlist" sx={{ color: 'rgba(255,255,255,0.6)', borderRadius: '10px', border: '1px solid transparent', flexShrink: 0, '&:hover': { color: '#EC4899', border: `1px solid ${BORDER}`, bgcolor: 'rgba(255,255,255,0.04)' } }}>
              <FavoriteBorder sx={{ fontSize: 22 }} />
            </IconButton>
          )}

          {/* Cart */}
          <IconButton component={Link} to="/cart" sx={{ color: 'white', borderRadius: '10px', border: '1px solid transparent', flexShrink: 0, '&:hover': { border: `1px solid ${BORDER}`, bgcolor: 'rgba(255,255,255,0.04)' } }}>
            <Badge badgeContent={count > 99 ? '99+' : count} max={999}
              sx={{ '& .MuiBadge-badge': { bgcolor: ORANGE, color: 'white', fontWeight: 900, fontSize: 10, minWidth: 18, height: 18, border: `2px solid ${BG}` } }}>
              <ShoppingCart sx={{ fontSize: 26 }} />
            </Badge>
          </IconButton>
        </Box>
        )}

        {/* â•â•â• BOTTOM NAV â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {!isMobile && (
          <Box sx={{
            bgcolor: NAV_BG,
            height: 46,
            display: 'flex', alignItems: 'stretch',
            borderTop: `1px solid ${BORDER}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            position: 'relative',
          }}>
            {/* Categories dropdown */}
            <Box ref={catRef} sx={{ position: 'relative', flexShrink: 0 }}>
              <Box onClick={() => setShowCat(o => !o)} sx={{
                display: 'flex', alignItems: 'center', gap: 0.9,
                px: 2.4, height: '100%', cursor: 'pointer',
                bgcolor: showCat ? alpha(ORANGE, 0.12) : 'transparent',
                borderRight: `1px solid ${BORDER}`,
                transition: 'background 0.15s',
                '&:hover': { bgcolor: showCat ? alpha(ORANGE, 0.14) : 'rgba(255,255,255,0.05)' },
              }}>
                <GridView sx={{ fontSize: 16, color: showCat ? ORANGE : 'rgba(255,255,255,0.7)', transition: 'color 0.15s' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: showCat ? ORANGE : 'rgba(255,255,255,0.88)', letterSpacing: 0.1 }}>
                  Catégories
                </Typography>
                <KeyboardArrowDown sx={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', transform: showCat ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </Box>
              {showCat && <CatDropdown activeCat={activeCat} onPick={(l, p) => { setActiveCat(l); navigate(p); }} onClose={() => setShowCat(false)} />}
            </Box>

            {/* Ventes Flash — badge sobre, plus de shimmer/pulse */}
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1.6, borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <Box component={Link} to="/ventes-flash" sx={{
                display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, height: 28,
                borderRadius: '8px', textDecoration: 'none',
                bgcolor: alpha(ORANGE, 0.16), border: `1px solid ${alpha(ORANGE, 0.35)}`,
                transition: 'background 0.15s, transform 0.15s',
                '&:hover': { bgcolor: alpha(ORANGE, 0.24), transform: 'translateY(-1px)' },
              }}>
                <FlashOn sx={{ fontSize: 14, color: ORANGE }} />
                <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: ORANGE, whiteSpace: 'nowrap' }}>
                  Ventes Flash
                </Typography>
              </Box>
            </Box>

            {/* Nav links — défilement discret avec fondu en bord droit pour signaler qu'il y a plus de contenu */}
            <Box sx={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <Box sx={{
                height: '100%', display: 'flex', alignItems: 'center',
                overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
                gap: 0.2, px: 0.5,
              }}>
                {NAV.map(({ label, path }) => (
                  <Box key={path} component={Link} to={path} sx={{
                    textDecoration: 'none', display: 'flex', alignItems: 'center', height: '100%',
                    px: 1.5, flexShrink: 0, position: 'relative', borderRadius: '8px',
                    transition: 'background 0.15s',
                    '&::after': { content: '""', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 0, height: 2, bgcolor: ORANGE, borderRadius: '2px 2px 0 0', transition: 'width 0.2s ease' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                    '&:hover::after': { width: '55%' },
                    '&:hover .nt': { color: 'rgba(255,255,255,0.95)' },
                  }}>
                    <Typography className="nt" sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.68)', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {/* Fondu droit — indique un contenu scrollable sans afficher de scrollbar */}
              <Box sx={{
                position: 'absolute', top: 0, bottom: 0, right: 0, width: 28, pointerEvents: 'none',
                background: `linear-gradient(90deg, transparent, ${NAV_BG})`,
              }} />
            </Box>

            {/* Right CTA */}
            <Box component={Link} to={isSeller ? '/seller' : user ? '/become-seller' : '/register?role=SELLER'} sx={{
              display: 'flex', alignItems: 'center', gap: 0.8, px: 2, flexShrink: 0,
              borderLeft: `1px solid ${BORDER}`, textDecoration: 'none',
              transition: 'background 0.15s',
            }}>
              {isSeller ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1.5, py: 0.6, bgcolor: ORANGE, borderRadius: '8px', boxShadow: `0 2px 10px ${alpha(ORANGE, 0.35)}`, transition: 'filter 0.15s, transform 0.15s', '&:hover': { filter: 'brightness(1.06)', transform: 'translateY(-1px)' } }}>
                  <GridView sx={{ fontSize: 14, color: 'white' }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>Dashboard</Typography>
                </Box>
              ) : (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 0.6, px: 1.6, py: 0.6, borderRadius: '8px',
                  border: `1px solid ${alpha(ORANGE, 0.4)}`, transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                  '&:hover': { bgcolor: alpha(ORANGE, 0.1), borderColor: ORANGE, transform: 'translateY(-1px)' },
                }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: ORANGE, whiteSpace: 'nowrap' }}>
                    Vendre sur DealPam
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ height: hH }} />

      {/* â•â•â• MOBILE DRAWER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Drawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setDrawerShowAllCats(false); }}
        PaperProps={{ sx: { width: '82vw', maxWidth: 320, bgcolor: '#0B1120', display: 'flex', flexDirection: 'column', borderRadius: '0 24px 24px 0', overflow: 'hidden' } }}>

        {/* ── Header drawer ── */}
        <Box sx={{ px: 2.5, pt: 3, pb: 2, background: 'linear-gradient(160deg, #1E2A45 0%, #0F172A 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px', color: 'white', lineHeight: 1 }}>
              Deal<span style={{ color: ORANGE }}>Pam</span>
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ color: 'rgba(255,255,255,0.45)', bgcolor: 'rgba(255,255,255,0.07)', borderRadius: '10px', width: 34, height: 34, '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', color: 'white' } }}>
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* User card */}
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: ORANGE, color: 'white', fontWeight: 900, fontSize: 18, flexShrink: 0, border: `2px solid ${alpha(ORANGE, 0.35)}` }}>
                {user.firstName?.[0]}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography fontWeight={700} fontSize={14} color="white" noWrap sx={{ flex: 1 }}>{user.firstName} {user.lastName}</Typography>
                  {isSeller && <Box sx={{ bgcolor: alpha(ORANGE, 0.2), border: `1px solid ${alpha(ORANGE, 0.4)}`, borderRadius: '20px', px: 1, py: '2px', flexShrink: 0 }}><Typography fontSize={9} fontWeight={800} color={ORANGE} sx={{ letterSpacing: 0.5 }}>VENDEUR</Typography></Box>}
                </Box>
                <Typography fontSize={11.5} color="rgba(255,255,255,0.35)" noWrap>{user.email}</Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button component={Link} to="/login" fullWidth onClick={() => setDrawerOpen(false)}
                sx={{ bgcolor: ORANGE, color: 'white', fontWeight: 700, borderRadius: '12px', py: 1.1, '&:hover': { bgcolor: ORANGE_D }, textTransform: 'none', fontSize: 13.5 }}>Connexion</Button>
              <Button component={Link} to="/register" fullWidth onClick={() => setDrawerOpen(false)}
                sx={{ border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', borderRadius: '12px', py: 1.1, '&:hover': { borderColor: ORANGE, color: ORANGE }, textTransform: 'none', fontSize: 13.5 }}>Inscription</Button>
            </Box>
          )}
        </Box>

        {/* ── Body scrollable ── */}
        <Box sx={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>

          {/* Zone */}
          <Box onClick={() => { setDrawerOpen(false); openLocationModal(); }} sx={{
            display: 'flex', alignItems: 'center', gap: 1.2, px: 2.5, py: 1.4, cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
          }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: alpha(ORANGE, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GpsFixed sx={{ fontSize: 15, color: ORANGE }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontSize={10.5} color="rgba(255,255,255,0.35)" lineHeight={1} mb={0.2}>Ma zone</Typography>
              <Typography fontSize={13} fontWeight={700} color={dpLocation ? ORANGE : 'rgba(255,255,255,0.5)'} noWrap>
                {dpLocation ? `${dpLocation.city || dpLocation.department}` : 'Choisir ma zone →'}
              </Typography>
            </Box>
            <KeyboardArrowRight sx={{ fontSize: 16, color: 'rgba(255,255,255,0.2)' }} />
          </Box>

          {/* Espace vendeur */}
          {isSeller && (
            <Box sx={{ mx: 2, mt: 2, mb: 0.5, p: 0.5, borderRadius: '16px', background: `linear-gradient(135deg, ${alpha(ORANGE, 0.18)} 0%, ${alpha(ORANGE, 0.08)} 100%)`, border: `1px solid ${alpha(ORANGE, 0.25)}` }}>
              <Box sx={{ px: 1.5, pt: 1.2, pb: 0.8 }}>
                <Typography fontSize={9.5} fontWeight={800} color={ORANGE} sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Espace Vendeur</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, px: 0.5, pb: 0.5 }}>
                {[
                  { l: 'Dashboard',     p: '/seller',          I: Dashboard },
                  { l: 'Produits',      p: '/seller/products', I: Inventory },
                  { l: 'Commandes',     p: '/seller/orders',   I: ShoppingBag },
                  { l: 'Ma boutique',   p: '/seller/store',    I: GridView },
                  { l: 'Mes boutiques', p: '/seller/stores',   I: StorefrontOutlined },
                ].map(({ l, p, I }) => (
                  <Box key={p} component={Link} to={p} onClick={() => setDrawerOpen(false)} sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.2, py: 1, borderRadius: '12px',
                    textDecoration: 'none', bgcolor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.15s', '&:hover': { bgcolor: ORANGE, '& .dl': { color: 'white' }, '& .di': { color: 'white' } },
                  }}>
                    <I className="di" sx={{ fontSize: 14, color: ORANGE, transition: 'color 0.15s' }} />
                    <Typography className="dl" fontSize={12.5} fontWeight={600} color="rgba(255,255,255,0.75)" sx={{ transition: 'color 0.15s' }}>{l}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Navigation */}
          <Box sx={{ px: 2, pt: 2 }}>
            <Typography fontSize={9.5} fontWeight={700} color="rgba(255,255,255,0.25)" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 1, px: 0.5 }}>Navigation</Typography>
            {[
              { path: '/home',         label: 'Accueil',     I: HomeIcon },
              { path: '/products',     label: 'Marketplace', I: GridView },
              { path: '/products?productType=SERVICE', label: 'Services', I: MiscellaneousServices },
              { path: '/ventes-flash', label: 'Ventes Flash',I: FlashOn },
              { path: '/stores',       label: 'Boutiques',   I: ShoppingBag },
              ...(user ? [{ path: '/account', label: 'Mon compte', I: Person }] : []),
            ].map(({ path, label, I }) => (
              <Box key={path} component={Link} to={path} onClick={() => setDrawerOpen(false)} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1.1, mb: 0.3, borderRadius: '12px',
                textDecoration: 'none', transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', '& .nl': { color: 'white' }, '& .ni': { color: ORANGE } },
              }}>
                <I className="ni" sx={{ fontSize: 18, color: 'rgba(255,255,255,0.35)', transition: 'color 0.15s' }} />
                <Typography className="nl" fontSize={14} fontWeight={500} color="rgba(255,255,255,0.65)" sx={{ transition: 'color 0.15s' }}>{label}</Typography>
              </Box>
            ))}
          </Box>

          {/* Catégories */}
          <Box sx={{ px: 2, pt: 1.5, pb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2, px: 0.5 }}>
              <Typography fontSize={9.5} fontWeight={700} color="rgba(255,255,255,0.25)" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Catégories</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.8 }}>
              {(drawerShowAllCats ? CATS : CATS.slice(0, 6)).map(({ label, icon: Icon, color, bg, path }) => (
                <Box key={label} component={Link} to={path} onClick={() => setDrawerOpen(false)} sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.7,
                  py: 1.3, borderRadius: '14px', textDecoration: 'none',
                  bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.18s ease',
                  '&:hover': { bgcolor: alpha(color, 0.12), borderColor: alpha(color, 0.35), transform: 'translateY(-2px)' },
                }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    <Icon sx={{ fontSize: 17, color }} />
                  </Box>
                  <Typography fontSize={10} fontWeight={500} color="rgba(255,255,255,0.55)" textAlign="center" lineHeight={1.2}>{label}</Typography>
                </Box>
              ))}
            </Box>
            {/* Voir plus / Voir moins */}
            <Box onClick={() => setDrawerShowAllCats(v => !v)} sx={{
              mt: 1.2, py: 1, borderRadius: '12px', cursor: 'pointer', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.08)', bgcolor: 'rgba(255,255,255,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6,
              transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.15)' },
            }}>
              <Typography fontSize={12} fontWeight={600} color="rgba(255,255,255,0.45)">
                {drawerShowAllCats ? 'Voir moins' : `Voir plus (${CATS.length - 6})`}
              </Typography>
              <KeyboardArrowDown sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', transform: drawerShowAllCats ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
            </Box>
          </Box>
        </Box>

        {/* ── Footer drawer ── */}
        <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, bgcolor: 'rgba(0,0,0,0.2)', display: 'flex', gap: 1 }}>
          {user ? (
            <>
              <Button component={Link} to="/account/wishlist" onClick={() => setDrawerOpen(false)}
                sx={{ flex: 1, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: 12.5, textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'white' } }}>
                Favoris
              </Button>
              <Button onClick={() => { logout(); setDrawerOpen(false); navigate('/'); }}
                sx={{ flex: 1, borderRadius: '12px', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', fontSize: 12.5, textTransform: 'none', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: '#F87171' } }}>
                Déconnexion
              </Button>
            </>
          ) : (
            <Typography fontSize={11} color="rgba(255,255,255,0.2)" textAlign="center" sx={{ width: '100%' }}>
              DealPam — La marketplace haitienne
            </Typography>
          )}
        </Box>
      </Drawer>

      {/* Location modal */}
      <LocationModal
        open={locationModalOpen}
        onClose={closeLocationModal}
      />
    </>
  );
}

