import { useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, IconButton,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  alpha, InputAdornment } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Add, Delete, Search, Tag as TagIcon } from '@mui/icons-material';
import api from '../../api/axios';
import { useSnackbar } from 'notistack';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const TAG_COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];

export default function TagsPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: '', slug: '', color: TAG_COLORS[0] });

  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: () => api.get('/tags?limit=500').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []).catch(() => []),
  });

  const create = useMutation({
    mutationFn: (payload: any) => api.post('/tags', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tags'] }); enqueueSnackbar('Tag créé', { variant: 'success' }); setDialogOpen(false); setForm({ name: '', slug: '', color: TAG_COLORS[0] }); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tags'] }); enqueueSnackbar('Tag supprimé', { variant: 'success' }); setDeleteTarget(null); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const filtered = data.filter((t: any) => !search || t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">Tags produits</Typography>
          <Typography color="text.secondary" fontSize={14} mt={0.3}>{data.length} tags • utilisés pour la recherche et le filtrage</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}
          sx={{ borderRadius: 2.5, fontWeight: 700, boxShadow: '0 4px 14px rgba(255,153,0,0.35)' }}>
          Nouveau tag
        </Button>
      </Box>

      <TextField size="small" fullWidth placeholder="Rechercher un tag…" value={search}
        onChange={e => setSearch(e.target.value)} sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }} />

      <Card>
        <CardContent>
          {isLoading
            ? <Typography color="text.secondary" textAlign="center" py={4}>Chargement…</Typography>
            : filtered.length === 0
              ? <Box sx={{ textAlign: 'center', py: 6 }}>
                  <TagIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">Aucun tag trouvé.</Typography>
                </Box>
              : <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 1 }}>
                  {filtered.map((tag: any) => (
                    <Box key={tag.id} sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      pl: 1.5, pr: 0.5, py: 0.5, borderRadius: 3,
                      bgcolor: alpha(tag.color || '#3B82F6', 0.1),
                      border: `1.5px solid ${alpha(tag.color || '#3B82F6', 0.25)}`,
                      transition: 'all 0.15s',
                      '&:hover': { boxShadow: `0 4px 12px ${alpha(tag.color || '#3B82F6', 0.2)}` },
                    }}>
                      <Typography sx={{ color: tag.color || '#3B82F6', fontWeight: 700, fontSize: 13.5 }}>
                        #{tag.name}
                      </Typography>
                      {tag._count?.products != null && (
                        <Chip label={tag._count.products} size="small"
                          sx={{ height: 18, fontSize: 10, bgcolor: alpha(tag.color || '#3B82F6', 0.15), color: tag.color || '#3B82F6', ml: 0.5 }} />
                      )}
                      <IconButton size="small" sx={{ p: 0.3, color: 'text.disabled', '&:hover': { color: 'error.main', bgcolor: alpha('#EF4444', 0.1) } }}
                        onClick={() => setDeleteTarget(tag)}>
                        <Delete sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
          }
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Nouveau tag</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '20px !important' }}>
          <TextField fullWidth label="Nom du tag *" value={form.name} autoFocus
            onChange={e => { const n = e.target.value; setForm(f => ({ ...f, name: n, slug: slugify(n) })); }}
            helperText={`Slug: ${form.slug || '—'}`}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>Couleur</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {TAG_COLORS.map(c => (
                <Box key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                    border: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                    outline: form.color === c ? `2px solid white` : 'none',
                    boxShadow: form.color === c ? `0 0 0 1px ${c}` : 'none',
                    transition: 'all 0.15s', transform: form.color === c ? 'scale(1.15)' : 'scale(1)' }} />
              ))}
            </Box>
          </Box>
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(form.color, 0.08), border: `1.5px solid ${alpha(form.color, 0.25)}`, textAlign: 'center' }}>
            <Typography sx={{ color: form.color, fontWeight: 700, fontSize: 15 }}>#{form.name || 'aperçu'}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button onClick={() => create.mutate(form)} variant="contained" disabled={!form.name || create.isPending}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            {create.isPending ? 'Création…' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700} color="error.main">Supprimer #{deleteTarget?.name} ?</DialogTitle>
        <DialogContent><Typography>Ce tag sera retiré de tous les produits qui l'utilisent.</Typography></DialogContent>
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
