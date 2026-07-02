import { useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Switch, FormControlLabel, alpha, Tooltip } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Add, Delete, Edit, Label as LabelIcon } from '@mui/icons-material';
import api from '../../api/axios';
import { useSnackbar } from 'notistack';

const PRESET_COLORS = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#F97316','#06B6D4'];
const PRESET_ICONS  = ['🔥','⭐','🆕','💥','🎯','💎','🏷️','✅','🎁','⚡','🌟','🛒'];
const EMPTY_FORM = { name: '', color: PRESET_COLORS[0], icon: PRESET_ICONS[0], isActive: true };

export default function LabelsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-labels'],
    queryFn: () => api.get('/labels?limit=200').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []).catch(() => []),
  });

  const save = useMutation({
    mutationFn: (payload: any) => editTarget ? api.patch(`/labels/${editTarget.id}`, payload) : api.post('/labels', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-labels'] }); enqueueSnackbar(editTarget ? 'Label modifié' : 'Label créé', { variant: 'success' }); closeDialog(); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/labels/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-labels'] }); enqueueSnackbar('Label supprimé', { variant: 'success' }); setDeleteTarget(null); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const openCreate = () => { setEditTarget(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
  const openEdit = (l: any) => { setEditTarget(l); setForm({ name: l.name, color: l.color, icon: l.icon || '', isActive: l.isActive }); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); setForm({ ...EMPTY_FORM }); };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">Labels produits</Typography>
          <Typography color="text.secondary" fontSize={14} mt={0.3}>Badges visuels assignés aux produits par les administrateurs</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}
          sx={{ borderRadius: 2.5, fontWeight: 700, boxShadow: '0 4px 14px rgba(255,153,0,0.35)' }}>
          Nouveau label
        </Button>
      </Box>

      <Card>
        <CardContent>
          {isLoading
            ? <Typography color="text.secondary" textAlign="center" py={4}>Chargement…</Typography>
            : data.length === 0
              ? <Box sx={{ textAlign: 'center', py: 6 }}>
                  <LabelIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">Aucun label. Créez-en un !</Typography>
                </Box>
              : <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
                  {data.map((label: any) => (
                    <Box key={label.id} sx={{
                      p: 2.5, borderRadius: 3,
                      border: `1.5px solid ${alpha(label.color, 0.3)}`,
                      bgcolor: alpha(label.color, 0.05),
                      position: 'relative',
                      opacity: label.isActive ? 1 : 0.5,
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: `0 8px 24px ${alpha(label.color, 0.2)}`, transform: 'translateY(-2px)' },
                    }}>
                      {/* Preview badge */}
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.6,
                        px: 1.5, py: 0.5, borderRadius: 2,
                        bgcolor: label.color, mb: 2,
                        boxShadow: `0 4px 12px ${alpha(label.color, 0.4)}`,
                      }}>
                        {label.icon && <Typography fontSize={13}>{label.icon}</Typography>}
                        <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 12, letterSpacing: '0.3px' }}>{label.name}</Typography>
                      </Box>

                      <Typography fontWeight={700} fontSize={14}>{label.name}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {label.isActive ? '✓ Actif' : '✗ Inactif'} · {label.color}
                      </Typography>

                      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Modifier">
                          <IconButton size="small" onClick={() => openEdit(label)} sx={{ p: 0.4, color: label.color, bgcolor: alpha(label.color, 0.1) }}>
                            <Edit sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton size="small" onClick={() => setDeleteTarget(label)} sx={{ p: 0.4, color: 'error.main', bgcolor: alpha('#EF4444', 0.1) }}>
                            <Delete sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Box>
          }
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editTarget ? 'Modifier le label' : 'Nouveau label'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '20px !important' }}>
          <TextField fullWidth label="Nom du label *" value={form.name} autoFocus
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Emoji</Typography>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              {PRESET_ICONS.map(ic => (
                <Box key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                  sx={{ width: 36, height: 36, borderRadius: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    border: form.icon === ic ? '2px solid' : '2px solid transparent',
                    borderColor: form.icon === ic ? 'primary.main' : 'transparent',
                    bgcolor: form.icon === ic ? alpha('#FF9900', 0.1) : 'rgba(0,0,0,0.04)',
                    transition: 'all 0.15s', transform: form.icon === ic ? 'scale(1.15)' : 'scale(1)' }}>
                  {ic}
                </Box>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Couleur</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <Box key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: 2,
                    transform: form.color === c ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.15s' }} />
              ))}
            </Box>
          </Box>

          {/* Preview */}
          <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#F8F9FA', textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">Aperçu</Typography>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, px: 1.5, py: 0.5, borderRadius: 2, bgcolor: form.color, boxShadow: `0 4px 12px ${alpha(form.color, 0.4)}` }}>
              {form.icon && <Typography fontSize={13}>{form.icon}</Typography>}
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 12 }}>{form.name || 'Aperçu'}</Typography>
            </Box>
          </Box>

          <FormControlLabel control={<Switch checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />}
            label={<Typography fontSize={14}>Label actif</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={closeDialog} variant="outlined" sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button onClick={() => save.mutate(form)} variant="contained" disabled={!form.name || save.isPending}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            {save.isPending ? 'Enregistrement…' : editTarget ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700} color="error.main">Supprimer le label ?</DialogTitle>
        <DialogContent><Typography>Supprimer <strong>{deleteTarget?.name}</strong> ? Il sera retiré de tous les produits.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined" sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button color="error" variant="contained" disabled={remove.isPending}
            onClick={() => deleteTarget && remove.mutate(deleteTarget.id)} sx={{ borderRadius: 2, fontWeight: 700 }}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
