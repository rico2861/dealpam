import { useState } from 'react';
import { Box, Container, Typography, Card, Chip, Tooltip, IconButton,
  TextField, InputAdornment, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search, ContentCopy, Visibility } from '@mui/icons-material';
import api from '../../api/axios';
import { useSnackbar } from 'notistack';

const METHOD_COLORS: Record<string, string> = {
  MONCASH: '#E53935', NATCASH: '#1565C0', STRIPE: '#6772E5',
  PAYPAL: '#003087', MANUAL: '#546E7A',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PENDING:   { bg: '#FEF3C7', color: '#92400E' },
  COMPLETED: { bg: '#D1FAE5', color: '#065F46' },
  FAILED:    { bg: '#FEE2E2', color: '#991B1B' },
  REFUNDED:  { bg: '#DBEAFE', color: '#1E40AF' },
};

function CopyCell({ value }: { value?: string }) {
  const { enqueueSnackbar } = useSnackbar();
  if (!value) return <Typography color="text.disabled" fontSize={12}>—</Typography>;
  const short = value.length > 20 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography fontSize={12} fontFamily="monospace" color="text.secondary" noWrap>{short}</Typography>
      <Tooltip title="Copier">
        <IconButton size="small" sx={{ p: 0.3 }}
          onClick={() => { navigator.clipboard.writeText(value); enqueueSnackbar('Copié !', { variant: 'success', autoHideDuration: 1200 }); }}>
          <ContentCopy sx={{ fontSize: 13, color: 'text.disabled' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default function PaymentsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [detail, setDetail] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-payments', dateFrom, dateTo],
    queryFn: () => api.get('/payments', { params: { limit: 200, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } })
      .then(r => Array.isArray(r.data) ? r.data : r.data?.data || []).catch(() => []),
  });

  const filtered = data.filter((p: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.id?.includes(q) || p.transactionId?.toLowerCase().includes(q) ||
      p.moncashOrderId?.toLowerCase().includes(q) || p.moncashTransactionId?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchMethod = methodFilter === 'ALL' || p.method === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  // Stats
  const total = data.reduce((s: number, p: any) => s + Number(p.amountHTG || 0), 0);
  const completed = data.filter((p: any) => p.status === 'COMPLETED');
  const totalCompleted = completed.reduce((s: number, p: any) => s + Number(p.amountHTG || 0), 0);

  const columns: GridColDef[] = [
    {
      field: 'method', headerName: 'Méthode', width: 120,
      renderCell: ({ value }) => (
        <Chip label={value || '—'} size="small"
          sx={{ bgcolor: METHOD_COLORS[value] || '#546E7A', color: 'white', fontSize: 11, fontWeight: 700, height: 22 }} />
      ),
    },
    {
      field: 'status', headerName: 'Statut', width: 120,
      renderCell: ({ value }) => {
        const s = STATUS_COLORS[value] || { bg: '#F1F5F9', color: '#64748B' };
        return <Chip label={value || '—'} size="small" sx={{ bgcolor: s.bg, color: s.color, fontSize: 11, fontWeight: 700, height: 22 }} />;
      },
    },
    {
      field: 'amountHTG', headerName: 'Montant (HTG)', width: 140, type: 'number',
      renderCell: ({ value }) => (
        <Typography fontWeight={700} fontSize={13.5} color={value > 0 ? 'success.main' : 'text.primary'}>
          {value != null ? `${Number(value).toLocaleString('fr-HT')} G` : '—'}
        </Typography>
      ),
    },
    {
      field: 'transactionId', headerName: 'Transaction ID (interne)', width: 200,
      renderCell: ({ value }) => <CopyCell value={value} />,
    },
    {
      field: 'moncashOrderId', headerName: 'MonCash Order ID', width: 200,
      renderCell: ({ value }) => <CopyCell value={value} />,
    },
    {
      field: 'moncashTransactionId', headerName: 'MonCash TX ID', width: 200,
      renderCell: ({ value }) => <CopyCell value={value} />,
    },
    {
      field: 'paidAt', headerName: 'Payé le', width: 160,
      renderCell: ({ value }) => value
        ? <Typography fontSize={12.5}>{new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Typography>
        : <Typography color="text.disabled" fontSize={12}>Non payé</Typography>,
    },
    {
      field: 'failureReason', headerName: 'Raison échec', width: 180,
      renderCell: ({ value }) => value
        ? <Tooltip title={value}><Typography fontSize={12} color="error.main" noWrap>{value}</Typography></Tooltip>
        : <Typography color="text.disabled" fontSize={12}>—</Typography>,
    },
    {
      field: 'createdAt', headerName: 'Créé le', width: 150,
      renderCell: ({ value }) => <Typography fontSize={12}>{new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</Typography>,
    },
    {
      field: 'actions', headerName: '', width: 50, sortable: false,
      renderCell: ({ row }) => (
        <IconButton size="small" onClick={() => setDetail(row)}>
          <Visibility fontSize="small" sx={{ color: 'text.disabled' }} />
        </IconButton>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">Paiements</Typography>
          <Typography color="text.secondary" fontSize={14} mt={0.3}>{data.length} paiements enregistrés</Typography>
        </Box>
        {/* Stats chips */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { label: `${data.length} total`, color: '#64748B' },
            { label: `${completed.length} complétés`, color: '#059669' },
            { label: `${Number(totalCompleted).toLocaleString('fr-HT')} G collectés`, color: '#1D4ED8' },
          ].map(s => (
            <Chip key={s.label} label={s.label} size="small"
              sx={{ bgcolor: `${s.color}15`, color: s.color, fontWeight: 700, fontSize: 12.5 }} />
          ))}
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Rechercher par ID, Transaction ID, MonCash ID…"
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }} />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Statut</InputLabel>
          <Select value={statusFilter} label="Statut" onChange={e => setStatusFilter(e.target.value)} sx={{ borderRadius: 2.5 }}>
            <MenuItem value="ALL">Tous</MenuItem>
            {['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Méthode</InputLabel>
          <Select value={methodFilter} label="Méthode" onChange={e => setMethodFilter(e.target.value)} sx={{ borderRadius: 2.5 }}>
            <MenuItem value="ALL">Toutes</MenuItem>
            {['MONCASH', 'NATCASH', 'STRIPE', 'PAYPAL', 'MANUAL'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, padding: '5px 8px', background: '#F7F8FA' }} />
          <Typography fontSize={12} color="text.secondary">à</Typography>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ fontSize: 12.5, color: '#0F172A', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 8, padding: '5px 8px', background: '#F7F8FA' }} />
          {(dateFrom || dateTo) && (
            <Typography onClick={() => { setDateFrom(''); setDateTo(''); }}
              sx={{ fontSize: 11.5, color: 'text.secondary', cursor: 'pointer', textDecoration: 'underline', '&:hover': { color: 'text.primary' } }}>
              Réinitialiser
            </Typography>
          )}
        </Box>
      </Box>

      <Card>
        <DataGrid rows={filtered} columns={columns} loading={isLoading}
          autoHeight pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          getRowId={r => r.id}
          sx={{ border: 'none', '& .MuiDataGrid-row:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}
          disableRowSelectionOnClick
        />
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Détail paiement</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'ID', value: detail.id },
                { label: 'Méthode', value: detail.method },
                { label: 'Statut', value: detail.status },
                { label: 'Montant HTG', value: detail.amountHTG ? `${Number(detail.amountHTG).toLocaleString('fr-HT')} G` : '—' },
                { label: 'Transaction ID (interne)', value: detail.transactionId },
                { label: 'MonCash Order ID', value: detail.moncashOrderId },
                { label: 'MonCash Transaction ID', value: detail.moncashTransactionId },
                { label: 'Payé le', value: detail.paidAt ? new Date(detail.paidAt).toLocaleString('fr-FR') : '—' },
                { label: "Raison d'échec", value: detail.failureReason || '—' },
                { label: 'Créé le', value: new Date(detail.createdAt).toLocaleString('fr-FR') },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', pb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ minWidth: 180 }}>{label}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontFamily={['id', 'Transaction ID (interne)', 'MonCash Order ID', 'MonCash Transaction ID'].some(l => l === label) ? 'monospace' : 'inherit'} fontSize={13}>
                      {value || '—'}
                    </Typography>
                    {value && value !== '—' && ['id', 'Transaction ID (interne)', 'MonCash Order ID', 'MonCash Transaction ID'].some(l => l === label) && (
                      <IconButton size="small" sx={{ p: 0.3 }}
                        onClick={() => { navigator.clipboard.writeText(value); enqueueSnackbar('Copié !', { variant: 'success', autoHideDuration: 1200 }); }}>
                        <ContentCopy sx={{ fontSize: 13, color: 'text.disabled' }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetail(null)} variant="outlined" sx={{ borderRadius: 2 }}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
