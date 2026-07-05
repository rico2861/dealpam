import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, IconButton, Avatar, Chip, Divider, useMediaQuery, useTheme, Badge, Tooltip, alpha } from '@mui/material';
import { Dashboard, People, Store, Inventory, ShoppingBag, Payment, Subscriptions, Category, BrandingWatermark, Reviews, Settings, Menu as MenuIcon, Logout, Notifications, FlashOn, Campaign, Tag, Label, Timer, ViewCarousel, SupportAgent, Storefront, AdminPanelSettings, Handshake, WorkspacePremium } from '@mui/icons-material';
import { useAdminStore } from '../../store/admin.store';

// Roles that each menu item is visible to (empty = all staff roles allowed)
type MenuItem = { path: string; label: string; icon: any; exact?: boolean; roles?: string[] };

const ALL_STAFF = ['ADMIN','SUPER_ADMIN','MODERATOR','CUSTOMER_CARE','PARTNER','ACCOUNTANT'];
const ADMIN_ONLY = ['ADMIN','SUPER_ADMIN'];
const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#EF4444', SUPER_ADMIN: '#7C3AED', MODERATOR: '#F59E0B',
  CUSTOMER_CARE: '#3B82F6', PARTNER: '#10B981', ACCOUNTANT: '#F97316',
};

const MENU: MenuItem[] = [
  { path: '/',              label: 'Tableau de bord',  icon: Dashboard,          exact: true, roles: [...ADMIN_ONLY, 'MODERATOR', 'CUSTOMER_CARE', 'ACCOUNTANT'] },
  { path: '/partner',       label: 'Mon tableau de bord', icon: Handshake,       exact: true, roles: ['PARTNER'] },
  { path: '/sellers',       label: 'Vendeurs',         icon: Store,              roles: [...ADMIN_ONLY, 'MODERATOR'] },
  { path: '/products',      label: 'Produits',         icon: Inventory,          roles: [...ADMIN_ONLY, 'MODERATOR'] },
  { path: '/orders',        label: 'Commandes',        icon: ShoppingBag,        roles: [...ADMIN_ONLY, 'MODERATOR', 'CUSTOMER_CARE'] },
  { path: '/users',         label: 'Utilisateurs',     icon: People,             roles: ADMIN_ONLY },
  { path: '/staff',         label: 'Équipe',           icon: AdminPanelSettings, roles: ADMIN_ONLY },
  { path: '/payments',      label: 'Paiements',        icon: Payment,            roles: [...ADMIN_ONLY, 'ACCOUNTANT'] },
  { path: '/subscriptions', label: 'Abonnements',      icon: Subscriptions,      roles: [...ADMIN_ONLY, 'ACCOUNTANT'] },
  { path: '/plans',         label: 'Plans',            icon: WorkspacePremium,   roles: ADMIN_ONLY },
  { path: '/categories',    label: 'Catégories',       icon: Category,           roles: ADMIN_ONLY },
  { path: '/brands',        label: 'Marques',          icon: BrandingWatermark,  roles: ADMIN_ONLY },
  { path: '/reviews',       label: 'Avis',             icon: Reviews,            roles: [...ADMIN_ONLY, 'MODERATOR', 'CUSTOMER_CARE'] },
  { path: '/flash-sale',    label: 'Ventes Flash',     icon: Timer,              roles: [...ADMIN_ONLY, 'MODERATOR'] },
  { path: '/promotions',    label: 'Promotions',       icon: FlashOn,            roles: [...ADMIN_ONLY, 'PARTNER'] },
  { path: '/ads',           label: 'Publicités',       icon: Campaign,           roles: [...ADMIN_ONLY, 'PARTNER'] },
  { path: '/tags',          label: 'Tags',             icon: Tag,                roles: ADMIN_ONLY },
  { path: '/labels',        label: 'Labels',           icon: Label,              roles: ADMIN_ONLY },
  { path: '/banners',       label: 'Pubs Homepage',    icon: ViewCarousel,       roles: [...ADMIN_ONLY, 'PARTNER'] },
  { path: '/boutique',      label: 'Boutique DealPam', icon: Storefront,         roles: [...ADMIN_ONLY, 'PARTNER'] },
  { path: '/chat',          label: 'Support Chat',     icon: SupportAgent,       roles: [...ADMIN_ONLY, 'MODERATOR', 'CUSTOMER_CARE'] },
  { path: '/settings',      label: 'Paramètres',       icon: Settings,           roles: ADMIN_ONLY },
];

