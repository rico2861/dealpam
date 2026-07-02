import { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, IconButton,
  Switch, FormControlLabel, TextField, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, alpha, Tooltip, Select, MenuItem,
  FormControl, InputLabel, InputAdornment, Grid } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashOn, Delete, Add, Search, DragIndicator, Timer, AutoAwesome, EditNote } from '@mui/icons-material';
import api from '../../api/axios';
import { useSnackbar } from 'notistack';

function CountdownDisplay({ endAt }: { endAt: string | null }) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!endAt) return;
    const tick = () => setDiff(Math.max(0, new Date(endAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  if (!endAt) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.04)', border: '1px dashed #E0E0E0' }}>
        <Timer sx={{ fontSize: 18, color: '#9CA3AF' }} />
        <Typography color="#9CA3AF" fontSize={13}>Aucune date de fin définie</Typography>
      </Box>
    );
  }

  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const totalS = diff / 1000;
  const days  = Math.floor(totalS / 86400);
  const hours = Math.floor((totalS % 86400) / 3600);
  const mins  = Math.floor((totalS % 3600) / 60);
  const secs  = Math.floor(totalS % 60);
  const expired = diff === 0;

  const segments = days > 0
    ? [{ v: pad(days), label: 'Jours' }, { v: pad(hours), label: 'Heures' }, { v: pad(mins), label: 'Min' }]
    : [{ v: pad(hours), label: 'Heures' }, { v: pad(mins), label: 'Min' }, { v: pad(secs), label: 'Sec' }];

  if (expired) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2, bgcolor: alpha('#CC0C39', 0.08), border: `1px solid ${alpha('#CC0C39', 0.2)}` }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#CC0C39' }} />
        <Typography color="#CC0C39" fontWeight={700} fontSize={13}>Vente flash terminée — Définissez une nouvelle date</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '8px', p: 2, borderRadius: 2.5, background: 'linear-gradient(135deg, #0D0000, #1A0505)', border: '1px solid rgba(204,12,57,0.2)' }}>
        {segments.map(({ v, label }, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <Box sx={{
                background: 'linear-gradient(180deg, #2A0A0A 0%, #1A0505 100%)',
                border: '1px solid rgba(204,12,57,0.35)',
                color: '#FF4444', fontWeight: 900, fontSize: 28,
                borderRadius: '10px', px: '16px', py: '8px',
                minWidth: 64, textAlign: 'center',
                fontFamily: '"Courier New", monospace', letterSpacing: '3px',
                boxShadow: '0 2px 16px rgba(204,12,57,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                position: 'relative',
                '&::after': { content: '""', position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', bgcolor: 'rgba(204,12,57,0.2)' },
              }}>{v}</Box>
              <Typography fontSize={10} color="rgba(255,255,255,0.35)" fontWeight={600} letterSpacing="0.5px" textTransform="uppercase">
                {label}
              </Typography>
            </Box>
            {i < segments.length - 1 && (
              <Box sx={{ mb: '20px', color: '#CC0C39', fontWeight: 900, fontSize: 24, opacity: 0.6 }}>:</Box>
            )}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 1 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#EF4444', animation: 'blink 1s step-start infinite', '@keyframes blink': { '50%': { opacity: 0 } } }} />
        <Typography fontSize={11} color="text.secondary">
          Se termine le {new Date(endAt).toLocaleString('fr', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Typography>
      </Box>
    </Box>
  );
}

export default function FlashSalePage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [addDialog, setAddDialog] = useState(false);
  const [search, setSearch] = useState('');

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['flash-config'],
    queryFn: () => api.get('/flash-sale/config').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['flash-items'],
    queryFn: () => api.get('/flash-sale/items').then(r => r.data),
  });

  const { data: autoProducts = [] } = useQuery({
    queryKey: ['flash-auto'],
    queryFn: () => api.get('/flash-sale/auto-products?limit=30').then(r => r.data).catch(() => []),
  });

  const updateConfig = useMutation({
    mutationFn: (dto: any) => api.patch('/flash-sale/config', dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flash-config'] }); enqueueSnackbar('Configuration sauvegardée', { variant: 'success' }); },
    onError: () => enqueueSnackbar('Erreur', { variant: 'error' }),
  });

  const addProduct = useMutation({
    mutationFn: (productId: string) => api.post('/flash-sale/items', { productId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flash-items'] }); enqueueSnackbar('Produit ajouté', { variant: 'success' }); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const removeProduct = useMutation({
    mutationFn: (productId: string) => api.delete(`/flash-sale/items/${productId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flash-items'] }); enqueueSnackbar('Produit retiré', { variant: 'success' }); },
  });

  const existingIds = new Set((items as any[]).map((i: any) => i.productId));
  const filteredAuto = (autoProducts as any[]).filter((p: any) =>
    !existingIds.has(p.id) && (!search || p.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Local state for endAt editing
  const [endAtInput, setEndAtInput] = useState('');
  useEffect(() => {
    if (config?.endAt) {
      setEndAtInput(new Date(config.endAt).toISOString().slice(0, 16));
    }
  }, [config?.endAt]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: '#CC0C39', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(204,12,57,0.4)' }}>
          <FlashOn sx={{ color: 'white', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">Ventes Flash</Typography>
          <Typography color="text.secondary" fontSize={14}>Gérez le timer et les produits en promotion flash</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* ── Config Card ── */}
        <Grid item xs={12} md={5}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Typography fontWeight={700} fontSize={16}>Configuration</Typography>

              {/* Active toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                p: 2, borderRadius: 2.5, bgcolor: config?.isActive ? alpha('#CC0C39', 0.06) : 'rgba(0,0,0,0.03)',
                border: `1.5px solid ${config?.isActive ? alpha('#CC0C39', 0.25) : 'rgba(0,0,0,0.08)'}` }}>
                <Box>
                  <Typography fontWeight={700} fontSize={14} color={config?.isActive ? '#CC0C39' : 'text.primary'}>
                    {config?.isActive ? '🔴 Vente Flash ACTIVE' : '⚫ Vente Flash inactive'}
                  </Typography>
                  <Typography fontSize={12} color="text.secondary">Visible sur la page d'accueil</Typography>
                </Box>
                <Switch checked={config?.isActive || false}
                  onChange={e => updateConfig.mutate({ isActive: e.target.checked })}
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: '#CC0C39' }, '& .Mui-checked .MuiSwitch-track': { bgcolor: '#CC0C39' } }} />
              </Box>

              {/* Countdown display */}
              <Box>
                <Typography fontWeight={600} fontSize={13} color="text.secondary" mb={1}>Compte à rebours actuel</Typography>
                <CountdownDisplay endAt={config?.endAt || null} />
              </Box>

              {/* End time picker */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography fontWeight={700} fontSize={13} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Timer sx={{ fontSize: 15, color: '#CC0C39' }} />
                    Date de fin
                  </Typography>
                  {config?.endAt && (
                    <Tooltip title="Supprimer le timer">
                      <Button size="small" color="error" variant="outlined"
                        onClick={() => updateConfig.mutate({ endAt: '' })}
                        sx={{ fontSize: 11, textTransform: 'none', borderRadius: 1.5, py: 0.3, px: 1 }}>
                        Supprimer
                      </Button>
                    </Tooltip>
                  )}
                </Box>

                {/* Raccourcis rapides */}
                <Typography fontSize={11} color="text.secondary" mb={0.8}>Raccourcis rapides</Typography>
                <Box sx={{ display: 'flex', gap: 0.8, mb: 1.5, flexWrap: 'wrap' }}>
                  {[
                    { label: '+1h', h: 1 }, { label: '+2h', h: 2 }, { label: '+4h', h: 4 },
                    { label: '+8h', h: 8 }, { label: '+24h', h: 24 }, { label: '+48h', h: 48 }, { label: '+7j', h: 168 },
                  ].map(({ label, h }) => (
                    <Chip key={label} label={label} size="small" clickable variant="outlined"
                      onClick={() => {
                        const base = config?.endAt && new Date(config.endAt) > new Date()
                          ? new Date(config.endAt).getTime()
                          : Date.now();
                        const d = new Date(base + h * 3600000);
                        setEndAtInput(d.toISOString().slice(0, 16));
                        updateConfig.mutate({ endAt: d.toISOString() });
                      }}
                      sx={{ fontSize: 11, height: 24, borderColor: alpha('#CC0C39', 0.35), color: '#CC0C39', fontWeight: 600,
                        '&:hover': { bgcolor: alpha('#CC0C39', 0.08), borderColor: '#CC0C39' } }} />
                  ))}
                </Box>

                {/* Date/heure manuelle */}
                <Typography fontSize={11} color="text.secondary" mb={0.8}>Ou choisir une date précise</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField type="datetime-local" size="small" value={endAtInput}
                    onChange={e => setEndAtInput(e.target.value)}
                    sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <Button variant="contained" size="small" disabled={!endAtInput}
                    onClick={() => updateConfig.mutate({ endAt: new Date(endAtInput).toISOString() })}
                    sx={{ borderRadius: 2, fontWeight: 700, whiteSpace: 'nowrap', bgcolor: '#CC0C39', '&:hover': { bgcolor: '#A80A30' } }}>
                    Appliquer
                  </Button>
                </Box>
              </Box>

              {/* Title */}
              <Box>
                <Typography fontWeight={600} fontSize={13} color="text.secondary" mb={1}>Titre affiché</Typography>
                <TextField size="small" fullWidth defaultValue={config?.title || 'Ventes Flash'}
                  onBlur={e => updateConfig.mutate({ title: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Box>

              {/* Mode */}
              <Box>
                <Typography fontWeight={600} fontSize={13} color="text.secondary" mb={1}>Sélection des produits</Typography>
                <FormControl fullWidth size="small">
                  <Select value={config?.mode || 'both'}
                    onChange={e => updateConfig.mutate({ mode: e.target.value })}
                    sx={{ borderRadius: 2 }}>
                    <MenuItem value="manual">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditNote fontSize="small" sx={{ color: 'primary.main' }} />
                        <Box>
                          <Typography fontSize={13} fontWeight={600}>Manuel uniquement</Typography>
                          <Typography fontSize={11} color="text.secondary">Seulement les produits ajoutés ci-dessous</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="auto">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoAwesome fontSize="small" sx={{ color: '#F59E0B' }} />
                        <Box>
                          <Typography fontSize={13} fontWeight={600}>Automatique</Typography>
                          <Typography fontSize={11} color="text.secondary">Produits en promo + vendeurs sponsorisés</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="both">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FlashOn fontSize="small" sx={{ color: '#CC0C39' }} />
                        <Box>
                          <Typography fontSize={13} fontWeight={600}>Manuel + Automatique</Typography>
                          <Typography fontSize={11} color="text.secondary">Manuel en priorité, complété automatiquement</Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Products Card ── */}
        <Grid item xs={12} md={7}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box>
                  <Typography fontWeight={700} fontSize={16}>Produits manuels</Typography>
                  <Typography fontSize={12} color="text.secondary">{(items as any[]).length} produit(s) sélectionné(s)</Typography>
                </Box>
                <Button startIcon={<Add />} variant="outlined" size="small" onClick={() => setAddDialog(true)}
                  sx={{ borderRadius: 2.5, fontWeight: 700, borderColor: '#CC0C39', color: '#CC0C39',
                    '&:hover': { bgcolor: alpha('#CC0C39', 0.06), borderColor: '#CC0C39' } }}>
                  Ajouter
                </Button>
              </Box>

              {(items as any[]).length === 0
                ? <Box sx={{ textAlign: 'center', py: 5, color: 'text.disabled' }}>
                    <FlashOn sx={{ fontSize: 40, mb: 1 }} />
                    <Typography fontSize={14}>Aucun produit manuel.<br />En mode "Auto" ou "Les deux", les promos s'affichent automatiquement.</Typography>
                  </Box>
                : (items as any[]).map((item: any) => {
                    const p = item.product;
                    const img = p?.images?.[0]?.urlMedium;
                    const disc = p?.salePrice ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
                    return (
                      <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.2,
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, borderRadius: 1, px: 0.5 }}>
                        <DragIndicator sx={{ fontSize: 16, color: 'text.disabled', cursor: 'grab' }} />
                        <Box component="img" src={img || 'https://placehold.co/48x48/F5F5F5/AAA?text=?'} alt={p?.name}
                          sx={{ width: 42, height: 42, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontSize={13} fontWeight={600} noWrap>{p?.name}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Typography fontSize={12} color="#CC0C39" fontWeight={700}>
                              {Number(p?.salePrice || p?.price).toLocaleString()} HTG
                            </Typography>
                            {disc > 0 && <Chip label={`-${disc}%`} size="small"
                              sx={{ height: 18, fontSize: 10, bgcolor: '#FEE2E2', color: '#CC0C39', fontWeight: 700 }} />}
                            {p?.isSponsored && <Chip label="Sponsorisé" size="small"
                              sx={{ height: 18, fontSize: 10, bgcolor: alpha('#FF9900', 0.12), color: '#FF9900' }} />}
                          </Box>
                        </Box>
                        <Tooltip title="Retirer">
                          <IconButton size="small" onClick={() => removeProduct.mutate(item.productId)}
                            sx={{ color: 'error.main', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    );
                  })}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Add Products Dialog ── */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Ajouter un produit en flash</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField size="small" fullWidth placeholder="Rechercher un produit…" value={search}
            onChange={e => setSearch(e.target.value)} sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }} />
          <Box sx={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {filteredAuto.length === 0
              ? <Typography color="text.disabled" textAlign="center" py={3} fontSize={13}>
                  Aucun produit disponible (tous déjà ajoutés ou aucun avec réduction)
                </Typography>
              : filteredAuto.map((p: any) => {
                  const img = p?.images?.[0]?.urlMedium;
                  const disc = p?.salePrice ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
                  return (
                    <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 2,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' } }}>
                      <Box component="img" src={img || 'https://placehold.co/40x40/F5F5F5/AAA?text=?'} alt={p.name}
                        sx={{ width: 38, height: 38, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontSize={13} fontWeight={600} noWrap>{p.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.6 }}>
                          <Typography fontSize={12} color="#CC0C39" fontWeight={700}>{Number(p.salePrice || p.price).toLocaleString()} HTG</Typography>
                          {disc > 0 && <Chip label={`-${disc}%`} size="small" sx={{ height: 16, fontSize: 10, bgcolor: '#FEE2E2', color: '#CC0C39' }} />}
                          {p.isSponsored && <Chip label="Sponsorisé" size="small" sx={{ height: 16, fontSize: 10, bgcolor: alpha('#FF9900', 0.1), color: '#FF9900' }} />}
                        </Box>
                      </Box>
                      <Button size="small" variant="contained" onClick={() => addProduct.mutate(p.id)}
                        disabled={addProduct.isPending}
                        sx={{ borderRadius: 2, fontWeight: 700, bgcolor: '#CC0C39', minWidth: 64, flexShrink: 0,
                          '&:hover': { bgcolor: '#A50930' } }}>
                        <Add sx={{ fontSize: 16 }} />
                      </Button>
                    </Box>
                  );
                })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialog(false)} variant="outlined" sx={{ borderRadius: 2 }}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
