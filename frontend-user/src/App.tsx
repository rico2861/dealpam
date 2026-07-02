import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth.store';

// Listens for token-expiry events from axios and redirects without page reload
function SessionWatcher() {
  const { logout } = useAuthStore();
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
  return null;
}

// Layout
import MainLayout from './components/layout/MainLayout';
import SellerLayout from './components/layout/SellerLayout';
import AuthLayout from './components/layout/AuthLayout';

// Public pages
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CategoriesPage from './pages/public/CategoriesPage';
import StoresPage from './pages/public/StoresPage';
import StoreDetailPage from './pages/public/StoreDetailPage';
import BoutiquePage from './pages/public/BoutiquePage';
import SearchPage from './pages/public/SearchPage';
import FlashSalePage from './pages/public/FlashSalePage';
import SupportPage from './pages/public/SupportPage';
import UnsubscribePage from './pages/public/UnsubscribePage';
import NotFoundPage from './pages/public/NotFoundPage';

// Legal pages
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import CookiesPage from './pages/legal/CookiesPage';
import LegalPage from './pages/legal/LegalPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Customer pages
import CustomerDashboard from './pages/customer/DashboardPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import MessagesPage from './pages/customer/MessagesPage';
import WishlistPage from './pages/account/WishlistPage';
import ProfilePage from './pages/customer/ProfilePage';
import BecomeSellerPage from './pages/customer/BecomeSellerPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';
import MoncashReturnHandler from './components/MoncashReturnHandler';
import ScrollToTop from './components/ScrollToTop';

// Seller pages
import SellerDashboard from './pages/seller/DashboardPage';
import SellerProductsPage from './pages/seller/ProductsPage';
import AddProductPage from './pages/seller/AddProductPage';
import EditProductPage from './pages/seller/EditProductPage';
import SellerOrdersPage from './pages/seller/OrdersPage';
import SellerSubscriptionPage from './pages/seller/SubscriptionPage';
import SellerStorePage from './pages/seller/StorePage';
import SellerAdsPage from './pages/seller/AdsPage';
import BoosterIaPage from './pages/seller/BoosterIaPage';
import SellerStoresPage from './pages/seller/StoresPage';
import SellerProfilePage from './pages/seller/ProfilePage';
import SellerChatPage from './pages/seller/ChatPage';
import SellerWalletPage from './pages/seller/WalletPage';
import StatisticsPage from './pages/seller/StatisticsPage';
import AddServicePage from './pages/seller/AddServicePage';
import AppointmentsPage from './pages/seller/AppointmentsPage';

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

export default function App() {
  const { user, refreshProfile } = useAuthStore();

  // Sync role & profile from server on every app load (handles role upgrades like buyer→seller)
  useEffect(() => { if (user) refreshProfile(); }, []); // eslint-disable-line

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <SessionWatcher />
        <ScrollToTop />
        <MoncashReturnHandler />

        <Routes>
          {/* Public */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/home" replace />} />
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
            <Route path="support" element={<SupportPage />} />
            <Route path="newsletter/unsubscribe" element={<UnsubscribePage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="cookies" element={<CookiesPage />} />
            <Route path="legal" element={<LegalPage />} />
          </Route>

          {/* Auth — with branded header + footer */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginGuard><LoginPage /></LoginGuard>} />
            <Route path="/register" element={<LoginGuard><RegisterPage /></LoginGuard>} />
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
            <Route path="services" element={<SellerProductsPage />} />
            <Route path="services/add" element={<AddServicePage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
