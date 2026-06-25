import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select,
  MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel, FormGroup,
  Alert, Skeleton, Avatar, IconButton, Tooltip,
} from '@mui/material';
import {
  Add, Campaign, TrendingUp, Visibility, TouchApp, ShoppingCart,
  Pause, PlayArrow, Cancel, BarChart, FlashOn, LocationOn, People,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const ORANGE = '#FF9900';
const DEPTS = ['Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Sud', 'Sud-Est', 'Grande-Anse', 'Nippes'];
const OBJECTIVES = [
  { value: 'TRAFFIC', label: 'Trafic', desc: 'Envoyer des gens sur votre fiche produit', icon: <TouchApp /> },
  { value: 'AWARENESS', label: 'Notoriété', desc: 'Maximiser la visibilité de votre produit', icon: <Visibility /> },
  { value: 'CONVERSIONS', label: 'Conversions', desc: 'Générer des achats', icon: <ShoppingCart /> },
];

function statusColor(s: string) {
  const map: Record<string, string> = {
    ACTIVE: '#22C55E', PAUSED: '#F59E0B', PENDING_REVIEW: '#6366F1',
    PENDING_PAYMENT: '#3B82F6', COMPLETED: '#94A3B8', REJECTED: '#EF4444', CANCELLED: '#94A3B8', DRAFT: '#94A3B8',
  };
  return map[s] || '#94A3B8';
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    ACTIVE: 'Active', PAUSED: 'En pause', PENDING_REVIEW: 'En revue',
    PENDING_PAYMENT: 'Paiement requis', COMPLETED: 'Terminée', REJECTED: 'Rejetée', CANCELLED: 'Annulée', DRAFT: 'Brouillon',
  };
  return map[s] || s;
}

