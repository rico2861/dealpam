import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Card, Chip, Button, Avatar, CircularProgress, Alert, alpha,
  Divider, Stack, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  ArrowBack, CheckCircle, Cancel, Pause, PlayArrow, Visibility, Store,
  AlternateEmail, LocationOn, AccessTime, Star, Inventory2, ReportProblem, Payments,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444', SUSPENDED: '#6B7280',
};

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none', border: '1px solid #EEE', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        {icon}
        <Typography fontSize={13} fontWeight={700} color="#555" textTransform="uppercase" letterSpacing={0.5}>
          {title}
        </Typography>
      </Box>
      {children}
    </Card>
  );
}

function StatBox({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Box sx={{ flex: 1, minWidth: 120, p: 1.5, bgcolor: '#F9FAFB', borderRadius: 2, textAlign: 'center' }}>
      <Typography fontSize={20} fontWeight={800} color={color || '#111'}>{value}</Typography>
      <Typography fontSize={11} color="#888" mt={0.3}>{label}</Typography>
    </Box>
  );
}

export default function SellerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [activateOpen, setActivateOpen] = useState(false);
  const [activatePlanId, setActivatePlanId] = useState('');
  const [activateReason, setActivateReason] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['seller-detail-full', id],
    queryFn: () => api.get(`/sellers/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const approveMut = useMutation({
    mutationFn: () => api.post(`/sellers/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-detail-full', id] }); enqueueSnackbar('Vendeur approuvé ✓', { variant: 'success' }); },
  });
  const rejectMut = useMutation({
    mutationFn: () => api.post(`/sellers/${id}/reject`, { reason: rejectReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-detail-full', id] }); setRejectOpen(false); setRejectReason(''); enqueueSnackbar('Vendeur rejeté', { variant: 'warning' }); },
  });
  const suspendMut = useMutation({
    mutationFn: () => api.post(`/sellers/${id}/suspend`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-detail-full', id] }); enqueueSnackbar('Vendeur suspendu', { variant: 'warning' }); },
  });
  const reactivateMut = useMutation({
    mutationFn: () => api.post(`/sellers/${id}/reactivate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-detail-full', id] }); enqueueSnackbar('Vendeur réactivé', { variant: 'success' }); },
  });
  const validateDocMut = useMutation({
    mutationFn: ({ docId, isValid }: any) => api.patch(`/sellers/${id}/documents/${docId}/validate`, { isValid }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller-detail-full', id] }); enqueueSnackbar('Document mis à jour', { variant: 'success' }); },
  });
  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans-admin'],
    queryFn: () => api.get('/subscriptions/plans/admin').then(r => r.data),
  });
  const activateMut = useMutation({
    mutationFn: () => api.post(`/subscriptions/admin/${id}/activate`, { planId: activatePlanId, reason: activateReason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-detail-full', id] });
      setActivateOpen(false); setActivatePlanId(''); setActivateReason('');
      enqueueSnackbar('Plan activé', { variant: 'success' });
    },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const viewDocument = async (docId: string) => {
    setViewingDoc(docId);
    try {
      const { data } = await api.get(`/sellers/${id}/documents/${docId}/view`);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      enqueueSnackbar('Impossible de charger le document', { variant: 'error' });
    } finally { setViewingDoc(null); }
  };

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (error || !data) return <Alert severity="error" sx={{ m: 3 }}>Vendeur introuvable</Alert>;

  const activeSub = data.subscriptions?.find((s: any) => s.isActive);
  const primaryStore = data.stores?.find((s: any) => s.isPrimary) ?? data.stores?.[0];

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/sellers')} sx={{ mb: 2, borderRadius: 2 }}>
        Retour à la liste
      </Button>

      {/* Header */}
      <Card sx={{ p: 3, borderRadius: 3, boxShadow: 'none', border: '1px solid #EEE', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: '#c41230', fontWeight: 800, fontSize: 24 }}>
              {data.user?.firstName?.[0]}
            </Avatar>
            <Box>
              <Typography fontWeight={800} fontSize={19}>{data.user?.firstName} {data.user?.lastName}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                <Chip label={data.status} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: alpha(STATUS_COLOR[data.status] || '#888', 0.12), color: STATUS_COLOR[data.status] }} />
                {primaryStore?.isVerified && (
                  <Chip icon={<CheckCircle sx={{ fontSize: 13 }} />} label="Boutique vérifiée" size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: alpha('#10B981', 0.12), color: '#10B981' }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 1 }}>
                <AlternateEmail sx={{ fontSize: 14, color: '#999' }} />
                <Typography fontSize={12.5} color="#555">{data.user?.email}</Typography>
              </Box>
              {(data.businessCity || data.businessDept) && (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.3 }}>
                  <LocationOn sx={{ fontSize: 14, color: '#999' }} />
                  <Typography fontSize={12.5} color="#555">{[data.businessCity, data.businessDept].filter(Boolean).join(', ')}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.3 }}>
                <AccessTime sx={{ fontSize: 14, color: '#999' }} />
                <Typography fontSize={12.5} color="#555">
                  Dernière connexion : {data.user?.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleString('fr-FR') : 'jamais'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {data.status === 'PENDING' && (
              <>
                <Button size="small" variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => approveMut.mutate()} disabled={approveMut.isPending} sx={{ borderRadius: 2 }}>Approuver</Button>
                <Button size="small" variant="outlined" color="error" startIcon={<Cancel />} onClick={() => setRejectOpen(true)} sx={{ borderRadius: 2 }}>Rejeter</Button>
              </>
            )}
            {data.status === 'APPROVED' && (
              <Button size="small" variant="outlined" color="warning" startIcon={<Pause />} onClick={() => suspendMut.mutate()} disabled={suspendMut.isPending} sx={{ borderRadius: 2 }}>Suspendre</Button>
            )}
            {(data.status === 'SUSPENDED' || data.status === 'REJECTED') && (
              <Button size="small" variant="contained" color="success" startIcon={<PlayArrow />} onClick={() => reactivateMut.mutate()} disabled={reactivateMut.isPending} sx={{ borderRadius: 2 }}>Réactiver</Button>
            )}
          </Stack>
        </Box>

        {data.status === 'REJECTED' && data.rejectionReason && (
          <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>
            <strong>Motif du rejet :</strong> {data.rejectionReason}
          </Alert>
        )}
      </Card>

      {/* Fiabilité */}
      <SectionCard title="Indicateur de fiabilité" icon={<ReportProblem sx={{ fontSize: 16, color: '#F59E0B' }} />}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <StatBox label="Note moyenne" value={`${(data.reliability?.avgRating ?? 0).toFixed(1)} ★`} color="#F59E0B" />
          <StatBox label="Avis reçus" value={data.reliability?.totalReviews ?? 0} />
          <StatBox label="Litiges signalés" value={data.reliability?.disputesCount ?? 0} color={data.reliability?.disputesCount > 0 ? '#EF4444' : '#10B981'} />
          <StatBox label="Membre depuis" value={new Date(data.reliability?.memberSince ?? data.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} />
        </Box>
      </SectionCard>

      {/* Abonnement & dépenses */}
      <SectionCard title="Abonnement & dépenses" icon={<Payments sx={{ fontSize: 16, color: '#2563EB' }} />}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: activeSub ? 1.5 : 0 }}>
          <StatBox label="Plan actuel" value={activeSub?.plan?.name ?? activeSub?.plan?.tier ?? 'Aucun'} />
          <StatBox label="Total dépensé" value={`${Number(data.totalSpentHTG ?? 0).toLocaleString()} HTG`} color="#10B981" />
          {activeSub && <StatBox label="Expire le" value={activeSub.endDate ? new Date(activeSub.endDate).toLocaleDateString('fr-FR') : '—'} />}
        </Box>
        <Typography fontSize={10.5} color="#999" mb={1.5}>Inclut abonnements + campagnes publicitaires. Vérifications de boutique payantes à venir (Étape 7).</Typography>
        <Button size="small" variant="outlined" onClick={() => setActivateOpen(true)} sx={{ borderRadius: 2 }}>
          Activer un plan manuellement
        </Button>
      </SectionCard>

      {/* Activer un plan manuellement — toujours motivé, tracé côté serveur (AuditLog + Payment MANUAL) */}
      <Dialog open={activateOpen} onClose={() => setActivateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Activer un plan manuellement</DialogTitle>
        <DialogContent>
          <Typography fontSize={12.5} color="#666" mb={2}>
            Utilisez ceci uniquement pour régulariser une situation (ex. paiement reçu avec un montant qui ne correspond pas exactement au plan). Le motif sera enregistré dans les logs.
          </Typography>
          <TextField select fullWidth label="Plan" value={activatePlanId} onChange={e => setActivatePlanId(e.target.value)}
            SelectProps={{ native: true }} sx={{ mb: 2 }}>
            <option value="" />
            {(plansData ?? []).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} — {Number(p.priceHTG).toLocaleString()} HTG/mois</option>
            ))}
          </TextField>
          <TextField fullWidth multiline minRows={2} label="Motif (obligatoire)" value={activateReason}
            onChange={e => setActivateReason(e.target.value)}
            placeholder="Ex : paiement MonCash reçu (450 HTG) pour le plan Business (500 HTG) — écart accepté, activation manuelle." />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivateOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={!activatePlanId || !activateReason.trim() || activateMut.isPending}
            onClick={() => activateMut.mutate()}>
            {activateMut.isPending ? <CircularProgress size={16} /> : 'Activer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boutiques */}
      <SectionCard title={`Boutiques (${data.stores?.length ?? 0})`} icon={<Store sx={{ fontSize: 16, color: '#059669' }} />}>
        <Stack spacing={1}>
          {(data.stores ?? []).map((store: any) => (
            <Box key={store.id} sx={{ p: 1.5, bgcolor: '#F9FAFB', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {store.logoUrl ? <Avatar src={store.logoUrl} sx={{ width: 28, height: 28, borderRadius: 1 }} /> : <Store sx={{ fontSize: 15, color: '#059669' }} />}
                <Typography fontSize={13} fontWeight={700}>{store.name}</Typography>
                {store.isPrimary && <Chip label="Principale" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: alpha('#059669', 0.1), color: '#059669' }} />}
                {store.isVerified && <Chip label="Vérifiée" size="small" sx={{ height: 18, fontSize: 9.5, bgcolor: alpha('#10B981', 0.1), color: '#10B981' }} />}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography fontSize={11.5} color="#666">Produits : <strong>{store._count?.products ?? 0}</strong></Typography>
                <Typography fontSize={11.5} color="#666">Commandes : <strong>{store._count?.orders ?? 0}</strong></Typography>
                <Typography fontSize={11.5} color="#666">Note : <strong>{store.avgRating?.toFixed(1) ?? '—'}</strong></Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </SectionCard>

      {/* Documents KYC */}
      <SectionCard title={`Documents KYC (${data.documents?.length ?? 0})`} icon={<CheckCircle sx={{ fontSize: 16, color: '#2563EB' }} />}>
        {(data.documents ?? []).length === 0 ? (
          <Typography fontSize={12.5} color="#999">Aucun document soumis</Typography>
        ) : (
          <Stack spacing={1}>
            {(data.documents ?? []).map((doc: any) => (
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
                <IconButton size="small" onClick={() => viewDocument(doc.id)} disabled={viewingDoc === doc.id}>
                  {viewingDoc === doc.id ? <CircularProgress size={14} /> : <Visibility sx={{ fontSize: 16 }} />}
                </IconButton>
                <IconButton size="small" onClick={() => validateDocMut.mutate({ docId: doc.id, isValid: true })} sx={{ color: '#10B981' }}>
                  <CheckCircle sx={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => validateDocMut.mutate({ docId: doc.id, isValid: false })} sx={{ color: '#EF4444' }}>
                  <Cancel sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>

      {/* Produits */}
      <SectionCard title={`Produits & services (${data.products?.length ?? 0})`} icon={<Inventory2 sx={{ fontSize: 16, color: '#7C3AED' }} />}>
        {(data.products ?? []).length === 0 ? (
          <Typography fontSize={12.5} color="#999">Aucun produit publié</Typography>
        ) : (
          <Stack spacing={1} sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {(data.products ?? []).map((p: any) => (
              <Box key={p.id} component={RouterLink} to={`/products?search=${encodeURIComponent(p.name)}`} sx={{ textDecoration: 'none', color: 'inherit' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2, bgcolor: '#F9FAFB', borderRadius: 2, '&:hover': { bgcolor: '#F1F1F1' } }}>
                  {p.images?.[0]?.urlThumb
                    ? <Avatar src={p.images[0].urlThumb} sx={{ width: 32, height: 32, borderRadius: 1.5 }} />
                    : <Inventory2 sx={{ fontSize: 18, color: '#999' }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontSize={12.5} fontWeight={700} noWrap>{p.name}</Typography>
                    <Typography fontSize={11} color="#888">
                      {Number(p.salePrice ?? p.price).toLocaleString()} HTG · Stock: {p.stock} · {p.productType}
                    </Typography>
                  </Box>
                  <Chip label={p.status} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </SectionCard>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Motif du rejet</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Ex: Documents incomplets, NIF invalide…" sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectOpen(false)} sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button variant="contained" color="error" onClick={() => rejectMut.mutate()} disabled={!rejectReason.trim() || rejectMut.isPending} sx={{ borderRadius: 2 }}>
            {rejectMut.isPending ? <CircularProgress size={18} color="inherit" /> : 'Confirmer le rejet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
