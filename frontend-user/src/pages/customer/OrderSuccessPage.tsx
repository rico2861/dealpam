import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, alpha, Divider } from '@mui/material';
import {
  CheckCircle, ShoppingBag, ArrowForward, Storefront,
  LocalShipping, DirectionsWalk, Phone, Email, LocationOn,
  Smartphone, AttachMoney, AccountBalance, CreditCard, ChatBubbleOutline,
} from '@mui/icons-material';
import { useEffect } from 'react';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const GRN  = '#10B981';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.09)';
const SHADOW = '0 2px 12px rgba(15,23,42,0.05)';

const PAYMENT_LABELS: Record<string, { label: string; Icon: any; color: string }> = {
  MONCASH:       { label: 'MonCash',          Icon: Smartphone,     color: OR },
  NATCASH:       { label: 'NatCash',          Icon: Smartphone,     color: '#003087' },
  CASH:          { label: 'Cash à la livraison', Icon: AttachMoney, color: GRN },
  BANK_TRANSFER: { label: 'Virement bancaire', Icon: AccountBalance, color: '#6366F1' },
  OTHER:         { label: 'Autre méthode',    Icon: CreditCard,     color: '#64748B' },
};

const DELIVERY_LABELS: Record<string, string> = {
  DELIVERY: 'Livraison à domicile',
  PICKUP:   'Retrait en boutique',
  CONTACT:  'Contact direct vendeur',
};

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  // state must be passed from CheckoutPage: { orders, storeInfo, selectedPayment }
  const orders: any[]    = state?.orders ?? [];
  const storeInfo: any   = state?.storeInfo ?? null;
  const sellerUserId: string | null = state?.sellerUserId ?? null;

  // Redirect if no order data (direct URL access)
  useEffect(() => {
    if (orders.length === 0) navigate('/account/orders', { replace: true });
  }, []);

  if (orders.length === 0) return null;

  const firstOrder = orders[0];
  const payment    = PAYMENT_LABELS[firstOrder?.chosenPaymentMethod] ?? null;
  const delivType  = firstOrder?.deliveryType ?? 'DELIVERY';

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 6 }}>
      <Box sx={{ maxWidth: 520, width: '100%' }}>

        {/* Success header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          {/* Animated checkmark ring */}
          <Box sx={{ position: 'relative', width: 96, height: 96, mx: 'auto', mb: 3 }}>
            <Box sx={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2px solid ${alpha(GRN, 0.2)}`,
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%,100%': { transform: 'scale(1)', opacity: 0.6 },
                '50%': { transform: 'scale(1.12)', opacity: 0.2 },
              },
            }} />
            <Box sx={{
              position: 'absolute', inset: 8, borderRadius: '50%',
              bgcolor: alpha(GRN, 0.1), border: `1.5px solid ${alpha(GRN, 0.3)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle sx={{ fontSize: 44, color: GRN }} />
            </Box>
          </Box>

          <Typography fontWeight={900} fontSize={28} color="#0F172A" letterSpacing="-0.5px" mb={1}>
            Commande passée !
          </Typography>
          <Typography fontSize={14} color="#94A3B8" lineHeight={1.7}>
            Votre commande a été transmise au vendeur avec succès.
          </Typography>

          {/* Order number(s) */}
          {orders.map((o: any) => (
            <Box key={o.id} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1,
              mt: 1.5, px: 2, py: 0.6, borderRadius: '20px',
              bgcolor: alpha(GRN, 0.08), border: `1px solid ${alpha(GRN, 0.2)}` }}>
              <Typography fontSize={13} fontWeight={700} color={GRN} fontFamily="monospace">
                #{o.id.slice(-8).toUpperCase()}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Order summary card */}
        <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '20px', overflow: 'hidden', mb: 2 }}>

          {/* Items */}
          {firstOrder?.items?.length > 0 && (
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${BORD}` }}>
              <Typography fontSize={11.5} fontWeight={700} color="#94A3B8"
                textTransform="uppercase" letterSpacing="0.6px" mb={1.5}>
                Articles commandés
              </Typography>
              {firstOrder.items.map((item: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography fontSize={13} color="#0F172A" sx={{
                    flex: 1, overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                    {item.productName} × {item.quantity}
                  </Typography>
                  <Typography fontSize={13} fontWeight={600} color="#0F172A" flexShrink={0} ml={1}>
                    {Number(item.subtotal).toLocaleString()} HTG
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ borderColor: BORD, mt: 1.2, mb: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography fontWeight={800} fontSize={14} color="#0F172A">Total</Typography>
                <Typography fontWeight={900} fontSize={16} color={OR}>
                  {Number(firstOrder.totalHTG ?? firstOrder.subtotalHTG ?? 0).toLocaleString()} HTG
                </Typography>
              </Box>
            </Box>
          )}

          {/* Delivery + payment info */}
          <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              {delivType === 'PICKUP'
                ? <DirectionsWalk sx={{ fontSize: 16, color: '#94A3B8', flexShrink: 0 }} />
                : <LocalShipping sx={{ fontSize: 16, color: '#94A3B8', flexShrink: 0 }} />
              }
              <Typography fontSize={13} color="#0F172A">
                {DELIVERY_LABELS[delivType] ?? delivType}
                {firstOrder?.pickupPointName && ` — ${firstOrder.pickupPointName}`}
              </Typography>
            </Box>

            {payment && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <payment.Icon sx={{ fontSize: 16, color: payment.color, flexShrink: 0 }} />
                <Typography fontSize={13} color="#0F172A">
                  Paiement : <Box component="span" fontWeight={700} color="#0F172A">{payment.label}</Box>
                </Typography>
              </Box>
            )}

            {storeInfo?.moncashPhone && ['MONCASH', 'NATCASH'].includes(firstOrder?.chosenPaymentMethod) && (
              <Box sx={{ mt: 0.5, p: 1.5, bgcolor: alpha(OR, 0.07), borderRadius: '12px', border: `1px solid ${alpha(OR, 0.2)}` }}>
                <Typography fontSize={12} color="#94A3B8" mb={0.5}>
                  Numéro {PAYMENT_LABELS[firstOrder.chosenPaymentMethod]?.label} du vendeur :
                </Typography>
                <Typography fontWeight={900} fontSize={20} letterSpacing={2} color={OR}>
                  {storeInfo.moncashPhone}
                </Typography>
                <Typography fontSize={11.5} color="#94A3B8" mt={0.5}>
                  Effectuez le paiement puis soumettez votre référence dans "Mes commandes".
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Seller contact card */}
        {storeInfo && (
          <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '20px', px: 2.5, py: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
              <Storefront sx={{ fontSize: 16, color: OR }} />
              <Typography fontSize={13} fontWeight={700} color="#0F172A">
                {storeInfo.name}
              </Typography>
            </Box>

            {storeInfo.phone && (
              <Box component="a" href={`tel:${storeInfo.phone}`}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8, textDecoration: 'none' }}>
                <Phone sx={{ fontSize: 14, color: '#94A3B8' }} />
                <Typography fontSize={13} color="#94A3B8">{storeInfo.phone}</Typography>
              </Box>
            )}
            {storeInfo.email && (
              <Box component="a" href={`mailto:${storeInfo.email}`}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8, textDecoration: 'none' }}>
                <Email sx={{ fontSize: 14, color: '#94A3B8' }} />
                <Typography fontSize={13} color="#94A3B8">{storeInfo.email}</Typography>
              </Box>
            )}
            {(storeInfo.address || storeInfo.city) && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.8 }}>
                <LocationOn sx={{ fontSize: 14, color: '#94A3B8', mt: 0.2, flexShrink: 0 }} />
                <Typography fontSize={13} color="#94A3B8">
                  {[storeInfo.address, storeInfo.city, storeInfo.department].filter(Boolean).join(', ')}
                </Typography>
              </Box>
            )}

            {sellerUserId && (
              <Button component={Link} to={`/account/messages/${sellerUserId}`}
                variant="outlined" fullWidth startIcon={<ChatBubbleOutline sx={{ fontSize: 16 }} />}
                sx={{ mt: 1, borderColor: alpha(OR, 0.3), color: OR, fontWeight: 700, fontSize: 13,
                  borderRadius: '12px', textTransform: 'none', py: 1,
                  '&:hover': { bgcolor: alpha(OR, 0.07), borderColor: OR } }}>
                Écrire au vendeur
              </Button>
            )}
          </Box>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button component={Link} to="/account/orders" variant="outlined" sx={{
            flex: 1, py: 1.4, borderRadius: '14px', fontWeight: 700, fontSize: 13.5,
            textTransform: 'none', borderColor: BORD, color: '#475569',
            '&:hover': { borderColor: 'rgba(15,23,42,0.18)', color: '#0F172A', bgcolor: '#FFFFFF' },
          }}>
            Mes commandes
          </Button>
          <Button component={Link} to="/products" variant="contained" endIcon={<ArrowForward />} sx={{
            flex: 1.3, py: 1.4, borderRadius: '14px', fontWeight: 800, fontSize: 13.5,
            textTransform: 'none', bgcolor: OR, color: 'white', '&:hover': { bgcolor: '#E05A00' },
            boxShadow: `0 4px 20px ${alpha(OR, 0.4)}`,
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography fontSize={10} fontWeight={500} color="rgba(255,255,255,0.75)" lineHeight={1}>Continuer</Typography>
              <Typography fontSize={13.5} fontWeight={800} lineHeight={1.3} color="white">mes achats</Typography>
            </Box>
          </Button>
        </Box>

        {/* Shopping bag icon bottom */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 3 }}>
          <ShoppingBag sx={{ fontSize: 14, color: '#CBD5E1' }} />
          <Typography fontSize={12} color="#94A3B8">
            DealPam · Marketplace Haïtienne
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
