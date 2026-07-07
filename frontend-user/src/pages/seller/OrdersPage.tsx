import { useState } from 'react';
import {
  Box, Typography, Button, Avatar, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Collapse, Tooltip, IconButton,
} from '@mui/material';
import {
  LocalShipping, CheckCircle, HourglassEmpty, Cancel,
  ExpandMore, ExpandLess, Phone, TrendingUp, Assignment,
  Inventory, AccessTime, Warning, ShoppingBag,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
const GRN  = '#10B981';
const RED  = '#EF4444';
const YLW  = '#F59E0B';
const BLU  = '#3B82F6';
const PUR  = '#8B5CF6';
const CYN  = '#06B6D4';

const fmt     = (v: number) => `${Number(v).toLocaleString('fr-HT')} HTG`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const hoursAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);

const STATUS: Record<string, { label: string; color: string; icon: any; next: string[] }> = {
  PENDING:   { label: 'En attente',     color: YLW, icon: HourglassEmpty, next: ['CONFIRMED', 'CANCELLED'] },
  CONFIRMED: { label: 'Confirmée',      color: BLU, icon: Assignment,     next: ['PREPARING'] },
  PREPARING: { label: 'En préparation', color: PUR, icon: Inventory,      next: ['SHIPPED'] },
  SHIPPED:   { label: 'Expédiée',       color: CYN, icon: LocalShipping,  next: ['DELIVERED'] },
  DELIVERED: { label: 'Livrée',         color: GRN, icon: CheckCircle,    next: [] },
  CANCELLED: { label: 'Annulée',        color: RED, icon: Cancel,         next: [] },
};

const NEXT_LABEL: Record<string, string> = {
  CONFIRMED: 'Accepter',
  PREPARING: 'En préparation',
  SHIPPED:   'Marquer expédiée',
  DELIVERED: 'Marquer livrée',
  CANCELLED: 'Annuler',
};

const TABS = [
  { label: 'Toutes',    value: '' },
  { label: 'En attente',value: 'PENDING' },
  { label: 'En cours',  value: 'ACTIVE' },
  { label: 'Livrées',   value: 'DELIVERED' },
  { label: 'Annulées',  value: 'CANCELLED' },
];

