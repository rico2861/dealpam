import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField, Switch,
  FormControlLabel, IconButton, Chip, Alert, Grid, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, alpha,
  Tabs, Tab, MenuItem,
} from '@mui/material';
import { Add, Edit, Delete, DragIndicator, OpenInNew, Image } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

const ORANGE = '#FF9900';

type Position = 'HERO' | 'SIDE_LEFT' | 'SIDE_RIGHT';

const POSITIONS: { value: Position; label: string; hint: string }[] = [
  { value: 'HERO',       label: 'Carrousel central', hint: 'Grand carrousel principal en haut de la homepage' },
  { value: 'SIDE_LEFT',  label: 'Colonne gauche',     hint: 'Bannières verticales à gauche du carrousel (desktop large uniquement)' },
  { value: 'SIDE_RIGHT', label: 'Colonne droite',     hint: 'Bannières verticales à droite du carrousel (desktop large uniquement)' },
];

interface Banner {
  id: string;
  position: Position;
  tag: string | null;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  catFilter: string | null;
  imageUrl: string;
  targetUrl: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

const EMPTY: Omit<Banner, 'id' | 'createdAt'> = {
  position: 'HERO', tag: '', title: '', subtitle: '', ctaText: 'Découvrir', catFilter: '',
  imageUrl: '', targetUrl: '', sortOrder: 0, isActive: true, startsAt: null, endsAt: null,
};

function BannerDialog({ banner, open, onClose }: { banner: Partial<Banner> | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !banner?.id;
  const [form, setForm] = useState<any>(banner ?? EMPTY);

  const set = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));
  const setB = (k: string) => (_: any, v: boolean) => setForm((p: any) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/banners/admin', form).then(r => r.data)
        : api.patch(`/banners/admin/${banner!.id}`, form).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-banners'] }); onClose(); },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{isNew ? 'Ajouter une bannière' : 'Modifier la bannière'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField select label="Emplacement" value={form.position || 'HERO'} onChange={set('position')} fullWidth size="small">
          {POSITIONS.map(p => (
            <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
          ))}
        </TextField>
        <Typography fontSize={12} color="text.secondary" mt={-1.5}>
          {POSITIONS.find(p => p.value === (form.position || 'HERO'))?.hint}
        </Typography>
        <TextField label="Badge / tag (ex: MODE & STYLE)" value={form.tag || ''} onChange={set('tag')} fullWidth size="small" />
        <TextField label="Titre" value={form.title || ''} onChange={set('title')} fullWidth size="small"
          helperText="Utilisez \n pour un retour à la ligne" />
        <TextField label="Sous-titre" value={form.subtitle || ''} onChange={set('subtitle')} fullWidth size="small" />
        <TextField label="URL image *" value={form.imageUrl || ''} onChange={set('imageUrl')} fullWidth size="small"
          placeholder="https://…/banner.jpg" required
          helperText="Image 1920×600 recommandée (WebP ou JPG)" />
        <TextField label="URL cible (lien) *" value={form.targetUrl || ''} onChange={set('targetUrl')} fullWidth size="small"
          placeholder="/products?category=mode" required />
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField label="Texte du bouton" value={form.ctaText || ''} onChange={set('ctaText')} fullWidth size="small" placeholder="Découvrir" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Filtre catégorie (slug)" value={form.catFilter || ''} onChange={set('catFilter')} fullWidth size="small"
              placeholder="vetements" helperText="Optionnel, pour le mini-carousel produits" />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Ordre d'affichage" type="number" value={form.sortOrder} onChange={set('sortOrder')} fullWidth size="small" />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel control={<Switch checked={form.isActive} onChange={setB('isActive')} color="warning" />} label="Active" />
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
        </Grid>

        {/* Preview */}
        {form.imageUrl && (
          <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #E5E7EB', aspectRatio: '16/5', bgcolor: '#F8FAFC' }}>
            <Box component="img" src={form.imageUrl} alt="preview"
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e: any) => { e.target.style.display = 'none'; }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>Annuler</Button>
        <Button variant="contained" onClick={() => save.mutate()}
          disabled={!form.imageUrl || !form.targetUrl || save.isPending}
          startIcon={save.isPending ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ borderRadius: 2, bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, fontWeight: 700 }}>
          {isNew ? 'Créer' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function BannersPage() {
  const qc = useQueryClient();
  const [dialogBanner, setDialogBanner] = useState<Partial<Banner> | null>(null);
  const [tab, setTab] = useState<Position>('HERO');

  const { data: allBanners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ['admin-banners'],
    queryFn:  () => api.get('/banners/admin').then(r => r.data),
  });
  const banners = allBanners.filter(b => (b.position || 'HERO') === tab);

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/banners/admin/${id}`, { isActive }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/banners/admin/${id}`).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-banners'] }),
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Gestion des pubs homepage</Typography>
          <Typography color="text.secondary" fontSize={14}>
            Bannières affichées dans le carousel de la page d'accueil.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogBanner({ ...EMPTY, position: tab })}
          sx={{ bgcolor: ORANGE, '&:hover': { bgcolor: '#e68900' }, borderRadius: 2, fontWeight: 700 }}>
          Ajouter
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #E5E7EB' }}>
        {POSITIONS.map(p => (
          <Tab key={p.value} value={p.value} label={`${p.label} (${allBanners.filter(b => (b.position || 'HERO') === p.value).length})`} />
        ))}
      </Tabs>

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        {POSITIONS.find(p => p.value === tab)?.hint} — les bannières sont affichées par ordre croissant de "Ordre d'affichage". Seules les bannières <strong>actives</strong> et dans la période de validité sont affichées sur la homepage.
      </Alert>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: ORANGE }} />
        </Box>
      ) : banners.length === 0 ? (
        <Card sx={{ borderRadius: 3, py: 6, textAlign: 'center' }}>
          <Image sx={{ fontSize: 64, color: '#E2E8F0', mb: 2 }} />
          <Typography color="text.secondary">Aucune bannière. Cliquez sur "Ajouter" pour créer la première.</Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {banners.map(b => (
            <Grid item xs={12} md={6} key={b.id}>
              <Card sx={{ borderRadius: 3, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                opacity: b.isActive ? 1 : 0.6 }}>
                {/* Banner image preview */}
                <Box sx={{ aspectRatio: '16/5', bgcolor: '#F8FAFC', overflow: 'hidden', position: 'relative' }}>
                  <Box component="img" src={b.imageUrl} alt={b.title ?? 'Bannière'}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 0.8 }}>
                    <Chip label={`#${b.sortOrder}`} size="small"
                      sx={{ bgcolor: 'rgba(0,0,0,0.55)', color: 'white', fontWeight: 700, height: 20, fontSize: 10 }} />
                    <Chip label={b.isActive ? 'Active' : 'Inactive'} size="small"
                      sx={{ bgcolor: b.isActive ? 'rgba(16,185,129,0.85)' : 'rgba(100,116,139,0.8)', color: 'white', fontWeight: 700, height: 20, fontSize: 10 }} />
                  </Box>
                </Box>

                <CardContent sx={{ pt: 1.5, pb: '12px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={700} fontSize={14} noWrap>
                        {b.title || <span style={{ color: '#94A3B8', fontWeight: 400 }}>Sans titre</span>}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                        <Typography fontSize={12} color="#64748B" noWrap sx={{ maxWidth: 220 }}>{b.targetUrl}</Typography>
                        <IconButton size="small" component="a" href={b.targetUrl} target="_blank"
                          sx={{ p: 0.2, color: '#94A3B8' }}>
                          <OpenInNew sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Box>
                      {(b.startsAt || b.endsAt) && (
                        <Typography fontSize={11} color="#94A3B8" mt={0.3}>
                          {b.startsAt && `Du ${new Date(b.startsAt).toLocaleDateString('fr-FR')} `}
                          {b.endsAt   && `au ${new Date(b.endsAt).toLocaleDateString('fr-FR')}`}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title={b.isActive ? 'Désactiver' : 'Activer'}>
                        <Switch size="small" checked={b.isActive} color="warning"
                          onChange={(_, v) => toggle.mutate({ id: b.id, isActive: v })} />
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small" onClick={() => setDialogBanner(b)}
                          sx={{ '&:hover': { color: ORANGE } }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" onClick={() => {
                          if (confirm('Supprimer cette bannière ?')) remove.mutate(b.id);
                        }} sx={{ '&:hover': { color: '#EF4444' } }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      {dialogBanner !== null && (
        <BannerDialog
          banner={dialogBanner}
          open={true}
          onClose={() => setDialogBanner(null)}
        />
      )}
    </Box>
  );
}
