import { useState } from 'react';
import {
  Box, Container, Typography, Card, Button, Tabs, Tab, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, IconButton, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, alpha, Tooltip,
  FormControlLabel, Checkbox, MenuItem, Select, InputLabel, FormControl,
} from '@mui/material';
import {
  Add, Edit, Delete, Storefront, LocalShipping, Payment, Inventory,
  CheckCircle, Settings, ArrowBack, Save, DirectionsWalk, Smartphone,
  AttachMoney, AccountBalance, CreditCard, Publish, Archive,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const OR   = '#FF6B00';
const METHODS = [
  { value: 'MONCASH',       label: 'MonCash',          Icon: Smartphone     },
  { value: 'NATCASH',       label: 'NatCash',          Icon: Smartphone     },
  { value: 'CASH',          label: 'Cash livraison',   Icon: AttachMoney    },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire',Icon: AccountBalance },
  { value: 'OTHER',         label: 'Autre',            Icon: CreditCard     },
];

const STATUS_CHIP: Record<string, any> = {
  PUBLISHED: { label: 'Publié',  color: 'success' },
  DRAFT:     { label: 'Brouillon', color: 'default' },
  ARCHIVED:  { label: 'Archivé', color: 'error' },
};

// ── Zone editor (inline) ──────────────────────────────────────────────────────
// Canonical shape (matches seller-side DeliveryZonesTab in frontend-user/StorePage.tsx):
// { id, name, departments: string[], price, minDays, maxDays }
const HAITI_DEPTS = ['Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Sud', 'Sud-Est', "Grand'Anse", 'Nippes'];

function ZoneEditor({ zones, onChange }: { zones: any[]; onChange: (z: any[]) => void }) {
  const add = () => onChange([...zones, { id: crypto.randomUUID(), name: '', departments: [], price: 0, minDays: 1, maxDays: 3 }]);
  const remove = (i: number) => onChange(zones.filter((_, j) => j !== i));
  const set = (i: number, k: string, v: any) => {
    const next = [...zones]; next[i] = { ...next[i], [k]: v }; onChange(next);
  };
  const toggleDept = (i: number, dept: string) => {
    const depts: string[] = zones[i].departments ?? [];
    set(i, 'departments', depts.includes(dept) ? depts.filter(d => d !== dept) : [...depts, dept]);
  };
  return (
    <Box>
      {zones.map((z, i) => (
        <Box key={z.id ?? i} sx={{ mb: 2, p: 1.5, border: '1px solid #E5E7EB', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
            <IconButton size="small" color="error" onClick={() => remove(i)}><Delete sx={{ fontSize: 16 }} /></IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <TextField size="small" label="Nom de la zone" placeholder="ex: Port-au-Prince" value={z.name} onChange={e => set(i, 'name', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Prix HTG" type="number" value={z.price} onChange={e => set(i, 'price', Number(e.target.value))} sx={{ flex: '1 1 120px' }} />
            <TextField size="small" label="Délai min (j)" type="number" value={z.minDays} onChange={e => set(i, 'minDays', Number(e.target.value))} sx={{ flex: '1 1 100px' }} />
            <TextField size="small" label="Délai max (j)" type="number" value={z.maxDays} onChange={e => set(i, 'maxDays', Number(e.target.value))} sx={{ flex: '1 1 100px' }} />
          </Box>
          <Typography fontSize={12} fontWeight={600} color="#555" mb={1}>
            Départements couverts ({(z.departments ?? []).length}/10)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
            {HAITI_DEPTS.map(dept => {
              const active = (z.departments ?? []).includes(dept);
              return (
                <Chip key={dept} label={dept} size="small" clickable onClick={() => toggleDept(i, dept)}
                  sx={{ fontSize: 11.5, bgcolor: active ? alpha(OR, 0.12) : '#F5F5F5', color: active ? OR : '#555',
                    border: `1px solid ${active ? OR : 'transparent'}`, fontWeight: active ? 700 : 400 }} />
              );
            })}
          </Box>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={add}>Ajouter zone</Button>
    </Box>
  );
}

// ── Pickup point editor ────────────────────────────────────────────────────────
function PickupEditor({ points, onChange }: { points: any[]; onChange: (p: any[]) => void }) {
  const add    = () => onChange([...points, { name: '', address: '', city: '', dept: '', phone: '', hours: '' }]);
  const remove = (i: number) => onChange(points.filter((_, j) => j !== i));
  const set    = (i: number, k: string, v: string) => { const n = [...points]; n[i] = { ...n[i], [k]: v }; onChange(n); };
  return (
    <Box>
      {points.map((pt, i) => (
        <Box key={i} sx={{ mb: 2, p: 1.5, border: '1px solid #E5E7EB', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
            <IconButton size="small" color="error" onClick={() => remove(i)}><Delete sx={{ fontSize: 15 }} /></IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" label="Nom du point" value={pt.name} onChange={e => set(i, 'name', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Adresse" value={pt.address} onChange={e => set(i, 'address', e.target.value)} sx={{ flex: '1 1 200px' }} />
            <TextField size="small" label="Ville" value={pt.city} onChange={e => set(i, 'city', e.target.value)} sx={{ flex: '1 1 120px' }} />
            <TextField size="small" label="Département" value={pt.dept} onChange={e => set(i, 'dept', e.target.value)} sx={{ flex: '1 1 120px' }} />
            <TextField size="small" label="Téléphone" value={pt.phone} onChange={e => set(i, 'phone', e.target.value)} sx={{ flex: '1 1 140px' }} />
            <TextField size="small" label="Horaires" value={pt.hours} onChange={e => set(i, 'hours', e.target.value)} sx={{ flex: '1 1 200px' }} />
          </Box>
        </Box>
      ))}
      <Button size="small" startIcon={<Add />} onClick={add}>Ajouter point de retrait</Button>
    </Box>
  );
}

// ── Product dialog ─────────────────────────────────────────────────────────────
function ProductDialog({ open, onClose, product, storeId }: { open: boolean; onClose: () => void; product?: any; storeId?: string }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const editing = !!product;

  const [form, setForm] = useState({
    name:        product?.name        ?? '',
    description: product?.description ?? '',
    price:       product?.price       ?? '',
    salePrice:   product?.salePrice   ?? '',
    stock:       product?.stock       ?? 999,
    images:      product?.images?.map((i: any) => i.url).join('\n') ?? '',
  });

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name:        form.name,
        description: form.description,
        price:       Number(form.price),
        salePrice:   form.salePrice ? Number(form.salePrice) : undefined,
        stock:       Number(form.stock),
        images:      form.images.split('\n').map(u => u.trim()).filter(Boolean),
      };
      return editing
        ? api.patch(`/admin/platform-store/products/${product.id}`, body)
        : api.post('/admin/platform-store/products', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platformProducts'] });
      enqueueSnackbar(editing ? 'Produit modifié' : 'Produit ajouté', { variant: 'success' });
      onClose();
    },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Nom du produit *" value={form.name} onChange={set('name')} fullWidth />
        <TextField label="Description" value={form.description} onChange={set('description')} fullWidth multiline rows={3} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField label="Prix HTG *" type="number" value={form.price} onChange={set('price')} fullWidth />
          <TextField label="Prix soldé HTG" type="number" value={form.salePrice} onChange={set('salePrice')} fullWidth />
        </Box>
        <TextField label="Stock" type="number" value={form.stock} onChange={set('stock')} fullWidth />
        <TextField
          label="URLs des images (une par ligne)"
          value={form.images} onChange={set('images')}
          fullWidth multiline rows={4}
          helperText="Collez les URLs des images, une par ligne"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={() => mutation.mutate()} variant="contained" disabled={!form.name || !form.price || mutation.isPending}
          sx={{ bgcolor: OR, '&:hover': { bgcolor: '#e05a00' } }}>
          {mutation.isPending ? 'Enregistrement...' : editing ? 'Sauvegarder' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function BoutiquePage() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab]           = useState(0);
  const [productDialog, setProductDialog] = useState<{ open: boolean; product?: any }>({ open: false });
  const [saving, setSaving]     = useState(false);

  const { data: store, isLoading } = useQuery({
    queryKey: ['platformStore'],
    queryFn:  () => api.get('/admin/platform-store').then(r => r.data),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['platformProducts'],
    queryFn:  () => api.get('/admin/platform-store/products').then(r => r.data),
    enabled:  !!store,
  });

  // Store settings form
  const [settings, setSettings] = useState<any>(null);
  // Initialize settings when store loads
  if (store && !settings) {
    setSettings({
      phone:       store.phone       ?? '',
      email:       store.email       ?? '',
      address:     store.address     ?? '',
      city:        store.city        ?? '',
      department:  store.department  ?? '',
      moncashPhone: store.moncashPhone ?? '',
      description: store.description ?? '',
      paymentMethods: store.paymentMethods ?? [],
      deliveryZones:  store.deliveryZones  ?? [],
      pickupPoints:   store.pickupPoints   ?? [],
    });
  }

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch('/admin/platform-store', {
        ...settings,
        acceptedPaymentMethods: settings.paymentMethods,
      });
      qc.invalidateQueries({ queryKey: ['platformStore'] });
      enqueueSnackbar('Paramètres sauvegardés', { variant: 'success' });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/platform-store/products/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['platformProducts'] }); enqueueSnackbar('Statut mis à jour', { variant: 'success' }); },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/platform-store/products/${id}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['platformProducts'] }); enqueueSnackbar('Produit supprimé', { variant: 'warning' }); },
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><Typography>Chargement...</Typography></Box>;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: '14px', bgcolor: alpha(OR, 0.12), border: `1.5px solid ${alpha(OR, 0.25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Storefront sx={{ color: OR, fontSize: 24 }} />
        </Box>
        <Box flex={1}>
          <Typography fontWeight={900} fontSize={22} color="#111827">Boutique DealPam Officielle</Typography>
          <Typography fontSize={13} color="#6B7280">Gérez vos produits, modes de paiement et livraison</Typography>
        </Box>
        <Chip label="Boutique Officielle" color="primary" icon={<CheckCircle />}
          sx={{ bgcolor: alpha(OR, 0.1), color: OR, border: `1px solid ${alpha(OR, 0.25)}`, fontWeight: 700 }} />
      </Box>

      <Card sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E5E7EB', px: 2 }}>
          <Tab label="Produits" icon={<Inventory sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Paramètres" icon={<Settings sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {/* ── PRODUCTS TAB ── */}
        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography fontWeight={700} fontSize={16} color="#111827">
                {products.length} produit{products.length !== 1 ? 's' : ''}
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setProductDialog({ open: true })}
                sx={{ bgcolor: OR, '&:hover': { bgcolor: '#e05a00' }, borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>
                Ajouter un produit
              </Button>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: '#374151', fontSize: 12.5, bgcolor: '#F9FAFB' } }}>
                  <TableCell>Produit</TableCell>
                  <TableCell align="right">Prix HTG</TableCell>
                  <TableCell align="right">Soldé</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p: any) => {
                  const img = p.images?.[0]?.url;
                  return (
                    <TableRow key={p.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ width: 44, height: 44, borderRadius: '8px', overflow: 'hidden', bgcolor: '#F3F4F6', flexShrink: 0 }}>
                            {img && <Box component="img" src={img} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </Box>
                          <Typography fontSize={13} fontWeight={600} color="#111827" sx={{ maxWidth: 280, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                            {p.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontSize={13} fontWeight={700}>{Number(p.price).toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        {p.salePrice ? (
                          <Typography fontSize={13} fontWeight={700} color="#E05A00">{Number(p.salePrice).toLocaleString()}</Typography>
                        ) : <Typography fontSize={12} color="#9CA3AF">—</Typography>}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontSize={13}>{p.stock}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={STATUS_CHIP[p.status]?.label ?? p.status}
                          color={STATUS_CHIP[p.status]?.color ?? 'default'} sx={{ fontSize: 11, fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          {p.status !== 'PUBLISHED' ? (
                            <Tooltip title="Publier">
                              <IconButton size="small" color="success" onClick={() => setStatus.mutate({ id: p.id, status: 'PUBLISHED' })}>
                                <Publish sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Archiver">
                              <IconButton size="small" color="warning" onClick={() => setStatus.mutate({ id: p.id, status: 'ARCHIVED' })}>
                                <Archive sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Modifier">
                            <IconButton size="small" onClick={() => setProductDialog({ open: true, product: p })}>
                              <Edit sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" color="error" onClick={() => { if (confirm('Supprimer ce produit ?')) deleteProduct.mutate(p.id); }}>
                              <Delete sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary">Aucun produit. Ajoutez votre premier produit.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 1 && settings && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

              {/* Contact */}
              <Box>
                <Typography fontWeight={800} fontSize={15} mb={2} color="#111827">Coordonnées</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Description" value={settings.description} onChange={e => setSettings((s: any) => ({ ...s, description: e.target.value }))} fullWidth multiline rows={2} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="Téléphone" value={settings.phone} onChange={e => setSettings((s: any) => ({ ...s, phone: e.target.value }))} fullWidth />
                    <TextField label="Email" value={settings.email} onChange={e => setSettings((s: any) => ({ ...s, email: e.target.value }))} fullWidth />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="Adresse" value={settings.address} onChange={e => setSettings((s: any) => ({ ...s, address: e.target.value }))} fullWidth />
                    <TextField label="Ville" value={settings.city} onChange={e => setSettings((s: any) => ({ ...s, city: e.target.value }))} sx={{ flex: 0.6 }} />
                    <TextField label="Département" value={settings.department} onChange={e => setSettings((s: any) => ({ ...s, department: e.target.value }))} sx={{ flex: 0.6 }} />
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Payment methods */}
              <Box>
                <Typography fontWeight={800} fontSize={15} mb={2} color="#111827">Méthodes de paiement DealPam</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                  {METHODS.map(({ value, label, Icon }) => {
                    const active = settings.paymentMethods.includes(value);
                    return (
                      <Box key={value} onClick={() => setSettings((s: any) => ({
                        ...s,
                        paymentMethods: active ? s.paymentMethods.filter((m: string) => m !== value) : [...s.paymentMethods, value],
                      }))} sx={{
                        display: 'flex', alignItems: 'center', gap: 1, px: 1.8, py: 1, cursor: 'pointer',
                        borderRadius: '10px', border: `2px solid ${active ? OR : '#E5E7EB'}`,
                        bgcolor: active ? alpha(OR, 0.07) : 'white', transition: 'all 0.13s',
                      }}>
                        <Icon sx={{ fontSize: 16, color: active ? OR : '#94A3B8' }} />
                        <Typography fontSize={13} fontWeight={active ? 700 : 500} color={active ? OR : '#374151'}>{label}</Typography>
                        {active && <CheckCircle sx={{ fontSize: 14, color: OR }} />}
                      </Box>
                    );
                  })}
                </Box>
                <TextField
                  label="Numéro MonCash/NatCash DealPam"
                  value={settings.moncashPhone}
                  onChange={e => setSettings((s: any) => ({ ...s, moncashPhone: e.target.value }))}
                  helperText="Ce numéro sera affiché aux clients pour payer DealPam directement"
                  fullWidth
                />
              </Box>

              <Divider />

              {/* Delivery zones */}
              <Box>
                <Typography fontWeight={800} fontSize={15} mb={2} color="#111827">Zones de livraison</Typography>
                <ZoneEditor zones={settings.deliveryZones} onChange={z => setSettings((s: any) => ({ ...s, deliveryZones: z }))} />
              </Box>

              <Divider />

              {/* Pickup points */}
              <Box>
                <Typography fontWeight={800} fontSize={15} mb={2} color="#111827">Points de retrait</Typography>
                <PickupEditor points={settings.pickupPoints} onChange={p => setSettings((s: any) => ({ ...s, pickupPoints: p }))} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<Save />} onClick={saveSettings} disabled={saving}
                  sx={{ bgcolor: OR, '&:hover': { bgcolor: '#e05a00' }, borderRadius: '10px', fontWeight: 700, textTransform: 'none', px: 3 }}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Card>

      {/* Product dialog */}
      <ProductDialog
        open={productDialog.open}
        onClose={() => setProductDialog({ open: false })}
        product={productDialog.product}
        storeId={store?.id}
      />
    </Container>
  );
}
