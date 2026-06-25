import { Container, Typography, Card, CardContent, Box, Chip, Button, CircularProgress, Divider } from '@mui/material';
import { ShoppingBag } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, any> = { PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'info', SHIPPED: 'primary', DELIVERED: 'success', CANCELLED: 'error' };
const STATUS_LABEL: Record<string, string> = { PENDING: 'En attente', CONFIRMED: 'Confirmée', PREPARING: 'En préparation', SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée' };

export default function OrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => api.get('/orders/me').then(r => r.data),
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!orders?.length) return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <ShoppingBag sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" fontWeight={700} mb={2}>Aucune commande</Typography>
      <Button variant="contained" component={Link} to="/products">Commencer mes achats</Button>
    </Container>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Mes commandes</Typography>
      {orders.map((order: any) => (
        <Card key={order.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Commande #{order.id.slice(-8).toUpperCase()}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(order.createdAt).toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip label={STATUS_LABEL[order.status] || order.status} size="small" color={STATUS_COLOR[order.status]} />
                <Typography variant="subtitle1" fontWeight={700} color="primary">{Number(order.totalHTG).toLocaleString()} HTG</Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={1}>🏪 {order.store?.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(order.items || []).slice(0, 3).map((item: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f5f5f5', px: 1, py: 0.5, borderRadius: 1 }}>
                  {item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 2 }} />}
                  <Typography variant="caption">{item.productName} x{item.quantity}</Typography>
                </Box>
              ))}
              {order.items?.length > 3 && <Typography variant="caption" color="text.secondary">+{order.items.length - 3} autres</Typography>}
            </Box>
            <Button component={Link} to={`/account/orders/${order.id}`} size="small" sx={{ mt: 1 }}>Voir les détails →</Button>
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}
