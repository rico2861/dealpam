import { useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, IconButton,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Select, FormControl, InputLabel, Switch, FormControlLabel,
  Tooltip, alpha, Collapse } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Add, Edit, Delete, ExpandMore, ExpandLess, Category,
  FolderOpen, Folder } from '@mui/icons-material';
import api from '../../api/axios';
import { useSnackbar } from 'notistack';

interface Cat {
  id: string; name: string; slug: string; icon?: string; imageUrl?: string;
  parentId?: string; sortOrder: number; isActive: boolean;
  children?: Cat[]; _count?: { products: number };
}

const EMPTY_FORM = { name: '', slug: '', icon: '', imageUrl: '', parentId: '', sortOrder: 0, isActive: true };

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function CategoryRow({ cat, depth, roots, onEdit, onDelete }: {
  cat: Cat; depth: number; roots: Cat[];
  onEdit: (c: Cat) => void; onDelete: (c: Cat) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = (cat.children?.length ?? 0) > 0;

  return (
    <>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        pl: 2 + depth * 3, pr: 2, py: 1.2,
        borderBottom: '1px solid rgba(0,0,0,0.04)',
        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
        bgcolor: depth > 0 ? `rgba(0,0,0,0.${depth})` : 'white',
      }}>
        <Box sx={{ width: 20, display: 'flex', justifyContent: 'center' }}>
          {hasChildren
            ? <IconButton size="small" sx={{ p: 0.2 }} onClick={() => setOpen(!open)}>
                {open ? <ExpandLess fontSize="small" sx={{ color: 'text.disabled' }} />
                       : <ExpandMore fontSize="small" sx={{ color: 'text.disabled' }} />}
              </IconButton>
            : <Box sx={{ width: 20 }} />}
        </Box>

        {depth === 0
          ? <FolderOpen sx={{ fontSize: 18, color: 'primary.main' }} />
          : <Folder sx={{ fontSize: 16, color: 'text.disabled' }} />}

        {cat.icon && <Typography fontSize={18}>{cat.icon}</Typography>}

        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography fontWeight={depth === 0 ? 700 : 500} fontSize={depth === 0 ? 14.5 : 13.5}>
            {cat.name}
          </Typography>
          <Typography variant="caption" color="text.disabled" fontFamily="monospace">/{cat.slug}</Typography>
          {cat._count?.products != null && (
            <Chip label={`${cat._count.products} produits`} size="small"
              sx={{ height: 20, fontSize: 11, bgcolor: 'rgba(0,0,0,0.05)', color: 'text.secondary' }} />
          )}
          {(cat.children?.length ?? 0) > 0 && (
            <Chip label={`${cat.children!.length} sous-catégories`} size="small"
              sx={{ height: 20, fontSize: 11, bgcolor: alpha('#2563EB', 0.08), color: '#2563EB' }} />
          )}
        </Box>

        <Chip label={cat.isActive ? 'Active' : 'Inactive'} size="small"
          sx={{ height: 20, fontSize: 11, bgcolor: cat.isActive ? '#D1FAE5' : '#FEE2E2', color: cat.isActive ? '#065F46' : '#991B1B' }} />

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Modifier">
            <IconButton size="small" onClick={() => onEdit(cat)} sx={{ color: 'primary.main', '&:hover': { bgcolor: alpha('#FF9900', 0.1) } }}>
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={() => onDelete(cat)} sx={{ color: 'error.main', '&:hover': { bgcolor: alpha('#EF4444', 0.1) } }}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {hasChildren && (
        <Collapse in={open}>
          {cat.children!.map(child => (
            <CategoryRow key={child.id} cat={child} depth={depth + 1} roots={roots} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </Collapse>
      )}
    </>
  );
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Cat | null>(null);
  const [editTarget, setEditTarget] = useState<Cat | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: raw = [], isLoading } = useQuery<Cat[]>({
    queryKey: ['admin-categories'],
    queryFn: () => api.get('/categories?limit=200').then(r => Array.isArray(r.data) ? r.data : r.data?.data || []),
  });

  // Build tree
  const roots: Cat[] = raw.filter(c => !c.parentId).map(root => ({
    ...root,
    children: raw.filter(c => c.parentId === root.id),
  }));

  const flatParents = raw.filter(c => !c.parentId); // only root cats can be parents for simplicity

  const save = useMutation({
    mutationFn: (payload: any) => editTarget
      ? api.patch(`/categories/${editTarget.id}`, payload)
      : api.post('/categories', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      enqueueSnackbar(editTarget ? 'Catégorie modifiée' : 'Catégorie créée', { variant: 'success' });
      closeDialog();
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      enqueueSnackbar('Catégorie supprimée', { variant: 'success' });
      setDeleteTarget(null);
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const openCreate = () => { setEditTarget(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
  const openEdit = (cat: Cat) => {
    setEditTarget(cat);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '', imageUrl: cat.imageUrl || '', parentId: cat.parentId || '', sortOrder: cat.sortOrder, isActive: cat.isActive });
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setEditTarget(null); setForm({ ...EMPTY_FORM }); };

  const handleSave = () => {
    const payload: any = { ...form, sortOrder: Number(form.sortOrder) };
    if (!payload.parentId) delete payload.parentId;
    if (!payload.icon) delete payload.icon;
    if (!payload.imageUrl) delete payload.imageUrl;
    save.mutate(payload);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.5px">Catégories</Typography>
          <Typography color="text.secondary" fontSize={14} mt={0.3}>
            {roots.length} catégories principales · {raw.filter(c => c.parentId).length} sous-catégories
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}
          sx={{ borderRadius: 2.5, fontWeight: 700, boxShadow: '0 4px 14px rgba(255,153,0,0.35)' }}>
          Nouvelle catégorie
        </Button>
      </Box>

      <Card>
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: '#F8F9FA', borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Category sx={{ fontSize: 18, color: 'text.disabled' }} />
          <Typography fontWeight={700} fontSize={13} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Arborescence des catégories
          </Typography>
        </Box>

        {isLoading
          ? <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Chargement…</Typography></Box>
          : roots.length === 0
            ? <Box sx={{ p: 6, textAlign: 'center' }}>
                <Category sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">Aucune catégorie. Créez-en une !</Typography>
              </Box>
            : roots.map(cat => (
                <CategoryRow key={cat.id} cat={cat} depth={0} roots={roots} onEdit={openEdit} onDelete={setDeleteTarget} />
              ))
        }
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>{editTarget ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '20px !important' }}>
          <TextField fullWidth label="Nom *" value={form.name} required autoFocus
            onChange={e => { const n = e.target.value; setForm(f => ({ ...f, name: n, slug: editTarget ? f.slug : slugify(n) })); }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
          <TextField fullWidth label="Slug *" value={form.slug} required
            onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
            helperText="Utilisé dans l'URL. Généré automatiquement."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField label="Emoji / icône" value={form.icon} placeholder="🛍️"
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
            <TextField label="Ordre d'affichage" type="number" value={form.sortOrder}
              onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
          </Box>
          <FormControl fullWidth>
            <InputLabel>Catégorie parente (optionnel)</InputLabel>
            <Select value={form.parentId} label="Catégorie parente (optionnel)"
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
              sx={{ borderRadius: 2.5 }}>
              <MenuItem value=""><em>— Aucune (catégorie principale) —</em></MenuItem>
              {flatParents.filter(c => c.id !== editTarget?.id).map(c => (
                <MenuItem key={c.id} value={c.id}>{c.icon} {c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField fullWidth label="URL de l'image (optionnel)" value={form.imageUrl}
            onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://…"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
          <FormControlLabel control={<Switch checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />}
            label={<Typography fontSize={14}>Catégorie active (visible sur le site)</Typography>} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={closeDialog} variant="outlined" sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" disabled={!form.name || !form.slug || save.isPending}
            sx={{ borderRadius: 2, fontWeight: 700, minWidth: 120 }}>
            {save.isPending ? 'Enregistrement…' : editTarget ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700} color="error.main">Supprimer la catégorie ?</DialogTitle>
        <DialogContent>
          <Typography>Voulez-vous vraiment supprimer <strong>{deleteTarget?.name}</strong> ?
            {(deleteTarget?.children?.length ?? 0) > 0 && (
              <> Cette catégorie a <strong>{deleteTarget?.children?.length} sous-catégorie(s)</strong> qui seront aussi supprimées.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined" sx={{ borderRadius: 2 }}>Annuler</Button>
          <Button color="error" variant="contained" disabled={remove.isPending}
            onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}
            sx={{ borderRadius: 2, fontWeight: 700 }}>
            {remove.isPending ? 'Suppression…' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
