import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useAdminStore } from './store/admin.store';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import SellersPage from './pages/sellers/SellersPage';
import ProductsPage from './pages/products/ProductsPage';
import OrdersPage from './pages/orders/OrdersPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import BrandsPage from './pages/brands/BrandsPage';
import ReviewsPage from './pages/reviews/ReviewsPage';
import SettingsPage from './pages/settings/SettingsPage';
import PromotionsPage from './pages/promotions/PromotionsPage';
import AdsAdminPage from './pages/ads/AdsAdminPage';

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
    MuiDataGrid: { styleOverrides: { root: { border: 'none', borderRadius: 12, '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f8f9fa' } } } },
  },
});

function Guard({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminStore();
  if (!admin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Guard><AdminLayout /></Guard>}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="sellers" element={<SellersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="promotions" element={<PromotionsPage />} />
            <Route path="ads" element={<AdsAdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
