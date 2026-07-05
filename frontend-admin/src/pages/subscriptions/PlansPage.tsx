import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField, Switch,
  FormControlLabel, IconButton, Chip, Alert, Grid, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Divider,
} from '@mui/material';
import { Add, Edit, Delete, WorkspacePremium } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const ORANGE = '#FF9900';

interface Plan {
  id: string;
  tier: 'STARTER' | 'BUSINESS' | 'PREMIUM' | 'ELITE';
  name: string;
  priceHTG: number;
  originalPriceHTG: number | null;
  maxProducts: number | null;
  maxServices: number | null;
  maxImages: number;
  maxStores: number;
  hasVerifiedBadge: boolean;
  hasEliteBadge: boolean;
  hasPrioritySearch: boolean;
  hasHomepageAd: boolean;
  hasAdvancedStats: boolean;
  hasAutoSponsored: boolean;
  hasKeywordTargeting: boolean;
  isPopular: boolean;
  maxPromoProducts: number;
  maxCarouselProducts: number;
  annualDiscountPercent: number;
  description: string | null;
  isActive: boolean;
}

const EMPTY: Omit<Plan, 'id'> = {
  tier: 'STARTER', name: '', priceHTG: 0, originalPriceHTG: null, maxProducts: null, maxServices: null, maxImages: 5, maxStores: 1,
  hasVerifiedBadge: false, hasEliteBadge: false, hasPrioritySearch: false, hasHomepageAd: false,
  hasAdvancedStats: false, hasAutoSponsored: false, hasKeywordTargeting: false, isPopular: false,
  maxPromoProducts: 0, maxCarouselProducts: 0, annualDiscountPercent: 25,
  description: '', isActive: true,
};

const TIERS = ['STARTER', 'BUSINESS', 'PREMIUM', 'ELITE'] as const;

const FEATURES: { key: keyof Plan; label: string }[] = [
  { key: 'hasVerifiedBadge',  label: 'Badge vérifié' },
  { key: 'hasEliteBadge',     label: 'Badge Elite' },
  { key: 'hasPrioritySearch', label: 'Priorité dans la recherche' },
  { key: 'hasHomepageAd',     label: 'Publicité sur la page d\'accueil' },
  { key: 'hasAdvancedStats',  label: 'Statistiques avancées' },
  { key: 'hasAutoSponsored',  label: 'Produits sponsorisés automatiquement' },
  { key: 'hasKeywordTargeting', label: 'Mots-clés ciblés (SEO)' },
];

