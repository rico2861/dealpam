import { useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useAdminStore } from './store/admin.store';
import { useInactivityLogout } from './hooks/useInactivityLogout';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 min — panel admin (KYC, paiements)
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import SellersPage from './pages/sellers/SellersPage';
import ProductsPage from './pages/products/ProductsPage';
import OrdersPage from './pages/orders/OrdersPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import PlansPage from './pages/subscriptions/PlansPage';
import CouponsPage from './pages/coupons/CouponsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import BrandsPage from './pages/brands/BrandsPage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import SettingsPage from './pages/settings/SettingsPage';
import PromotionsPage from './pages/promotions/PromotionsPage';
import AdsAdminPage from './pages/ads/AdsAdminPage';
import TagsPage from './pages/tags/TagsPage';
import LabelsPage from './pages/labels/LabelsPage';
import FlashSalePage from './pages/flash-sale/FlashSalePage';
import BannersPage from './pages/banners/BannersPage';
import ChatMonitorPage from './pages/chat/ChatMonitorPage';
import BoutiquePage from './pages/boutique/BoutiquePage';
import StaffPage from './pages/staff/StaffPage';
import PartnerPage from './pages/partner/PartnerPage';
import InvestorLayout from './components/layout/InvestorLayout';
import ChangePasswordPage from './pages/ChangePasswordPage';
import InvestorSellersPage from './pages/partner/InvestorSellersPage';
import InvestorAdsPage from './pages/partner/InvestorAdsPage';
import InvestorClientsPage from './pages/partner/InvestorClientsPage';
import InvestorOrdersPage from './pages/partner/InvestorOrdersPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#FF9900', dark: '#e68900', light: '#FFB703' },
    secondary: { main: '#1a1a2e' },
    background: { default: '#f0f2f5' },
  },
  typography: { fontFamily: '"Roboto", sans-serif' },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } } },
    // @ts-ignore
    MuiDataGrid: { styleOverrides: { root: { border: 'none', borderRadius: 12, '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8f9fa' } } } },
  },
});

// ── Role-based access map ─────────────────────────────────────────────────

const ADMIN_ONLY  = ['ADMIN', 'SUPER_ADMIN'];
const ADMIN_MOD   = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];

/** Which roles can access each path. Undefined = all authenticated staff. */
const ROUTE_ROLES: Record<string, string[]> = {
  '/':             ['ADMIN', 'SUPER_ADMIN'],
  '/sellers':      [...ADMIN_MOD],
  '/products':     [...ADMIN_MOD],
  '/orders':       [...ADMIN_MOD, 'CUSTOMER_CARE'],
  '/users':        ADMIN_ONLY,
  '/staff':        ADMIN_ONLY,
  '/payments':     [...ADMIN_ONLY, 'ACCOUNTANT'],
  '/subscriptions':[...ADMIN_ONLY, 'ACCOUNTANT'],
  '/plans':        ADMIN_ONLY,
  '/coupons':      ADMIN_ONLY,
  '/categories':   ADMIN_ONLY,
  '/brands':       ADMIN_ONLY,
  '/reviews':      [...ADMIN_MOD, 'CUSTOMER_CARE'],
  '/flash-sale':   [...ADMIN_MOD],
  '/promotions':   [...ADMIN_ONLY, 'PARTNER'],
  '/ads':          [...ADMIN_ONLY, 'PARTNER'],
  '/tags':         ADMIN_ONLY,
  '/labels':       ADMIN_ONLY,
  '/banners':      [...ADMIN_ONLY, 'PARTNER'],
  '/boutique':     [...ADMIN_ONLY, 'PARTNER'],
  '/chat':         [...ADMIN_MOD, 'CUSTOMER_CARE'],
  '/settings':     ADMIN_ONLY,
  '/partner':      ['PARTNER'],
};

/** First page the role lands on after login. */
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/', SUPER_ADMIN: '/', MODERATOR: '/sellers',
  CUSTOMER_CARE: '/orders', PARTNER: '/partner', ACCOUNTANT: '/payments',
};

function canAccess(role: string, path: string): boolean {
  const allowed = ROUTE_ROLES[path];
  if (!allowed) return true; // unlisted route → open to all staff
  return allowed.includes(role);
}

// ── Guards ────────────────────────────────────────────────────────────────

