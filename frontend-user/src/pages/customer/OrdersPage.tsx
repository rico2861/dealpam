import { useState } from 'react';
import { Box, Typography, alpha, CircularProgress } from '@mui/material';
import {
  ShoppingBagOutlined, LocalShippingOutlined, CheckCircleOutlined,
  PendingOutlined, CancelOutlined, InventoryOutlined, ArrowForward,
  StorefrontOutlined, FilterListOutlined,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { ListSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useAuthStore } from '../../store/auth.store';

const ORANGE = '#FF6B00';
const GREEN  = '#10B981';
const BLUE   = '#3B82F6';
const PURPLE = '#8B5CF6';
const YELLOW = '#F59E0B';
const RED    = '#EF4444';

const STATUS_META: Record<string, { label: string; color: string; Icon: any; bg: string }> = {
  PENDING:   { label: 'En attente',      color: YELLOW,  bg: alpha(YELLOW,  0.12), Icon: PendingOutlined },
  CONFIRMED: { label: 'Confirmée',       color: BLUE,    bg: alpha(BLUE,    0.12), Icon: CheckCircleOutlined },
  PREPARING: { label: 'En préparation',  color: PURPLE,  bg: alpha(PURPLE,  0.12), Icon: InventoryOutlined },
  SHIPPED:   { label: 'Expédiée',        color: BLUE,    bg: alpha(BLUE,    0.12), Icon: LocalShippingOutlined },
  DELIVERED: { label: 'Livrée',          color: GREEN,   bg: alpha(GREEN,   0.12), Icon: CheckCircleOutlined },
  CANCELLED: { label: 'Annulée',         color: RED,     bg: alpha(RED,     0.12), Icon: CancelOutlined },
};

const FILTERS = [
  { key: 'all',       label: 'Toutes' },
  { key: 'PENDING',   label: 'En attente' },
  { key: 'SHIPPED',   label: 'Expédiées' },
  { key: 'DELIVERED', label: 'Livrées' },
  { key: 'CANCELLED', label: 'Annulées' },
];

export default function OrdersPage() {
  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 10;
  const { user } = useAuthStore();

  // Le backend pagine désormais /orders/me (limit=100 ici pour permettre le filtre
  // par statut + date côté client sans requête supplémentaire par filtre).
  const { data: orders, isLoading } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => api.get('/orders/me', { params: { limit: 100 } }).then(r => r.data),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : (data?.data ?? []),
  });

  const showSkel = useDelayedLoading(isLoading);
  const filtered = (orders ?? []).filter((o: any) => {
    if (filter !== 'all' && o.status !== filter) return false;
    if (dateFrom && new Date(o.createdAt) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(o.createdAt) > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });
  const pageCount   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged       = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F8FA', py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3, lg: 4 } }}>
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>

        {/* ── Header ── */}
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: 22, sm: 26 }, color: '#0F172A', letterSpacing: '-0.6px', mb: 0.5 }}>
            Mes commandes
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#64748B' }}>
            {isLoading ? '…' : `${orders?.length ?? 0} commande${(orders?.length ?? 0) !== 1 ? 's' : ''} au total`}
          </Typography>
        </Box>

        {/* ── Filters ── */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <FilterListOutlined sx={{ fontSize: 17, color: '#64748B', alignSelf: 'center', mr: 0.5 }} />
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <Box key={f.key} onClick={() => setFilter(f.key)} sx={{
                px: 1.6, py: 0.65, borderRadius: '20px', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700,
                bgcolor: active ? ORANGE : '#FFFFFF',
                color: active ? 'white' : '#475569',
                border: active ? `1.5px solid ${ORANGE}` : '1.5px solid rgba(15,23,42,0.09)',
                transition: 'all 0.18s',
                '&:hover': active ? {} : { bgcolor: 'rgba(15,23,42,0.04)', color: '#0F172A' },
              }}>
                {f.label}
              </Box>
            );
          })}
        </Box>

        {/* ── Date range filter ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 3, flexWrap: 'wrap' }}>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 8, padding: '5px 8px', background: '#F7F8FA' }} />
          <Typography sx={{ fontSize: 12, color: '#64748B' }}>à</Typography>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.09)', borderRadius: 8, padding: '5px 8px', background: '#F7F8FA' }} />
          {(dateFrom || dateTo) && (
            <Typography onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}
              sx={{ fontSize: 11.5, color: '#64748B', cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: '#0F172A' } }}>
              Réinitialiser
            </Typography>
          )}
        </Box>

        {/* ── Loading ── */}
        {isLoading && showSkel && <ListSkeleton rows={4} />}

        {/* ── Empty state ── */}
        {!isLoading && filtered.length === 0 && (
          <Box sx={{
            textAlign: 'center', py: { xs: 8, sm: 12 }, px: 4,
            borderRadius: '24px',
            background: '#FFFFFF',
            border: '1px solid rgba(15,23,42,0.09)',
            boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
          }}>
            <Box sx={{
              width: 72, height: 72, borderRadius: '22px', mx: 'auto', mb: 3,
              background: `linear-gradient(135deg, ${alpha(ORANGE, 0.15)}, ${alpha(ORANGE, 0.05)})`,
              border: `1.5px solid ${alpha(ORANGE, 0.2)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 24px ${alpha(ORANGE, 0.12)}`,
            }}>
              <ShoppingBagOutlined sx={{ fontSize: 32, color: alpha(ORANGE, 0.8) }} />
            </Box>

            <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#0F172A', mb: 1 }}>
              {filter === 'all' ? 'Aucune commande' : 'Aucune commande dans ce filtre'}
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: '#64748B', mb: 3.5, lineHeight: 1.75 }}>
              {filter === 'all'
                ? 'Vous n\'avez pas encore passé de commande.\nDécouvrez nos produits et faites votre premier achat.'
                : 'Essayez un autre filtre ou revenez plus tard.'}
            </Typography>

            {filter === 'all' && (
              <Box component={Link} to="/products" sx={{
                display: 'inline-flex', alignItems: 'center', gap: 1, textDecoration: 'none',
                px: 3, py: 1.2, borderRadius: '14px',
                background: `linear-gradient(135deg, ${ORANGE}, #e05e00)`,
                color: 'white', fontSize: 14, fontWeight: 800,
                boxShadow: `0 6px 20px ${alpha(ORANGE, 0.4)}`,
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 10px 28px ${alpha(ORANGE, 0.5)}` },
              }}>
                Explorer les produits <ArrowForward sx={{ fontSize: 17 }} />
              </Box>
            )}
          </Box>
        )}

        {/* ── Orders list ── */}
        {!isLoading && filtered.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {paged.map((order: any) => {
              const meta = STATUS_META[order.status] ?? STATUS_META.PENDING;
              const StatusIcon = meta.Icon;
              const firstItem = order.items?.[0];
              const extraCount = (order.items?.length ?? 1) - 1;

              return (
                <Box component={Link} to={`/account/orders/${order.id}`} key={order.id} sx={{
                  display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2.5 },
                  p: { xs: 1.8, sm: 2.5 }, borderRadius: '18px', textDecoration: 'none',
                  background: '#FFFFFF',
                  border: '1px solid rgba(15,23,42,0.09)',
                  boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
                  transition: 'all 0.18s',
                  '&:hover': {
                    background: '#FFFFFF',
                    borderColor: alpha(meta.color, 0.3),
                    transform: 'translateY(-1px)',
                    boxShadow: `0 8px 24px rgba(15,23,42,0.1)`,
                  },
                }}>

                  {/* Product thumbnail */}
                  <Box sx={{
                    width: { xs: 52, sm: 64 }, height: { xs: 52, sm: 64 },
                    borderRadius: '14px', flexShrink: 0, overflow: 'hidden',
                    bgcolor: '#F1F5F9',
                    border: '1px solid rgba(15,23,42,0.09)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {firstItem?.imageUrl
                      ? <Box component="img" src={firstItem.imageUrl} alt=""
                          sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <ShoppingBagOutlined sx={{ fontSize: 24, color: '#CBD5E1' }} />
                    }
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 800, fontSize: { xs: 12, sm: 13 }, color: '#475569', fontFamily: 'monospace' }}>
                        #{order.id.slice(-8).toUpperCase()}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5,
                        px: 1, py: 0.2, borderRadius: '8px', bgcolor: meta.bg, border: `1px solid ${alpha(meta.color, 0.25)}` }}>
                        <StatusIcon sx={{ fontSize: 11, color: meta.color }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</Typography>
                      </Box>
                    </Box>

                    <Typography noWrap sx={{ fontSize: { xs: 13, sm: 14 }, fontWeight: 700, color: '#0F172A', mb: 0.4 }}>
                      {firstItem?.product?.name ?? firstItem?.productName ?? 'Commande'}
                      {extraCount > 0 && (
                        <Box component="span" sx={{ fontSize: 12, color: '#64748B', fontWeight: 500, ml: 0.8 }}>
                          +{extraCount} article{extraCount > 1 ? 's' : ''}
                        </Box>
                      )}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <StorefrontOutlined sx={{ fontSize: 12, color: '#64748B' }} />
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        {order.store?.name ?? 'Boutique'}
                      </Typography>
                      <Box component="span" sx={{ color: '#CBD5E1', mx: 0.5 }}>·</Box>
                      <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Amount + arrow */}
                  <Box sx={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: 14, sm: 16 }, color: '#0F172A', letterSpacing: '-0.3px' }}>
                      {Number(order.totalHTG ?? order.totalAmount ?? 0).toLocaleString('fr-FR')}
                      <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', ml: 0.5 }}>HTG</Box>
                    </Typography>
                    <ArrowForward sx={{ fontSize: 15, color: '#CBD5E1' }} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* ── Pagination ── */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2.5 }}>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>Page {currentPage} / {pageCount}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box component="button" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.09)', borderRadius: '8px', px: 1.5, py: 0.7, bgcolor: 'transparent', '&:disabled': { color: '#64748B', opacity: 0.5, cursor: 'default' } }}>
                Précédent
              </Box>
              <Box component="button" disabled={currentPage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.09)', borderRadius: '8px', px: 1.5, py: 0.7, bgcolor: 'transparent', '&:disabled': { color: '#64748B', opacity: 0.5, cursor: 'default' } }}>
                Suivant
              </Box>
            </Box>
          </Box>
        )}

      </Box>
    </Box>
  );
}
