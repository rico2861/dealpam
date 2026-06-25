import { useState } from 'react';
import { Container, Typography, Card, Box, Chip, Button, Avatar, TextField, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Pause, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

export default function SellersPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', tab],
    queryFn: () => api.get(`/sellers?status=${tab}&limit=100`).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sellers/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellers'] }); enqueueSnackbar('Vendeur approuvé', { variant: 'success' }); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/sellers/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellers'] }); setRejectDialog({ open: false, id: '' }); enqueueSnackbar('Vendeur rejeté', { variant: 'warning' }); },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sellers/${id}/suspend`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellers'] }); enqueueSnackbar('Vendeur suspendu', { variant: 'warning' }); },
  });

  const filtered = (data || []).filter((s: any) => {
    const q = search.toLowerCase();
    return !q || s.user?.firstName?.toLowerCase().includes(q) || s.user?.email?.toLowerCase().includes(q) || s.store?.name?.toLowerCase().includes(q);
  });

  const STATUS_COLOR: Record<string, any> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error', SUSPENDED: 'default' };

  const columns: GridColDef[] = [
    { field: 'avatar', headerName: '', width: 56, renderCell: (p) => <Avatar sx={{ bgcolor: '#c41230', width: 32, height: 32, fontSize: 13 }}>{p.row.user?.firstName?.[0]}</Avatar>, sortable: false },
    { field: 'name', headerName: 'Vendeur', flex: 1.5, minWidth: 160, renderCell: (p) => (
      <Box><Typography variant="body2" fontWeight={600}>{p.row.user?.firstName} {p.row.user?.lastName}</Typography><Typography variant="caption" color="text.secondary">{p.row.user?.email}</Typography></Box>
    )},
    { field: 'store', headerName: 'Boutique', flex: 1, minWidth: 130, renderCell: (p) => p.row.store?.name || '—' },
    { field: 'sub', headerName: 'Abonnement', width: 120, renderCell: (p) => {
      const plan = p.row.subscriptions?.[0]?.plan?.tier;
      return plan ? <Chip label={plan} size="small" color={plan === 'ELITE' ? 'error' : plan === 'PREMIUM' ? 'secondary' : 'default'} /> : '—';
    }},
    { field: 'status', headerName: 'Statut', width: 110, renderCell: (p) => <Chip label={p.row.status} size="small" color={STATUS_COLOR[p.row.status]} /> },
    { field: 'createdAt', headerName: 'Inscrit le', width: 110, renderCell: (p) => new Date(p.row.createdAt).toLocaleDateString('fr') },
    { field: 'actions', headerName: 'Actions', width: 200, sortable: false, renderCell: (p) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {p.row.status === 'PENDING' && (
          <>
            <Button size="small" color="success" variant="contained" startIcon={<CheckCircle />} onClick={() => approveMutation.mutate(p.row.id)} sx={{ fontSize: 11 }}>Approuver</Button>
            <Button size="small" color="error" variant="outlined" startIcon={<Cancel />} onClick={() => setRejectDialog({ open: true, id: p.row.id })} sx={{ fontSize: 11 }}>Rejeter</Button>
          </>
        )}
        {p.row.status === 'APPROVED' && (
          <Button size="small" color="warning" variant="outlined" startIcon={<Pause />} onClick={() => suspendMutation.mutate(p.row.id)} sx={{ fontSize: 11 }}>Suspendre</Button>
        )}
        {p.row.status === 'SUSPENDED' && (
          <Button size="small" color="success" variant="outlined" onClick={() => api.post(`/sellers/${p.row.id}/reactivate`).then(() => qc.invalidateQueries({ queryKey: ['sellers'] }))} sx={{ fontSize: 11 }}>Réactiver</Button>
        )}
      </Box>
    )},
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Gestion des vendeurs</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map(s => <Tab key={s} value={s} label={s} />)}
      </Tabs>

      <Card>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField size="small" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> }} sx={{ width: 280 }} />
          <Chip label={`${filtered.length} résultat(s)`} variant="outlined" size="small" />
        </Box>
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={isLoading}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[20, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          sx={{ border: 'none' }}
        />
      </Card>

      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, id: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Rejeter le vendeur</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>Le vendeur sera notifié par email avec la raison du rejet.</Alert>
          <TextField fullWidth label="Raison du rejet" multiline rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, id: '' })}>Annuler</Button>
          <Button variant="contained" color="error" onClick={() => rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason })} disabled={!rejectReason.trim()}>Confirmer le rejet</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
