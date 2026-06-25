import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, IconButton, useMediaQuery, useTheme, Avatar, Divider, alpha, Tooltip } from '@mui/material';
import { Dashboard, Inventory, ShoppingBag, Subscriptions, Store, Menu as MenuIcon, Logout, ArrowBack, Campaign } from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';

const MENU = [
  { path: '/seller',              label: 'Tableau de bord', icon: Dashboard },
  { path: '/seller/products',     label: 'Mes produits',    icon: Inventory },
  { path: '/seller/orders',       label: 'Commandes',       icon: ShoppingBag },
  { path: '/seller/subscription', label: 'Abonnement',      icon: Subscriptions },
  { path: '/seller/store',        label: 'Ma boutique',     icon: Store },
  { path: '/seller/ads',          label: 'Publicités',      icon: Campaign },
];

const W = 240;

export default function SellerLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography sx={{ color: 'white', fontWeight: 900, fontSize: 16, lineHeight: 1 }}>D</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'white', letterSpacing: '-0.3px' }}>
            deal<span style={{ color: '#60A5FA' }}>pam</span>
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Espace Vendeur</Typography>
        </Box>
      </Box>

      <List sx={{ flex: 1, px: 1.5, py: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {MENU.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Tooltip title={label} placement="right" key={path}>
              <ListItem component={Link} to={path} onClick={() => setMobileOpen(false)}
                sx={{ borderRadius: 2.5, px: 1.5, py: 1.2,
                  bgcolor: active ? alpha('#2563EB', 0.2) : 'transparent',
                  border: '1px solid', borderColor: active ? alpha('#2563EB', 0.4) : 'transparent',
                  '&:hover': { bgcolor: active ? alpha('#2563EB', 0.25) : 'rgba(255,255,255,0.06)' },
                  transition: 'all 0.15s',
                }}>
                <ListItemIcon sx={{ color: active ? '#60A5FA' : 'rgba(255,255,255,0.45)', minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={label} primaryTypographyProps={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? 'white' : 'rgba(255,255,255,0.6)' }} />
              </ListItem>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.04)' }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#2563EB', fontSize: 13, fontWeight: 700 }}>
            {user?.firstName?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" color="white" fontWeight={600} noWrap fontSize={13}>{user?.firstName} {user?.lastName}</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Vendeur</Typography>
          </Box>
        </Box>
        <ListItem component={Link} to="/" sx={{ borderRadius: 2, py: 0.8, gap: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
          <ArrowBack fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
          <ListItemText primary="Retour au site" primaryTypographyProps={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }} />
        </ListItem>
        <ListItem onClick={() => { logout(); navigate('/'); }} sx={{ borderRadius: 2, py: 0.8, gap: 1, cursor: 'pointer', '&:hover': { bgcolor: alpha('#EF4444', 0.12) } }}>
          <Logout fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
          <ListItemText primary="Déconnexion" primaryTypographyProps={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }} />
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton color="inherit" onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>
            <Typography variant="h6" fontWeight={800} sx={{ ml: 1.5, color: 'white' }}>Espace Vendeur</Typography>
          </Toolbar>
        </AppBar>
      )}

      <Drawer variant={isMobile ? 'temporary' : 'permanent'} open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{ width: W, '& .MuiDrawer-paper': { width: W, border: 'none', boxSizing: 'border-box' } }}>
        {drawer}
      </Drawer>

      <Box sx={{ flex: 1, ml: isMobile ? 0 : `${W}px`, pt: isMobile ? 8 : 0, bgcolor: '#F1F5F9', minHeight: '100vh' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
