import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Avatar, Badge, IconButton, Drawer,
  useMediaQuery, useTheme, Tooltip,
} from '@mui/material';
import {
  Dashboard, Inventory, ShoppingBag, Subscriptions, Store,
  Menu as MenuIcon, Logout, ArrowBack, Campaign, Chat,
  Description, AccountBalanceWallet, AutoAwesome, BarChart,
  Add, KeyboardArrowRight, Close, CalendarMonth, MedicalServices,
  Verified, HourglassTopRounded,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const SIDE = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const W    = 240;

const GROUPS = [
  {
    label: 'Principal',
    items: [
      { path: '/seller',          label: 'Dashboard',   icon: Dashboard,            badge: '' },
      { path: '/seller/orders',   label: 'Commandes',   icon: ShoppingBag,          badge: 'pendingOrders' },
      { path: '/seller/products', label: 'Produits',    icon: Inventory,            badge: '' },
      { path: '/seller/chat',     label: 'Messages',    icon: Chat,                 badge: 'unreadMessages' },
    ],
  },
  {
    label: 'Services',
    items: [
      { path: '/seller/services',     label: 'Mes Services', icon: MedicalServices, badge: '' },
      { path: '/seller/appointments', label: 'Rendez-vous',  icon: CalendarMonth,   badge: 'pendingAppointments' },
    ],
  },
  {
    label: 'Boutique',
    items: [
      { path: '/seller/stores',     label: 'Boutiques',    icon: Store,       badge: '' },
      { path: '/seller/ads',        label: 'Publicites',   icon: Campaign,    badge: '' },
      { path: '/seller/booster-ia', label: 'Booster IA',   icon: AutoAwesome, badge: '' },
      { path: '/seller/statistics', label: 'Statistiques', icon: BarChart,    badge: '' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { path: '/seller/wallet',       label: 'Wallet',     icon: AccountBalanceWallet, badge: '' },
      { path: '/seller/profile',      label: 'Profil',     icon: Description,          badge: '' },
      { path: '/seller/subscription', label: 'Abonnement', icon: Subscriptions,        badge: '' },
    ],
  },
];

function NavItem({ path, label, icon: Icon, count, onClick }: {
  path: string; label: string; icon: any; count?: number; onClick?: () => void;
}) {
  const location = useLocation();
  const active = path === '/seller'
    ? location.pathname === '/seller'
    : location.pathname.startsWith(path);

  return (
    <Box component={Link} to={path} onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1,
        borderRadius: '10px', mb: 0.5, textDecoration: 'none', transition: 'all 0.15s',
        bgcolor: active ? 'rgba(255,107,0,0.12)' : 'transparent',
        border: '1px solid',
        borderColor: active ? 'rgba(255,107,0,0.28)' : 'transparent',
        '&:hover': { bgcolor: active ? 'rgba(255,107,0,0.14)' : 'rgba(15,23,42,0.09)', borderColor: 'rgba(15,23,42,0.09)' },
      }}>
      <Box sx={{ flexShrink: 0 }}>
        {count && count > 0 ? (
          <Badge badgeContent={count} color="error"
            sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 15, minWidth: 15 } }}>
            <Icon sx={{ fontSize: 18, color: active ? OR : SUB }} />
          </Badge>
        ) : (
          <Icon sx={{ fontSize: 18, color: active ? OR : SUB }} />
        )}
      </Box>
      <Typography sx={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? TXT : SUB, flex: 1 }}>
        {label}
      </Typography>
      {active && <KeyboardArrowRight sx={{ fontSize: 14, color: OR, opacity: 0.7 }} />}
    </Box>
  );
}

