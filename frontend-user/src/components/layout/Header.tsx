import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Typography, IconButton, Box, Button,
  InputBase, Avatar, Menu, MenuItem, Drawer, List, ListItem,
  ListItemText, useMediaQuery, useTheme, Divider, Paper, alpha,
} from '@mui/material';
import {
  Search, ShoppingCart, Menu as MenuIcon,
  Logout, Close, KeyboardArrowDown,
  Checkroom, PhoneAndroid, Home as HomeIcon,
  SportsEsports, FitnessCenter, LocalFlorist, Diamond,
  DirectionsCar, RestaurantMenu, WorkOutline, MiscellaneousServices,
  DirectionsRun, FlashOn, Room, Apps,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BG = '#131921';           // Amazon dark navy
const BG2 = '#232F3E';          // Amazon secondary bar
const BG3 = '#37475A';          // Amazon bottom bar
const ORANGE = '#FF9900';       // Amazon orange
const ORANGE_HOVER = '#FFB703';

const NAV_LINKS = [
  { label: 'Ventes Flash', path: '/products?sale=true', hot: true },
  { label: "Nouveautes", path: '/products?sort=latest' },
  { label: 'Mode Femme', path: '/products?category=mode' },
  { label: 'Mode Homme', path: '/products?category=mode&gender=homme' },
  { label: 'Electronique', path: '/products?category=electronique' },
  { label: 'Maison & Deco', path: '/products?category=maison' },
  { label: 'Beaute', path: '/products?category=beaute' },
  { label: 'Chaussures', path: '/products?category=chaussures' },
  { label: 'Bijoux', path: '/products?category=bijoux' },
  { label: 'Sport', path: '/products?category=sport' },
  { label: 'Vehicules', path: '/products?category=vehicules' },
  { label: 'Alimentation', path: '/products?category=alimentation' },
  { label: 'Services', path: '/products?category=services' },
];

const CATS_MENU = [
  { label: 'Mode', icon: Checkroom, color: '#EC4899', path: '/products?category=mode' },
  { label: 'Electronique', icon: PhoneAndroid, color: '#3B82F6', path: '/products?category=electronique' },
  { label: 'Maison', icon: HomeIcon, color: '#10B981', path: '/products?category=maison' },
  { label: 'Beaute', icon: LocalFlorist, color: '#F59E0B', path: '/products?category=beaute' },
  { label: 'Bijoux', icon: Diamond, color: '#8B5CF6', path: '/products?category=bijoux' },
  { label: 'Sport', icon: FitnessCenter, color: '#EF4444', path: '/products?category=sport' },
  { label: 'Vehicules', icon: DirectionsCar, color: '#06B6D4', path: '/products?category=vehicules' },
  { label: 'Alimentation', icon: RestaurantMenu, color: '#84CC16', path: '/products?category=alimentation' },
  { label: 'Sacs', icon: WorkOutline, color: '#F97316', path: '/products?category=sacs' },
  { label: 'Chaussures', icon: DirectionsRun, color: '#14B8A6', path: '/products?category=chaussures' },
  { label: 'Jeux', icon: SportsEsports, color: '#A855F7', path: '/products?category=jeux' },
  { label: 'Services', icon: MiscellaneousServices, color: '#6366F1', path: '/products?category=services' },
];

// ─── HOVERABLE BUTTON (Amazon style border on hover) ──────────────────────────

function HBtn({ children, onClick, sx = {}, component, to }: any) {
  const [hov, setHov] = useState(false);
  const props: any = { onClick, onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false) };
  if (component) { props.component = component; props.to = to; }
  return (
    <Box {...props} sx={{
      cursor: 'pointer', borderRadius: 0.5, px: 0.8, py: 0.4,
      border: hov ? '1px solid white' : '1px solid transparent',
      display: 'flex', alignItems: 'center', gap: 0.4, userSelect: 'none',
      ...sx,
    }}>
      {children}
    </Box>
  );
}

// ─── MAIN HEADER ──────────────────────────────────────────────────────────────