function PlanDialog({ plan, open, onClose }: { plan: Partial<Plan> | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !plan?.id;
  const [form, setForm] = useState<any>(plan ?? EMPTY);

  const set  = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));
  const setN = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value === '' ? null : Number(e.target.value) }));
  const setB = (k: string) => (_: any, v: boolean) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/subscriptions/plans/admin', form).then(r => r.data)
        : api.patch(`/subscriptions/plans/admin/${plan!.id}`, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{isNew ? 'Créer un plan' : 'Modifier le plan'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField select label="Tier *" value={form.tier} onChange={set('tier')} fullWidth size="small"
              SelectProps={{ native: true }} disabled={!isNew}
              helperText={!isNew ? 'Le tier ne peut pas être modifié' : undefined}>
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField label="Nom affiché *" value={form.name || ''} onChange={set('name')} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Prix mensuel (HTG) *" type="number" value={form.priceHTG} onChange={setN('priceHTG')} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Prix barré (avant réduction)" type="number" value={form.originalPriceHTG ?? ''} onChange={setN('originalPriceHTG')}
              fullWidth size="small" placeholder="Optionnel" helperText="Affiché barré au-dessus du prix pour créer l'envie" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Réduction annuelle (%)" type="number" value={form.annualDiscountPercent}
              onChange={setN('annualDiscountPercent')} fullWidth size="small"
              helperText="Appliquée si paiement pour 1 an" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Boutiques max" type="number" value={form.maxStores} onChange={setN('maxStores')} fullWidth size="small" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Produits max" type="number" value={form.maxProducts ?? ''} onChange={setN('maxProducts')}
              fullWidth size="small" placeholder="Illimité" helperText="Vide = illimité" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Services max" type="number" value={form.maxServices ?? ''} onChange={setN('maxServices')}
              fullWidth size="small" placeholder="Illimité" helperText="Quota séparé des produits" />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Images / produit" type="number" value={form.maxImages} onChange={setN('maxImages')} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Produits pub max" type="number" value={form.maxPromoProducts} onChange={setN('maxPromoProducts')}
              fullWidth size="small" helperText="Publiables comme pub, jamais dans le carousel" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Dont produits carousel" type="number" value={form.maxCarouselProducts} onChange={setN('maxCarouselProducts')}
              fullWidth size="small" helperText="Sous-ensemble visible dans le carousel homepage" />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description" value={form.description || ''} onChange={set('description')} fullWidth size="small" multiline rows={2}
              helperText="Texte marketing affiché sous le nom du plan" />
          </Grid>
        </Grid>

        <Divider />
        <Typography fontSize={13} fontWeight={700} color="text.secondary">Fonctionnalités incluses</Typography>
        <Grid container>
          {FEATURES.map(f => (
            <Grid item xs={6} key={f.key}>
              <FormControlLabel
                control={<Switch size="small" checked={!!form[f.key]} onChange={setB(f.key)} color="warning" />}
                label={<Typography fontSize={13}>{f.label}</Typography>}
              />
            </Grid>
          ))}
        </Grid>

        <Divider />
        <FormControlLabel control={<Switch checked={!!form.isPopular} onChange={setB('isPopular')} color="warning" />}
          label={<Typography fontSize={13} fontWeight={700}>Marquer comme "POPULAIRE" (badge mis en avant)</Typography>} />
        <FormControlLabel control={<Switch checked={form.isActive} onChange={setB('isActive')} color="warning" />}
          label="Plan actif (visible aux vendeurs)" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>Annuler</Button>
        <Button variant="contained" onClick={() => save.mutate()}
          disabled={!form.name || save.isPending}
          startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ borderRadius: 2, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, fontWeight: 700 }}>
          {isNew ? 'Créer' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PlansPage() {
  const qc = useQueryClient();
  const [dialogPlan, setDialogPlan] = useState<Partial<Plan> | null>(null);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['admin-plans'],
    queryFn:  () => api.get('/subscriptions/plans/admin').then(r => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/subscriptions/plans/admin/${id}`, { isActive }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/subscriptions/plans/admin/${id}`).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-plans'] }),
    onError: (e: any) => alert(e?.response?.data?.message || 'Erreur lors de la suppression'),
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Plans d'abonnement</Typography>
          <Typography color="text.secondary" fontSize={14}>
            Gérez les plans proposés aux vendeurs — tarifs, fonctionnalités, réduction annuelle.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogPlan({ ...EMPTY })}
          sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, borderRadius: 2, fontWeight: 700 }}>
          Créer un plan
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        Seuls les plans <strong>actifs</strong> sont proposés aux vendeurs. La réduction annuelle s'applique automatiquement quand un vendeur choisit de payer pour 1 an d'un coup.
      </Alert>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ORANGE }} />
        </Box>
      ) : plans.length === 0 ? (
        <Card sx={{ borderRadius: 3, py: 6, textAlign: 'center' }}>
          <WorkspacePremium sx={{ fontSize: 64, color: '#E2E8F0', mb: 2 }} />
          <Typography color="text.secondary">Aucun plan. Cliquez sur "Créer un plan" pour commencer.</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {plans.map(p => {
            const annualPrice = Math.round(p.priceHTG * 12 * (1 - (p.annualDiscountPercent || 0) / 100));
            return (
              <Grid item xs={12} md={6} lg={4} key={p.id}>
                <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  opacity: p.isActive ? 1 : 0.6, height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                          <Chip label={p.tier} size="small" sx={{ bgcolor: alphaOrange, color: ORANGE, fontWeight: 800 }} />
                          {p.isPopular && <Chip label="⭐ POPULAIRE" size="small" sx={{ bgcolor: 'rgba(59,130,246,0.12)', color: '#3B82F6', fontWeight: 800 }} />}
                        </Box>
                        <Typography fontWeight={800} fontSize={18}>{p.name}</Typography>
                      </Box>
                      <Chip label={p.isActive ? 'Actif' : 'Inactif'} size="small"
                        sx={{ bgcolor: p.isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
                          color: p.isActive ? '#059669' : '#64748B', fontWeight: 700 }} />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      {p.originalPriceHTG && p.originalPriceHTG > p.priceHTG && (
                        <Typography fontSize={15} color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                          {p.originalPriceHTG.toLocaleString()}
                        </Typography>
                      )}
                      <Typography fontSize={26} fontWeight={900} color={ORANGE}>
                        {p.priceHTG.toLocaleString()} <Typography component="span" fontSize={13} fontWeight={500} color="text.secondary">HTG/mois</Typography>
                      </Typography>
                    </Box>
                    {p.priceHTG > 0 && (
                      <Typography fontSize={12} color="text.secondary" mb={1}>
                        ou {annualPrice.toLocaleString()} HTG/an (-{p.annualDiscountPercent}%)
                      </Typography>
                    )}

                    {p.description && <Typography fontSize={13} color="text.secondary" mb={1.5}>{p.description}</Typography>}

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, mb: 1 }}>
                      <Typography fontSize={12.5} color="text.secondary">
                        📦 {p.maxProducts ?? 'Illimité'} produits · 🔧 {p.maxServices ?? 'Illimité'} services · 🖼️ {p.maxImages} images · 🏪 {p.maxStores} boutique(s)
                      </Typography>
                      {p.maxPromoProducts > 0 && (
                        <Typography fontSize={12.5} color="text.secondary">
                          📢 {p.maxPromoProducts} produit(s) en pub{p.maxCarouselProducts > 0 ? ` · dont ${p.maxCarouselProducts} au carousel` : ''}
                        </Typography>
                      )}
                      {FEATURES.filter(f => (p as any)[f.key]).map(f => (
                        <Typography key={f.key} fontSize={12.5} color="text.secondary">✓ {f.label}</Typography>
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 1 }}>
                      <Tooltip title={p.isActive ? 'Désactiver' : 'Activer'}>
                        <Switch size="small" checked={p.isActive} color="warning"
                          onChange={(_, v) => toggle.mutate({ id: p.id, isActive: v })} />
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => setDialogPlan(p)} sx={{ '&:hover': { color: ORANGE } }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => {
                          if (confirm(`Supprimer le plan "${p.name}" ?`)) remove.mutate(p.id);
                        }} sx={{ '&:hover': { color: '#EF4444' } }}>
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

      {dialogPlan !== null && (
        <PlanDialog plan={dialogPlan} open={true} onClose={() => setDialogPlan(null)} />
      )}
    </Box>
  );
}

const alphaOrange = 'rgba(255,153,0,0.12)';
