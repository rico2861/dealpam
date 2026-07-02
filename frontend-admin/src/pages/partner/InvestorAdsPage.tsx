import { useState } from 'react';
import { Container, Typography, Box, Card, Avatar, Chip, TextField, InputAdornment, alpha } from '@mui/material';
import { Search, Campaign, Store, Inventory } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, string> = {
  PENDING_REVIEW: '#F59E0B', ACTIVE: '#10B981', PAUSED: '#6B7280',
  REJECTED: '#EF4444', DRAFT: '#94A3B8', PENDING_PAYMENT: '#3B82F6', COMPLETED: '#8B5CF6',
};

export default function InvestorAdsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(0);
  const pageSize = 25;

  const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['inv-ads', page, search],
    queryFn: () => api.get(`/ads/admin?${params}`).then(r => r.data),
    staleTime: 60_000,
  });

  const rows  = data?.campaigns ?? (Array.isArray(data) ? data : []);
  const total = data?.total     ?? rows.length;

  const columns: GridColDef[] = [
    {
      field: 'title', headerName: 'Campagne', flex: 1.5, minWidth: 180,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
          <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#FF6B00', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Campaign sx={{ fontSize: 14, color: '#FF6B00' }} />
          </Box>
          <Typography fontSize={13} fontWeight={600} noWrap>{row.title || '—'}</Typography>
        </Box>
      ),
    },
    {
      field: 'target', headerName: 'Cible', flex: 1, minWidth: 150,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, height: '100%' }}>
          {row.storeId ? <Store sx={{ fontSize: 14, color: '#059669' }} /> : <Inventory sx={{ fontSize: 14, color: '#3B82F6' }} />}
          <Typography fontSize={12.5} noWrap>{row.store?.name || row.product?.name || '—'}</Typography>
        </Box>
      ),
    },
    {
      field: 'budgetHTG', headerName: 'Budget (HTG)', width: 130,
      renderCell: ({ value }) => <Typography fontSize={13} fontWeight={700} color="#111">{Number(value || 0).toLocaleString('fr-FR')} HTG</Typography>,
    },
    {
      field: 'status', headerName: 'Statut', width: 150,
      renderCell: ({ value }) => <Chip label={value} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(STATUS_COLOR[value] || '#888', 0.1), color: STATUS_COLOR[value] || '#888' }} />,
    },
    {
      field: 'startDate', headerName: 'Début', width: 110,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#888">{value ? new Date(value).toLocaleDateString('fr-FR') : '—'}</Typography>,
    },
    {
      field: 'endDate', headerName: 'Fin', width: 110,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#888">{value ? new Date(value).toLocaleDateString('fr-FR') : '—'}</Typography>,
    },
    {
      field: 'clicks', headerName: 'Clics', width: 80,
      renderCell: ({ value }) => <Typography fontSize={13} fontWeight={600} color="#555">{(value || 0).toLocaleString('fr-FR')}</Typography>,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Publicités</Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.3}>{total} campagne{total > 1 ? 's' : ''} · lecture seule</Typography>
        </Box>
        <TextField size="small" placeholder="Rechercher…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
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
