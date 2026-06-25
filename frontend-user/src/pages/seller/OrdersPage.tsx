import { useState } from 'react';
import { Container, Typography, Card, Box, Chip, Button, Tab, Tabs, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, any> = { PENDING: 'warning', CONFIRMED: 'info', PREPARING: 'info', SHIPPED: 'primary', DELIVERED: 'success', CANCELLED: 'error' };
const STATUS_LABEL: Record<string, string> = { PENDING: 'En attente', CONFIRMED: 'Confirmée', PREPARING: 'En préparation', SHIPPED: 'Expédiée', DELIVERED: 'Livrée', CANCELLED: 'Annulée' };
const NEXT_STATUSES: Record<string, string[]> = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['PREPARING'], PREPARING: ['SHIPPED'], SHIPPED: ['DELIVERED'] };

export default function SellerOrdersPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [updateDialog, setUpdateDialog] = useState<{ open: boolean; order: any; status: string }>({ open: false, order: null, status: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['sellerOrders'],
    queryFn: () => api.get('/orders/seller?limit=200').then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/orders/seller/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sellerOrders'] });
      enqueueSnackbar('Statut mis à jour', { variant: 'success' });
      setUpdateDialog({ open: false, order: null, status: '' });
    },
  });

  const columns: GridColDef[] = [
    { field: 'id', headerName: '#', width: 100, renderCell: (p) => p.row.id.slice(-8).toUpperCase() },
    {
      field: 'customer', headerName: 'Client', flex: 1, minWidth: 140,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1a1a2e' }}>{p.row.user?.firstName?.[0]}</Avatar>
          <Typography variant="body2">{p.row.user?.firstName} {p.row.user?.lastName}</Typography>
        </Box>
      ),
    },
    {
      field: 'items', headerName: 'Articles', width: 80, align: 'center',
      renderCell: (p) => p.row.items?.length || 0,
    },
    {
      field: 'totalHTG', headerName: 'Total', width: 120,
      renderCell: (p) => `${Number(p.row.totalHTG).toLocaleString()} HTG`,
    },
    {
      field: 'status', headerName: 'Statut', width: 130,
      renderCell: (p) => <Chip label={STATUS_LABEL[p.row.status] || p.row.status} size="small" color={STATUS_COLOR[p.row.status]} />,
    },
    {
      field: 'createdAt', headerName: 'Date', width: 100,
      renderCell: (p) => new Date(p.row.createdAt).toLocaleDateString('fr'),
    },
    {
      field: 'actions', headerName: 'Actions', width: 150, sortable: false,
      renderCell: (p) => {
        const nextStatuses = NEXT_STATUSES[p.row.status];
        if (!nextStatuses?.length) return null;
        return (
          <Button size="small" variant="contained" sx={{ fontSize: 11 }} onClick={() => setUpdateDialog({ open: true, order: p.row, status: nextStatuses[0] })}>
            Mettre à jour
          </Button>
        );
      },
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" fontWeight={800} mb={3}>Mes commandes</Typography>
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

      <Dialog open={updateDialog.open} onClose={() => setUpdateDialog({ open: false, order: null, status: '' })}>
        <DialogTitle>Mettre à jour la commande</DialogTitle>
        <DialogContent sx={{ minWidth: 300, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Nouveau statut</InputLabel>
            <Select value={updateDialog.status} label="Nouveau statut" onChange={(e) => setUpdateDialog({ ...updateDialog, status: e.target.value })}>
              {(NEXT_STATUSES[updateDialog.order?.status] || []).map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABEL[s]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog({ open: false, order: null, status: '' })}>Annuler</Button>
          <Button variant="contained" onClick={() => updateMutation.mutate({ id: updateDialog.order?.id, status: updateDialog.status })}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
