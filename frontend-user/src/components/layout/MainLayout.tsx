import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import SupportChatWidget from '../shared/SupportChatWidget';
import SilentErrorBoundary from '../shared/SilentErrorBoundary';
import FlyToCartLayer from '../shared/FlyToCartLayer';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';

export default function MainLayout() {
  const { user } = useAuthStore();
  const { fetchCount } = useCartStore();

  useEffect(() => {
    if (user) fetchCount();
  }, [user]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>
      <Header />
      <Box component="main" sx={{
        flex: 1,
        pb: { xs: 'calc(56px + env(safe-area-inset-bottom, 0px))', md: 0 },
        minHeight: '100vh',
      }}>
        <Outlet />
      </Box>
      <Footer />
      <MobileBottomNav />
      {/* Isole les erreurs : ce widget flottant est monte sur toutes les
          pages, une exception ici ne doit jamais casser checkout/panier/etc. */}
      <SilentErrorBoundary>
        <SupportChatWidget />
      </SilentErrorBoundary>
      <SilentErrorBoundary>
        <FlyToCartLayer />
      </SilentErrorBoundary>
    </Box>
  );
}
