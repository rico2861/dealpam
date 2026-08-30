import { useState } from 'react';
import {
  Container, Typography, Card, Box, Chip, Drawer, IconButton, Divider,
  TextField, MenuItem, Select, FormControl, InputLabel, Avatar,
} from '@mui/material';
import { Close, LocationOn, Phone, Email, Payments, LocalShipping } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import api from '../../api/axios';

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'En attente',   bg: '#FEF3C7', color: '#92400E' },
  CONFIRMED: { label: 'Confirmée',    bg: '#DBEAFE', color: '#1D4ED8' },
  PREPARING: { label: 'Préparation',  bg: '#EDE9FE', color: '#6D28D9' },
  SHIPPED:   { label: 'Expédiée',     bg: '#E0F2FE', color: '#0369A1' },
  DELIVERED: { label: 'Livrée',       bg: '#DCFCE7', color: '#166534' },
  CANCELLED: { label: 'Annulée',      bg: '#FEE2E2', color: '#991B1B' },
  REFUNDED:  { label: 'Remboursée',   bg: '#F3F4F6', color: '#374151' },
};

const DELIVERY_LABEL: Record<string, string> = {
  DELIVERY: 'Livraison à domicile',
  PICKUP:   'Retrait en boutique',
  CONTACT:  'Contact direct vendeur',
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || { label: status, bg: '#F3F4F6', color: '#374151' };
  return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11.5 }} />;
}

function fmtHTG(v: any) { return `${Number(v || 0).toLocaleString()} HTG`; }

