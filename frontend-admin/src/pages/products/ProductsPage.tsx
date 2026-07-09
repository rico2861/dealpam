import { useState } from 'react';
import { Container, Typography, Card, Box, Chip, Button, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Avatar, CircularProgress, Tooltip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { CheckCircle, Cancel, Visibility, Flag, History } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, any> = { PUBLISHED: 'success', PENDING_REVIEW: 'warning', REJECTED: 'error', DRAFT: 'default', ARCHIVED: 'default' };

export default function ProductsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState('PENDING_REVIEW');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [reason, setReason] = useState('');
  const [historyProductId, setHistoryProductId] = useState<string | null>(null);

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['product-audit-log', historyProductId],
    queryFn: () => api.get(`/products/${historyProductId}/audit-log`).then(r => r.data || []),
    enabled: !!historyProductId,
  });
  const ACTION_LABEL: Record<string, string> = {
    PRODUCT_CREATED: 'Créé', PRODUCT_EDITED: 'Modifié', PRODUCT_APPROVED: 'Approuvé', PRODUCT_REJECTED: 'Rejeté',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['adminProducts', tab],
    queryFn: () => api.get(`/products/admin-list?status=${tab}&limit=100`).then(r => r.data?.data || []),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/products/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminProducts'] }); enqueueSnackbar('Produit approuvé', { variant: 'success' }); },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/products/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminProducts'] }); setRejectDialog({ open: false, id: '' }); enqueueSnackbar('Produit rejeté', { variant: 'warning' }); },
  });

  const columns: GridColDef[] = [
    { field: 'img', headerName: '', width: 56, renderCell: (p) => (
      <Avatar variant="rounded" src={p.row.images?.[0]?.url} sx={{ width: 36, height: 36 }}>{p.row.name?.[0]}</Avatar>
    ), sortable: false },
    { field: 'name', headerName: 'Produit', flex: 2, minWidth: 180, renderCell: (p) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, height: '100%' }}>
        {p.row.isFlagged && (
          <Tooltip title={p.row.flagReason || 'Contenu potentiellement sensible — à vérifier'}>
            <Flag sx={{ fontSize: 16, color: '#EF4444' }} />
          </Tooltip>
        )}
        <span>{p.row.name}</span>
      </Box>
    ) },
    { field: 'store', headerName: 'Boutique', flex: 1, minWidth: 120, renderCell: (p) => p.row.store?.name || '—' },
    { field: 'price', headerName: 'Prix (HTG)', width: 110, renderCell: (p) => `${Number(p.row.price).toLocaleString()} HTG` },
    { field: 'stock', headerName: 'Stock', width: 80, align: 'center' },
    { field: 'status', headerName: 'Statut', width: 140, renderCell: (p) => <Chip label={p.row.status} size="small" color={STATUS_COLOR[p.row.status]} /> },
    { field: 'createdAt', headerName: 'Soumis le', width: 110, renderCell: (p) => new Date(p.row.createdAt).toLocaleDateString('fr') },
    { field: 'actions', headerName: 'Actions', width: 260, sortable: false, renderCell: (p) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {p.row.status === 'PENDING_REVIEW' && (
          <>
            <Button size="small" color="success" variant="contained" startIcon={<CheckCircle />} onClick={() => approveMutation.mutate(p.row.id)} sx={{ fontSize: 11 }}>Approuver</Button>
            <Button size="small" color="error" variant="outlined" startIcon={<Cancel />} onClick={() => setRejectDialog({ open: true, id: p.row.id })} sx={{ fontSize: 11 }}>Rejeter</Button>
          </>
        )}
        <Button size="small" variant="outlined" href={`https://dealpam.com/products/${p.row.slug}`} target="_blank" startIcon={<Visibility />} sx={{ fontSize: 11 }}>Voir</Button>
        <Button size="small" variant="text" startIcon={<History />} onClick={() => setHistoryProductId(p.row.id)} sx={{ fontSize: 11 }}>Historique</Button>
      </Box>
    )},
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Modération des produits</Typography>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Une édition d'un produit déjà publié reste visible immédiatement — seul un contenu détecté comme suspect
        repasse en "Pending review" le temps qu'un admin tranche ici.
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        {['PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'DRAFT'].map(s => (
          <Tab key={s} value={s} label={s.replace('_', ' ')} />
        ))}
      </Tabs>

      <Card>
        <DataGrid
          rows={data || []}
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
        <DialogTitle>Rejeter le produit</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Raison du rejet" multiline rows={3} value={reason} onChange={(e) => setReason(e.target.value)} sx={{ mt: 1 }} required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, id: '' })}>Annuler</Button>
          <Button variant="contained" color="error" disabled={!reason.trim()}
            onClick={() => rejectMutation.mutate({ id: rejectDialog.id, reason })}>
            Rejeter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Historique complet du produit — qui a fait quoi, quand (creation, edits, approbation/rejet) */}
      <Dialog open={!!historyProductId} onClose={() => setHistoryProductId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Historique du produit</DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={22} /></Box>
          ) : !history?.length ? (
            <Typography fontSize={13} color="text.secondary">Aucun historique disponible.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {history.map((h: any) => (
                <Box key={h.id} sx={{ borderBottom: '1px solid rgba(0,0,0,0.08)', pb: 1.2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                    <Chip size="small" label={ACTION_LABEL[h.action] || h.action} />
                    <Typography fontSize={11} color="text.secondary">{new Date(h.createdAt).toLocaleString('fr-FR')}</Typography>
                  </Box>
                  <Typography fontSize={12} color="text.secondary">
                    Par : {h.user ? `${h.user.firstName} ${h.user.lastName} (${h.user.role})` : 'Vendeur'}
                  </Typography>
                  {h.newValues?.flagged && (
                    <Typography fontSize={12} color="error.main" fontWeight={600} mt={0.3}>
                      Suspect : {h.newValues.flagReason}
                    </Typography>
                  )}
                  {h.newValues?.reason && (
                    <Typography fontSize={12} color="text.secondary" mt={0.3}>Motif : {h.newValues.reason}</Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryProductId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
