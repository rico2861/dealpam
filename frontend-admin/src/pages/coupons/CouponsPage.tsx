import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField, Switch,
  FormControlLabel, IconButton, Chip, Alert, Grid, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Divider,
} from '@mui/material';
import { Add, Edit, Delete, LocalOffer, ContentCopy } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const ORANGE = '#FF9900';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  appliesTo: 'SUBSCRIPTION' | 'PLATFORM_PRODUCT' | 'BOTH';
  minAmountHTG: number | null;
  maxDiscountHTG: number | null;
  maxUses: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

const EMPTY: Omit<Coupon, 'id' | 'usedCount'> = {
  code: '', description: '', discountType: 'PERCENTAGE', discountValue: 10, appliesTo: 'BOTH',
  minAmountHTG: null, maxDiscountHTG: null, maxUses: null, maxUsesPerUser: 1,
  startsAt: null, endsAt: null, isActive: true,
};

const APPLIES_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Abonnements uniquement',
  PLATFORM_PRODUCT: 'Achats boutique DealPam uniquement',
  BOTH: 'Abonnements + boutique DealPam',
};

function CouponDialog({ coupon, open, onClose }: { coupon: Partial<Coupon> | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !coupon?.id;
  const [form, setForm] = useState<any>(coupon ?? EMPTY);

  const set  = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));
  const setN = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value === '' ? null : Number(e.target.value) }));
  const setB = (k: string) => (_: any, v: boolean) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/coupons/admin', form).then(r => r.data)
        : api.patch(`/coupons/admin/${coupon!.id}`, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-coupons'] }); onClose(); },
    onError: (e: any) => alert(e?.response?.data?.message || 'Erreur'),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{isNew ? 'Créer un coupon' : 'Modifier le coupon'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField label="Code *" value={form.code || ''} onChange={(e) => setForm((p: any) => ({ ...p, code: e.target.value.toUpperCase() }))}
              fullWidth size="small" placeholder="BIENVENUE30" helperText="Le client saisit ce code exact (majuscules)" />
          </Grid>
          <Grid item xs={6}>
            <TextField select label="Type de réduction" value={form.discountType} onChange={set('discountType')} fullWidth size="small" SelectProps={{ native: true }}>
              <option value="PERCENTAGE">Pourcentage (%)</option>
              <option value="FIXED_AMOUNT">Montant fixe (HTG)</option>
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField label={form.discountType === 'PERCENTAGE' ? 'Valeur (%)' : 'Valeur (HTG)'} type="number"
              value={form.discountValue} onChange={setN('discountValue')} fullWidth size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField select label="Utilisable sur" value={form.appliesTo} onChange={set('appliesTo')} fullWidth size="small" SelectProps={{ native: true }}>
              <option value="BOTH">Abonnements + boutique DealPam</option>
              <option value="SUBSCRIPTION">Abonnements uniquement</option>
              <option value="PLATFORM_PRODUCT">Achats boutique DealPam uniquement</option>
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField label="Montant min. (HTG)" type="number" value={form.minAmountHTG ?? ''} onChange={setN('minAmountHTG')}
              fullWidth size="small" placeholder="Optionnel" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Réduction max (HTG)" type="number" value={form.maxDiscountHTG ?? ''} onChange={setN('maxDiscountHTG')}
              fullWidth size="small" placeholder="Optionnel" helperText="Plafond si type = %" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Utilisations totales max" type="number" value={form.maxUses ?? ''} onChange={setN('maxUses')}
              fullWidth size="small" placeholder="Illimité" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Max par utilisateur" type="number" value={form.maxUsesPerUser} onChange={setN('maxUsesPerUser')} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Date de début" type="datetime-local" value={form.startsAt ? form.startsAt.slice(0, 16) : ''}
              onChange={e => setForm((p: any) => ({ ...p, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Date de fin" type="datetime-local" value={form.endsAt ? form.endsAt.slice(0, 16) : ''}
              onChange={e => setForm((p: any) => ({ ...p, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              fullWidth size="small" InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description (interne)" value={form.description || ''} onChange={set('description')} fullWidth size="small" multiline rows={2} />
          </Grid>
        </Grid>
        <FormControlLabel control={<Switch checked={form.isActive} onChange={setB('isActive')} color="warning" />} label="Coupon actif" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>Annuler</Button>
        <Button variant="contained" onClick={() => save.mutate()}
          disabled={!form.code || save.isPending}
          startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ borderRadius: 2, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, fontWeight: 700 }}>
          {isNew ? 'Créer' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CouponsPage() {
  const qc = useQueryClient();
  const [dialogCoupon, setDialogCoupon] = useState<Partial<Coupon> | null>(null);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ['admin-coupons'],
    queryFn:  () => api.get('/coupons/admin').then(r => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/coupons/admin/${id}`, { isActive }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/admin/${id}`).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
    onError: (e: any) => alert(e?.response?.data?.message || 'Erreur lors de la suppression'),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Coupons</Typography>
          <Typography color="text.secondary" fontSize={14}>
            Codes de réduction utilisables sur les abonnements et les achats dans la boutique DealPam.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogCoupon({ ...EMPTY })}
          sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, borderRadius: 2, fontWeight: 700 }}>
          Créer un coupon
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ORANGE }} />
        </Box>
      ) : coupons.length === 0 ? (
        <Card sx={{ borderRadius: 3, py: 6, textAlign: 'center' }}>
          <LocalOffer sx={{ fontSize: 64, color: '#E2E8F0', mb: 2 }} />
          <Typography color="text.secondary">Aucun coupon. Cliquez sur "Créer un coupon" pour commencer.</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {coupons.map(c => {
            const expired = c.endsAt && new Date(c.endsAt) < new Date();
            const exhausted = c.maxUses !== null && c.usedCount >= c.maxUses;
            return (
              <Grid item xs={12} md={6} lg={4} key={c.id}>
                <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', opacity: c.isActive ? 1 : 0.6 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography fontWeight={900} fontSize={18} fontFamily="monospace">{c.code}</Typography>
                        <Tooltip title="Copier le code">
                          <IconButton size="small" onClick={() => navigator.clipboard.writeText(c.code)}>
                            <ContentCopy sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Chip label={!c.isActive ? 'Inactif' : expired ? 'Expiré' : exhausted ? 'Épuisé' : 'Actif'} size="small"
                        sx={{ bgcolor: (c.isActive && !expired && !exhausted) ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                          color: (c.isActive && !expired && !exhausted) ? '#059669' : '#64748B', fontWeight: 700 }} />
                    </Box>

                    <Typography fontSize={22} fontWeight={900} color={ORANGE} mb={0.5}>
                      {c.discountType === 'PERCENTAGE' ? `-${c.discountValue}%` : `-${c.discountValue.toLocaleString()} HTG`}
                    </Typography>

                    {c.description && <Typography fontSize={13} color="text.secondary" mb={1}>{c.description}</Typography>}

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mb: 1 }}>
                      <Typography fontSize={12.5} color="text.secondary">🎯 {APPLIES_LABELS[c.appliesTo]}</Typography>
                      <Typography fontSize={12.5} color="text.secondary">
                        📊 {c.usedCount} utilisé(s){c.maxUses ? ` / ${c.maxUses} max` : ' (illimité)'} · {c.maxUsesPerUser}× max par personne
                      </Typography>
                      {c.minAmountHTG && <Typography fontSize={12.5} color="text.secondary">💰 Minimum {c.minAmountHTG.toLocaleString()} HTG</Typography>}
                      {c.endsAt && <Typography fontSize={12.5} color="text.secondary">📅 Expire le {new Date(c.endsAt).toLocaleDateString('fr-FR')}</Typography>}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
                      <Tooltip title={c.isActive ? 'Désactiver' : 'Activer'}>
                        <Switch size="small" checked={c.isActive} color="warning" onChange={(_, v) => toggle.mutate({ id: c.id, isActive: v })} />
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => setDialogCoupon(c)} sx={{ '&:hover': { color: ORANGE } }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => { if (confirm(`Supprimer le coupon "${c.code}" ?`)) remove.mutate(c.id); }}
                          sx={{ '&:hover': { color: '#EF4444' } }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {dialogCoupon !== null && <CouponDialog coupon={dialogCoupon} open={true} onClose={() => setDialogCoupon(null)} />}
    </Box>
  );
}
