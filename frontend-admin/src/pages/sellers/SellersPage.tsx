import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Card, Box, Chip, Button, Avatar, TextField,
  Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Alert, alpha, Divider, Stack, InputAdornment, IconButton,
  Badge,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  CheckCircle, Cancel, Pause, Search, Store, Visibility,
  AlternateEmail, LocationOn, AccessTime, PlayArrow, FiberManualRecord,
  VerifiedUser, Business, ExpandMore, ExpandLess,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444', SUSPENDED: '#6B7280',
};

// ── Pending card (richer inline view for verification queue) ───────────────

function PendingCard({ row, onApprove, onReject, onDetail }: { row: any; onApprove: () => void; onReject: () => void; onDetail: () => void }) {
  const [storesOpen, setStoresOpen] = useState(false);
  const stores: any[] = row.stores ?? [];
  const plan = row.subscriptions?.[0]?.plan?.tier;
  const planColors: Record<string, string> = { STARTER: '#6B7280', BUSINESS: '#2563EB', PREMIUM: '#7C3AED', ELITE: '#EF4444' };

  return (
    <Card sx={{ p: 2.5, borderRadius: 3, border: '1.5px solid #FDE68A', bgcolor: '#FFFBEB', boxShadow: 'none', mb: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Avatar + name */}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flex: 1, minWidth: 200 }}>
          <Avatar sx={{ width: 48, height: 48, bgcolor: '#c41230', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
            {row.user?.firstName?.[0]}
          </Avatar>
          <Box>
            <Typography fontWeight={800} fontSize={15} color="#111">
              {row.user?.firstName} {row.user?.lastName}
            </Typography>
            <Typography fontSize={12} color="#666">{row.user?.email}</Typography>
            {row.businessCity && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.3 }}>
                <LocationOn sx={{ fontSize: 12, color: '#999' }} />
                <Typography fontSize={11.5} color="#777">{row.businessCity}{row.businessDept ? `, ${row.businessDept}` : ''}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Business info */}
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography fontSize={11} fontWeight={700} color="#888" textTransform="uppercase" letterSpacing="0.5px" mb={0.5}>Type d'activité</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Business sx={{ fontSize: 15, color: '#555' }} />
            <Typography fontSize={13} fontWeight={600}>{row.businessType || '—'}</Typography>
          </Box>
          {plan && (
            <Chip label={plan} size="small" sx={{ mt: 0.8, height: 20, fontSize: 10, fontWeight: 700, bgcolor: alpha(planColors[plan] || '#888', 0.1), color: planColors[plan] || '#888' }} />
          )}
        </Box>

        {/* Inscription date */}
        <Box sx={{ flex: 0.6, minWidth: 100 }}>
          <Typography fontSize={11} fontWeight={700} color="#888" textTransform="uppercase" letterSpacing="0.5px" mb={0.5}>Inscrit le</Typography>
          <Typography fontSize={13}>{new Date(row.createdAt).toLocaleDateString('fr-FR')}</Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', flexShrink: 0 }}>
          <IconButton size="small" onClick={onDetail} sx={{ bgcolor: alpha('#2563EB', 0.08), borderRadius: 1.5, '&:hover': { bgcolor: alpha('#2563EB', 0.16) } }}>
            <Visibility fontSize="small" sx={{ color: '#2563EB' }} />
          </IconButton>
          <Button size="small" variant="contained" color="success" startIcon={<CheckCircle sx={{ fontSize: 13 }} />}
            onClick={onApprove} sx={{ borderRadius: 1.5, fontSize: 12, fontWeight: 700 }}>
            Approuver
          </Button>
          <Button size="small" variant="outlined" color="error" startIcon={<Cancel sx={{ fontSize: 13 }} />}
            onClick={onReject} sx={{ borderRadius: 1.5, fontSize: 12 }}>
            Rejeter
          </Button>
        </Box>
      </Box>

      {/* Stores section */}
      {stores.length > 0 && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #FDE68A' }}>
          <Box onClick={() => setStoresOpen(p => !p)} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, cursor: 'pointer', mb: storesOpen ? 1 : 0 }}>
            <Store sx={{ fontSize: 15, color: '#059669' }} />
            <Typography fontSize={12.5} fontWeight={700} color="#059669">{stores.length} boutique{stores.length > 1 ? 's' : ''}</Typography>
            {storesOpen ? <ExpandLess sx={{ fontSize: 16, color: '#666' }} /> : <ExpandMore sx={{ fontSize: 16, color: '#666' }} />}
          </Box>
          {storesOpen && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {stores.map((s: any) => (
                <Box key={s.id} sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: '#fff', border: '1px solid #E5E7EB', minWidth: 160 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    {s.logoUrl ? <Avatar src={s.logoUrl} sx={{ width: 24, height: 24, borderRadius: 1 }} /> : <Store sx={{ fontSize: 16, color: '#059669' }} />}
                    <Typography fontSize={13} fontWeight={700}>{s.name}</Typography>
                    {s.isPrimary && <Chip label="principale" size="small" sx={{ height: 16, fontSize: 9, bgcolor: alpha('#059669', 0.1), color: '#059669' }} />}
                  </Box>
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 1.5 }}>
                    <Typography fontSize={11} color="#888">{s._count?.products ?? 0} produits</Typography>
                    {s.department && <Typography fontSize={11} color="#888">{s.department}</Typography>}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SellersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab]         = useState('PENDING');
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string }>({ open: false, id: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const params = new URLSearchParams({ status: tab, page: String(page + 1), limit: String(pageSize) });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', tab, page, pageSize, search],
    queryFn: () => api.get(`/sellers?${params}`).then(r => { setLastRefresh(new Date()); return r.data; }),
    refetchInterval: 20000, // refresh every 20s — real-time
  });

  // Always fetch PENDING count for badge
  const { data: pendingData } = useQuery({
    queryKey: ['sellers-pending-count'],
    queryFn: () => api.get('/sellers?status=PENDING&limit=1').then(r => r.data?.total ?? 0),
    refetchInterval: 20000,
  });
  const pendingCount = typeof pendingData === 'number' ? pendingData : 0;

  const rows  = data?.sellers ?? (Array.isArray(data) ? data : []);
  const total = data?.total   ?? rows.length;

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['seller-detail', detailId],
    queryFn: () => api.get(`/sellers/${detailId}`).then(r => r.data),
    enabled: !!detailId,
  });

  const approveMut    = useMutation({ mutationFn: (id: string) => api.post(`/sellers/${id}/approve`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellers'] }); qc.invalidateQueries({ queryKey: ['sellers-pending-count'] }); enqueueSnackbar('Vendeur approuvé ✓', { variant: 'success' }); } });
  const rejectMut     = useMutation({ mutationFn: ({ id, reason }: any) => api.post(`/sellers/${id}/reject`, { reason }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellers'] }); qc.invalidateQueries({ queryKey: ['sellers-pending-count'] }); setRejectDialog({ open: false, id: '' }); setRejectReason(''); enqueueSnackbar('Vendeur rejeté', { variant: 'warning' }); } });
  const suspendMut    = useMutation({ mutationFn: (id: string) => api.post(`/sellers/${id}/suspend`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellers'] }); enqueueSnackbar('Vendeur suspendu', { variant: 'warning' }); } });
  const reactivateMut = useMutation({ mutationFn: (id: string) => api.post(`/sellers/${id}/reactivate`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['sellers'] }); enqueueSnackbar('Vendeur réactivé', { variant: 'success' }); } });

  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const viewDocument = async (sellerId: string, docId: string) => {
    setViewingDoc(docId);
    try {
      const { data } = await api.get(`/sellers/${sellerId}/documents/${docId}/view`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      enqueueSnackbar('Impossible de charger le document', { variant: 'error' });
    } finally { setViewingDoc(null); }
  };
  const validateDocMut = useMutation({
    mutationFn: ({ sellerId, docId, isValid }: any) => api.patch(`/sellers/${sellerId}/documents/${docId}/validate`, { isValid }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-detail', detailId] }); enqueueSnackbar('Document mis à jour', { variant: 'success' }); },
  });

  const columns: GridColDef[] = [
    {
      field: 'user', headerName: 'Vendeur', flex: 1.5, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%' }}>
          <Avatar sx={{ bgcolor: '#c41230', width: 34, height: 34, fontSize: 13, fontWeight: 700 }}>
            {row.user?.firstName?.[0]}
          </Avatar>
          <Box>
            <Typography fontSize={13} fontWeight={600} color="#111" lineHeight={1.2}>
              {row.user?.firstName} {row.user?.lastName}
            </Typography>
            <Typography fontSize={11} color="#888">{row.user?.email}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'stores', headerName: 'Boutiques', flex: 1, minWidth: 140,
      renderCell: ({ row }) => {
        const stores: any[] = row.stores ?? [];
        return (
          <Box>
            {stores.length === 0
              ? <Typography fontSize={12} color="#bbb">Aucune boutique</Typography>
              : <>
                <Typography fontSize={12.5} fontWeight={600}>{stores[0]?.name}</Typography>
                {stores.length > 1 && <Chip label={`+${stores.length - 1} autre${stores.length > 2 ? 's' : ''}`} size="small" sx={{ height: 18, fontSize: 10, mt: 0.3, bgcolor: alpha('#059669', 0.1), color: '#059669' }} />}
              </>
            }
          </Box>
        );
      },
    },
    {
      field: 'subscriptions', headerName: 'Plan', width: 110,
      renderCell: ({ row }) => {
        const plan = row.subscriptions?.[0]?.plan?.tier;
        const colors: Record<string, string> = { STARTER: '#6B7280', BUSINESS: '#2563EB', PREMIUM: '#7C3AED', ELITE: '#EF4444' };
        return plan ? <Chip label={plan} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: alpha(colors[plan] || '#888', 0.1), color: colors[plan] || '#888' }} /> : <Typography fontSize={12} color="#bbb">Free</Typography>;
      },
    },
    {
      field: 'status', headerName: 'Statut', width: 110,
      renderCell: ({ value }) => <Chip label={value} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: alpha(STATUS_COLOR[value] || '#888', 0.12), color: STATUS_COLOR[value] || '#888' }} />,
    },
    {
      field: 'createdAt', headerName: 'Inscrit le', width: 110,
      renderCell: ({ value }) => <Typography fontSize={11.5} color="#666">{new Date(value).toLocaleDateString('fr-FR')}</Typography>,
    },
    {
      field: 'actions', headerName: 'Actions', width: 240, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
          <IconButton size="small" onClick={() => setDetailId(row.id)} sx={{ '&:hover': { bgcolor: alpha('#2563EB', 0.08) } }}>
            <Visibility fontSize="small" sx={{ color: '#2563EB' }} />
          </IconButton>
          {row.status === 'PENDING' && (
            <>
              <Button size="small" color="success" variant="contained" startIcon={<CheckCircle sx={{ fontSize: 13 }} />} onClick={() => approveMut.mutate(row.id)} disabled={approveMut.isPending} sx={{ fontSize: 11, py: 0.4, px: 1, minWidth: 0, borderRadius: 1.5 }}>Approuver</Button>
              <Button size="small" color="error" variant="outlined" startIcon={<Cancel sx={{ fontSize: 13 }} />} onClick={() => setRejectDialog({ open: true, id: row.id })} sx={{ fontSize: 11, py: 0.4, px: 1, minWidth: 0, borderRadius: 1.5 }}>Rejeter</Button>
            </>
          )}
          {row.status === 'APPROVED' && (
            <Button size="small" color="warning" variant="outlined" startIcon={<Pause sx={{ fontSize: 13 }} />} onClick={() => suspendMut.mutate(row.id)} disabled={suspendMut.isPending} sx={{ fontSize: 11, py: 0.4, px: 1, minWidth: 0, borderRadius: 1.5 }}>Suspendre</Button>
          )}
          {(row.status === 'SUSPENDED' || row.status === 'REJECTED') && (
            <Button size="small" color="success" variant="outlined" startIcon={<PlayArrow sx={{ fontSize: 13 }} />} onClick={() => reactivateMut.mutate(row.id)} disabled={reactivateMut.isPending} sx={{ fontSize: 11, py: 0.4, px: 1, minWidth: 0, borderRadius: 1.5 }}>Réactiver</Button>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h5" fontWeight={800}>Gestion des vendeurs</Typography>
            {pendingCount > 0 && (
              <Chip label={`${pendingCount} en attente`} size="small"
                sx={{ height: 24, fontWeight: 700, bgcolor: alpha('#F59E0B', 0.12), color: '#D97706', fontSize: 12, border: '1px solid #FDE68A' }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
            <FiberManualRecord sx={{ fontSize: 8, color: '#10B981' }} />
            <Typography fontSize={12} color="#888">
              En direct · actualisé à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          </Box>
        </Box>
        <TextField
          size="small" placeholder="Nom, email, boutique…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: '#999' }} /></InputAdornment> }}
          sx={{ width: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }}
        sx={{ mb: 2, '& .MuiTab-root': { fontWeight: 700, fontSize: 12.5 } }}>
        {[
          { value: 'PENDING',   label: 'En attente', badgeCount: pendingCount },
          { value: 'APPROVED',  label: 'Approuvés' },
          { value: 'REJECTED',  label: 'Rejetés' },
          { value: 'SUSPENDED', label: 'Suspendus' },
        ].map(({ value, label, badgeCount }) => (
          <Tab key={value} value={value}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                {label}
                {badgeCount ? (
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography fontSize={10} fontWeight={900} color="#fff">{badgeCount > 99 ? '99+' : badgeCount}</Typography>
                  </Box>
                ) : null}
              </Box>
            }
            sx={{ color: STATUS_COLOR[value], '&.Mui-selected': { color: STATUS_COLOR[value] } }}
          />
        ))}
      </Tabs>

      {/* PENDING tab: rich card view */}
      {tab === 'PENDING' && !isLoading && rows.length > 0 ? (
        <Box>
          <Typography fontSize={13} color="#888" mb={2}>{total} demande{total > 1 ? 's' : ''} de vérification en attente</Typography>
          {rows.map((row: any) => (
            <PendingCard key={row.id} row={row}
              onApprove={() => approveMut.mutate(row.id)}
              onReject={() => setRejectDialog({ open: true, id: row.id })}
              onDetail={() => setDetailId(row.id)} />
          ))}
        </Box>
      ) : tab === 'PENDING' && !isLoading && rows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, borderRadius: 3, border: '1px dashed #E5E7EB' }}>
          <VerifiedUser sx={{ fontSize: 52, color: '#D1FAE5', mb: 1.5 }} />
          <Typography fontWeight={700} fontSize={15} color="#555">Aucune demande en attente</Typography>
          <Typography fontSize={13} color="#888" mt={0.5}>Toutes les vérifications sont traitées.</Typography>
        </Box>
      ) : (
        /* All other tabs: DataGrid */
        <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: 'none' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            autoHeight
            rowHeight={64}
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
        </Card>
      )}

      {/* Seller Detail Dialog */}
      <Dialog open={!!detailId} onClose={() => setDetailId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Détail vendeur
          {detailId && (
            <Button size="small" onClick={() => navigate(`/sellers/${detailId}`)} sx={{ borderRadius: 2 }}>
              Voir le profil complet →
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : detailData ? (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: '#c41230', fontWeight: 800, fontSize: 18 }}>
                  {detailData.user?.firstName?.[0]}
                </Avatar>
                <Box>
                  <Typography fontWeight={800} fontSize={16}>{detailData.user?.firstName} {detailData.user?.lastName}</Typography>
                  <Chip label={detailData.status} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: alpha(STATUS_COLOR[detailData.status] || '#888', 0.12), color: STATUS_COLOR[detailData.status] }} />
                </Box>
              </Box>

              {detailData.status === 'REJECTED' && detailData.rejectionReason && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  <strong>Motif du rejet :</strong> {detailData.rejectionReason}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <AlternateEmail sx={{ fontSize: 15, color: '#999' }} />
                <Typography fontSize={12.5}>{detailData.user?.email}</Typography>
              </Box>
              {detailData.user?.phone && <Typography fontSize={12.5} color="#555">📞 {detailData.user?.phone}</Typography>}
              {detailData.businessType && <Typography fontSize={12.5} color="#555">🏢 {detailData.businessType}</Typography>}
              {(detailData.businessCity || detailData.businessDept) && (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <LocationOn sx={{ fontSize: 15, color: '#999' }} />
                  <Typography fontSize={12.5} color="#555">{[detailData.businessCity, detailData.businessDept].filter(Boolean).join(', ')}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <AccessTime sx={{ fontSize: 15, color: '#999' }} />
                <Typography fontSize={12.5} color="#555">Dernière connexion : {detailData.user?.lastLoginAt ? new Date(detailData.user.lastLoginAt).toLocaleString('fr-FR') : 'jamais'}</Typography>
              </Box>

              <Divider />

              <Typography fontSize={12} fontWeight={700} color="#555" textTransform="uppercase" letterSpacing={0.5}>
                Boutiques ({detailData.stores?.length ?? 0})
              </Typography>
              {(detailData.stores ?? []).map((store: any) => (
                <Box key={store.id} sx={{ p: 1.5, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    {store.logoUrl ? <Avatar src={store.logoUrl} sx={{ width: 28, height: 28, borderRadius: 1 }} /> : <Store sx={{ fontSize: 15, color: '#059669' }} />}
                    <Typography fontSize={13} fontWeight={700}>{store.name}</Typography>
                    {store.isPrimary && <Chip label="Principale" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: alpha('#059669', 0.1), color: '#059669' }} />}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography fontSize={11.5} color="#666">Produits : <strong>{store._count?.products ?? 0}</strong></Typography>
                    <Typography fontSize={11.5} color="#666">Commandes : <strong>{store._count?.orders ?? 0}</strong></Typography>
                    <Typography fontSize={11.5} color="#666">Note : <strong>{store.avgRating?.toFixed(1) ?? '—'}</strong></Typography>
                    {store.department && <Typography fontSize={11.5} color="#666">{store.department}</Typography>}
                  </Box>
                </Box>
              ))}

              <Divider />

              <Typography fontSize={12} fontWeight={700} color="#555" textTransform="uppercase" letterSpacing={0.5}>
                Documents KYC ({detailData.documents?.length ?? 0})
              </Typography>
              {(detailData.documents ?? []).length === 0 ? (
                <Typography fontSize={12.5} color="#999">Aucun document soumis</Typography>
              ) : (
                (detailData.documents ?? []).map((doc: any) => (
                  <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontSize={12.5} fontWeight={700}>{doc.type}</Typography>
                      <Typography fontSize={11} color="#888" noWrap>{doc.fileName?.replace(/^(PUBLIC:|PRIVATE:)/, '')}</Typography>
                    </Box>
                    <Chip
                      label={doc.isValid === true ? 'Validé' : doc.isValid === false ? 'Rejeté' : 'En attente'}
                      size="small"
                      sx={{ height: 20, fontSize: 10, fontWeight: 700,
                        bgcolor: alpha(doc.isValid === true ? '#10B981' : doc.isValid === false ? '#EF4444' : '#F59E0B', 0.12),
                        color: doc.isValid === true ? '#10B981' : doc.isValid === false ? '#EF4444' : '#F59E0B' }}
                    />
                    <IconButton size="small" onClick={() => viewDocument(detailData.id, doc.id)} disabled={viewingDoc === doc.id}>
                      {viewingDoc === doc.id ? <CircularProgress size={14} /> : <Visibility sx={{ fontSize: 16 }} />}
                    </IconButton>
                    <IconButton size="small" onClick={() => validateDocMut.mutate({ sellerId: detailData.id, docId: doc.id, isValid: true })} sx={{ color: '#10B981' }}>
                      <CheckCircle sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => validateDocMut.mutate({ sellerId: detailData.id, docId: doc.id, isValid: false })} sx={{ color: '#EF4444' }}>
                      <Cancel sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))
              )}

              {detailData.subscriptions?.filter((s: any) => s.isActive).length > 0 && (
                <>
                  <Divider />
                  <Typography fontSize={12} fontWeight={700} color="#555" textTransform="uppercase" letterSpacing={0.5}>Abonnement actif</Typography>
                  {detailData.subscriptions.filter((s: any) => s.isActive).slice(0, 1).map((sub: any) => (
                    <Box key={sub.id} sx={{ p: 1.5, bgcolor: alpha('#2563EB', 0.05), borderRadius: 2 }}>
                      <Typography fontSize={13} fontWeight={700}>{sub.plan?.name ?? sub.plan?.tier}</Typography>
                      <Typography fontSize={11.5} color="#666">Expire le {sub.endDate ? new Date(sub.endDate).toLocaleDateString('fr-FR') : '—'}</Typography>
                    </Box>
                  ))}
                </>
              )}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDetailId(null)} sx={{ borderRadius: 2 }}>Fermer</Button>
          {detailData?.status === 'PENDING' && (
            <>
              <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => { approveMut.mutate(detailData.id); setDetailId(null); }} sx={{ borderRadius: 2 }}>Approuver</Button>
              <Button variant="outlined" color="error" startIcon={<Cancel />} onClick={() => { setDetailId(null); setRejectDialog({ open: true, id: detailData.id }); }} sx={{ borderRadius: 2 }}>Rejeter</Button>
            </>
          )}
          {detailData?.status === 'APPROVED' && (
            <Button variant="outlined" color="warning" startIcon={<Pause />} onClick={() => { suspendMut.mutate(detailData.id); setDetailId(null); }} sx={{ borderRadius: 2 }}>Suspendre</Button>
          )}
          {(detailData?.status === 'SUSPENDED' || detailData?.status === 'REJECTED') && (
            <Button variant="contained" color="success" startIcon={<PlayArrow />} onClick={() => { reactivateMut.mutate(detailData.id); setDetailId(null); }} sx={{ borderRadius: 2 }}>Réactiver</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, id: '' })} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>Rejeter le vendeur</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}>Le vendeur sera notifié par email avec la raison du rejet.</Alert>
          <TextField fullWidth label="Raison du rejet *" multiline rows={3}
            value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Ex: Documents incomplets, NIF invalide…"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog({ open: false, id: '' })} sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button variant="contained" color="error" onClick={() => rejectMut.mutate({ id: rejectDialog.id, reason: rejectReason })}
            disabled={!rejectReason.trim() || rejectMut.isPending} sx={{ borderRadius: 2 }}>
            {rejectMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Confirmer le rejet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
