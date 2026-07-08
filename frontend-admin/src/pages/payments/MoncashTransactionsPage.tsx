import { useState } from 'react';
import {
  Box, Container, Typography, Card, Chip, TextField, InputAdornment, Button,
  MenuItem, Select, FormControl, InputLabel, CircularProgress, Alert, Divider,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search, TravelExplore } from '@mui/icons-material';
import api from '../../api/axios';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SUCCESS:          { bg: '#D1FAE5', color: '#065F46' },
  FAILED:           { bg: '#FEE2E2', color: '#991B1B' },
  ALREADY_CREDITED: { bg: '#DBEAFE', color: '#1E40AF' },
  PENDING:          { bg: '#FEF3C7', color: '#92400E' },
  UNKNOWN:          { bg: '#F1F5F9', color: '#64748B' },
};

export default function MoncashTransactionsPage() {
  const [lookupId, setLookupId] = useState('');
  const [idType, setIdType]     = useState<'transactionId' | 'orderId'>('transactionId');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const lookup = useMutation({
    mutationFn: (payload: { transactionId?: string; orderId?: string }) =>
      api.post('/admin/moncash-transactions/lookup', payload).then(r => r.data),
  });

  const { data = { data: [], total: 0 }, isLoading, refetch } = useQuery({
    queryKey: ['admin-moncash-tx', statusFilter],
    queryFn: () => api.get('/admin/moncash-transactions', {
      params: statusFilter !== 'ALL' ? { status: statusFilter } : {},
    }).then(r => r.data),
  });

  const runLookup = () => {
    if (!lookupId.trim()) return;
    lookup.mutate({ [idType]: lookupId.trim() } as any);
  };

  const columns: GridColDef[] = [
    {
      field: 'status', headerName: 'Statut', width: 150,
      renderCell: ({ value }) => {
        const s = STATUS_COLORS[value] || STATUS_COLORS.UNKNOWN;
        return <Chip label={value} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: 11, height: 22 }} />;
      },
    },
    { field: 'scenario', headerName: 'Scénario', width: 120 },
    { field: 'moncashTransactionId', headerName: 'MonCash Transaction ID', width: 220,
      renderCell: ({ value }) => <Typography fontSize={12} fontFamily="monospace">{value || '—'}</Typography> },
    { field: 'orderId', headerName: 'Order / Référence', width: 220,
      renderCell: ({ value }) => <Typography fontSize={12} fontFamily="monospace">{value || '—'}</Typography> },
    { field: 'amount', headerName: 'Montant (HTG)', width: 130,
      renderCell: ({ value }) => <Typography fontSize={13} fontWeight={600}>{value != null ? `${Number(value).toLocaleString('fr-HT')} G` : '—'}</Typography> },
    { field: 'payer', headerName: 'Payeur', width: 140 },
    { field: 'credited', headerName: 'Crédité', width: 90,
      renderCell: ({ value }) => value ? <Chip label="Oui" size="small" color="success" sx={{ height: 20, fontSize: 11 }} /> : <Chip label="Non" size="small" sx={{ height: 20, fontSize: 11 }} /> },
    { field: 'failReason', headerName: "Raison d'échec", width: 220,
      renderCell: ({ value }) => value ? <Typography fontSize={12} color="error.main">{value}</Typography> : <Typography color="text.disabled" fontSize={12}>—</Typography> },
    { field: 'createdAt', headerName: 'Créé le', width: 160,
      renderCell: ({ value }) => <Typography fontSize={12}>{new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Typography> },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">Transactions MonCash</Typography>
      <Typography color="text.secondary" fontSize={14} mt={0.3} mb={3}>
        Vérification en temps réel auprès de MonCash + journal des tentatives (succès et échecs)
      </Typography>

      {/* ── Recherche live chez MonCash ── */}
      <Card sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography fontWeight={700} fontSize={15} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TravelExplore sx={{ fontSize: 20, color: 'primary.main' }} /> Vérifier une transaction chez MonCash (en direct)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Type d'ID</InputLabel>
            <Select value={idType} label="Type d'ID" onChange={e => setIdType(e.target.value as any)}>
              <MenuItem value="transactionId">Transaction ID</MenuItem>
              <MenuItem value="orderId">Order ID</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small" placeholder="Coller le transactionId ou orderId ici…"
            value={lookupId} onChange={e => setLookupId(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') runLookup(); }}
            sx={{ flex: 1, minWidth: 280 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
          />
          <Button variant="contained" onClick={runLookup} disabled={lookup.isPending || !lookupId.trim()}>
            {lookup.isPending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Vérifier chez MonCash'}
          </Button>
        </Box>

        {lookup.data && (
          <Box sx={{ mt: 2.5 }}>
            <Divider sx={{ mb: 2 }} />
            {!lookup.data.found ? (
              <Alert severity="warning">{lookup.data.message}</Alert>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                {[
                  { label: 'Heure', value: lookup.data.time ? new Date(lookup.data.time).toLocaleString('fr-FR') : 'Non fourni par MonCash' },
                  { label: 'Transaction ID', value: lookup.data.transaction_id },
                  { label: 'Référence (orderId)', value: lookup.data.reference },
                  { label: 'Montant', value: lookup.data.cost != null ? `${Number(lookup.data.cost).toLocaleString('fr-HT')} G` : '—' },
                  { label: 'Statut MonCash', value: lookup.data.message },
                  { label: 'Payeur', value: lookup.data.payer },
                ].map(({ label, value }) => (
                  <Box key={label}>
                    <Typography fontSize={11.5} color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing="0.5px">{label}</Typography>
                    <Typography fontSize={14} fontWeight={600} fontFamily={label.includes('ID') || label === 'Référence (orderId)' ? 'monospace' : 'inherit'}>
                      {value ?? '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Card>

      {/* ── Journal DB filtrable ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography fontWeight={700} fontSize={15}>Journal des vérifications ({data.total})</Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} label="Statut" onChange={e => { setStatusFilter(e.target.value); refetch(); }}>
            <MenuItem value="ALL">Tous</MenuItem>
            <MenuItem value="SUCCESS">Succès</MenuItem>
            <MenuItem value="FAILED">Échoués</MenuItem>
            <MenuItem value="ALREADY_CREDITED">Déjà crédités</MenuItem>
            <MenuItem value="PENDING">En attente</MenuItem>
            <MenuItem value="UNKNOWN">Inconnu</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card>
        <DataGrid rows={data.data} columns={columns} loading={isLoading}
          autoHeight pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          getRowId={(r: any) => r.id}
          sx={{ border: 'none', '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}
          disableRowSelectionOnClick
        />
      </Card>
    </Container>
  );
}
