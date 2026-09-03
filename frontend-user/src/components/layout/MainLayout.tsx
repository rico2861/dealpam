import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import SupportChatWidget from '../shared/SupportChatWidget';
import SilentErrorBoundary from '../shared/SilentErrorBoundary';
import FlyToCartLayer from '../shared/FlyToCartLayer';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';
import { getMoncashTransactionId } from '../../utils/moncashParam';

export default function MainLayout() {
  const { user } = useAuthStore();
  const { fetchCount } = useCartStore();
  const location = useLocation();

  useEffect(() => {
    if (user) fetchCount();
  }, [user]);

  // Le compte marchand MonCash étant partagé, MonCash atterrit parfois sur
  // "/" ou "/home" au lieu de l'URL de retour configurée (vu en prod) —
  // sans ça, le header/footer DealPam s'affichait quand même autour du
  // contenu vide pendant que MoncashReturnHandler vérifie encore le
  // paiement. Uniquement sur ces deux chemins précis (jamais sur les autres
  // pages utilisant ce layout) et seulement le temps de la vérification.
  const hasPendingMoncashReturn =
    (location.pathname === '/' || location.pathname === '/home') &&
    (!!getMoncashTransactionId(location.search) ||
      sessionStorage.getItem('moncashVerifyPending') === '1');
  if (hasPendingMoncashReturn) return <Outlet />;

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
