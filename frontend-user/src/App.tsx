import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useAuthStore } from './store/auth.store';

// Layout
import MainLayout from './components/layout/MainLayout';
import SellerLayout from './components/layout/SellerLayout';

// Public pages
import HomePage from './pages/public/HomePage';
import ProductsPage from './pages/public/ProductsPage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CategoriesPage from './pages/public/CategoriesPage';
import StoresPage from './pages/public/StoresPage';
import StoreDetailPage from './pages/public/StoreDetailPage';
import SearchPage from './pages/public/SearchPage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Customer pages
import CustomerDashboard from './pages/customer/DashboardPage';
import OrdersPage from './pages/customer/OrdersPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import WishlistPage from './pages/customer/WishlistPage';
import ProfilePage from './pages/customer/ProfilePage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';

// Seller pages
import SellerDashboard from './pages/seller/DashboardPage';
import SellerProductsPage from './pages/seller/ProductsPage';
import AddProductPage from './pages/seller/AddProductPage';
import EditProductPage from './pages/seller/EditProductPage';
import SellerOrdersPage from './pages/seller/OrdersPage';
import SellerSubscriptionPage from './pages/seller/SubscriptionPage';
import SellerStorePage from './pages/seller/StorePage';
import SellerAdsPage from './pages/seller/AdsPage';

const theme = createTheme({
  palette: {
    primary: { main: '#FF9900', dark: '#e68900', contrastText: '#111' },
    secondary: { main: '#131921' },
    background: { default: '#EAEDED', paper: '#FFFFFF' },
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
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuthStore();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="stores" element={<StoresPage />} />
            <Route path="store/:slug" element={<StoreDetailPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="cart" element={<CartPage />} />
          </Route>

          {/* Auth — redirect to home if already logged in */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Customer */}
          <Route path="/account" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
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
            <Route path="ads" element={<SellerAdsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