/* ── Order card ─────────────────────────────────────────────────────────── */
function OrderCard({ order, onUpdate }: { order: any; onUpdate: (id: string, status: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const st      = STATUS[order.status] ?? STATUS.PENDING;
  const Icon    = st.icon;
  const hours   = hoursAgo(order.createdAt);
  const urgent  = order.status === 'PENDING' && hours > 24;

  return (
    <Box sx={{
      borderRadius: '16px', bgcolor: CARD, overflow: 'hidden',
      border: `1px solid ${urgent ? 'rgba(239,68,68,0.4)' : BORD}`,
      boxShadow: urgent ? '0 0 0 1px rgba(239,68,68,0.2), 0 8px 24px rgba(15,23,42,0.1)' : '0 4px 16px rgba(15,23,42,0.06)',
      transition: 'all 0.18s',
      '&:hover': { borderColor: urgent ? 'rgba(239,68,68,0.55)' : 'rgba(15,23,42,0.09)', transform: 'translateY(-1px)' },
    }}>

      {/* Urgent banner */}
      {urgent && (
        <Box sx={{ px: 2, py: 0.8, bgcolor: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning sx={{ fontSize: 13, color: RED }}/>
          <Typography fontSize={11.5} fontWeight={700} color={RED}>
            En attente depuis {hours}h — action requise
          </Typography>
        </Box>
      )}

      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.6, flexWrap: 'wrap' }}>
            <Typography fontWeight={800} fontSize={14} color={TXT} letterSpacing="-0.2px">
              #{order.id.slice(-8).toUpperCase()}
            </Typography>
            {/* Status badge */}
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1, py: 0.3,
              borderRadius: '7px', bgcolor: `${st.color}18`, border: `1px solid ${st.color}33` }}>
              <Icon sx={{ fontSize: 12, color: st.color }}/>
              <Typography fontSize={11.5} fontWeight={700} color={st.color}>{st.label}</Typography>
            </Box>
            {order.paymentTxRef && (
              <Box sx={{ display: 'inline-flex', px: 1, py: 0.3, borderRadius: '7px',
                bgcolor: order.paymentTxStatus === 'APPROVED' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                border: `1px solid ${order.paymentTxStatus === 'APPROVED' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                <Typography fontSize={11} fontWeight={700}
                  color={order.paymentTxStatus === 'APPROVED' ? GRN : YLW}>
                  {order.paymentTxStatus === 'APPROVED' ? '💳 Payé' : '⏳ Tx soumise'}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime sx={{ fontSize: 11, color: SUB }}/>
            <Typography fontSize={12} color={SUB}>{fmtDate(order.createdAt)} · {hours}h</Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography fontWeight={900} fontSize={16} color={OR} letterSpacing="-0.5px">
            {fmt(Number(order.totalHTG))}
          </Typography>
          <Typography fontSize={11.5} color={SUB}>{order.items?.length || 0} article(s)</Typography>
        </Box>
      </Box>

      {/* Customer + items */}
      <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${BORD}`, bgcolor: 'rgba(15,23,42,0.09)' }}>
        {/* Customer row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: order.items?.length > 0 ? 1.5 : 0 }}>
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'rgba(59,130,246,0.2)', color: BLU, fontSize: 12, fontWeight: 900, border: '1px solid rgba(59,130,246,0.25)' }}>
            {order.user?.firstName?.[0]}
          </Avatar>
          <Typography fontSize={13} fontWeight={600} color={SUB2} flex={1}>
            {order.user?.firstName} {order.user?.lastName}
          </Typography>
          {order.user?.phone && (
            <Tooltip title={`Appeler ${order.user.phone}`}>
              <IconButton size="small" component="a" href={`tel:${order.user.phone}`}
                sx={{ color: GRN, bgcolor: 'rgba(16,185,129,0.1)', borderRadius: '8px',
                  border: '1px solid rgba(16,185,129,0.2)', '&:hover': { bgcolor: 'rgba(16,185,129,0.2)' } }}>
                <Phone sx={{ fontSize: 13 }}/>
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Items preview */}
        {order.items?.slice(0, 2).map((item: any, i: number) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, py: 0.6,
            borderBottom: i < Math.min(order.items.length, 2) - 1 ? `1px solid ${BORD}` : 'none' }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
              bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
              {item.product?.images?.[0]?.urlThumb && (
                <Box component="img" src={item.product.images[0].urlThumb} alt=""
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              )}
            </Box>
            <Typography fontSize={13} color={SUB2} noWrap flex={1}>
              {item.productName || item.product?.name}
            </Typography>
            <Typography fontSize={12} color={SUB}>×{item.quantity}</Typography>
            <Typography fontSize={13} fontWeight={700} color={TXT}>
              {fmt(Number(item.subtotal ?? item.unitPrice * item.quantity))}
            </Typography>
          </Box>
        ))}
        {order.items?.length > 2 && (
          <Typography fontSize={11.5} color={SUB} mt={0.8}>
            + {order.items.length - 2} autre(s) article(s)
          </Typography>
        )}
      </Box>

      {/* Expandable delivery details */}
      <Box sx={{ px: 2.5, borderTop: `1px solid ${BORD}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          py: 1.2, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <Typography fontSize={12} color={SUB} fontWeight={500}>Détails livraison & paiement</Typography>
          {expanded
            ? <ExpandLess sx={{ fontSize: 15, color: SUB }}/>
            : <ExpandMore sx={{ fontSize: 15, color: SUB }}/>}
        </Box>
        <Collapse in={expanded}>
          <Box sx={{ pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
            {[
              order.deliveryType && { k: 'Livraison', v: order.deliveryType === 'DELIVERY' ? '🏠 À domicile' : order.deliveryType === 'PICKUP' ? '🏪 Retrait boutique' : '📞 Contact direct' },
              order.pickupPointName && { k: 'Point retrait', v: order.pickupPointName },
              order.address && { k: 'Adresse', v: `${order.address.line1}, ${order.address.city}` },
              order.chosenPaymentMethod && { k: 'Paiement', v: order.chosenPaymentMethod },
              order.paymentTxRef && { k: 'Réf. TX', v: `${order.paymentTxRef} (${order.paymentTxStatus})` },
            ].filter(Boolean).map((row: any) => (
              <Box key={row.k} sx={{ display: 'flex', gap: 1.5 }}>
                <Typography fontSize={12} color={SUB} sx={{ minWidth: 100, flexShrink: 0 }}>{row.k} :</Typography>
                <Typography fontSize={12} fontWeight={600} color={SUB2}>{row.v}</Typography>
              </Box>
            ))}
            {order.notes && (
              <Box sx={{ p: 1.2, borderRadius: '8px', bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', mt: 0.5 }}>
                <Typography fontSize={12} color={YLW}>💬 {order.notes}</Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Action buttons */}
      {st.next.length > 0 && (
        <Box sx={{ px: 2.5, py: 1.8, borderTop: `1px solid ${BORD}`, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {st.next.map(next => {
            const isCancelBtn = next === 'CANCELLED';
            return (
              <Button key={next} size="small" onClick={() => onUpdate(order.id, next)}
                sx={{
                  borderRadius: '9px', fontWeight: 700, fontSize: 12.5, px: 2, py: 0.8,
                  bgcolor: isCancelBtn ? 'transparent' : OR,
                  color: isCancelBtn ? RED : '#fff',
                  border: isCancelBtn ? '1px solid rgba(239,68,68,0.35)' : 'none',
                  boxShadow: isCancelBtn ? 'none' : '0 3px 10px rgba(255,107,0,0.3)',
                  '&:hover': {
                    bgcolor: isCancelBtn ? 'rgba(239,68,68,0.1)' : '#E05A00',
                    borderColor: isCancelBtn ? 'rgba(239,68,68,0.6)' : undefined,
                  },
                }}>
                {NEXT_LABEL[next] ?? next}
              </Button>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function SellerOrdersPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab]         = useState('');
  const [cancelDlg, setCancelDlg] = useState<{ open: boolean; id: string } | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['sellerOrders'],
    queryFn: () => api.get('/orders/seller?limit=100').then(r => r.data),
    enabled: !!localStorage.getItem('accessToken'),
    refetchInterval: 30000,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/orders/seller/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sellerOrders'] });
      qc.invalidateQueries({ queryKey: ['sellerStats'] });
      enqueueSnackbar('Statut mis à jour — email envoyé au client', { variant: 'success' });
      setCancelDlg(null);
    },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const handleUpdate = (id: string, status: string) => {
    if (status === 'CANCELLED') { setCancelDlg({ open: true, id }); return; }
    updateMut.mutate({ id, status });
  };

  const list: any[] = orders;
  const stats = {
    pending:   list.filter(o => o.status === 'PENDING').length,
    active:    list.filter(o => ['CONFIRMED','PREPARING','SHIPPED'].includes(o.status)).length,
    delivered: list.filter(o => o.status === 'DELIVERED').length,
    revenue:   list.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + Number(o.totalHTG), 0),
  };

  const filtered = list.filter(o => {
    if (!tab) return true;
    if (tab === 'ACTIVE') return ['CONFIRMED','PREPARING','SHIPPED'].includes(o.status);
    return o.status === tab;
  });

  const tabCount = (v: string) =>
    v === '' ? list.length : v === 'ACTIVE' ? stats.active : list.filter(o => o.status === v).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography fontWeight={900} fontSize={{ xs: 20, md: 24 }} color={TXT} letterSpacing="-0.5px">
          Commandes
        </Typography>
        <Typography fontSize={13} color={SUB}>{list.length} commande{list.length !== 1 ? 's' : ''} au total</Typography>
      </Box>

      {/* KPI cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(4,1fr)' }, gap: 1.5, mb: 3 }}>
        {[
          { label: 'En attente', value: stats.pending,      color: YLW, icon: HourglassEmpty, urgent: stats.pending > 0 },
          { label: 'En cours',   value: stats.active,       color: BLU, icon: LocalShipping   },
          { label: 'Livrées',    value: stats.delivered,    color: GRN, icon: CheckCircle      },
          { label: 'Revenus',    value: fmt(stats.revenue), color: OR,  icon: TrendingUp       },
        ].map(({ label, value, color, icon: Icon, urgent }) => (
          <Box key={label} sx={{
            p: 2.5, borderRadius: '16px', bgcolor: CARD,
            border: `1px solid ${urgent ? 'rgba(239,68,68,0.4)' : BORD}`,
            boxShadow: urgent ? '0 0 0 1px rgba(239,68,68,0.2)' : 'none',
            transition: 'all 0.15s',
          }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '10px', mb: 1.5,
              bgcolor: `${color}18`, border: `1px solid ${color}2a`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon sx={{ fontSize: 18, color }}/>
            </Box>
            <Typography fontSize={11.5} fontWeight={600} color={SUB} mb={0.3} textTransform="uppercase" letterSpacing="0.3px">
              {label}
            </Typography>
            <Typography fontWeight={900} fontSize={22} color={urgent ? RED : TXT} letterSpacing="-0.5px">
              {value}
            </Typography>
            {urgent && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <Warning sx={{ fontSize: 12, color: RED }}/>
                <Typography fontSize={11} color={RED} fontWeight={600}>Action requise</Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Filter tabs */}
      <Box sx={{ display: 'flex', gap: 0.8, mb: 3, flexWrap: 'wrap' }}>
        {TABS.map(({ label, value }) => {
          const count   = tabCount(value);
          const sel     = tab === value;
          const isAlert = value === 'PENDING' && stats.pending > 0;
          return (
            <Box key={value} onClick={() => setTab(value)}
              sx={{
                px: 1.5, py: 0.8, borderRadius: '9px', cursor: 'pointer', transition: 'all 0.14s',
                display: 'flex', alignItems: 'center', gap: 0.8,
                bgcolor: sel ? 'rgba(255,107,0,0.14)' : '#FFFFFF',
                border: '1px solid',
                borderColor: sel ? 'rgba(255,107,0,0.4)' : BORD,
                '&:hover': { borderColor: sel ? 'rgba(255,107,0,0.5)' : 'rgba(15,23,42,0.09)' },
              }}>
              <Typography fontSize={13} fontWeight={600} color={sel ? OR : SUB2}>{label}</Typography>
              {count > 0 && (
                <Box sx={{ px: 0.8, py: 0.1, borderRadius: '5px',
                  bgcolor: isAlert ? 'rgba(239,68,68,0.2)' : sel ? 'rgba(255,107,0,0.2)' : '#FFFFFF' }}>
                  <Typography fontSize={11} fontWeight={800}
                    color={isAlert ? RED : sel ? OR : SUB}>{count}</Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Orders */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress sx={{ color: OR }}/>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ py: 10, textAlign: 'center', borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}` }}>
          <ShoppingBag sx={{ fontSize: 52, color: BORD, mb: 2 }}/>
          <Typography fontWeight={700} fontSize={16} color={SUB}>Aucune commande</Typography>
          <Typography fontSize={13} color={SUB} mt={0.5}>
            {tab ? 'Aucune commande avec ce statut' : 'Les commandes de vos clients apparaîtront ici'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map((order: any) => (
            <OrderCard key={order.id} order={order} onUpdate={handleUpdate}/>
          ))}
        </Box>
      )}

      {/* Cancel confirmation */}
      <Dialog open={!!cancelDlg?.open} onClose={() => setCancelDlg(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '20px' } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 17, color: TXT }}>Annuler la commande ?</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', mb: 1.5 }}>
            <Typography fontSize={13} color={RED} fontWeight={600}>
              ⚠ Cette action est irréversible. Le client sera notifié par email.
            </Typography>
          </Box>
          <Typography fontSize={13} color={SUB2}>
            Des annulations fréquentes pénalisent votre score de réputation et réduisent votre visibilité sur la marketplace.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setCancelDlg(null)}
            sx={{ color: SUB2, borderRadius: '10px', border: `1px solid ${BORD}`,
              '&:hover': { borderColor: 'rgba(15,23,42,0.09)' } }}>
            Revenir
          </Button>
          <Button onClick={() => cancelDlg && updateMut.mutate({ id: cancelDlg.id, status: 'CANCELLED' })}
            disabled={updateMut.isPending}
            sx={{ bgcolor: RED, color: '#fff', borderRadius: '10px', fontWeight: 700, px: 2.5,
              '&:hover': { bgcolor: '#DC2626' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
            {updateMut.isPending ? <CircularProgress size={15} color="inherit"/> : 'Confirmer l\'annulation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
