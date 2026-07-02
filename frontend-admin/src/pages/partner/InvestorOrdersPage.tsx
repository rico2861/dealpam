import { useState } from 'react';
import { Container, Typography, Box, Card, Chip, TextField, InputAdornment, alpha } from '@mui/material';
import { Search } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', CONFIRMED: '#3B82F6', PROCESSING: '#8B5CF6',
  SHIPPED: '#F97316', DELIVERED: '#10B981', CANCELLED: '#EF4444', REFUNDED: '#6B7280',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente', CONFIRMED: 'Confirmée', PROCESSING: 'En préparation',
  SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée', REFUNDED: 'Remboursée',
};

export default function InvestorOrdersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(0);
  const pageSize = 25;

  const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['inv-orders', page, search],
    queryFn: () => api.get(`/orders/admin?${params}`).then(r => r.data),
    staleTime: 60_000,
  });

  const rows  = data?.orders ?? (Array.isArray(data) ? data : []);
  const total = data?.total  ?? rows.length;

  const columns: GridColDef[] = [
    {
      field: 'id', headerName: 'Référence', width: 130,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#555" fontFamily="monospace">{String(value).slice(0, 8).toUpperCase()}</Typography>,
    },
    {
      field: 'customer', headerName: 'Client', flex: 1, minWidth: 160,
      renderCell: ({ row }) => (
        <Box>
          <Typography fontSize={13} fontWeight={600}>{row.user?.firstName} {row.user?.lastName}</Typography>
          <Typography fontSize={11} color="#888">{row.user?.email}</Typography>
        </Box>
      ),
    },
    {
      field: 'store', headerName: 'Boutique', flex: 1, minWidth: 140,
      renderCell: ({ row }) => <Typography fontSize={13}>{row.store?.name || '—'}</Typography>,
    },
    {
      field: 'totalHTG', headerName: 'Montant', width: 130,
      renderCell: ({ value }) => <Typography fontSize={13} fontWeight={700} color="#111">{Number(value || 0).toLocaleString('fr-FR')} HTG</Typography>,
    },
    {
      field: 'status', headerName: 'Statut', width: 145,
      renderCell: ({ value }) => <Chip label={STATUS_LABEL[value] || value} size="small"
        sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(STATUS_COLOR[value] || '#888', 0.1), color: STATUS_COLOR[value] || '#888' }} />,
    },
    {
      field: 'chosenPaymentMethod', headerName: 'Paiement', width: 120,
      renderCell: ({ value }) => <Typography fontSize={12} color="#666">{value || '—'}</Typography>,
    },
    {
      field: 'createdAt', headerName: 'Date', width: 130,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#888">{new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</Typography>,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Commandes</Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.3}>{total.toLocaleString('fr-FR')} commande{total > 1 ? 's' : ''} · lecture seule</Typography>
        </Box>
        <TextField size="small" placeholder="Référence, client…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment> }}
          sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <DataGrid rows={rows} columns={columns} loading={isLoading} autoHeight rowHeight={58}
          rowCount={total} paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={({ page: p }) => setPage(p)}
          pageSizeOptions={[25]}
          disableRowSelectionOnClick
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#F9FAFB', fontSize: 12, fontWeight: 700 }, '& .MuiDataGrid-row:hover': { bgcolor: '#FAFAFA' }, '& .MuiDataGrid-cell': { borderColor: '#F3F4F6' } }}
        />
      </Card>
    </Container>
  );
}
