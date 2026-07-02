import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Box, Typography, Button, Avatar, Chip, alpha, Tab, Tabs } from '@mui/material';
import { Logout, Handshake, Dashboard, Store, Campaign, Group, ShoppingBag } from '@mui/icons-material';
import { useAdminStore } from '../../store/admin.store';

const GRN = '#10B981';

const NAV = [
  { path: '/partner',          label: 'Tableau de bord', icon: Dashboard },
  { path: '/partner/sellers',  label: 'Vendeurs',        icon: Store },
  { path: '/partner/ads',      label: 'Publicités',      icon: Campaign },
  { path: '/partner/clients',  label: 'Clients',         icon: Group },
  { path: '/partner/orders',   label: 'Commandes',       icon: ShoppingBag },
];

export default function InvestorLayout() {
  const { admin, logout } = useAdminStore();
  const navigate  = useNavigate();
  const location  = useLocation();

  const active = NAV.findIndex(n =>
    n.path === '/partner'
      ? location.pathname === '/partner'
      : location.pathname.startsWith(n.path)
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8FAFC' }}>

      {/* Top bar */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 10,
        bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        {/* Brand + user row */}
        <Box sx={{ px: { xs: 2, md: 4 }, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '9px', background: 'linear-gradient(135deg,#FF9900,#e68900)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ color: '#111', fontWeight: 900, fontSize: 16, lineHeight: 1 }}>D</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 14, color: '#111', lineHeight: 1, letterSpacing: '-0.2px' }}>
                Deal<span style={{ color: '#FF9900' }}>Pam</span>
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: '#999', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Portail Investisseur</Typography>
            </Box>
            <Box sx={{ width: 1, height: 22, bgcolor: '#E5E7EB', mx: 1 }} />
            <Chip
              icon={<Handshake sx={{ fontSize: '12px !important', color: `${GRN} !important` }} />}
              label="Accès lecture seule"
              size="small"
              sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(GRN, 0.07), color: GRN, border: `1px solid ${alpha(GRN, 0.18)}` }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
              <Typography fontSize={13} fontWeight={700} color="#111">{admin?.firstName} {admin?.lastName}</Typography>
              <Typography fontSize={10.5} color="#999">{admin?.email}</Typography>
            </Box>
            <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(GRN, 0.12), color: GRN, fontWeight: 800, fontSize: 13 }}>
              {admin?.firstName?.[0]}
            </Avatar>
            <Button size="small" startIcon={<Logout sx={{ fontSize: 13 }} />}
              onClick={() => { logout(); navigate('/login'); }}
              sx={{ color: '#999', fontSize: 11.5, borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#FEF2F2', color: '#EF4444' } }}>
              Déconnexion
            </Button>
          </Box>
        </Box>

        {/* Horizontal nav */}
        <Box sx={{ px: { xs: 1, md: 3 }, borderTop: '1px solid #F1F5F9' }}>
          <Tabs value={active === -1 ? 0 : active}
            variant="scrollable" scrollButtons="auto"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': { minHeight: 44, fontSize: 12.5, fontWeight: 600, textTransform: 'none', color: '#94A3B8', px: 2, gap: 0.8 },
              '& .Mui-selected': { color: GRN, fontWeight: 700 },
              '& .MuiTabs-indicator': { bgcolor: GRN, height: 2.5, borderRadius: '2px 2px 0 0' },
            }}>
            {NAV.map(({ path, label, icon: Icon }) => (
              <Tab key={path} label={label} icon={<Icon sx={{ fontSize: 15 }} />} iconPosition="start"
                component={Link} to={path} />
            ))}
          </Tabs>
        </Box>
      </Box>

      {/* Content */}
      <Outlet />
    </Box>
  );
}
