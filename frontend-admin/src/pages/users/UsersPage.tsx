import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Avatar, Chip, IconButton, Tooltip,
  TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Alert, alpha, Select, MenuItem, FormControl,
  InputLabel, Divider, Stack,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Search, LockReset, Block, CheckCircle, Visibility, LockOpen, Person,
  AlternateEmail, Store, AccessTime, LocationOn,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const ORANGE = '#FF9900';
const ROLE_COLOR: Record<string, string> = {
  CUSTOMER: '#6366F1', SELLER: '#059669', ADMIN: '#EF4444', SUPER_ADMIN: '#7C3AED', MODERATOR: '#F59E0B',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: string; email: string }>({ open: false, userId: '', email: '' });
  const [resetResult, setResetResult] = useState('');
  const [detailUser, setDetailUser]   = useState<any>(null);
  const [page, setPage]       = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const params = new URLSearchParams({ page: String(page + 1), limit: String(pageSize) });
  if (search)      params.set('search', search);
  if (roleFilter)  params.set('role', roleFilter);
  if (activeFilter !== '') params.set('active', activeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, pageSize, search, roleFilter, activeFilter],
    queryFn: () => api.get(`/users?${params}`).then(r => r.data),
  });

  const rows   = data?.users  ?? (Array.isArray(data) ? data : []);
  const total  = data?.total  ?? rows.length;

  const resetMut = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-password`).then(r => r.data),
    onSuccess: (d) => { setResetResult(d.message || 'Mot de passe réinitialisé'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => setResetResult('Erreur'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.delete(`/users/${id}`) : api.patch(`/users/${id}/enable`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const unlockMut = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/unlock`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const columns: GridColDef[] = [
    {
      field: 'name', headerName: 'Utilisateur', flex: 1.5, minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%' }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: ORANGE, fontSize: 13, fontWeight: 700 }}>
            {row.firstName?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography fontSize={13} fontWeight={600} color="#111" lineHeight={1.2}>
              {row.firstName} {row.lastName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography fontSize={11} color="#888">{row.email}</Typography>
              {row.username && <Chip label={`@${row.username}`} size="small" sx={{ height: 15, fontSize: 9.5, fontWeight: 600, bgcolor: alpha('#6366F1', 0.08), color: '#6366F1' }} />}
            </Box>
          </Box>
        </Box>
      ),
    },
    {
      field: 'role', headerName: 'Rôle', width: 130,
      renderCell: ({ value }) => (
        <Chip label={value} size="small" sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(ROLE_COLOR[value] || '#888', 0.12), color: ROLE_COLOR[value] || '#888' }} />
      ),
    },
    {
      field: 'seller', headerName: 'Boutiques', width: 100,
      renderCell: ({ row }) => {
        if (!row.seller) return <Typography fontSize={12} color="#bbb">—</Typography>;
        const count = row.seller._count?.stores ?? row.seller.stores?.length ?? 0;
        return (
          <Chip label={`${count} boutique${count > 1 ? 's' : ''}`} size="small"
            icon={<Store sx={{ fontSize: '12px !important' }} />}
            sx={{ fontSize: 11, fontWeight: 600, bgcolor: alpha('#059669', 0.1), color: '#059669', height: 22 }} />
        );
      },
    },
    {
      field: 'isActive', headerName: 'Statut', width: 100,
      renderCell: ({ row }) => (
        <Box>
          <Chip label={row.isActive ? 'Actif' : 'Bloqué'} size="small"
            sx={{ fontSize: 11, fontWeight: 600,
              bgcolor: row.isActive ? alpha('#059669', 0.1) : alpha('#EF4444', 0.1),
              color: row.isActive ? '#059669' : '#EF4444', height: 22 }} />
          {row.lockedUntil && new Date(row.lockedUntil) > new Date() && (
            <Typography fontSize={9.5} color="error.main" lineHeight={1}>Verrouillé</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'lastLoginAt', headerName: 'Dernière connexion', width: 155,
      renderCell: ({ value }) => (
        <Typography fontSize={11.5} color="#666">
          {value ? new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
        </Typography>
      ),
    },
    {
      field: 'createdAt', headerName: 'Inscrit le', width: 115,
      renderCell: ({ value }) => (
        <Typography fontSize={11.5} color="#666">
          {value ? new Date(value).toLocaleDateString('fr-FR') : '—'}
        </Typography>
      ),
    },
    {
      field: 'actions', headerName: 'Actions', width: 130, sortable: false, filterable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.2, alignItems: 'center', height: '100%' }}>
          <Tooltip title="Voir détails">
            <IconButton size="small" onClick={() => setDetailUser(row)} sx={{ '&:hover': { bgcolor: alpha(ORANGE, 0.1) } }}>
              <Visibility fontSize="small" sx={{ color: ORANGE }} />
            </IconButton>
          </Tooltip>
          {row.lockedUntil && new Date(row.lockedUntil) > new Date() && (
            <Tooltip title="Déverrouiller">
              <IconButton size="small" onClick={() => unlockMut.mutate(row.id)} sx={{ '&:hover': { bgcolor: alpha('#10B981', 0.1) } }}>
                <LockOpen fontSize="small" sx={{ color: '#10B981' }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Reset mot de passe">
            <IconButton size="small" onClick={() => { setResetResult(''); setResetDialog({ open: true, userId: row.id, email: row.email }); }}
              sx={{ '&:hover': { bgcolor: alpha(ORANGE, 0.1) } }}>
              <LockReset fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? 'Bloquer' : 'Activer'}>
            <IconButton size="small" onClick={() => toggleMut.mutate({ id: row.id, active: row.isActive })}
              sx={{ '&:hover': { bgcolor: row.isActive ? alpha('#EF4444', 0.1) : alpha('#059669', 0.1) } }}>
              {row.isActive ? <Block fontSize="small" sx={{ color: '#EF4444' }} /> : <CheckCircle fontSize="small" sx={{ color: '#059669' }} />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#111">Utilisateurs</Typography>
          <Typography fontSize={13} color="#888">{total} compte{total > 1 ? 's' : ''} au total</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField placeholder="Nom, email, username…" size="small" value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment> }}
            sx={{ width: 230, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Rôle</InputLabel>
            <Select value={roleFilter} label="Rôle" onChange={e => { setRoleFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tous</MenuItem>
              {['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN', 'MODERATOR'].map(r => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Statut</InputLabel>
            <Select value={activeFilter} label="Statut" onChange={e => { setActiveFilter(e.target.value); setPage(0); }} sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="true">Actifs</MenuItem>
              <MenuItem value="false">Bloqués</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <CardContent sx={{ p: 0 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            autoHeight
            rowHeight={62}
            rowCount={total}
            paginationMode="server"
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={({ page: p, pageSize: ps }) => { setPage(p); setPageSize(ps); }}
            pageSizeOptions={[25, 50, 100]}
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

      {/* User Detail Drawer */}
      <Dialog open={!!detailUser} onClose={() => setDetailUser(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        {detailUser && (
          <>
            <DialogTitle sx={{ pb: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: ORANGE, fontWeight: 800, fontSize: 18 }}>
                  {detailUser.firstName?.[0]}
                </Avatar>
                <Box>
                  <Typography fontWeight={800} fontSize={16}>{detailUser.firstName} {detailUser.lastName}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mt: 0.3 }}>
                    <Chip label={detailUser.role} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(ROLE_COLOR[detailUser.role] || '#888', 0.12), color: ROLE_COLOR[detailUser.role] || '#888' }} />
                    <Chip label={detailUser.isActive ? 'Actif' : 'Bloqué'} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 600, bgcolor: detailUser.isActive ? alpha('#059669', 0.1) : alpha('#EF4444', 0.1), color: detailUser.isActive ? '#059669' : '#EF4444' }} />
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <AlternateEmail sx={{ fontSize: 16, color: '#999', mt: 0.1 }} />
                  <Box>
                    <Typography fontSize={12.5} color="#555">{detailUser.email}</Typography>
                    {detailUser.username && <Typography fontSize={12} color="#888">@{detailUser.username}</Typography>}
                  </Box>
                </Box>
                {detailUser.phone && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Typography fontSize={13} color="#555">📞 {detailUser.phone}</Typography>
                  </Box>
                )}
                {(detailUser.city || detailUser.department) && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <LocationOn sx={{ fontSize: 16, color: '#999' }} />
                    <Typography fontSize={12.5} color="#555">{[detailUser.city, detailUser.department].filter(Boolean).join(', ')}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <AccessTime sx={{ fontSize: 16, color: '#999' }} />
                  <Typography fontSize={12.5} color="#555">
                    Dernière connexion : {detailUser.lastLoginAt ? new Date(detailUser.lastLoginAt).toLocaleString('fr-FR') : 'jamais'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Person sx={{ fontSize: 16, color: '#999' }} />
                  <Typography fontSize={12.5} color="#555">
                    Inscrit le {new Date(detailUser.createdAt).toLocaleDateString('fr-FR')}
                  </Typography>
                </Box>
                {detailUser.seller && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography fontSize={12} fontWeight={700} color="#555" textTransform="uppercase" letterSpacing={0.5}>Boutiques</Typography>
                    {(detailUser.seller.stores || []).map((s: any) => (
                      <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.2, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                        <Store sx={{ fontSize: 15, color: '#059669' }} />
                        <Typography fontSize={12.5} fontWeight={600}>{s.name}</Typography>
                        {s.isPrimary && <Chip label="Principale" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: alpha('#059669', 0.1), color: '#059669' }} />}
                        <Chip label={detailUser.seller.status} size="small" sx={{ height: 18, fontSize: 9.5, ml: 'auto' }} />
                      </Box>
                    ))}
                    {(!detailUser.seller.stores || detailUser.seller.stores.length === 0) && (
                      <Typography fontSize={12} color="#999" pl={1}>Aucune boutique</Typography>
                    )}
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
              <Button onClick={() => setDetailUser(null)} sx={{ borderRadius: 2 }}>Fermer</Button>
              <Button variant="outlined" color="error" onClick={() => { toggleMut.mutate({ id: detailUser.id, active: detailUser.isActive }); setDetailUser(null); }}
                sx={{ borderRadius: 2, fontSize: 13 }}>
                {detailUser.isActive ? 'Bloquer' : 'Activer'}
              </Button>
              <Button variant="contained" onClick={() => { setResetResult(''); setDetailUser(null); setResetDialog({ open: true, userId: detailUser.id, email: detailUser.email }); }}
                sx={{ borderRadius: 2, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, color: '#111', fontWeight: 700, fontSize: 13 }}>
                Reset MDP
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, userId: '', email: '' })}
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 420 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          {!resetResult ? (
            <>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}>
                Un mot de passe temporaire sera envoyé à <strong>{resetDialog.email}</strong>.
              </Alert>
              <Typography fontSize={13} color="#555">L'utilisateur devra le changer à la prochaine connexion.</Typography>
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
            <Button variant="contained" onClick={() => resetMut.mutate(resetDialog.userId)} disabled={resetMut.isPending}
              sx={{ borderRadius: 2, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, color: '#111', fontWeight: 700 }}>
              {resetMut.isPending ? <CircularProgress size={18} sx={{ color: '#111' }} /> : 'Envoyer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
