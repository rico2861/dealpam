import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, alpha, CircularProgress, Chip } from '@mui/material';
import {
  ShoppingBagOutlined, FavoriteBorderOutlined, PersonOutlined,
  ArrowForward, StorefrontOutlined, TrendingUpOutlined,
  LocalShippingOutlined, CheckCircleOutlined, PendingOutlined,
  CancelOutlined, InventoryOutlined,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import api from '../../api/axios';

const ORANGE = '#FF6B00';
const GREEN  = '#10B981';
const BLUE   = '#3B82F6';
const PURPLE = '#8B5CF6';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente', CONFIRMED: 'Confirmée', PREPARING: 'En préparation',
  SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', CONFIRMED: BLUE, PREPARING: PURPLE,
  SHIPPED: BLUE, DELIVERED: GREEN, CANCELLED: '#EF4444',
};
const STATUS_ICON: Record<string, any> = {
  PENDING: PendingOutlined, CONFIRMED: CheckCircleOutlined, PREPARING: InventoryOutlined,
  SHIPPED: LocalShippingOutlined, DELIVERED: CheckCircleOutlined, CANCELLED: CancelOutlined,
};

function StatCard({ icon: Icon, label, value, color, to }: any) {
  const navigate = useNavigate();
  return (
    <Box onClick={() => to && navigate(to)} sx={{
      p: { xs: 2, sm: 2.5 }, borderRadius: '18px', cursor: to ? 'pointer' : 'default',
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      transition: 'all 0.22s',
      '&:hover': to ? {
        background: 'rgba(255,255,255,0.05)',
        borderColor: alpha(color, 0.35),
        transform: 'translateY(-2px)',
        boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
      } : {},
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: '12px',
          bgcolor: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.2)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 20, color }} />
        </Box>
        {to && <ArrowForward sx={{ fontSize: 15, color: 'rgba(255,255,255,0.2)' }} />}
      </Box>
      <Typography sx={{ fontWeight: 900, fontSize: { xs: 24, sm: 28 }, color: 'white', letterSpacing: '-1px', lineHeight: 1 }}>
        {value ?? <CircularProgress size={18} sx={{ color }} />}
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', mt: 0.5, fontWeight: 500 }}>{label}</Typography>
    </Box>
  );
}