const W = 248;

export default function AdminLayout() {
  const { admin, logout } = useAdminStore();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/');

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: '#0F172A', display: 'flex', flexDirection: 'column' }}>
      {/* Brand */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #FF9900, #e68900)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(255,153,0,0.4)' }}>
            <Typography sx={{ color: '#111', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>D</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: 'white', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Deal<span style={{ color: '#FF9900' }}>Pam</span>
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Admin Panel</Typography>
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <List sx={{ flex: 1, px: 1.5, py: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.4 }}>
        {MENU.filter(item => !item.roles || item.roles.includes(admin?.role ?? '')).map(({ path, label, icon: Icon, exact }) => {
          const active = isActive(path, exact);
          return (
            <Tooltip title={label} placement="right" key={path} disableHoverListener>
              <ListItem component={Link} to={path} onClick={() => setOpen(false)}
                sx={{ borderRadius: 2.5, px: 1.5, py: 1.1,
                  bgcolor: active ? alpha('#FF9900', 0.2) : 'transparent',
                  border: '1px solid', borderColor: active ? alpha('#FF9900', 0.35) : 'transparent',
                  '&:hover': { bgcolor: active ? alpha('#FF9900', 0.25) : 'rgba(255,255,255,0.05)' },
                  transition: 'all 0.15s',
                }}>
                <ListItemIcon sx={{ color: active ? '#FF9900' : 'rgba(255,255,255,0.4)', minWidth: 34 }}>
                  <Icon sx={{ fontSize: 19 }} />
                </ListItemIcon>
                <ListItemText primary={label}
                  primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'white' : 'rgba(255,255,255,0.6)' }} />
              </ListItem>
            </Tooltip>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* User */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(255,255,255,0.04)', mb: 1 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#FF9900', fontSize: 13, fontWeight: 700 }}>
            {admin?.firstName?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden', flex: 1 }}>
            <Typography variant="body2" color="white" fontWeight={600} noWrap fontSize={13}>{admin?.firstName} {admin?.lastName}</Typography>
            <Chip label={admin?.role?.replace('_', ' ')} size="small" sx={{ height: 16, fontSize: 9, bgcolor: alpha(ROLE_COLORS[admin?.role ?? ''] || '#FF9900', 0.25), color: ROLE_COLORS[admin?.role ?? ''] || '#FF9900', mt: 0.3 }} />
          </Box>
        </Box>
        <ListItem onClick={() => { logout(); navigate('/login'); }}
          sx={{ borderRadius: 2, py: 0.8, gap: 1, cursor: 'pointer', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}>
          <Logout fontSize="small" sx={{ color: 'rgba(255,255,255,0.4)' }} />
          <ListItemText primary="Déconnexion" primaryTypographyProps={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }} />
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F1F5F9' }}>
      {isMobile && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: '#0F172A', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton color="inherit" onClick={() => setOpen(true)}><MenuIcon /></IconButton>
            <Typography variant="h6" fontWeight={800} sx={{ ml: 1.5, color: 'white' }}>Admin Panel</Typography>
            <Box sx={{ ml: 'auto' }}>
              <IconButton color="inherit">
                <Badge badgeContent={3} color="error"><Notifications sx={{ fontSize: 22 }} /></Badge>
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      <Drawer variant={isMobile ? 'temporary' : 'permanent'} open={isMobile ? open : true} onClose={() => setOpen(false)}
        sx={{ width: W, '& .MuiDrawer-paper': { width: W, border: 'none', boxSizing: 'border-box' } }}>
        {drawer}
      </Drawer>

      <Box sx={{ flex: 1, ml: isMobile ? 0 : `${W}px`, pt: isMobile ? 8 : 0, minHeight: '100vh' }}>
        {!isMobile && (
          <Box sx={{ bgcolor: 'white', borderBottom: '1px solid rgba(0,0,0,0.06)', px: 3, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
            <IconButton size="small" sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={3} color="error"><Notifications fontSize="small" /></Badge>
            </IconButton>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
              {admin?.firstName?.[0]?.toUpperCase()}
            </Avatar>
          </Box>
        )}
        <Outlet />
      </Box>
    </Box>
  );
}
