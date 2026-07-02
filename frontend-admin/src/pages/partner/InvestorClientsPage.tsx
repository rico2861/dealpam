import { useState } from 'react';
import { Container, Typography, Box, Card, Avatar, Chip, TextField, InputAdornment, alpha } from '@mui/material';
import { Search, FiberManualRecord } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

export default function InvestorClientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(0);
  const pageSize = 25;

  const params = new URLSearchParams({ role: 'CUSTOMER', page: String(page + 1), limit: String(pageSize) });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['inv-clients', page, search],
    queryFn: () => api.get(`/users?${params}`).then(r => r.data),
    staleTime: 60_000,
  });

  const rows  = data?.users ?? (Array.isArray(data) ? data : []);
  const total = data?.total ?? rows.length;

  const columns: GridColDef[] = [
    {
      field: 'firstName', headerName: 'Client', flex: 1.5, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%' }}>
          <Avatar src={row.avatar} sx={{ width: 32, height: 32, bgcolor: '#3B82F6', fontSize: 12, fontWeight: 700 }}>
            {row.firstName?.[0]}
          </Avatar>
          <Box>
            <Typography fontSize={13} fontWeight={600} color="#111">{row.firstName} {row.lastName}</Typography>
            <Typography fontSize={11} color="#888">{row.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'username', headerName: 'Username', width: 130,
      renderCell: ({ value }) => <Typography fontSize={12} color="#555">@{value || '—'}</Typography>,
    },
    {
      field: 'phone', headerName: 'Téléphone', width: 130,
      renderCell: ({ value }) => <Typography fontSize={12.5} color="#555">{value || '—'}</Typography>,
    },
    {
      field: 'city', headerName: 'Ville', width: 120,
      renderCell: ({ row }) => <Typography fontSize={12} color="#555">{[row.city, row.department].filter(Boolean).join(', ') || '—'}</Typography>,
    },
    {
      field: 'isActive', headerName: 'Statut', width: 100,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <FiberManualRecord sx={{ fontSize: 9, color: value ? '#10B981' : '#9CA3AF' }} />
          <Typography fontSize={12} fontWeight={600} color={value ? '#059669' : '#9CA3AF'}>{value ? 'Actif' : 'Inactif'}</Typography>
        </Box>
      ),
    },
    {
      field: 'createdAt', headerName: 'Inscrit le', width: 110,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#888">{new Date(value).toLocaleDateString('fr-FR')}</Typography>,
    },
    {
      field: 'lastLoginAt', headerName: 'Dernière connexion', width: 155,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#888">{value ? new Date(value).toLocaleString('fr-FR') : '—'}</Typography>,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Clients</Typography>
          <Typography fontSize={13} color="text.secondary" mt={0.3}>{total.toLocaleString('fr-FR')} compte{total > 1 ? 's' : ''} client · lecture seule</Typography>
        </Box>
        <TextField size="small" placeholder="Nom, email, username…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment> }}
          sx={{ width: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
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