export default function AdsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [statsId, setStatsId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', productId: '', objective: 'TRAFFIC', totalBudget: 1000,
    dailyBudget: '', startDate: '', endDate: '',
    targetGenders: [] as string[], targetAgeMin: '', targetAgeMax: '',
    targetDepts: [] as string[],
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn: () => api.get('/ads/my').then(r => r.data),
  });
  const { data: products } = useQuery({
    queryKey: ['seller-products-simple'],
    queryFn: () => api.get('/products/my?limit=100').then(r => r.data?.data || []),
  });
  const { data: stats } = useQuery({
    queryKey: ['campaign-stats', statsId],
    queryFn: () => statsId ? api.get(`/ads/my/${statsId}/stats`).then(r => r.data) : null,
    enabled: !!statsId,
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/ads', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-campaigns'] }); setOpen(false); enqueueSnackbar('Campagne créée — en attente de paiement', { variant: 'success' }); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });
  const pauseMut = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/pause`), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });
  const resumeMut = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/resume`), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });
  const cancelMut = useMutation({ mutationFn: (id: string) => api.patch(`/ads/my/${id}/cancel`), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-campaigns'] }) });

  const list = campaigns?.data || [];
  const totalSpent = list.reduce((s: number, c: any) => s + Number(c.spent || 0), 0);
  const totalImpr = list.reduce((s: number, c: any) => s + (c.impressions || 0), 0);
  const totalClicks = list.reduce((s: number, c: any) => s + (c.clicks || 0), 0);

  const handleSubmit = () => {
    if (!form.name || !form.productId || !form.startDate || !form.endDate) {
      enqueueSnackbar('Veuillez remplir tous les champs requis', { variant: 'warning' }); return;
    }
    createMut.mutate({
      name: form.name, productId: form.productId, objective: form.objective,
      totalBudget: form.totalBudget, dailyBudget: form.dailyBudget ? Number(form.dailyBudget) : undefined,
      startDate: form.startDate, endDate: form.endDate,
      targetGenders: form.targetGenders, targetDepts: form.targetDepts,
      targetAgeMin: form.targetAgeMin ? Number(form.targetAgeMin) : undefined,
      targetAgeMax: form.targetAgeMax ? Number(form.targetAgeMax) : undefined,
    });
  };

  const toggleGender = (g: string) => setForm(f => ({
    ...f, targetGenders: f.targetGenders.includes(g) ? f.targetGenders.filter(x => x !== g) : [...f.targetGenders, g],
  }));
  const toggleDept = (d: string) => setForm(f => ({
    ...f, targetDepts: f.targetDepts.includes(d) ? f.targetDepts.filter(x => x !== d) : [...f.targetDepts, d],
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#0F1111">Mes Publicités</Typography>
          <Typography fontSize={13} color="#666">Boostez vos produits comme sur Meta Ads</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}
          sx={{ bgcolor: ORANGE, color: 'white', fontWeight: 700, borderRadius: 2, px: 2.5,
            '&:hover': { bgcolor: '#e68900' } }}>
          Créer une pub
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total dépensé', value: `${totalSpent.toLocaleString()} HTG`, icon: <FlashOn />, color: '#FF9900' },
          { label: 'Impressions', value: totalImpr.toLocaleString(), icon: <Visibility />, color: '#6366F1' },
          { label: 'Clics', value: totalClicks.toLocaleString(), icon: <TouchApp />, color: '#22C55E' },
          { label: 'CTR moyen', value: totalImpr > 0 ? `${((totalClicks / totalImpr) * 100).toFixed(1)}%` : '0%', icon: <TrendingUp />, color: '#3B82F6' },
        ].map(({ label, value, icon, color }) => (
          <Grid item xs={6} md={3} key={label}>
            <Card elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color, fontSize: 18 }}>{icon}</Box>
                  <Typography fontSize={11} color="#666" fontWeight={500}>{label}</Typography>
                </Box>
                <Typography fontWeight={800} fontSize={20} color="#0F1111">{value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Alert info */}
      <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: 13 }}>
        <strong>Comment ça marche ?</strong> Créez une campagne, choisissez votre budget et votre audience cible.
        Après validation et paiement, vos produits seront affichés en priorité aux bons clients.
        Coût estimé : <strong>15 HTG / 1000 impressions</strong> · <strong>8 HTG / clic</strong>
      </Alert>

      {/* Campaigns list */}
      {isLoading ? (
        <Grid container spacing={2}>{[...Array(3)].map((_, i) => <Grid item xs={12} key={i}><Skeleton height={120} sx={{ borderRadius: 2 }} /></Grid>)}</Grid>
      ) : list.length === 0 ? (
        <Card elevation={0} sx={{ border: '2px dashed #E8E8E8', borderRadius: 2, textAlign: 'center', py: 6 }}>
          <Campaign sx={{ fontSize: 48, color: '#DDD', mb: 1 }} />
          <Typography color="#999" fontWeight={600}>Aucune campagne publicitaire</Typography>
          <Typography color="#BBB" fontSize={13} mb={2}>Créez votre première pub pour booster vos ventes</Typography>
          <Button variant="outlined" startIcon={<Add />} onClick={() => setOpen(true)}
            sx={{ borderColor: ORANGE, color: ORANGE }}>Créer une campagne</Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {list.map((c: any) => {
            const img = c.product?.images?.[0]?.urlThumb || c.product?.images?.[0]?.urlMedium;
            const pct = Math.min(100, (Number(c.spent) / Number(c.totalBudget)) * 100);
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : '0';
            const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000));
            return (
              <Grid item xs={12} key={c.id}>
                <Card elevation={0} sx={{ border: '1px solid #E8E8E8', borderRadius: 2, overflow: 'hidden' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      {/* Product thumb */}
                      <Avatar variant="rounded" src={img} sx={{ width: 64, height: 64, borderRadius: 1.5, bgcolor: '#F0F0F0' }} />

                      {/* Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography fontWeight={800} fontSize={15} noWrap>{c.name}</Typography>
                          <Chip label={statusLabel(c.status)} size="small"
                            sx={{ bgcolor: statusColor(c.status) + '22', color: statusColor(c.status), fontWeight: 700, fontSize: 11 }} />
                          <Chip label={c.objective} size="small" variant="outlined" sx={{ fontSize: 10 }} />
                        </Box>
                        <Typography fontSize={12} color="#666" noWrap>{c.product?.name}</Typography>

                        {/* Targeting chips */}
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.8 }}>
                          {c.targetDepts?.length > 0 && (
                            <Chip icon={<LocationOn sx={{ fontSize: 12 }} />} label={c.targetDepts.join(', ')} size="small"
                              sx={{ fontSize: 10, bgcolor: '#EEF2FF', color: '#6366F1' }} />
                          )}
                          {c.targetGenders?.length > 0 && (
                            <Chip icon={<People sx={{ fontSize: 12 }} />} label={c.targetGenders.join(', ')} size="small"
                              sx={{ fontSize: 10, bgcolor: '#FDF2F8', color: '#DB2777' }} />
                          )}
                          {(c.targetAgeMin || c.targetAgeMax) && (
                            <Chip label={`${c.targetAgeMin || '?'}–${c.targetAgeMax || '?'} ans`} size="small"
                              sx={{ fontSize: 10, bgcolor: '#ECFDF5', color: '#059669' }} />
                          )}
                          <Chip label={`${daysLeft}j restants`} size="small"
                            sx={{ fontSize: 10, bgcolor: '#FFF8EC', color: '#FF9900' }} />
                        </Box>
                      </Box>

                      {/* Stats */}
                      <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, textAlign: 'center', alignItems: 'center' }}>
                        {[
                          { label: 'Impressions', value: c.impressions?.toLocaleString() },
                          { label: 'Clics', value: c.clicks?.toLocaleString() },
                          { label: 'CTR', value: `${ctr}%` },
                          { label: 'Dépensé', value: `${Number(c.spent).toLocaleString()} HTG` },
                        ].map(({ label, value }) => (
                          <Box key={label}>
                            <Typography fontWeight={800} fontSize={16}>{value}</Typography>
                            <Typography fontSize={10} color="#999">{label}</Typography>
                          </Box>
                        ))}
                      </Box>

                      {/* Actions */}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Statistiques détaillées">
                          <IconButton size="small" onClick={() => setStatsId(statsId === c.id ? null : c.id)}
                            sx={{ color: statsId === c.id ? '#6366F1' : '#999' }}>
                            <BarChart fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {c.status === 'ACTIVE' && (
                          <Tooltip title="Mettre en pause">
                            <IconButton size="small" onClick={() => pauseMut.mutate(c.id)} sx={{ color: '#F59E0B' }}>
                              <Pause fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {c.status === 'PAUSED' && (
                          <Tooltip title="Relancer">
                            <IconButton size="small" onClick={() => resumeMut.mutate(c.id)} sx={{ color: '#22C55E' }}>
                              <PlayArrow fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!['COMPLETED', 'CANCELLED', 'REJECTED'].includes(c.status) && (
                          <Tooltip title="Annuler">
                            <IconButton size="small" onClick={() => cancelMut.mutate(c.id)} sx={{ color: '#EF4444' }}>
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>

                    {/* Budget progress */}
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography fontSize={11} color="#666">Budget utilisé</Typography>
                        <Typography fontSize={11} fontWeight={700}>
                          {Number(c.spent).toLocaleString()} / {Number(c.totalBudget).toLocaleString()} HTG ({pct.toFixed(0)}%)
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height: 6, borderRadius: 3,
                          bgcolor: '#F0F0F0', '& .MuiLinearProgress-bar': { bgcolor: pct > 80 ? '#EF4444' : ORANGE } }} />
                    </Box>

                    {/* Stats expand */}
                    {statsId === c.id && stats && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E8E8E8' }}>
                        <Typography fontWeight={700} fontSize={13} mb={1.5}>Performance des 30 derniers jours</Typography>
                        <Grid container spacing={1.5}>
                          {[
                            { label: 'CTR', value: `${stats.ctr}%`, color: '#6366F1' },
                            { label: 'CPC moyen', value: `${Number(stats.cpc).toFixed(0)} HTG`, color: '#22C55E' },
                            { label: 'Budget restant', value: `${Number(stats.remaining).toLocaleString()} HTG`, color: ORANGE },
                            { label: 'Jours restants', value: `${stats.daysLeft}j`, color: '#3B82F6' },
                          ].map(({ label, value, color }) => (
                            <Grid item xs={6} sm={3} key={label}>
                              <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #E8E8E8' }}>
                                <Typography fontWeight={900} fontSize={18} color={color}>{value}</Typography>
                                <Typography fontSize={11} color="#666">{label}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 20, pb: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Campaign sx={{ color: ORANGE }} /> Créer une campagne publicitaire
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2.5}>
            {/* Nom */}
            <Grid item xs={12}>
              <TextField fullWidth label="Nom de la campagne *" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} size="small" />
            </Grid>

            {/* Produit */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Produit à promouvoir *</InputLabel>
                <Select value={form.productId} label="Produit à promouvoir *"
                  onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}>
                  {(products || []).map((p: any) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Objectif */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Objectif</InputLabel>
                <Select value={form.objective} label="Objectif"
                  onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}>
                  {OBJECTIVES.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: ORANGE, display: 'flex' }}>{o.icon}</Box>
                        <Box>
                          <Typography fontSize={14} fontWeight={600}>{o.label}</Typography>
                          <Typography fontSize={11} color="#666">{o.desc}</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Budget */}
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Budget total (HTG) *" type="number"
                value={form.totalBudget} inputProps={{ min: 500, step: 100 }}
                onChange={e => setForm(f => ({ ...f, totalBudget: Number(e.target.value) }))}
                size="small" helperText="Minimum 500 HTG" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Budget quotidien (HTG) — optionnel" type="number"
                value={form.dailyBudget}
                onChange={e => setForm(f => ({ ...f, dailyBudget: e.target.value }))}
                size="small" helperText="Laisser vide = pas de limite journalière" />
            </Grid>

            {/* Dates */}
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Date de début *" type="date"
                value={form.startDate} InputLabelProps={{ shrink: true }}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} size="small" />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Date de fin *" type="date"
                value={form.endDate} InputLabelProps={{ shrink: true }}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} size="small" />
            </Grid>

            {/* Ciblage */}
            <Grid item xs={12}>
              <Typography fontWeight={700} fontSize={14} color="#333" mb={1.5}>
                🎯 Ciblage de l'audience
              </Typography>

              {/* Genre */}
              <Typography fontSize={12} color="#666" mb={0.5}>Genre</Typography>
              <FormGroup row>
                {['MALE', 'FEMALE'].map(g => (
                  <FormControlLabel key={g} control={
                    <Checkbox checked={form.targetGenders.includes(g)} onChange={() => toggleGender(g)} size="small" />
                  } label={g === 'MALE' ? 'Hommes' : 'Femmes'} />
                ))}
                <Typography fontSize={11} color="#999" sx={{ alignSelf: 'center', ml: 1 }}>
                  (vide = tous)
                </Typography>
              </FormGroup>

              {/* Âge */}
              <Typography fontSize={12} color="#666" mb={0.5} mt={1.5}>Tranche d'âge</Typography>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label="Âge min" type="number" size="small" sx={{ width: 100 }}
                  value={form.targetAgeMin} inputProps={{ min: 13, max: 100 }}
                  onChange={e => setForm(f => ({ ...f, targetAgeMin: e.target.value }))} />
                <TextField label="Âge max" type="number" size="small" sx={{ width: 100 }}
                  value={form.targetAgeMax} inputProps={{ min: 13, max: 100 }}
                  onChange={e => setForm(f => ({ ...f, targetAgeMax: e.target.value }))} />
                <Typography fontSize={11} color="#999" sx={{ alignSelf: 'center' }}>
                  (vide = tous âges)
                </Typography>
              </Box>

              {/* Département */}
              <Typography fontSize={12} color="#666" mb={0.5} mt={1.5}>Zones géographiques</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {DEPTS.map(d => (
                  <Chip key={d} label={d} size="small" clickable
                    onClick={() => toggleDept(d)}
                    sx={{
                      bgcolor: form.targetDepts.includes(d) ? '#6366F1' : '#F0F0F0',
                      color: form.targetDepts.includes(d) ? 'white' : '#333',
                      fontWeight: form.targetDepts.includes(d) ? 700 : 400,
                      border: form.targetDepts.includes(d) ? '1.5px solid #6366F1' : '1.5px solid transparent',
                      transition: 'all 0.15s',
                    }} />
                ))}
              </Box>
              {form.targetDepts.length === 0 && (
                <Typography fontSize={11} color="#999" mt={0.5}>Vide = toute Haïti</Typography>
              )}
            </Grid>

            {/* Estimation */}
            <Grid item xs={12}>
              <Box sx={{ bgcolor: '#FFF8EC', border: '1px solid #FFE0A0', borderRadius: 1.5, p: 2 }}>
                <Typography fontWeight={700} fontSize={13} color="#B45309" mb={1}>
                  💡 Estimation de portée
                </Typography>
                <Grid container spacing={1}>
                  {[
                    { label: 'Impressions estimées', value: `~${Math.round(form.totalBudget / 0.015).toLocaleString()}` },
                    { label: 'Clics estimés (CTR 3%)', value: `~${Math.round((form.totalBudget / 0.015) * 0.03).toLocaleString()}` },
                    { label: 'Durée', value: form.startDate && form.endDate ? `${Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000)} jours` : '—' },
                  ].map(({ label, value }) => (
                    <Grid item xs={4} key={label}>
                      <Typography fontSize={18} fontWeight={900} color="#B45309">{value}</Typography>
                      <Typography fontSize={11} color="#92400E">{label}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={createMut.isPending}
            sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, borderRadius: 2, fontWeight: 700, px: 3 }}>
            {createMut.isPending ? 'Création...' : 'Créer la campagne →'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