function OrderDetail({ order, onClose }: { order: any; onClose: () => void }) {
  return (
    <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
        <Box>
          <Typography fontWeight={800} fontSize={17}>Commande #{order.id.slice(-8).toUpperCase()}</Typography>
          <Typography fontSize={12} color="text.secondary">{new Date(order.createdAt).toLocaleString('fr-FR')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><Close fontSize="small" /></IconButton>
      </Box>

      <StatusChip status={order.status} />
      {order.cancelReason && (
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
          <Typography fontSize={12} fontWeight={700} color="#991B1B" mb={0.3}>Motif d'annulation</Typography>
          <Typography fontSize={13} color="#7F1D1D">{order.cancelReason}</Typography>
        </Box>
      )}

      <Divider sx={{ my: 2.5 }} />

      <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Client</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Avatar sx={{ width: 36, height: 36, bgcolor: '#FF6B00' }}>{order.user?.firstName?.[0]}</Avatar>
        <Box>
          <Typography fontWeight={700} fontSize={13.5}>{order.user?.firstName} {order.user?.lastName}</Typography>
          <Typography fontSize={12} color="text.secondary">{order.user?.email}</Typography>
        </Box>
      </Box>
      {order.user?.phone && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.8, fontSize: 13, color: '#475569' }}>
          <Phone sx={{ fontSize: 15 }} /> {order.user.phone}
        </Box>
      )}

      <Divider sx={{ my: 2.5 }} />

      <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Boutique</Typography>
      <Typography fontWeight={700} fontSize={13.5}>{order.store?.name}</Typography>

      <Divider sx={{ my: 2.5 }} />

      <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Livraison</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
        <LocalShipping sx={{ fontSize: 16, color: '#64748B' }} />
        <Typography fontSize={13}>{DELIVERY_LABEL[order.deliveryType] || order.deliveryType || 'Livraison à domicile'}</Typography>
      </Box>
      {order.deliveryType === 'PICKUP' && order.pickupPointName && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 0.5 }}>
          <LocationOn sx={{ fontSize: 16, color: '#64748B', mt: 0.2 }} />
          <Typography fontSize={13} color="#475569">{order.pickupPointName}{order.pickupPointAddress ? ` — ${order.pickupPointAddress}` : ''}</Typography>
        </Box>
      )}
      {order.address && (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 0.5 }}>
          <LocationOn sx={{ fontSize: 16, color: '#64748B', mt: 0.2 }} />
          <Typography fontSize={13} color="#475569">
            {order.address.line1}, {order.address.city} ({order.address.department})
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 2.5 }} />

      <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Paiement</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Payments sx={{ fontSize: 16, color: '#64748B' }} />
        <Typography fontSize={13}>{order.chosenPaymentMethod || '—'}</Typography>
      </Box>
      {order.paymentTxRef && (
        <Typography fontSize={12} color="text.secondary" mt={0.5}>Réf. transaction : {order.paymentTxRef} ({order.paymentTxStatus})</Typography>
      )}

      <Divider sx={{ my: 2.5 }} />

      <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={1} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Articles</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {(order.items || []).map((it: any, i: number) => (
          <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <Typography fontSize={13}>{it.quantity}× {it.productName}</Typography>
            <Typography fontSize={13} fontWeight={700}>{fmtHTG(it.subtotal)}</Typography>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 2.5 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography fontSize={13} color="text.secondary">Sous-total</Typography>
        <Typography fontSize={13}>{fmtHTG(order.subtotalHTG)}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography fontSize={13} color="text.secondary">Livraison</Typography>
        <Typography fontSize={13}>{fmtHTG(order.shippingHTG)}</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography fontWeight={800} fontSize={15}>Total</Typography>
        <Typography fontWeight={800} fontSize={15}>{fmtHTG(order.totalHTG)}</Typography>
      </Box>

      {order.notes && (
        <>
          <Divider sx={{ my: 2.5 }} />
          <Typography fontSize={12} fontWeight={700} color="text.secondary" mb={0.5} sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>Note du client</Typography>
          <Typography fontSize={13} color="#475569">{order.notes}</Typography>
        </>
      )}
    </Box>
  );
}

export default function OrdersPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [status, setStatus]     = useState('');
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', dateFrom, dateTo, status, search],
    queryFn: () => api.get('/orders', {
      params: { limit: 100, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, status: status || undefined, search: search || undefined },
    }).then(r => Array.isArray(r.data) ? r.data : r.data?.data || []).catch(() => []),
  });

  const columns: GridColDef[] = [
    {
      field: 'id', headerName: 'N°', width: 110,
      valueGetter: (params: any) => params.row.id.slice(-8).toUpperCase(),
    },
    {
      field: 'client', headerName: 'Client', flex: 1, minWidth: 160,
      valueGetter: (params: any) => `${params.row.user?.firstName || ''} ${params.row.user?.lastName || ''}`.trim(),
    },
    {
      field: 'store', headerName: 'Boutique', flex: 1, minWidth: 140,
      valueGetter: (params: any) => params.row.store?.name || '—',
    },
    {
      field: 'status', headerName: 'Statut', width: 130,
      renderCell: (p) => <StatusChip status={p.value} />,
    },
    {
      field: 'deliveryType', headerName: 'Livraison', width: 150,
      valueGetter: (params: any) => DELIVERY_LABEL[params.row.deliveryType] || params.row.deliveryType || 'Livraison',
    },
    {
      field: 'chosenPaymentMethod', headerName: 'Paiement', width: 110,
      valueGetter: (params: any) => params.row.chosenPaymentMethod || '—',
    },
    {
      field: 'totalHTG', headerName: 'Total', width: 120,
      valueGetter: (params: any) => fmtHTG(params.row.totalHTG),
    },
    {
      field: 'createdAt', headerName: 'Date', width: 150,
      valueGetter: (params: any) => new Date(params.row.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Commandes</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Rechercher (ID, client, email, téléphone, boutique...)"
          value={search} onChange={e => setSearch(e.target.value)} sx={{ minWidth: 280 }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select label="Statut" value={status} onChange={e => setStatus(e.target.value)}>
            <MenuItem value="">Tous les statuts</MenuItem>
            {Object.entries(STATUS_STYLE).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </Select>
        </FormControl>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, padding: '7px 8px', background: '#F7F8FA' }} />
        <Typography fontSize={12} color="text.secondary">à</Typography>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, padding: '7px 8px', background: '#F7F8FA' }} />
        {(dateFrom || dateTo || status || search) && (
          <Typography onClick={() => { setDateFrom(''); setDateTo(''); setStatus(''); setSearch(''); }}
            sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: 'text.primary' } }}>
            Réinitialiser
          </Typography>
        )}
      </Box>

      <Card sx={{ p: 0 }}>
        <DataGrid
          rows={data || []}
          columns={columns}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[20, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          onRowClick={(p) => setSelected(p.row)}
          sx={{
            border: 'none', cursor: 'pointer',
            '& .MuiDataGrid-columnHeaders': { bgcolor: '#F9FAFB', fontSize: 12, fontWeight: 700 },
            '& .MuiDataGrid-row:hover': { bgcolor: '#FAFAFA' },
            '& .MuiDataGrid-cell': { borderColor: '#F3F4F6' },
          }}
        />
      </Card>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}>
        {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}
      </Drawer>
    </Container>
  );
}