/** Redirects to /login if not authenticated. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAdminStore();
  const onInactive = useCallback(() => {
    sessionStorage.setItem('logout_reason', 'Déconnecté pour inactivité');
    logout();
  }, [logout]);
  useInactivityLogout(INACTIVITY_TIMEOUT_MS, onInactive, !!admin);

  if (!admin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Silently redirects to the role's home if the role cannot access the path. */
function RoleGuard({ children, path }: { children: React.ReactNode; path: string }) {
  const { admin } = useAdminStore();
  if (!admin) return null;
  if (!canAccess(admin.role, path)) {
    const home = ROLE_HOME[admin.role] ?? '/';
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

/** If mustChangePassword is true, force the user to /change-password before anything else. */
function MustChangeGuard({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminStore();
  if (admin?.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <>{children}</>;
}

function RoleHome() {
  const { admin } = useAdminStore();
  const home = ROLE_HOME[admin?.role ?? ''] ?? '/';
  if (home === '/') return <DashboardPage />;
  return <Navigate to={home} replace />;
}

// ── App ───────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<AuthGuard><ChangePasswordPage /></AuthGuard>} />
          {/* Investor portal — completely separate layout, no admin chrome */}
          <Route path="/partner" element={<AuthGuard><MustChangeGuard><InvestorLayout /></MustChangeGuard></AuthGuard>}>
            <Route index element={<RoleGuard path="/partner"><PartnerPage /></RoleGuard>} />
            <Route path="sellers" element={<RoleGuard path="/partner"><InvestorSellersPage /></RoleGuard>} />
            <Route path="ads"     element={<RoleGuard path="/partner"><InvestorAdsPage /></RoleGuard>} />
            <Route path="clients" element={<RoleGuard path="/partner"><InvestorClientsPage /></RoleGuard>} />
            <Route path="orders"  element={<RoleGuard path="/partner"><InvestorOrdersPage /></RoleGuard>} />
          </Route>

          <Route path="/" element={<AuthGuard><MustChangeGuard><AdminLayout /></MustChangeGuard></AuthGuard>}>
            <Route index element={<RoleHome />} />
            <Route path="users"         element={<RoleGuard path="/users">        <UsersPage /></RoleGuard>} />
            <Route path="staff"         element={<RoleGuard path="/staff">        <StaffPage /></RoleGuard>} />
            <Route path="sellers"       element={<RoleGuard path="/sellers">      <SellersPage /></RoleGuard>} />
            <Route path="products"      element={<RoleGuard path="/products">     <ProductsPage /></RoleGuard>} />
            <Route path="orders"        element={<RoleGuard path="/orders">       <OrdersPage /></RoleGuard>} />
            <Route path="payments"      element={<RoleGuard path="/payments">     <PaymentsPage /></RoleGuard>} />
            <Route path="subscriptions" element={<RoleGuard path="/subscriptions"><SubscriptionsPage /></RoleGuard>} />
            <Route path="plans" element={<RoleGuard path="/plans"><PlansPage /></RoleGuard>} />
            <Route path="coupons" element={<RoleGuard path="/coupons"><CouponsPage /></RoleGuard>} />
            <Route path="categories"    element={<RoleGuard path="/categories">   <CategoriesPage /></RoleGuard>} />
            <Route path="brands"        element={<RoleGuard path="/brands">       <BrandsPage /></RoleGuard>} />
            <Route path="reviews"       element={<RoleGuard path="/reviews">      <ReviewsPage /></RoleGuard>} />
            <Route path="settings"      element={<RoleGuard path="/settings">     <SettingsPage /></RoleGuard>} />
            <Route path="promotions"    element={<RoleGuard path="/promotions">   <PromotionsPage /></RoleGuard>} />
            <Route path="ads"           element={<RoleGuard path="/ads">          <AdsAdminPage /></RoleGuard>} />
            <Route path="flash-sale"    element={<RoleGuard path="/flash-sale">   <FlashSalePage /></RoleGuard>} />
            <Route path="tags"          element={<RoleGuard path="/tags">         <TagsPage /></RoleGuard>} />
            <Route path="labels"        element={<RoleGuard path="/labels">       <LabelsPage /></RoleGuard>} />
            <Route path="banners"       element={<RoleGuard path="/banners">      <BannersPage /></RoleGuard>} />
            <Route path="chat"          element={<RoleGuard path="/chat">         <ChatMonitorPage /></RoleGuard>} />
            <Route path="boutique"      element={<RoleGuard path="/boutique">     <BoutiquePage /></RoleGuard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