function QuickAction({ icon: Icon, label, sub, color, to }: any) {
  return (
    <Box component={Link} to={to} sx={{
      display: 'flex', alignItems: 'center', gap: 1.8,
      p: 2, borderRadius: '16px', textDecoration: 'none',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      transition: 'all 0.18s',
      '&:hover': {
        background: alpha(color, 0.07),
        borderColor: alpha(color, 0.25),
        '& .qa-arrow': { color, transform: 'translateX(3px)' },
      },
    }}>
      <Box sx={{ width: 42, height: 42, borderRadius: '13px', flexShrink: 0,
        bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.18)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon sx={{ fontSize: 20, color }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.82)', lineHeight: 1.3 }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', mt: 0.2 }}>{sub}</Typography>
      </Box>
      <ArrowForward className="qa-arrow" sx={{ fontSize: 16, color: 'rgba(255,255,255,0.2)', transition: 'all 0.18s' }} />
    </Box>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => api.get('/orders/me').then(r => r.data),
  });

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist').then(r => r.data),
  });

  const totalOrders    = orders?.length ?? null;
  const deliveredCount = orders?.filter((o: any) => o.status === 'DELIVERED').length ?? null;
  const activeCount    = orders?.filter((o: any) => !['DELIVERED','CANCELLED'].includes(o.status)).length ?? null;
  const wishCount      = Array.isArray(wishlist) ? wishlist.length : (wishlist?.items?.length ?? null);

  const recentOrders = (orders ?? []).slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonsoir' : 'Bonsoir';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#060B14', py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3, lg: 4 } }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>

        {/* ── Hero greeting ── */}
        <Box sx={{
          mb: { xs: 3, sm: 4 }, p: { xs: 2.5, sm: 3.5 }, borderRadius: '22px', position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #0F1E3A 0%, #0A1220 60%, #160C1A 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* Glow */}
          <Box sx={{ position: 'absolute', width: 400, height: 400, top: '-30%', right: '-5%', borderRadius: '50%', pointerEvents: 'none',
            background: `radial-gradient(circle, ${alpha(ORANGE, 0.08)} 0%, transparent 60%)` }} />
          {/* Grid */}
          <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.018,
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '44px 44px' }} />

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, mb: 1.5,
                px: 1.4, py: 0.5, borderRadius: '20px', bgcolor: alpha(ORANGE, 0.1), border: `1px solid ${alpha(ORANGE, 0.22)}` }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: ORANGE,
                  animation: 'ping 2s ease-in-out infinite', '@keyframes ping': { '0%,100%': { opacity: 1, transform: 'scale(1)' }, '50%': { opacity: 0.4, transform: 'scale(0.85)' } } }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: ORANGE }}>Compte actif</Typography>
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 28 }, color: 'white', letterSpacing: '-0.8px', lineHeight: 1.15 }}>
                {greeting}, <Box component="span" sx={{ color: ORANGE }}>{user?.firstName}</Box>
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.32)', mt: 0.6 }}>
                Bienvenue sur votre espace personnel DealPam.
              </Typography>
            </Box>
            {user?.role === 'BUYER' && (
              <Box component={Link} to="/become-seller" sx={{
                display: 'flex', alignItems: 'center', gap: 1.2, textDecoration: 'none',
                px: 2.2, py: 1.1, borderRadius: '14px',
                background: `linear-gradient(135deg, ${alpha(ORANGE, 0.18)}, ${alpha(ORANGE, 0.07)})`,
                border: `1.5px solid ${alpha(ORANGE, 0.28)}`,
                transition: 'all 0.2s',
                '&:hover': { borderColor: alpha(ORANGE, 0.5), transform: 'translateY(-1px)' },
              }}>
                <StorefrontOutlined sx={{ fontSize: 18, color: ORANGE }} />
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Devenir vendeur</Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>Ouvrez votre boutique</Typography>
                </Box>
                <ArrowForward sx={{ fontSize: 14, color: ORANGE, ml: 0.5 }} />
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Stats grid ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: { xs: 3, sm: 4 } }}>
          <StatCard icon={ShoppingBagOutlined}   label="Commandes"        value={ordersLoading ? null : totalOrders}    color={ORANGE}  to="/account/orders" />
          <StatCard icon={LocalShippingOutlined}  label="En cours"         value={ordersLoading ? null : activeCount}    color={BLUE}    to="/account/orders" />
          <StatCard icon={CheckCircleOutlined}    label="Livrées"          value={ordersLoading ? null : deliveredCount} color={GREEN}   to="/account/orders" />
          <StatCard icon={FavoriteBorderOutlined} label="Favoris"          value={wishCount ?? '—'}                      color={PURPLE}  to="/account/wishlist" />
        </Box>

        {/* ── Main content ── */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, gap: { xs: 2, sm: 3 } }}>

          {/* Recent orders */}
          <Box sx={{ p: { xs: 2, sm: 3 }, borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'white' }}>Commandes récentes</Typography>
              <Box component={Link} to="/account/orders" sx={{
                display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none',
                fontSize: 12.5, fontWeight: 700, color: ORANGE,
                '&:hover': { opacity: 0.8 },
              }}>
                Voir tout <ArrowForward sx={{ fontSize: 13 }} />
              </Box>
            </Box>

            {ordersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} sx={{ color: ORANGE }} />
              </Box>
            ) : recentOrders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
                  bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBagOutlined sx={{ fontSize: 26, color: 'rgba(255,255,255,0.2)' }} />
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, mb: 2 }}>Aucune commande pour l'instant</Typography>
                <Box component={Link} to="/products" sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.8, textDecoration: 'none',
                  px: 2.5, py: 1, borderRadius: '12px',
                  background: `linear-gradient(135deg, ${ORANGE}, #e05e00)`,
                  color: 'white', fontSize: 13.5, fontWeight: 700,
                  boxShadow: `0 4px 16px ${alpha(ORANGE, 0.35)}`,
                }}>
                  Explorer les produits <ArrowForward sx={{ fontSize: 15 }} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {recentOrders.map((order: any) => {
                  const StatusIcon = STATUS_ICON[order.status] ?? PendingOutlined;
                  const sc = STATUS_COLOR[order.status] ?? ORANGE;
                  const firstItem = order.items?.[0];
                  return (
                    <Box component={Link} to={`/account/orders/${order.id}`} key={order.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      p: { xs: 1.5, sm: 2 }, borderRadius: '14px', textDecoration: 'none',
                      border: '1px solid rgba(255,255,255,0.05)',
                      bgcolor: 'rgba(255,255,255,0.018)',
                      transition: 'all 0.16s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: alpha(sc, 0.25) },
                    }}>
                      {/* Thumb */}
                      <Box sx={{ width: { xs: 44, sm: 52 }, height: { xs: 44, sm: 52 }, borderRadius: '12px', flexShrink: 0,
                        bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {firstItem?.product?.images?.[0]?.url
                          ? <Box component="img" src={firstItem.product.images[0].url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <ShoppingBagOutlined sx={{ fontSize: 20, color: 'rgba(255,255,255,0.2)' }} />}
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                          {firstItem?.product?.name ?? `Commande #${order.id.slice(-6).toUpperCase()}`}
                          {order.items?.length > 1 ? ` +${order.items.length - 1} article${order.items.length > 2 ? 's' : ''}` : ''}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.28)', mt: 0.3 }}>
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5, justifyContent: 'flex-end' }}>
                          <StatusIcon sx={{ fontSize: 13, color: sc }} />
                          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: sc }}>{STATUS_LABEL[order.status]}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'white' }}>
                          {Number(order.totalAmount ?? 0).toLocaleString('fr-FR')} HTG
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Right column: quick actions + profile snippet */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Quick actions */}
            <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14, color: 'white', mb: 2 }}>Accès rapide</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                <QuickAction icon={ShoppingBagOutlined}   label="Mes commandes"   sub="Suivre & gérer"       color={ORANGE}  to="/account/orders" />
                <QuickAction icon={FavoriteBorderOutlined} label="Mes favoris"     sub="Articles sauvegardés" color={PURPLE}  to="/account/wishlist" />
                <QuickAction icon={PersonOutlined}         label="Mon profil"      sub="Infos & sécurité"     color={BLUE}    to="/account/profile" />
                <QuickAction icon={TrendingUpOutlined}     label="Explorer"        sub="Nouveaux produits"    color={GREEN}   to="/products" />
              </Box>
            </Box>

            {/* Profile snippet */}
            <Box sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '14px', flexShrink: 0,
                  bgcolor: alpha(ORANGE, 0.15), border: `1.5px solid ${alpha(ORANGE, 0.25)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, color: ORANGE }}>
                  {user?.firstName?.[0]}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={user?.role === 'SELLER' ? 'Vendeur' : 'Acheteur'} size="small"
                  sx={{ height: 22, fontSize: 10.5, fontWeight: 700, borderRadius: '8px',
                    bgcolor: alpha(ORANGE, 0.12), color: ORANGE, border: `1px solid ${alpha(ORANGE, 0.22)}` }} />
                {user?.city && (
                  <Chip label={user.city} size="small"
                    sx={{ height: 22, fontSize: 10.5, fontWeight: 600, borderRadius: '8px',
                      bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }} />
                )}
              </Box>

              <Box component={Link} to="/account/profile" sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, textDecoration: 'none',
                mt: 2, py: 1, borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,0.08)',
                bgcolor: 'rgba(255,255,255,0.03)',
                fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)',
                transition: 'all 0.18s',
                '&:hover': { borderColor: alpha(ORANGE, 0.35), color: ORANGE, bgcolor: alpha(ORANGE, 0.05) },
              }}>
                Modifier le profil <ArrowForward sx={{ fontSize: 14 }} />
              </Box>
            </Box>

          </Box>
        </Box>
      </Box>
    </Box>
  );
}
