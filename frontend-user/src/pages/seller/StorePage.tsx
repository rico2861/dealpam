import { useState, useEffect } from 'react';
import {
  Container, Typography, Card, CardContent, TextField, Button, Grid, Box,
  Alert, CircularProgress, Divider, Chip, IconButton, Switch, FormControlLabel,
  alpha, Tabs, Tab, Select, MenuItem, InputLabel, FormControl, Tooltip,
} from '@mui/material';
import {
  Save, Store, Add, Delete, LocationOn, Payments, LocalShipping,
  ContentCopy, CheckCircle, Info, Edit, Phone,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';

const ORANGE = '#FF9900';
const DEPARTMENTS = ['Ouest', 'Nord', 'Nord-Est', 'Nord-Ouest', 'Artibonite', 'Centre', 'Sud', 'Sud-Est', "Grand'Anse", 'Nippes'];

const PAYMENT_METHODS = [
  { key: 'MONCASH', label: 'MonCash', color: '#FF3C00', desc: 'Paiement mobile Haiti' },
  { key: 'NATCASH', label: 'NatCash', color: '#003087', desc: 'Paiement mobile Haiti' },
  { key: 'CASH', label: 'Especes', color: '#007600', desc: 'Paiement a la livraison' },
  { key: 'BANK_TRANSFER', label: 'Virement bancaire', color: '#1E40AF', desc: 'Transfert bancaire' },
  { key: 'VISA', label: 'Visa / Mastercard', color: '#1A1F71', desc: 'Carte internationale' },
];

interface DeliveryZone {
  id: string;
  name: string;
  departments: string[];
  price: number;
  minDays: number;
  maxDays: number;
}

interface PickupPoint {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
}

function TabPanel({ children, value, index }: any) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ── Delivery Zones Tab ──────────────────────────────────────────────────────

function DeliveryZonesTab({ storeId, initialZones }: { storeId: string; initialZones: DeliveryZone[] }) {
  const { enqueueSnackbar } = useSnackbar();
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones);

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/stores/me/${storeId}/delivery-zones`, { deliveryZones: zones }),
    onSuccess: () => enqueueSnackbar('Zones de livraison sauvegardees !', { variant: 'success' }),
    onError: () => enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }),
  });

  const addZone = () => setZones(z => [...z, {
    id: crypto.randomUUID(),
    name: '',
    departments: [],
    price: 0,
    minDays: 1,
    maxDays: 3,
  }]);

  const removeZone = (id: string) => setZones(z => z.filter(z => z.id !== id));

  const updateZone = (id: string, key: string, val: any) =>
    setZones(z => z.map(zone => zone.id === id ? { ...zone, [key]: val } : zone));

  const toggleDept = (zoneId: string, dept: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;
    const depts = zone.departments.includes(dept)
      ? zone.departments.filter(d => d !== dept)
      : [...zone.departments, dept];
    updateZone(zoneId, 'departments', depts);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography fontWeight={700} fontSize={15} color="#0F1111">Zones de livraison</Typography>
          <Typography fontSize={12.5} color="#666">Definissez vos tarifs par zone geographique</Typography>
        </Box>
        <Button startIcon={<Add />} onClick={addZone} variant="outlined" size="small"
          sx={{ borderColor: ORANGE, color: ORANGE, borderRadius: 1.5, '&:hover': { borderColor: ORANGE, bgcolor: alpha(ORANGE, 0.05) } }}>
          Ajouter une zone
        </Button>
      </Box>

      {zones.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 5, bgcolor: '#F8F8F8', borderRadius: 2, border: '2px dashed #DDD' }}>
          <LocalShipping sx={{ fontSize: 40, color: '#CCC', mb: 1 }} />
          <Typography color="#64748B" fontSize={14}>Aucune zone de livraison configuree</Typography>
          <Button startIcon={<Add />} onClick={addZone} sx={{ mt: 1.5, color: ORANGE }} size="small">
            Ajouter votre premiere zone
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {zones.map((zone, i) => (
          <Card key={zone.id} variant="outlined" sx={{ borderRadius: 2, borderColor: '#E0E0E0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography fontWeight={700} fontSize={13} color="#333">Zone {i + 1}</Typography>
                <IconButton size="small" onClick={() => removeZone(zone.id)} sx={{ color: '#EF4444' }}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Nom de la zone" placeholder="ex: Port-au-Prince"
                    value={zone.name} onChange={e => updateZone(zone.id, 'name', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Prix de livraison (HTG)" type="number"
                    value={zone.price} onChange={e => updateZone(zone.id, 'price', Number(e.target.value))}
                    InputProps={{ inputProps: { min: 0 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Délai min (jours)" type="number"
                    value={zone.minDays} onChange={e => updateZone(zone.id, 'minDays', Number(e.target.value))}
                    InputProps={{ inputProps: { min: 1 } }} />
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth size="small" label="Délai max (jours)" type="number"
                    value={zone.maxDays} onChange={e => updateZone(zone.id, 'maxDays', Number(e.target.value))}
                    InputProps={{ inputProps: { min: 1 } }} />
                </Grid>
                <Grid item xs={12}>
                  <Typography fontSize={12} fontWeight={600} color="#555" mb={1}>
                    Departements couverts ({zone.departments.length}/10)
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                    {DEPARTMENTS.map(dept => {
                      const active = zone.departments.includes(dept);
                      return (
                        <Chip key={dept} label={dept} size="small" clickable
                          onClick={() => toggleDept(zone.id, dept)}
                          sx={{
                            fontSize: 11.5,
                            bgcolor: active ? alpha(ORANGE, 0.12) : '#F5F5F5',
                            color: active ? ORANGE : '#555',
                            border: `1px solid ${active ? ORANGE : 'transparent'}`,
                            fontWeight: active ? 700 : 400,
                            '&:hover': { bgcolor: alpha(ORANGE, 0.1) },
                          }} />
                      );
                    })}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Box>

      {zones.length > 0 && (
        <Button fullWidth variant="contained" disableElevation startIcon={<Save />}
          onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          sx={{ mt: 2, py: 1.3, bgcolor: ORANGE, color: '#111', fontWeight: 700,
            borderRadius: 1.5, '&:hover': { bgcolor: '#FFB703' } }}>
          {saveMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'Sauvegarder les zones'}
        </Button>
      )}
    </Box>
  );
}

// ── Pickup Points Tab ────────────────────────────────────────────────────────

function PickupPointsTab({ storeId, initialPoints }: { storeId: string; initialPoints: PickupPoint[] }) {
  const { enqueueSnackbar } = useSnackbar();
  const [points, setPoints] = useState<PickupPoint[]>(initialPoints);

  const saveMutation = useMutation({
    mutationFn: () => api.patch(`/stores/me/${storeId}/pickup-points`, { pickupPoints: points }),
    onSuccess: () => enqueueSnackbar('Points de retrait sauvegardes !', { variant: 'success' }),
    onError: () => enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }),
  });

  const addPoint = () => setPoints(p => [...p, { id: crypto.randomUUID(), name: '', address: '', phone: '', hours: '' }]);
  const removePoint = (id: string) => setPoints(p => p.filter(x => x.id !== id));
  const updatePoint = (id: string, key: string, val: string) =>
    setPoints(p => p.map(x => x.id === id ? { ...x, [key]: val } : x));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography fontWeight={700} fontSize={15} color="#0F1111">Points de retrait</Typography>
          <Typography fontSize={12.5} color="#666">Permettez aux clients de venir retirer leurs commandes</Typography>
        </Box>
        <Button startIcon={<Add />} onClick={addPoint} variant="outlined" size="small"
          sx={{ borderColor: ORANGE, color: ORANGE, borderRadius: 1.5, '&:hover': { bgcolor: alpha(ORANGE, 0.05) } }}>
          Ajouter un point
        </Button>
      </Box>

      {points.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 5, bgcolor: '#F8F8F8', borderRadius: 2, border: '2px dashed #DDD' }}>
          <LocationOn sx={{ fontSize: 40, color: '#CCC', mb: 1 }} />
          <Typography color="#64748B" fontSize={14}>Aucun point de retrait configure</Typography>
          <Button startIcon={<Add />} onClick={addPoint} sx={{ mt: 1.5, color: ORANGE }} size="small">
            Ajouter un point de retrait
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {points.map((pt, i) => (
          <Card key={pt.id} variant="outlined" sx={{ borderRadius: 2, borderColor: '#E0E0E0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: alpha(ORANGE, 0.15),
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography fontSize={13} fontWeight={800} color={ORANGE}>{i + 1}</Typography>
                  </Box>
                  <Typography fontWeight={700} fontSize={13} color="#333">
                    {pt.name || 'Point de retrait ' + (i + 1)}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => removePoint(pt.id)} sx={{ color: '#EF4444' }}>
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Nom du point" placeholder="ex: Boutique principale"
                    value={pt.name} onChange={e => updatePoint(pt.id, 'name', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Telephone" placeholder="+509..."
                    value={pt.phone} onChange={e => updatePoint(pt.id, 'phone', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Adresse complete" placeholder="Rue, quartier, ville..."
                    value={pt.address} onChange={e => updatePoint(pt.id, 'address', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Horaires d'ouverture" placeholder="ex: Lun-Sam 8h-18h"
                    value={pt.hours} onChange={e => updatePoint(pt.id, 'hours', e.target.value)} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Box>

      {points.length > 0 && (
        <Button fullWidth variant="contained" disableElevation startIcon={<Save />}
          onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          sx={{ mt: 2, py: 1.3, bgcolor: ORANGE, color: '#111', fontWeight: 700,
            borderRadius: 1.5, '&:hover': { bgcolor: '#FFB703' } }}>
          {saveMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'Sauvegarder les points'}
        </Button>
      )}
    </Box>
  );
}

// ── Payment Methods Tab ─────────────────────────────────────────────────────

function PaymentMethodsTab({ storeId, store }: { storeId: string; store: any }) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();

  const parseArr = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  };

  const [accepted, setAccepted] = useState<string[]>(parseArr(store?.acceptedPaymentMethods) || ['MONCASH', 'CASH']);
  const [moncashPhone, setMoncashPhone] = useState(store?.moncashPhone || '');
  const [natcashPhone, setNatcashPhone] = useState(store?.natcashPhone || '');
  const [copied, setCopied] = useState(false);
  const [currency, setCurrency] = useState<string>(store?.currency || 'HTG');
  const [exchangeRate, setExchangeRate] = useState<string>(store?.exchangeRate != null ? String(store.exchangeRate) : '');

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/stores/me', {
      acceptedPaymentMethods: JSON.stringify(accepted),
      moncashPhone,
      natcashPhone,
      currency,
      exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
    }),
    onSuccess: () => {
      enqueueSnackbar('Configuration paiement sauvegardee !', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['sellerMe'] });
    },
    onError: () => enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }),
  });

  const toggle = (key: string) =>
    setAccepted(a => a.includes(key) ? a.filter(x => x !== key) : [...a, key]);

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box>
      <Typography fontWeight={700} fontSize={15} color="#0F1111" mb={0.5}>
        Methodes de paiement acceptees
      </Typography>
      <Typography fontSize={12.5} color="#666" mb={2.5}>
        Selectionnez les methodes que vous acceptez. Elles seront affichees aux clients lors du checkout.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {PAYMENT_METHODS.map(pm => {
          const isActive = accepted.includes(pm.key);
          return (
            <Box key={pm.key} onClick={() => toggle(pm.key)}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 2, cursor: 'pointer',
                border: `2px solid ${isActive ? pm.color : '#E0E0E0'}`,
                bgcolor: isActive ? alpha(pm.color, 0.04) : 'white',
                transition: 'all 0.2s',
                '&:hover': { borderColor: pm.color, bgcolor: alpha(pm.color, 0.04) } }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: alpha(pm.color, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Payments sx={{ fontSize: 20, color: pm.color }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontSize={14} fontWeight={700} color="#0F1111">{pm.label}</Typography>
                <Typography fontSize={12} color="#666">{pm.desc}</Typography>
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                {isActive
                  ? <CheckCircle sx={{ color: pm.color, fontSize: 22 }} />
                  : <Box sx={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #CCC' }} />
                }
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Mobile payment phone numbers */}
      {(accepted.includes('MONCASH') || accepted.includes('NATCASH')) && (
        <>
          <Divider sx={{ my: 2.5 }} />
          <Typography fontWeight={700} fontSize={14} mb={0.5}>Numéros de paiement mobile</Typography>
          <Typography fontSize={12} color="#666" mb={2}>
            Ces numeros sont affichees aux clients pour effectuer le paiement.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {accepted.includes('MONCASH') && (
              <TextField fullWidth label="Numéro MonCash" placeholder="+509 XXXX-XXXX"
                value={moncashPhone} onChange={e => setMoncashPhone(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <Phone sx={{ fontSize: 16, color: '#FF3C00', mr: 1 }} />,
                  endAdornment: moncashPhone ? (
                    <Tooltip title={copied ? 'Copié !' : 'Copier'}>
                      <IconButton size="small" onClick={() => copyPhone(moncashPhone)}>
                        {copied ? <CheckCircle sx={{ fontSize: 15, color: '#007600' }} /> : <ContentCopy sx={{ fontSize: 15, color: '#64748B' }} />}
                      </IconButton>
                    </Tooltip>
                  ) : null,
                }}
              />
            )}
            {accepted.includes('NATCASH') && (
              <TextField fullWidth label="Numéro NatCash" placeholder="+509 XXXX-XXXX"
                value={natcashPhone} onChange={e => setNatcashPhone(e.target.value)}
                size="small"
                InputProps={{ startAdornment: <Phone sx={{ fontSize: 16, color: '#003087', mr: 1 }} /> }}
              />
            )}
          </Box>
        </>
      )}

      <Divider sx={{ my: 2.5 }} />
      <Typography fontWeight={700} fontSize={14} mb={0.5}>Devise de la boutique</Typography>
      <Typography fontSize={12} color="#666" mb={2}>
        Choisissez la devise par défaut de vos prix et votre propre taux de change. Les clients pourront basculer l'affichage entre HTG et USD sur la page produit.
      </Typography>
      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Devise par défaut</InputLabel>
            <Select label="Devise par défaut" value={currency} onChange={e => setCurrency(e.target.value)}>
              <MenuItem value="HTG">Gourdes (HTG)</MenuItem>
              <MenuItem value="USD">Dollars US (USD)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth size="small" type="number" label="Taux de change (HTG pour 1 USD)"
            placeholder="ex: 132.5" value={exchangeRate}
            onChange={e => setExchangeRate(e.target.value)}
            inputProps={{ min: 0, step: 0.01 }}
          />
        </Grid>
      </Grid>
      {!exchangeRate && (
        <Alert severity="info" sx={{ mt: 1.5, fontSize: 12 }}>
          Sans taux de change, les clients ne verront le prix que dans la devise par défaut — le basculement HTG/USD sera indisponible.
        </Alert>
      )}

      <Button fullWidth variant="contained" disableElevation startIcon={<Save />}
        onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || accepted.length === 0}
        sx={{ mt: 3, py: 1.3, bgcolor: ORANGE, color: '#111', fontWeight: 700,
          borderRadius: 1.5, '&:hover': { bgcolor: '#FFB703' } }}>
        {saveMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'Sauvegarder la configuration'}
      </Button>
      {accepted.length === 0 && (
        <Alert severity="warning" sx={{ mt: 1, fontSize: 12 }}>
          Selectionnez au moins une methode de paiement
        </Alert>
      )}
    </Box>
  );
}

// ── Main Store Page ─────────────────────────────────────────────────────────

export default function SellerStorePage() {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    name: '', description: '', city: '', address: '', phone: '', email: '', department: '',
  });

  const { data: sellerData, isLoading } = useQuery({
    queryKey: ['sellerMe'],
    queryFn: () => api.get('/sellers/me').then(r => r.data),
  });

  const store = sellerData?.store;
  const storeId = store?.id;

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '',
        description: store.description || '',
        city: store.city || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        department: store.department || '',
      });
    }
  }, [store]);

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/stores/me', form),
    onSuccess: () => {
      enqueueSnackbar('Boutique mise a jour !', { variant: 'success' });
      qc.invalidateQueries({ queryKey: ['sellerMe'] });
    },
    onError: () => enqueueSnackbar('Erreur lors de la sauvegarde', { variant: 'error' }),
  });

  const f = (k: string) => (e: any) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const parseArr = (val: any): any[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { return JSON.parse(val); } catch { return []; }
  };

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress sx={{ color: ORANGE }} />
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: alpha(ORANGE, 0.12),
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Store sx={{ color: ORANGE, fontSize: 24 }} />
        </Box>
        <Box>
          <Typography fontWeight={900} fontSize={22} color="#0F1111">
            {store?.name || 'Ma boutique'}
          </Typography>
          <Typography fontSize={13} color="#666">
            Gerez les informations, zones de livraison et paiements de votre boutique
          </Typography>
        </Box>
      </Box>

      {/* Status alerts */}
      {sellerData?.status === 'PENDING' && (
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
          Votre boutique est en cours de validation. Vous serez notifie par email.
        </Alert>
      )}
      {sellerData?.status === 'REJECTED' && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 1.5 }}>
          Boutique rejetee : {sellerData.rejectionReason}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid #E0E0E0', mb: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: 13.5, textTransform: 'none', minHeight: 44 },
            '& .Mui-selected': { color: ORANGE },
            '& .MuiTabs-indicator': { bgcolor: ORANGE } }}>
          <Tab label="Infos boutique" icon={<Store sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Zones de livraison" icon={<LocalShipping sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Points de retrait" icon={<LocationOn sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Paiements" icon={<Payments sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* ── Tab 0: Store Info ── */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography fontWeight={700} fontSize={15} mb={2.5}>Informations principales</Typography>
                <TextField fullWidth label="Nom de la boutique" value={form.name} onChange={f('name')}
                  size="small" sx={{ mb: 2 }} />
                <TextField fullWidth label="Description" value={form.description} onChange={f('description')}
                  size="small" multiline rows={4} sx={{ mb: 2 }}
                  helperText="Decrivez votre boutique, vos produits, votre histoire..." />
                <Divider sx={{ my: 2.5 }} />
                <Typography fontWeight={700} fontSize={13.5} mb={2} color="#555">Coordonnees publiques</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Departement</InputLabel>
                      <Select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} label="Departement">
                        {DEPARTMENTS.map(d => <MenuItem key={d} value={d} sx={{ fontSize: 13.5 }}>{d}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Ville" value={form.city} onChange={f('city')} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Telephone" value={form.phone} onChange={f('phone')}
                      placeholder="+509 XXXX-XXXX" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Email boutique" type="email" value={form.email} onChange={f('email')} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="Adresse complete" value={form.address} onChange={f('address')}
                      placeholder="Rue, quartier, ville..." />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Store link */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography fontWeight={700} fontSize={13} mb={1.5} color="#0F1111">
                    Lien de votre boutique
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#F8F8F8',
                    p: 1.2, borderRadius: 1.5, border: '1px solid #E0E0E0' }}>
                    <Typography fontSize={12} color="#333" sx={{ flex: 1, wordBreak: 'break-all' }}>
                      dealpam.com/store/{store?.slug}
                    </Typography>
                    <Tooltip title="Copier le lien">
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(`https://dealpam.com/store/${store?.slug}`)}>
                        <ContentCopy sx={{ fontSize: 15, color: '#64748B' }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Button fullWidth variant="contained" disableElevation startIcon={<Save />}
                    onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
                    sx={{ mt: 2.5, py: 1.2, bgcolor: ORANGE, color: '#111', fontWeight: 700,
                      borderRadius: 1.5, '&:hover': { bgcolor: '#FFB703' } }}>
                    {saveMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'Sauvegarder'}
                  </Button>
                </CardContent>
              </Card>

              {/* Reputation score */}
              {store?.reputationScore !== undefined && (
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography fontWeight={700} fontSize={13} mb={1}>Score de reputation</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ flex: 1, height: 8, bgcolor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%', borderRadius: 4, transition: 'width 0.5s',
                          width: store.reputationScore + '%',
                          bgcolor: store.reputationScore >= 70 ? '#007600' : store.reputationScore >= 40 ? '#D97706' : '#EF4444',
                        }} />
                      </Box>
                      <Typography fontWeight={800} fontSize={16}
                        color={store.reputationScore >= 70 ? '#007600' : store.reputationScore >= 40 ? '#D97706' : '#EF4444'}>
                        {store.reputationScore}/100
                      </Typography>
                    </Box>
                    <Typography fontSize={11.5} color="#666" mt={0.8}>
                      {store.reputationScore >= 70 ? 'Excellent ! Continuez ainsi.' :
                        store.reputationScore >= 40 ? 'Bon score. Ameliorez vos delais.' :
                          'Score faible. Vos produits sont moins visibles.'}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ── Tab 1: Delivery Zones ── */}
      <TabPanel value={tab} index={1}>
        {storeId && (
          <DeliveryZonesTab storeId={storeId} initialZones={parseArr(store?.deliveryZones)} />
        )}
      </TabPanel>

      {/* ── Tab 2: Pickup Points ── */}
      <TabPanel value={tab} index={2}>
        {storeId && (
          <PickupPointsTab storeId={storeId} initialPoints={parseArr(store?.pickupPoints)} />
        )}
      </TabPanel>

      {/* ── Tab 3: Payment Methods ── */}
      <TabPanel value={tab} index={3}>
        {storeId && <PaymentMethodsTab storeId={storeId} store={store} />}
      </TabPanel>

    </Container>
  );
}
