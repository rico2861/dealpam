import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { Suspense, lazy, useCallback, useEffect } from 'react';
import { useAuthStore } from './store/auth.store';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { getMoncashTransactionId } from './utils/moncashParam';
import PaymentVerifyingScreen from './components/shared/PaymentVerifyingScreen';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 min — client/vendeur (wallet, paiements)

// Listens for token-expiry events from axios and redirects without page reload
function SessionWatcher() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  useEffect(() => {
    const handler = async (e: Event) => {
      const reason = (e as CustomEvent).detail?.reason;
      // await logout so Zustand clears user BEFORE navigating
      // (prevents login page from seeing stale user and redirecting to /home)
      await logout();
      navigate(`/login${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, { replace: true });
    };
    window.addEventListener('auth:session-expired', handler);
    return () => window.removeEventListener('auth:session-expired', handler);
  }, []); // eslint-disable-line

  const onInactive = useCallback(() => {
    // Code court (pas de texte brut) — le libellé affiché est résolu côté
    // LoginPage, pour ne pas exposer de message humain dans l'URL.
    window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason: 'inactivity' } }));
  }, []);
  useInactivityLogout(INACTIVITY_TIMEOUT_MS, onInactive, !!user);

  return null;
}

// Layout
import MainLayout from './components/layout/MainLayout';
import SellerLayout from './components/layout/SellerLayout';
import AuthLayout from './components/layout/AuthLayout';

// MainLayout/SellerLayout/AuthLayout et HomePage restent en chargement immédiat
// (premier écran affiché à l'utilisateur) ; toutes les ~45 autres pages passent
// en React.lazy — auparavant tout (vendeur, admin, légal...) partait dans le
// même bundle initial, alourdissant le premier chargement pour tout le monde.
import HomePage from './pages/public/HomePage';
import MoncashReturnHandler from './components/MoncashReturnHandler';
import CookieConsentBanner from './components/shared/CookieConsentBanner';
import ScrollToTop from './components/ScrollToTop';

// Public pages
const ProductsPage       = lazy(() => import('./pages/public/ProductsPage'));
const ProductDetailPage  = lazy(() => import('./pages/public/ProductDetailPage'));
const CategoriesPage     = lazy(() => import('./pages/public/CategoriesPage'));
const StoresPage         = lazy(() => import('./pages/public/StoresPage'));
const StoreDetailPage    = lazy(() => import('./pages/public/StoreDetailPage'));
const BoutiquePage       = lazy(() => import('./pages/public/BoutiquePage'));
const SearchPage         = lazy(() => import('./pages/public/SearchPage'));
const FlashSalePage      = lazy(() => import('./pages/public/FlashSalePage'));
const SupportPage        = lazy(() => import('./pages/public/SupportPage'));
const UnsubscribePage    = lazy(() => import('./pages/public/UnsubscribePage'));
const NotFoundPage       = lazy(() => import('./pages/public/NotFoundPage'));

// Legal pages
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const TermsPage   = lazy(() => import('./pages/legal/TermsPage'));
const CookiesPage = lazy(() => import('./pages/legal/CookiesPage'));
const LegalPage   = lazy(() => import('./pages/legal/LegalPage'));

// Auth pages
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Customer pages
const CustomerDashboard = lazy(() => import('./pages/customer/DashboardPage'));
const OrdersPage        = lazy(() => import('./pages/customer/OrdersPage'));
const OrderDetailPage   = lazy(() => import('./pages/customer/OrderDetailPage'));
const MessagesPage      = lazy(() => import('./pages/customer/MessagesPage'));
const WishlistPage      = lazy(() => import('./pages/account/WishlistPage'));
const ProfilePage       = lazy(() => import('./pages/customer/ProfilePage'));
const BecomeSellerPage  = lazy(() => import('./pages/customer/BecomeSellerPage'));
const CartPage          = lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage      = lazy(() => import('./pages/customer/CheckoutPage'));
const OrderSuccessPage  = lazy(() => import('./pages/customer/OrderSuccessPage'));
const ThankYouPage      = lazy(() => import('./pages/customer/ThankYouPage'));
const TransactionDesignTestPage = lazy(() => import('./pages/customer/TransactionDesignTestPage'));
const CrossAppPaymentReturnPage = lazy(() => import('./pages/customer/CrossAppPaymentReturnPage'));

// Seller pages
const SellerDashboard       = lazy(() => import('./pages/seller/DashboardPage'));
const SellerProductsPage    = lazy(() => import('./pages/seller/ProductsPage'));
const AddProductPage        = lazy(() => import('./pages/seller/AddProductPage'));
const EditProductPage       = lazy(() => import('./pages/seller/EditProductPage'));
const SellerOrdersPage      = lazy(() => import('./pages/seller/OrdersPage'));
const SellerSubscriptionPage = lazy(() => import('./pages/seller/SubscriptionPage'));
const SellerStorePage       = lazy(() => import('./pages/seller/StorePage'));
const SellerAdsPage         = lazy(() => import('./pages/seller/AdsPage'));
const BoosterIaPage         = lazy(() => import('./pages/seller/BoosterIaPage'));
const SellerStoresPage      = lazy(() => import('./pages/seller/StoresPage'));
const SellerProfilePage     = lazy(() => import('./pages/seller/ProfilePage'));
const SellerChatPage        = lazy(() => import('./pages/seller/ChatPage'));
const SellerWalletPage      = lazy(() => import('./pages/seller/WalletPage'));
const StatisticsPage        = lazy(() => import('./pages/seller/StatisticsPage'));
const AddServicePage        = lazy(() => import('./pages/seller/AddServicePage'));
const AppointmentsPage      = lazy(() => import('./pages/seller/AppointmentsPage'));

// Fallback minimal pendant le chargement d'une page en lazy — un centre d'écran
// simple suffit, la page a déjà layout/header/footer chargés autour d'elle.
function RouteFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <CircularProgress size={32} sx={{ color: '#FF9900' }} />
    </Box>
  );
}

const theme = createTheme({
  palette: {
    primary: { main: '#FF9900', dark: '#e68900', contrastText: '#111' },
    secondary: { main: '#131921' },
    background: { default: '#F4F5F7', paper: '#FFFFFF' },
  },
  typography: { fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif' },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10, textTransform: 'none', fontWeight: 600 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    // Le label flottant ("Boutique", "Nom de la campagne"...) restait parfois figé à
    // mi-hauteur, chevauchant la bordure du champ au lieu de se rétracter proprement
    // au-dessus — surtout dans les Dialog (l'animation d'entrée Grow empêche MUI de
    // mesurer correctement le label au premier rendu). Forcer shrink:true partout
    // règle ce glitch sur TOUS les champs (TextField et Select) d'un coup.
    MuiInputLabel: { defaultProps: { shrink: true } },
  },
});

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuthStore();
  const hasToken = !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
  if (!user || !hasToken) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

// Login guard: only redirect to /home if BOTH user AND valid token exist
function LoginGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const hasToken = !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
  if (user && hasToken) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

// Le compte marchand MonCash étant partagé et son URL de retour parfois mal
// respectée par MonCash lui-même (vu en prod : atterrit sur "/" au lieu de
// /order-received/thank-you/), un <Navigate to="/home"> immédiat et
// inconditionnel ici écraserait l'URL (donc le ?transactionId=...) avant
// même que MoncashReturnHandler ait fini de lire/traiter le paramètre —
// react-router's Navigate ne préserve pas la query string. On temporise :
// tant qu'un retour MonCash est en cours, on ne rend rien plutôt que de
// naviguer, MoncashReturnHandler prend le relais une fois résolu.
function HomeRedirect() {
  const hasPendingMoncashReturn =
    !!getMoncashTransactionId(window.location.search) ||
    sessionStorage.getItem('moncashVerifyPending') === '1';
  if (hasPendingMoncashReturn) return <PaymentVerifyingScreen />;
  return <Navigate to="/home" replace />;
}

export default function App() {
  const { user, refreshProfile, hasHydrated } = useAuthStore();

  // Sync role & profile from server on every app load (handles role upgrades like buyer→seller).
  // Sauf si un retour MonCash est en cours (transactionId dans l'URL) : si le
  // token stocké est périmé, cet appel déclenche un refresh qui échoue puis
  // un logout global (SessionWatcher -> navigate('/login')) -- un aller-
  // retour parasite vers une page brandée DealPam pendant que
  // MoncashReturnHandler est encore en train de vérifier le paiement
  // (confondu avec "ça affiche la home"), avant que la vraie redirection
  // (DealPam ou app externe) ne prenne le dessus. On teste la présence du
  // paramètre plutôt qu'un chemin précis : le compte marchand MonCash étant
  // partagé, son URL de retour configurée peut en pratique atterrir sur
  // n'importe quelle page (vu en prod : www.dealpam.com/?transactionId=...
  // au lieu de /order-received/thank-you/, MonCash ne respectant pas
  // toujours l'URL configurée dans son propre portail marchand).
  useEffect(() => {
    const hasPendingMoncashReturn = !!getMoncashTransactionId(window.location.search);
    if (user && !hasPendingMoncashReturn) refreshProfile();
  }, []); // eslint-disable-line

  // NOTE : le gate bloquant sur hasHydrated a été retiré (2026-07) — il a provoqué
  // un écran de chargement infini en production (BootScreen figé indéfiniment,
  // site totalement inaccessible) quand le callback onRehydrateStorage de
  // zustand/persist ne s'est pas déclenché comme prévu dans cet environnement.
  // `hasHydrated` reste disponible dans le store pour un usage futur non-bloquant,
  // mais ne doit plus jamais conditionner le rendu de toute l'app.
  void hasHydrated;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <SessionWatcher />
        <ScrollToTop />
        <MoncashReturnHandler />
        <CookieConsentBanner />

        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="home" element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="stores" element={<StoresPage />} />
            <Route path="store/:slug" element={<StoreDetailPage />} />
            <Route path="boutique/:slug" element={<BoutiquePage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="ventes-flash" element={<FlashSalePage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="order-success" element={<OrderSuccessPage />} />
            <Route path="test/transaction-design" element={<TransactionDesignTestPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="newsletter/unsubscribe" element={<UnsubscribePage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="cookies" element={<CookiesPage />} />
            <Route path="legal" element={<LegalPage />} />
          </Route>

          {/* Page de retour MonCash — hors MainLayout : le compte marchand est
              partagé avec d'autres apps (PeguyTBN...) et son URL de retour est
              fixe (dealpam.com/order-received/thank-you), donc CETTE page peut
              recevoir un client qui n'a jamais eu de session/compte DealPam.
              Tant que l'app propriétaire de la transaction n'est pas identifiée,
              rien de marque DealPam ne doit s'afficher (voir ThankYouPage). */}
          <Route path="/order-received/thank-you" element={<ThankYouPage />} />
          <Route path="/payments/return/:appTag" element={<CrossAppPaymentReturnPage />} />

          {/* Auth — with branded header + footer */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginGuard><LoginPage /></LoginGuard>} />
            <Route path="/register" element={<LoginGuard><RegisterPage /></LoginGuard>} />
            {/* Lien court et propre pour les campagnes/pubs vendeur — évite d'exposer
                "?role=SELLER" en clair dans l'URL partagée (WhatsApp, réseaux sociaux). */}
            <Route path="/vendre" element={<LoginGuard><RegisterPage forceRole="SELLER" /></LoginGuard>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Become seller (protected, any authenticated role) */}
          <Route path="/become-seller" element={<ProtectedRoute><BecomeSellerPage /></ProtectedRoute>} />

          {/* Customer */}
          <Route path="/account" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            {/* Une seule page pour la liste + le fil de discussion (comme seller/ChatPage) —
                :userId est optionnel, juste utilisé pour ouvrir directement une conversation. */}
            <Route path="messages" element={<MessagesPage />} />
            <Route path="messages/:userId" element={<MessagesPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="checkout" element={<CheckoutPage />} />
          </Route>

          {/* Seller */}
          <Route path="/seller" element={<ProtectedRoute roles={['SELLER']}><SellerLayout /></ProtectedRoute>}>
            <Route index element={<SellerDashboard />} />
            <Route path="products" element={<SellerProductsPage />} />
            <Route path="products/add" element={<AddProductPage />} />
            <Route path="products/edit/:id" element={<EditProductPage />} />
            <Route path="orders" element={<SellerOrdersPage />} />
            <Route path="subscription" element={<SellerSubscriptionPage />} />
            <Route path="store" element={<SellerStorePage />} />
            <Route path="stores" element={<SellerStoresPage />} />
            <Route path="ads" element={<SellerAdsPage />} />
            <Route path="booster-ia" element={<BoosterIaPage />} />
            <Route path="profile" element={<SellerProfilePage />} />
            <Route path="chat" element={<SellerChatPage />} />
            <Route path="wallet" element={<SellerWalletPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="services" element={<SellerProductsPage mode="services" />} />
            <Route path="services/add" element={<AddServicePage />} />
            <Route path="services/edit/:id" element={<AddServicePage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
