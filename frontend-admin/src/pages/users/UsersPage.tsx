import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, Chip, IconButton, Tooltip,
  TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert, alpha,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Search, LockReset, Block, CheckCircle, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const ORANGE = '#FF9900';

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: '', email: '' });
  const [resetResult, setResetResult] = useState('');

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users?limit=200').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []).catch(() => []),
  });

  const rows = raw.filter((u: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.firstName?.toLowerCase().includes(q) || u.lastName?.toLowerCase().includes(q);
  });

  const resetMut = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-password`).then(r => r.data),
    onSuccess: (data) => { setResetResult(data.message || 'Mot de passe réinitialisé'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => setResetResult('Erreur lors de la réinitialisation'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.delete(`/users/${id}`) : api.patch(`/users/${id}/enable`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const roleColor: Record<string, string> = {
    CUSTOMER: '#6366F1', SELLER: '#059669', ADMIN: '#EF4444', SUPER_ADMIN: '#7C3AED',
  };

  const columns: GridColDef[] = [
    {
      field: 'name', headerName: 'Utilisateur', flex: 1.5, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%' }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: ORANGE, fontSize: 12, fontWeight: 700 }}>
            {row.firstName?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography fontSize={13} fontWeight={600} color="#111" lineHeight={1.2}>
              {row.firstName} {row.lastName}
            </Typography>
            <Typography fontSize={11.5} color="#888">{row.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role', headerName: 'Rôle', width: 130,
      renderCell: ({ value }) => (
        <Chip label={value} size="small"
          sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(roleColor[value] || '#888', 0.12), color: roleColor[value] || '#888' }} />
      ),
    },
    {
      field: 'isActive', headerName: 'Statut', width: 110,
      renderCell: ({ value }) => (
        <Chip label={value ? 'Actif' : 'Bloqué'} size="small"
          sx={{ fontSize: 11, fontWeight: 600,
            bgcolor: value ? alpha('#059669', 0.1) : alpha('#EF4444', 0.1),
            color: value ? '#059669' : '#EF4444' }} />
      ),
    },
    {
      field: 'createdAt', headerName: 'Inscrit le', width: 130,
      renderCell: ({ value }) => (
        <Typography fontSize={12} color="#666">
          {value ? new Date(value).toLocaleDateString('fr-FR') : '—'}
        </Typography>
      ),
    },
    {
      field: 'actions', headerName: 'Actions', width: 130, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          <Tooltip title="Réinitialiser mot de passe">
            <IconButton size="small" onClick={() => { setResetResult(''); setResetDialog({ open: true, userId: row.id, email: row.email }); }}
              sx={{ '&:hover': { bgcolor: alpha(ORANGE, 0.1), color: ORANGE } }}>
              <LockReset fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? 'Bloquer' : 'Activer'}>
            <IconButton size="small"
              onClick={() => toggleMut.mutate({ id: row.id, active: row.isActive })}
              sx={{ '&:hover': { bgcolor: row.isActive ? alpha('#EF4444', 0.1) : alpha('#059669', 0.1) } }}>
              {row.isActive
                ? <Block fontSize="small" sx={{ color: '#EF4444' }} />
                : <CheckCircle fontSize="small" sx={{ color: '#059669' }} />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#111">Utilisateurs</Typography>
          <Typography fontSize={13} color="#888">{rows.length} compte{rows.length > 1 ? 's' : ''}</Typography>
        </Box>
        <TextField placeholder="Rechercher par nom ou email…" size="small" value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment> }}
          sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            autoHeight
            rowHeight={60}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { bgcolor: '#F9FAFB', fontSize: 12, fontWeight: 700 },
              '& .MuiDataGrid-row:hover': { bgcolor: '#FAFAFA' },
              '& .MuiDataGrid-cell': { borderColor: '#F3F4F6' },
            }}
          />
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, userId: '', email: '' })}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 420 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          {!resetResult ? (
            <>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}>
                Un mot de passe temporaire sera généré et envoyé par email à <strong>{resetDialog.email}</strong>.
                L'utilisateur devra le changer à la prochaine connexion.
              </Alert>
              <Typography fontSize={13} color="#555">
                Cette action est irréversible. L'ancien mot de passe sera immédiatement invalide.
              </Typography>
            </>
          ) : (
            <Alert severity="success" sx={{ borderRadius: 2, fontSize: 13 }}>{resetResult}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetDialog({ open: false, userId: '', email: '' })} sx={{ borderRadius: 2 }}>
            {resetResult ? 'Fermer' : 'Annuler'}
          </Button>
          {!resetResult && (
            <Button variant="contained" onClick={() => resetMut.mutate(resetDialog.userId)}
              disabled={resetMut.isPending}
              sx={{ borderRadius: 2, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, color: '#111', fontWeight: 700 }}>
              {resetMut.isPending ? <CircularProgress size={18} sx={{ color: '#111' }} /> : 'Envoyer le mot de passe'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
