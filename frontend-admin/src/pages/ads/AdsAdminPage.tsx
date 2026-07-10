import { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, LinearProgress, Avatar,
  Button, TextField, Select, MenuItem, FormControl, InputLabel, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Tab, Tabs,
} from '@mui/material';
import {
  Campaign, CheckCircle, Cancel, Visibility, TouchApp, TrendingUp,
  LocationOn, People, FlashOn, Pause, PlayArrow, Block,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const ORANGE = '#FF9900';

function statusColor(s: string) {
  const map: Record<string, string> = {
    ACTIVE: '#22C55E', PAUSED: '#F59E0B', PENDING_REVIEW: '#6366F1',
    PENDING_PAYMENT: '#3B82F6', COMPLETED: '#94A3B8', REJECTED: '#EF4444',
    CANCELLED: '#94A3B8', DRAFT: '#94A3B8',
  };
  return map[s] || '#94A3B8';
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    ACTIVE: 'Active', PAUSED: 'En pause', PENDING_REVIEW: 'En revue',
    PENDING_PAYMENT: 'Paiement requis', COMPLETED: 'Terminée',
    REJECTED: 'Rejetée', CANCELLED: 'Annulée', DRAFT: 'Brouillon',
  };
  return map[s] || s;
}

const STATUS_TABS = ['ALL', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED'];

export default function AdsAdminPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  // Tarification publicitaire (budget minimum, CPM, CPC) — configurable ici,
  // remplace les constantes auparavant codées en dur dans ads.service.ts.
  const { data: settings } = useQuery({
    queryKey: ['ads-admin-settings'],
    queryFn: () => api.get('/ads/admin/settings').then(r => r.data),
  });
  const [settingsForm, setSettingsForm] = useState<{ minBudgetHTG: string; cpmRateHTG: string; cpcRateHTG: string }>({ minBudgetHTG: '', cpmRateHTG: '', cpcRateHTG: '' });
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        minBudgetHTG: String(settings.minBudgetHTG),
        cpmRateHTG: String(settings.cpmRateHTG),
        cpcRateHTG: String(settings.cpcRateHTG),
      });
    }
  }, [settings]);
  const settingsMut = useMutation({
    mutationFn: (body: { minBudgetHTG: number; cpmRateHTG: number; cpcRateHTG: number }) => api.patch('/ads/admin/settings', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ads-admin-settings'] }); enqueueSnackbar('Tarifs mis à jour', { variant: 'success' }); },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || 'Erreur lors de la mise à jour', { variant: 'error' }),
  });
  const saveSettings = () => {
    settingsMut.mutate({
      minBudgetHTG: Number(settingsForm.minBudgetHTG),
      cpmRateHTG: Number(settingsForm.cpmRateHTG),
      cpcRateHTG: Number(settingsForm.cpcRateHTG),
    });
  };

  const statusFilter = STATUS_TABS[tab] === 'ALL' ? undefined : STATUS_TABS[tab];

  const { data, isLoading } = useQuery({
    queryKey: ['admin-campaigns', tab],
    queryFn: () => api.get(`/ads/admin/all${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });
  const { data: adminStats } = useQuery({
    queryKey: ['admin-ad-stats'],
    queryFn: () => api.get('/ads/admin/stats').then(r => r.data),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, action, note }: any) => api.patch(`/ads/admin/${id}/review`, { action, note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-campaigns'] }); qc.invalidateQueries({ queryKey: ['admin-ad-stats'] }); setReviewId(null); enqueueSnackbar('Décision enregistrée', { variant: 'success' }); },
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api.patch(`/ads/admin/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-campaigns'] }),
  });

  const campaigns = data?.data || [];
  const stats = adminStats;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={800}>Gestion des Publicités</Typography>
        <Typography fontSize={13} color="#666">Contrôle de toutes les campagnes des vendeurs</Typography>
      </Box>

      {/* Tarification (budget minimum, CPM, CPC) — configurable, remplace les
          constantes auparavant codées en dur côté backend. */}
      <Card elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 2, mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography fontWeight={700} fontSize={14} mb={0.3}>Tarification publicitaire</Typography>
          <Typography fontSize={12} color="#666" mb={2}>
            Ces valeurs s'appliquent immédiatement à toutes les nouvelles campagnes créées par les vendeurs.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField size="small" label="Budget minimum (HTG)" type="number" value={settingsForm.minBudgetHTG}
              onChange={e => setSettingsForm(f => ({ ...f, minBudgetHTG: e.target.value }))}
              sx={{ width: 180 }} />
            <TextField size="small" label="Tarif CPM (HTG / 1 000 impressions)" type="number" value={settingsForm.cpmRateHTG}
              onChange={e => setSettingsForm(f => ({ ...f, cpmRateHTG: e.target.value }))}
              sx={{ width: 240 }} />
            <TextField size="small" label="Tarif CPC (HTG / clic)" type="number" value={settingsForm.cpcRateHTG}
              onChange={e => setSettingsForm(f => ({ ...f, cpcRateHTG: e.target.value }))}
              sx={{ width: 180 }} />
            <Button variant="contained" onClick={saveSettings} disabled={settingsMut.isPending}
              sx={{ bgcolor: ORANGE, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#E68A00' } }}>
              {settingsMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Global Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Campagnes actives', value: stats?.active || 0, icon: <Campaign />, color: '#22C55E' },
          { label: 'En attente de revue', value: stats?.pending || 0, icon: <FlashOn />, color: '#6366F1' },
          { label: 'Revenus totaux', value: `${Number(stats?.totalRevenue || 0).toLocaleString()} HTG`, icon: <TrendingUp />, color: ORANGE },
          { label: 'Total campagnes', value: stats?.total || 0, icon: <Visibility />, color: '#3B82F6' },
        ].map(({ label, value, icon, color }) => (
          <Grid item xs={6} md={3} key={label}>
            <Card elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color }}>{icon}</Box>
                  <Typography fontSize={11} color="#666">{label}</Typography>
                </Box>
                <Typography fontWeight={900} fontSize={22} color="#0F1111">{value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E8E8E8' }}>
        {STATUS_TABS.map((s, i) => (
          <Tab key={s} label={s === 'ALL' ? 'Toutes' : statusLabel(s)}
            sx={{ fontWeight: 600, fontSize: 12.5, textTransform: 'none' }} />
        ))}
      </Tabs>

      {/* Campaigns */}
      {isLoading ? (
        <Typography color="#999">Chargement...</Typography>
      ) : campaigns.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Campaign sx={{ fontSize: 48, color: '#DDD' }} />
          <Typography color="#999">Aucune campagne</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {campaigns.map((c: any) => {
            const img = c.product?.images?.[0]?.urlThumb;
            const pct = Math.min(100, (Number(c.spent) / Number(c.totalBudget)) * 100);
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0';
            const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000));

            return (
              <Grid item xs={12} key={c.id}>
                <Card elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 2,
                  borderLeft: `4px solid ${statusColor(c.status)}` }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      {/* Product */}
                      <Avatar variant="rounded" src={img} sx={{ width: 56, height: 56, borderRadius: 1.5, bgcolor: '#F0F0F0' }} />

                      {/* Main info */}
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.3 }}>
                          <Typography fontWeight={800} fontSize={14}>{c.name}</Typography>
                          <Chip label={statusLabel(c.status)} size="small"
                            sx={{ bgcolor: statusColor(c.status) + '22', color: statusColor(c.status), fontWeight: 700, fontSize: 10 }} />
                        </Box>
                        <Typography fontSize={12} color="#444" fontWeight={600}>
                          {c.seller?.store?.name} · {c.seller?.user?.firstName} {c.seller?.user?.lastName}
                        </Typography>
                        <Typography fontSize={11} color="#888">{c.product?.name}</Typography>

                        {/* Targeting */}
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.8 }}>
                          {c.targetDepts?.length > 0 && (
                            <Chip icon={<LocationOn sx={{ fontSize: 11 }} />} label={c.targetDepts.join(', ')} size="small"
                              sx={{ fontSize: 10, bgcolor: '#EEF2FF', color: '#6366F1' }} />
                          )}
                          {c.targetGenders?.length > 0 && (
                            <Chip icon={<People sx={{ fontSize: 11 }} />} label={c.targetGenders.join(', ')} size="small"
                              sx={{ fontSize: 10, bgcolor: '#FDF2F8', color: '#DB2777' }} />
                          )}
                          {(c.targetAgeMin || c.targetAgeMax) && (
                            <Chip label={`${c.targetAgeMin || '?'}–${c.targetAgeMax || '?'} ans`} size="small"
                              sx={{ fontSize: 10, bgcolor: '#ECFDF5', color: '#059669' }} />
                          )}
                          {c.targetInterests?.length > 0 && (
                            <Chip label={`Intérêts: ${c.targetInterests.join(', ')}`} size="small"
                              sx={{ fontSize: 10, bgcolor: '#EFF6FF', color: '#3B82F6' }} />
                          )}
                          <Chip label={`${daysLeft}j restants`} size="small"
                            sx={{ fontSize: 10, bgcolor: '#FFF8EC', color: '#FF9900' }} />
                          <Chip label={c.objective} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                        </Box>
                      </Box>

                      {/* Stats */}
                      <Box sx={{ display: 'flex', gap: 3, textAlign: 'center' }}>
                        {[
                          { label: 'Impr.', value: c.impressions?.toLocaleString() },
                          { label: 'Clics', value: c.clicks?.toLocaleString() },
                          { label: 'CTR', value: `${ctr}%` },
                          { label: 'Budget', value: `${Number(c.totalBudget).toLocaleString()} HTG` },
                          { label: 'Dépensé', value: `${Number(c.spent).toLocaleString()} HTG` },
                        ].map(({ label, value }) => (
                          <Box key={label}>
                            <Typography fontWeight={800} fontSize={14}>{value}</Typography>
                            <Typography fontSize={10} color="#999">{label}</Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', gap: 0.5, alignSelf: 'center' }}>
                        {c.status === 'PENDING_REVIEW' && (
                          <>
                            <Tooltip title="Approuver">
                              <IconButton size="small" onClick={() => reviewMut.mutate({ id: c.id, action: 'approve' })}
                                sx={{ color: '#22C55E' }}>
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Rejeter">
                              <IconButton size="small" onClick={() => { setReviewId(c.id); setReviewNote(''); }}
                                sx={{ color: '#EF4444' }}>
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {c.status === 'ACTIVE' && (
                          <Tooltip title="Suspendre">
                            <IconButton size="small" onClick={() => statusMut.mutate({ id: c.id, status: 'PAUSED' })}
                              sx={{ color: '#F59E0B' }}>
                              <Pause fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.status === 'PAUSED' && (
                          <Tooltip title="Réactiver">
                            <IconButton size="small" onClick={() => statusMut.mutate({ id: c.id, status: 'ACTIVE' })}
                              sx={{ color: '#22C55E' }}>
                              <PlayArrow fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!['COMPLETED', 'CANCELLED'].includes(c.status) && (
                          <Tooltip title="Annuler définitivement">
                            <IconButton size="small" onClick={() => statusMut.mutate({ id: c.id, status: 'CANCELLED' })}
                              sx={{ color: '#94A3B8' }}>
                              <Block fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>

                    {/* Budget bar */}
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography fontSize={11} color="#666">Budget</Typography>
                        <Typography fontSize={11} fontWeight={700}>
                          {Number(c.spent).toLocaleString()} / {Number(c.totalBudget).toLocaleString()} HTG ({pct.toFixed(0)}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height: 5, borderRadius: 2.5,
                          bgcolor: '#F0F0F0', '& .MuiLinearProgress-bar': { bgcolor: pct > 80 ? '#EF4444' : ORANGE } }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Reject dialog */}
      <Dialog open={!!reviewId} onClose={() => setReviewId(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle fontWeight={800}>Rejeter la campagne</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={3} label="Raison du rejet (visible par le vendeur)"
            value={reviewNote} onChange={e => setReviewNote(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setReviewId(null)} variant="outlined">Annuler</Button>
          <Button onClick={() => reviewMut.mutate({ id: reviewId, action: 'reject', note: reviewNote })}
            variant="contained" color="error" sx={{ borderRadius: 2 }}>
            Confirmer le rejet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