export default function Header() {
  const { user, logout } = useAuthStore();
  const { count } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catAnchor, setCatAnchor] = useState<null | HTMLElement>(null);
  const [cityAnchor, setCityAnchor] = useState<null | HTMLElement>(null);
  const [searchCat, setSearchCat] = useState('Tous');
  const [searchCatAnchor, setSearchCatAnchor] = useState<null | HTMLElement>(null);
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    const saved = localStorage.getItem('dealpam_city');
    if (saved) return saved;
    // Use user's department/city if logged in (set after mount via useEffect)
    return '';
  });

  // Sync with user profile on login
  useEffect(() => {
    if (user && !localStorage.getItem('dealpam_city')) {
      const dept = user.department || user.city || '';
      if (dept) { setSelectedCity(dept); localStorage.setItem('dealpam_city', dept); }
    }
  }, [user]);

  const DEPARTMENTS = ['Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Sud', 'Sud-Est', 'Grand Anse', 'Nippes'];

  const handleCitySelect = (dept: string) => {
    setSelectedCity(dept);
    localStorage.setItem('dealpam_city', dept);
    setCityAnchor(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (q || searchCat !== 'Tous') {
      const cat = searchCat !== 'Tous' ? `&category=${encodeURIComponent(searchCat.toLowerCase())}` : '';
      navigate(`/search?q=${encodeURIComponent(q)}${cat}`);
      setMobileOpen(false);
    }
  };

  const isActive = (p: string) => location.pathname === p.split('?')[0];

  // Main bar: 60px (xs) | 64px (md)
  // Sub-nav: 38px (desktop only)
  const spacerH = isMobile ? 56 : 64 + 44;

  return (
    <>
      {/* ══════════════════════════════════════════════
          MAIN BAR
      ══════════════════════════════════════════════ */}
      <Box sx={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: theme.zIndex.appBar + 1,
        bgcolor: BG,
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', height: { xs: 56, md: 64 }, px: { xs: 1, md: 2 }, gap: 1 }}>

          {/* Mobile menu */}
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} sx={{ color: 'white', p: 0.8 }}>
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <HBtn component={Link} to="/" sx={{ flexShrink: 0, mr: { xs: 0.5, md: 1 } }}>
            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 24 }, letterSpacing: '-0.5px', lineHeight: 1, color: 'white' }}>
                Deal<span style={{ color: ORANGE }}>Pam</span>
              </Typography>
              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.3, lineHeight: 1, textAlign: 'center' }}>
                .com
              </Typography>
            </Box>
          </HBtn>

          {/* Delivery location (desktop) */}
          {!isMobile && (
            <Box sx={{ flexShrink: 0 }}>
              <HBtn onClick={e => setCityAnchor(e.currentTarget)} sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>
                  {selectedCity ? 'Livrer à' : 'Choisir'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Room sx={{ color: selectedCity ? 'white' : 'rgba(255,255,255,0.55)', fontSize: 14 }} />
                  <Typography sx={{ color: selectedCity ? 'white' : 'rgba(255,255,255,0.65)',
                    fontWeight: selectedCity ? 700 : 400, fontSize: 12.5, lineHeight: 1 }}>
                    {selectedCity || 'votre zone'}
                  </Typography>
                  <KeyboardArrowDown sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }} />
                </Box>
              </HBtn>
              <Menu anchorEl={cityAnchor} open={Boolean(cityAnchor)} onClose={() => setCityAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ elevation: 12, sx: { borderRadius: 1, minWidth: 180, mt: 0.5 } }}>
                {DEPARTMENTS.map(dept => (
                  <MenuItem key={dept} onClick={() => handleCitySelect(dept)} selected={dept === selectedCity}
                    sx={{ fontSize: 13.5, py: 0.9, '&.Mui-selected': { bgcolor: 'rgba(255,153,0,0.1)', color: ORANGE, fontWeight: 700 } }}>
                    {dept}
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          )}

          {/* ── SEARCH BAR (Amazon style) ── */}
          {!isMobile ? (
            <Box sx={{ flex: 1, display: 'flex', height: 40, borderRadius: 0.5, border: `2px solid ${ORANGE}`, overflow: 'hidden' }}>
              {/* Category selector — rendered as sibling, Menu uses portal */}
              <Box onClick={e => setSearchCatAnchor(e.currentTarget)}
                sx={{ bgcolor: '#F3F3F3', borderRight: '1px solid #CDCDCD', display: 'flex', alignItems: 'center',
                  px: 1.2, gap: 0.3, cursor: 'pointer', flexShrink: 0, minWidth: 80,
                  '&:hover': { bgcolor: '#E6E6E6' } }}>
                <Typography fontSize={12} fontWeight={500} color="#111" noWrap sx={{ maxWidth: 90 }}>{searchCat}</Typography>
                <KeyboardArrowDown sx={{ fontSize: 14, color: '#555',
                  transform: Boolean(searchCatAnchor) ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </Box>
              <Box component="form" onSubmit={handleSearch} sx={{ flex: 1, display: 'flex' }}>
                <InputBase
                  placeholder="Rechercher produits, boutiques, categories..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  sx={{ flex: 1, px: 1.5, fontSize: 13.5, bgcolor: 'white', color: '#111',
                    '& input': { color: '#111' },
                    '& input::placeholder': { color: '#444', opacity: 1, fontSize: 13.5 } }}
                />
                <Button type="submit" disableElevation
                  sx={{ bgcolor: ORANGE, color: '#111', borderRadius: 0, minWidth: 46, px: 1.5,
                    '&:hover': { bgcolor: ORANGE_HOVER } }}>
                  <Search sx={{ fontSize: 21, color: '#111' }} />
                </Button>
              </Box>
              <Menu anchorEl={searchCatAnchor} open={Boolean(searchCatAnchor)} onClose={() => setSearchCatAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ elevation: 16, sx: { borderRadius: 2, width: 320, mt: 0.5, p: 1.5,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.18)' } }}>
                {/* Tous */}
                <Box onClick={() => { setSearchCat('Tous'); setSearchCatAnchor(null); }}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 1.2, py: 0.9, mb: 0.5,
                    borderRadius: 1.5, cursor: 'pointer', transition: 'all 0.15s',
                    bgcolor: searchCat === 'Tous' ? alpha(ORANGE, 0.1) : 'transparent',
                    border: `1px solid ${searchCat === 'Tous' ? ORANGE : 'transparent'}`,
                    '&:hover': { bgcolor: alpha(ORANGE, 0.07) } }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: alpha(ORANGE, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Apps sx={{ fontSize: 15, color: ORANGE }} />
                  </Box>
                  <Typography fontWeight={searchCat === 'Tous' ? 700 : 500} fontSize={13.5}
                    color={searchCat === 'Tous' ? ORANGE : '#222'}>
                    Toutes les catégories
                  </Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.4 }}>
                  {CATS_MENU.map(({ label, icon: Icon, color }) => (
                    <Box key={label} onClick={() => { setSearchCat(label); setSearchCatAnchor(null); }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.9, px: 1, py: 0.8,
                        borderRadius: 1.5, cursor: 'pointer', transition: 'all 0.15s',
                        bgcolor: searchCat === label ? alpha(color, 0.1) : 'transparent',
                        border: `1px solid ${searchCat === label ? alpha(color, 0.4) : 'transparent'}`,
                        '&:hover': { bgcolor: alpha(color, 0.07) } }}>
                      <Box sx={{ width: 26, height: 26, borderRadius: 0.8, bgcolor: alpha(color, 0.12),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon sx={{ fontSize: 13, color }} />
                      </Box>
                      <Typography fontSize={12.5} fontWeight={searchCat === label ? 700 : 400}
                        color={searchCat === label ? color : '#333'} noWrap>
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Menu>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSearch} sx={{ flex: 1, display: 'flex', height: 36, borderRadius: 0.5, overflow: 'hidden', border: `1.5px solid ${ORANGE}` }}>
              <InputBase placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                sx={{ flex: 1, px: 1.2, fontSize: 13, bgcolor: 'white', color: '#111',
                  '& input::placeholder': { color: '#444', opacity: 1 } }} />
              <Button type="submit" sx={{ bgcolor: ORANGE, borderRadius: 0, minWidth: 38, '&:hover': { bgcolor: ORANGE_HOVER } }}>
                <Search sx={{ fontSize: 18, color: '#111' }} />
              </Button>
            </Box>
          )}

          {/* ── RIGHT BUTTONS ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>

            {/* Compte / Connexion */}
            {user ? (
              <HBtn onClick={e => setAnchorEl(e.currentTarget)} sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 }}>Bonjour, {user.firstName}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 12.5, lineHeight: 1 }}>Mon Compte</Typography>
                  <KeyboardArrowDown sx={{ color: 'white', fontSize: 14 }} />
                </Box>
              </HBtn>
            ) : (
              <HBtn component={Link} to="/login" sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 }}>Bonjour, connectez-vous</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 12.5, lineHeight: 1 }}>Compte & Listes</Typography>
                  <KeyboardArrowDown sx={{ color: 'white', fontSize: 14 }} />
                </Box>
              </HBtn>
            )}

            {/* Commandes */}
            {!isMobile && (
              <HBtn component={Link} to="/account/orders" sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.2 }}>Retours &</Typography>
                <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 12.5, lineHeight: 1 }}>Commandes</Typography>
              </HBtn>
            )}

            {/* Panier */}
            <HBtn component={Link} to="/cart" sx={{ flexDirection: 'row', alignItems: 'flex-end', gap: 0.5, px: 1 }}>
              <Box sx={{ position: 'relative' }}>
                <ShoppingCart sx={{ color: 'white', fontSize: 32, display: 'block' }} />
                <Box sx={{ position: 'absolute', top: 0, right: -2, bgcolor: ORANGE, color: '#111',
                  borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 900, fontSize: 11, lineHeight: 1 }}>
                  {count}
                </Box>
              </Box>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 12.5, pb: 0.3 }}>Panier</Typography>
            </HBtn>
          </Box>
        </Box>

        {/* ══════════════════════════════════════════════
            BOTTOM BAR
        ══════════════════════════════════════════════ */}
        {!isMobile && (
          <Box sx={{
            bgcolor: '#191C1F',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            height: 40,
            display: 'flex', alignItems: 'stretch',
          }}>
            {/* Left: Categories button fixed */}
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
              <Box onClick={e => setCatAnchor(catAnchor ? null : e.currentTarget)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.8, px: 2, cursor: 'pointer',
                  bgcolor: Boolean(catAnchor) ? ORANGE : 'transparent',
                  borderRight: '1px solid rgba(255,255,255,0.1)',
                  transition: 'background 0.15s',
                  '&:hover': { bgcolor: Boolean(catAnchor) ? ORANGE : 'rgba(255,255,255,0.06)' },
                }}>
                <Apps sx={{ color: Boolean(catAnchor) ? '#111' : 'rgba(255,255,255,0.9)', fontSize: 15 }} />
                <Typography sx={{ color: Boolean(catAnchor) ? '#111' : 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: 13 }}>
                  Catégories
                </Typography>
                <KeyboardArrowDown sx={{
                  color: Boolean(catAnchor) ? '#111' : 'rgba(255,255,255,0.45)', fontSize: 14,
                  transform: Boolean(catAnchor) ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
                }} />
              </Box>
              <Menu anchorEl={catAnchor} open={Boolean(catAnchor)} onClose={() => setCatAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                PaperProps={{ elevation: 16, sx: {
                  borderRadius: '0 8px 8px 8px', width: 500, p: 2, mt: 0,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1.2, borderBottom: '1px solid #F0F0F0' }}>
                  <Apps sx={{ color: ORANGE, fontSize: 18 }} />
                  <Typography fontWeight={800} fontSize={13} color="#111" letterSpacing={0.5} sx={{ textTransform: 'uppercase' }}>
                    Toutes les categories
                  </Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
                  {CATS_MENU.map(({ label, icon: Icon, color, path }) => (
                    <Box key={label} component={Link} to={path} onClick={() => setCatAnchor(null)}
                      sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 1,
                        px: 1.2, py: 0.9, borderRadius: 1.5, border: '1px solid transparent', transition: 'all 0.15s',
                        '&:hover': { bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.2)}` } }}>
                      <Box sx={{ width: 30, height: 30, borderRadius: 1, bgcolor: alpha(color, 0.12),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon sx={{ fontSize: 16, color }} />
                      </Box>
                      <Typography fontWeight={500} fontSize={13} color="#222">{label}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box component={Link} to="/categories" onClick={() => setCatAnchor(null)}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1.5, pt: 1.2,
                    borderTop: '1px solid #F0F0F0', textDecoration: 'none', color: ORANGE, fontWeight: 700, fontSize: 13,
                    '&:hover': { color: '#e68900' } }}>
                  Voir toutes les categories &rsaquo;
                </Box>
              </Menu>
            </Box>

            {/* Center: scrollable nav links */}
            <Box sx={{
              flex: 1, display: 'flex', alignItems: 'stretch',
              overflowX: 'auto', overflowY: 'hidden',
              scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
            }}>
              {/* Flash sale */}
              <Box component={Link} to="/products?sale=true"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.6, px: 1.5, mx: 1, my: 'auto',
                  height: 26, background: 'linear-gradient(135deg, #CC0C39, #ff2557)',
                  borderRadius: '14px', textDecoration: 'none', flexShrink: 0,
                  boxShadow: '0 0 10px rgba(204,12,57,0.4)',
                  '&:hover': { opacity: 0.9 },
                }}>
                <FlashOn sx={{ fontSize: 13, color: 'white' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 12, color: 'white', whiteSpace: 'nowrap' }}>
                  Ventes Flash
                </Typography>
              </Box>

              {/* Category links */}
              {NAV_LINKS.filter(l => !l.hot).map(({ label, path }) => (
                <Box key={path} component={Link} to={path}
                  sx={{
                    textDecoration: 'none', display: 'flex', alignItems: 'center',
                    px: 1.3, flexShrink: 0, position: 'relative',
                    '&::after': {
                      content: '""', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                      width: 0, height: 2, bgcolor: ORANGE, transition: 'width 0.2s',
                    },
                    '&:hover::after': { width: '70%' },
                    '&:hover .nl': { color: 'white' },
                  }}>
                  <Typography className="nl" sx={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 400, whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Right: Sell CTA fixed */}
            <Box component={Link} to="/register?role=SELLER"
              sx={{
                display: 'flex', alignItems: 'center', px: 2, flexShrink: 0,
                borderLeft: '1px solid rgba(255,255,255,0.1)', textDecoration: 'none',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: 'rgba(255,153,0,0.1)' },
              }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: ORANGE, whiteSpace: 'nowrap' }}>
                Vendre sur DealPam
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Spacer */}
      <Box sx={{ height: spacerH }} />

      {/* ── User menu ── */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{ elevation: 12, sx: { mt: 0.5, borderRadius: 1.5, minWidth: 200, border: '1px solid #E5E7EB', overflow: 'hidden' } }}>
        <Box sx={{ px: 2, py: 1.5, bgcolor: BG }}>
          <Typography fontWeight={700} color="white" fontSize={13}>Bonjour, {user?.firstName}</Typography>
          <Typography fontSize={11} sx={{ color: 'rgba(255,255,255,0.5)' }}>{user?.email}</Typography>
        </Box>
        <Box sx={{ py: 0.5 }}>
          {[
            { label: 'Mon compte', path: '/account', color: '#2563EB' },
            { label: 'Mes commandes', path: '/account/orders', color: '#10B981' },
            { label: 'Mes favoris', path: '/account/wishlist', color: '#EC4899' },
            ...(user?.role === 'SELLER' ? [{ label: 'Ma boutique', path: '/seller', color: '#F59E0B' }] : []),
          ].map(({ label, path, color }) => (
            <MenuItem key={path} onClick={() => { navigate(path); setAnchorEl(null); }}
              sx={{ py: 1.1, fontSize: 13.5, '&:hover': { bgcolor: '#F9FAFB', color } }}>
              {label}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem onClick={() => { logout(); setAnchorEl(null); navigate('/'); }}
            sx={{ py: 1.1, color: '#EF4444', '&:hover': { bgcolor: '#FEF2F2' } }}>
            Deconnexion
          </MenuItem>
        </Box>
      </Menu>

      {/* ── Mobile Drawer ── */}
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 280, bgcolor: '#fff' } }}>
        <Box sx={{ bgcolor: BG, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 900, fontSize: 22, letterSpacing: '-0.5px', color: 'white' }}>
            Deal<span style={{ color: ORANGE }}>Pam</span>
          </Typography>
          <IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'rgba(255,255,255,0.6)', p: 0.5 }}><Close /></IconButton>
        </Box>
        <List dense sx={{ px: 1, pt: 0.5 }}>
          {[['/', 'Accueil'], ['/products', 'Produits'], ['/categories', 'Categories'], ['/stores', 'Boutiques'], ['/products?sale=true', 'Ventes Flash']].map(([path, label]) => (
            <ListItem key={path} component={Link} to={path} onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: 1.5, '&:hover': { bgcolor: '#F9FAFB' } }}>
              <ListItemText primary={label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
            </ListItem>
          ))}
        </List>
        <Divider />
        {user ? (
          <Box sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#F9FAFB', mb: 1 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: ORANGE, color: '#111', fontSize: 14, fontWeight: 900 }}>{user.firstName[0]}</Avatar>
              <Box><Typography fontWeight={700} fontSize={13.5}>{user.firstName}</Typography><Typography variant="caption" color="text.secondary">{user.email}</Typography></Box>
            </Box>
            <Button fullWidth variant="outlined" color="error" size="small" startIcon={<Logout />}
              onClick={() => { logout(); setMobileOpen(false); navigate('/'); }}>Deconnexion</Button>
          </Box>
        ) : (
          <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button component={Link} to="/login" fullWidth onClick={() => setMobileOpen(false)}
              sx={{ bgcolor: ORANGE, color: '#111', fontWeight: 700, borderRadius: 1.5, '&:hover': { bgcolor: ORANGE_HOVER } }}>
              Connexion
            </Button>
            <Button component={Link} to="/register" variant="outlined" fullWidth onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: 1.5, borderColor: BG, color: BG }}>S'inscrire</Button>
          </Box>
        )}
      </Drawer>
    </>
  );
}