function SidebarContent({ badges, onClose, stats }: {
  badges: Record<string, number>;
  onClose?: () => void;
  stats?: any;
}) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isApproved = stats?.sellerStatus === 'APPROVED';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: SIDE }}>

      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BORD}`, flexShrink: 0 }}>
        <Box component={Link} to="/" sx={{ textDecoration: 'none' }}>
          <Typography sx={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.5px', color: TXT, lineHeight: 1 }}>
            Deal<span style={{ color: OR }}>Pam</span>
          </Typography>
          <Typography sx={{ fontSize: 10, color: SUB, mt: 0.2 }}>Espace Vendeur</Typography>
        </Box>
        {onClose && (
          <IconButton onClick={onClose} size="small"
            sx={{ color: SUB, borderRadius: '8px', '&:hover': { color: TXT, bgcolor: 'rgba(15,23,42,0.09)' } }}>
            <Close fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Status pill */}
      {stats && (
        <Box sx={{
          mx: 2, mt: 1.5, mb: 0.5, px: 1.6, py: 1.1, borderRadius: '12px',
          background: isApproved
            ? 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.05))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.05))',
          border: `1px solid ${isApproved ? 'rgba(16,185,129,0.28)' : 'rgba(245,158,11,0.28)'}`,
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <Box sx={{
            width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: isApproved ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)',
          }}>
            {isApproved
              ? <Store sx={{ fontSize: 15, color: '#34D399' }} />
              : <HourglassTopRounded sx={{ fontSize: 14, color: '#FCD34D' }} />}
          </Box>
          <Typography fontSize={12.5} fontWeight={700} color={isApproved ? '#34D399' : '#FCD34D'} noWrap sx={{ flex: 1 }}>
            {isApproved ? 'Boutique active' : 'En attente d\'approbation'}
          </Typography>
          {stats.isVerified && (
            <Box sx={{
              ml: 'auto', px: 0.9, py: 0.35, borderRadius: '7px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0.4,
              bgcolor: 'rgba(16,185,129,0.16)', border: '1px solid rgba(16,185,129,0.35)',
            }}>
              <Verified sx={{ fontSize: 12, color: '#34D399' }} />
              <Typography fontSize={9.5} fontWeight={800} color="#34D399" letterSpacing="0.3px">VÉRIFIÉ</Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1, scrollbarWidth: 'thin', scrollbarColor: 'rgba(15,23,42,0.09) transparent', '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(15,23,42,0.09)', borderRadius: 3, '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } } }}>
        {GROUPS.map((g, gi) => (
          <Box key={gi} sx={{ mb: 2 }}>
            <Typography sx={{ px: 1.5, mb: 0.8, fontSize: 9.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {g.label}
            </Typography>
            {g.items.map(({ path, label, icon, badge }) => (
              <NavItem key={path} path={path} label={label} icon={icon}
                count={badge ? badges[badge] : 0} onClick={onClose} />
            ))}
          </Box>
        ))}
      </Box>

      {/* CTA buttons */}
      <Box sx={{ mx: 1.5, mb: 1.5, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
        <Box component={Link} to="/seller/products/add" onClick={onClose}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, borderRadius: '10px', textDecoration: 'none', bgcolor: 'rgba(255,107,0,0.11)', border: '1px solid rgba(255,107,0,0.25)', '&:hover': { bgcolor: 'rgba(255,107,0,0.18)' }, transition: 'all 0.15s' }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '6px', bgcolor: OR, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Add sx={{ fontSize: 16, color: '#fff' }} />
          </Box>
          <Typography fontSize={13} fontWeight={700} color={OR}>Ajouter un produit</Typography>
        </Box>
        <Box component={Link} to="/seller/services/add" onClick={onClose}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, borderRadius: '10px', textDecoration: 'none', bgcolor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', '&:hover': { bgcolor: 'rgba(16,185,129,0.14)' }, transition: 'all 0.15s' }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '6px', bgcolor: '#10B981', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MedicalServices sx={{ fontSize: 14, color: '#fff' }} />
          </Box>
          <Typography fontSize={13} fontWeight={700} color="#10B981">Ajouter un service</Typography>
        </Box>
      </Box>

      <Box sx={{ borderTop: `1px solid ${BORD}`, flexShrink: 0 }} />

      {/* User card */}
      <Box sx={{ p: 1.5, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2, borderRadius: '10px', bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}`, mb: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: OR, color: '#fff', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
            {user?.firstName?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Typography fontSize={13} fontWeight={600} color={TXT} noWrap>{user?.firstName} {user?.lastName}</Typography>
            <Typography fontSize={10.5} color={SUB} noWrap>{user?.email}</Typography>
          </Box>
        </Box>
        <Box component="a" href="mailto:sellers@dealpam.com"
          sx={{ display: 'block', textAlign: 'center', mb: 1, py: 0.6, borderRadius: '8px', textDecoration: 'none',
            bgcolor: 'rgba(255,107,0,0.06)', border: `1px solid rgba(255,107,0,0.15)`, '&:hover': { bgcolor: 'rgba(255,107,0,0.1)' } }}>
          <Typography fontSize={11} color={OR}>Besoin d'aide ? sellers@dealpam.com</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.8 }}>
          <Box component={Link} to="/" onClick={onClose}
            sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.8, px: 1.2, py: 0.9, borderRadius: '8px', textDecoration: 'none', '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' }, transition: 'all 0.15s' }}>
            <ArrowBack sx={{ fontSize: 14, color: SUB }} />
            <Typography fontSize={12} color={SUB}>Marketplace</Typography>
          </Box>
          <Box onClick={() => { logout(); navigate('/'); }}
            sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.8, px: 1.2, py: 0.9, borderRadius: '8px', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' }, transition: 'all 0.15s' }}>
            <Logout sx={{ fontSize: 14, color: SUB }} />
            <Typography fontSize={12} color={SUB}>Déconnexion</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function SellerLayout() {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['sellerStats'],
    queryFn: () => api.get('/dashboard/seller').then(r => r.data),
    refetchInterval: 30000,
    enabled: !!localStorage.getItem('accessToken'),
  });

  const { data: apptData } = useQuery({
    queryKey: ['sellerAppointmentsBadge'],
    queryFn: () => api.get('/appointments/seller').then(r => r.data),
    refetchInterval: 60000,
    enabled: !!localStorage.getItem('accessToken'),
    select: (d: any[]) => d.filter((a: any) => a.status === 'PENDING').length,
  });

  const badges: Record<string, number> = {
    pendingOrders:       stats?.pendingOrders ?? 0,
    unreadMessages:      0,
    pendingAppointments: apptData ?? 0,
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', bgcolor: BG }}>

      {!isMobile && (
        <Box sx={{ width: W, flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, borderRight: `1px solid ${BORD}`, zIndex: 100 }}>
          <SidebarContent badges={badges} stats={stats} />
        </Box>
      )}

      {isMobile && (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
          PaperProps={{ sx: { width: W, bgcolor: SIDE, border: 'none' } }}>
          <SidebarContent badges={badges} stats={stats} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, ml: isMobile ? 0 : `${W}px`, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {isMobile && (
          <Box sx={{ position: 'sticky', top: 0, zIndex: 50, bgcolor: SIDE, borderBottom: `1px solid ${BORD}`, px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => setDrawerOpen(true)} size="small"
              sx={{ color: TXT, bgcolor: 'rgba(15,23,42,0.06)', borderRadius: '8px', p: '7px', '&:hover': { bgcolor: 'rgba(15,23,42,0.09)' } }}>
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography fontWeight={900} sx={{ color: TXT, fontSize: 19, letterSpacing: '-0.5px', flex: 1, lineHeight: 1 }}>
              Deal<span style={{ color: OR }}>Pam</span>
              <Typography component="span" sx={{ fontSize: 10, color: SUB, ml: 0.5 }}>Vendeur</Typography>
            </Typography>
            {badges.pendingOrders > 0 && (
              <Tooltip title={`${badges.pendingOrders} commande(s) en attente`}>
                <Box component={Link} to="/seller/orders" sx={{ textDecoration: 'none' }}>
                  <Badge badgeContent={badges.pendingOrders} color="error">
                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: 'rgba(15,23,42,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShoppingBag sx={{ fontSize: 18, color: '#475569' }} />
                    </Box>
                  </Badge>
                </Box>
              </Tooltip>
            )}
            <Tooltip title="Ajouter un produit">
              <Box component={Link} to="/seller/products/add"
                sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: OR, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', '&:hover': { bgcolor: '#E05A00' }, transition: 'all 0.15s' }}>
                <Add sx={{ fontSize: 18, color: '#fff' }} />
              </Box>
            </Tooltip>
          </Box>
        )}

        <Box sx={{ flex: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
