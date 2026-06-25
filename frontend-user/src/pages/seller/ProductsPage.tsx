import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Card, Box, Chip, Button, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Delete, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, any> = {
  PUBLISHED: 'success', PENDING_REVIEW: 'warning', REJECTED: 'error', DRAFT: 'default', ARCHIVED: 'default'
};
const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Publié', PENDING_REVIEW: 'En révision', REJECTED: 'Rejeté', DRAFT: 'Brouillon', ARCHIVED: 'Archivé'
};

export default function SellerProductsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sellerProducts'],
    queryFn: () => api.get('/products/me?limit=200').then(r => r.data?.data || []),
  });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/products/${deleteDialog.id}`);
      qc.invalidateQueries({ queryKey: ['sellerProducts'] });
      enqueueSnackbar('Produit supprimé', { variant: 'success' });
      setDeleteDialog({ open: false, id: '', name: '' });
    } catch {
      enqueueSnackbar('Erreur lors de la suppression', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'img', headerName: '', width: 60, sortable: false,
      renderCell: (p) => (
        <Avatar variant="rounded" src={p.row.images?.[0]?.url} sx={{ width: 38, height: 38 }}>
          {p.row.name?.[0]}
        </Avatar>
      ),
    },
    { field: 'name', headerName: 'Produit', flex: 2, minWidth: 180 },
    {
      field: 'price', headerName: 'Prix', width: 130,
      renderCell: (p) => (
        <Box>
          {p.row.salePrice ? (
            <>
              <Typography variant="body2" color="error" fontWeight={700}>{Number(p.row.salePrice).toLocaleString()} HTG</Typography>
              <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>{Number(p.row.price).toLocaleString()}</Typography>
            </>
          ) : (
            <Typography variant="body2" fontWeight={600}>{Number(p.row.price).toLocaleString()} HTG</Typography>
          )}
        </Box>
      ),
    },
    { field: 'stock', headerName: 'Stock', width: 80, align: 'center', headerAlign: 'center' },
    {
      field: 'status', headerName: 'Statut', width: 130,
      renderCell: (p) => <Chip label={STATUS_LABEL[p.row.status] || p.row.status} size="small" color={STATUS_COLOR[p.row.status]} />,
    },
    {
      field: 'createdAt', headerName: 'Date', width: 100,
      renderCell: (p) => new Date(p.row.createdAt).toLocaleDateString('fr'),
    },
    {
      field: 'actions', headerName: 'Actions', width: 180, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" variant="outlined" startIcon={<Edit />} onClick={() => navigate(`/seller/products/edit/${p.row.id}`)} sx={{ fontSize: 11 }}>Éditer</Button>
          <Button size="small" variant="outlined" color="error" startIcon={<Delete />} onClick={() => setDeleteDialog({ open: true, id: p.row.id, name: p.row.name })} sx={{ fontSize: 11 }}>Sup.</Button>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Mes produits</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/seller/products/add')} size="large">
          Ajouter un produit
        </Button>
      </Box>

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

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: '', name: '' })}>
        <DialogTitle>Supprimer le produit</DialogTitle>
        <DialogContent>
          <Typography>Êtes-vous sûr de vouloir supprimer <strong>"{deleteDialog.name}"</strong> ?</Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>Cette action supprimera aussi toutes les images sur Cloudinary.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: '', name: '' })}>Annuler</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
