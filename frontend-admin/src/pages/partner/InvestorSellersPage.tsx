import { useState } from 'react';
import { Container, Typography, Box, Card, Avatar, Chip, TextField, InputAdornment, alpha } from '@mui/material';
import { Search, Store, FiberManualRecord } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, string> = { APPROVED: '#10B981', PENDING: '#F59E0B', REJECTED: '#EF4444', SUSPENDED: '#6B7280' };

export default function InvestorSellersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const params = new URLSearchParams({ status: 'APPROVED', page: String(page + 1), limit: String(pageSize) });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['inv-sellers', page, search],
    queryFn: () => api.get(`/sellers?${params}`).then(r => r.data),
    staleTime: 60_000,
  });

  const rows  = data?.sellers ?? (Array.isArray(data) ? data : []);
  const total = data?.total   ?? rows.length;

  const columns: GridColDef[] = [
    {
      field: 'user', headerName: 'Vendeur', flex: 1.5, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%' }}>
          <Avatar sx={{ bgcolor: '#c41230', width: 32, height: 32, fontSize: 12, fontWeight: 700 }}>
            {row.user?.firstName?.[0]}
          </Avatar>
          <Box>
            <Typography fontSize={13} fontWeight={600} color="#111">{row.user?.firstName} {row.user?.lastName}</Typography>
            <Typography fontSize={11} color="#888">{row.user?.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'stores', headerName: 'Boutique', flex: 1, minWidth: 140,
      renderCell: ({ row }) => {
        const s = row.stores?.[0];
        return s
          ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Store sx={{ fontSize: 14, color: '#059669' }} />
              <Typography fontSize={13}>{s.name}</Typography>
            </Box>
          : <Typography fontSize={12} color="#bbb">—</Typography>;
      },
    },
    {
      field: 'subscriptions', headerName: 'Plan', width: 110,
      renderCell: ({ row }) => {
        const plan = row.subscriptions?.[0]?.plan?.tier;
        const colors: Record<string, string> = { STARTER: '#6B7280', BUSINESS: '#2563EB', PREMIUM: '#7C3AED', ELITE: '#EF4444' };
        return plan ? <Chip label={plan} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(colors[plan] || '#888', 0.1), color: colors[plan] }} /> : <Typography fontSize={12} color="#bbb">Free</Typography>;
      },
    },
    {
      field: 'businessCity', headerName: 'Ville', width: 130,
      renderCell: ({ value }) => <Typography fontSize={12.5} color="#555">{value || '—'}</Typography>,
    },
    {
      field: 'createdAt', headerName: 'Inscrit le', width: 110,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#888">{new Date(value).toLocaleDateString('fr-FR')}</Typography>,
    },
    {
      field: 'status', headerName: 'Statut', width: 110,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <FiberManualRecord sx={{ fontSize: 9, color: STATUS_COLOR[value] || '#888' }} />
          <Typography fontSize={12} fontWeight={600} color={STATUS_COLOR[value] || '#888'}>{value}</Typography>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Vendeurs</Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.3}>{total} vendeur{total > 1 ? 's' : ''} approuvé{total > 1 ? 's' : ''} · lecture seule</Typography>
        </Box>
        <TextField size="small" placeholder="Rechercher un vendeur…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment> }}
          sx={{ width: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <DataGrid rows={rows} columns={columns} loading={isLoading} autoHeight rowHeight={60}
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
