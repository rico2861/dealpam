import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container, Grid, Box, Typography, Button, Chip, Divider,
  TextField, CircularProgress, Radio, alpha, IconButton,
  Dialog, DialogContent, MenuItem,
} from '@mui/material';
import {
  ShoppingCart, LocationOn, ArrowBack,
  Phone, WhatsApp, LocalShipping, ContentCopy,
  DirectionsWalk, Info, Smartphone, AccountBalance, AttachMoney,
  CreditCard, AccessTime, Lock, Shield, Add, Close,
  Warning, ChatBubbleOutline, Person,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useCartStore } from '../../store/cart.store';

// ─── Theme ───────────────────────────────────────────────────────────────────

const OR    = '#FF6B00';
const ORD   = '#E05A00';
const GRN   = '#10B981';
const BG    = '#F7F8FA';
const CARD  = '#F7F8FA';
const CARD2 = '#FFFFFF';
const BORD  = 'rgba(15,23,42,0.09)';
const TXT   = '#0F172A';
const TXT2  = '#64748B';

const fmtHTG = (v: number) => `${v.toLocaleString('fr-HT')} HTG`;

const PAYMENT_INFO: Record<string, { label: string; color: string; Icon: any; hint: string }> = {
  MONCASH:       { label: 'MonCash',         color: '#FF6B00', Icon: Smartphone,      hint: 'Paiement mobile Digicel' },
  NATCASH:       { label: 'NatCash',         color: '#0EA5E9', Icon: Smartphone,      hint: 'Paiement mobile Natcom' },
  CASH:          { label: 'Cash',            color: GRN,       Icon: AttachMoney,     hint: 'Paiement en espèces à la livraison' },
  BANK_TRANSFER: { label: 'Virement',        color: '#818CF8', Icon: AccountBalance,  hint: 'Virement bancaire' },
  OTHER:         { label: 'Autre méthode',   color: TXT2,      Icon: CreditCard,      hint: 'Autres méthodes acceptées' },
};

const HAITI_DEPTS = ['Ouest','Nord','Nord-Est','Nord-Ouest','Artibonite','Centre','Sud','Sud-Est',"Grand'Anse",'Nippes','Grand-Anse'];

// ─── Add Address Modal ────────────────────────────────────────────────────────

function AddAddressModal({ open, onClose, profile, onCreated }: any) {
  const { enqueueSnackbar } = useSnackbar();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', fullName: '', phone: '', line1: '', city: '', department: '' });

  useEffect(() => {
    if (open && profile) {
      setForm({
        label:      'Mon adresse',
        fullName:   `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim(),
        phone:      profile.phone ?? '',
        line1:      '',
        city:       profile.city ?? '',
        department: profile.department ?? '',
      });
    }
  }, [open, profile]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.fullName || !form.phone || !form.line1 || !form.city || !form.department) {
      enqueueSnackbar('Veuillez remplir tous les champs', { variant: 'warning' }); return;
    }
    setSaving(true);
    try {
      const res = await api.post('/users/me/addresses', { ...form, isDefault: true });
      onCreated(res.data);
      enqueueSnackbar('Adresse ajoutée !', { variant: 'success' });
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const inputSx = { mb: 2,
    '& .MuiOutlinedInput-root': { borderRadius: '10px' } };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { borderRadius: { xs: 0, sm: '16px' }, m: { xs: 0, sm: 2 },
        width: { xs: '100%', sm: 'auto' }, height: { xs: '100%', sm: 'auto' },
        maxHeight: { xs: '100%', sm: 'calc(100% - 64px)' } } }}>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Typography fontWeight={700} fontSize={17}>Nouvelle adresse de livraison</Typography>
          <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
        </Box>
        <Box sx={{ px: 3, py: 3 }}>
          <TextField fullWidth label="Libellé" value={form.label} onChange={e => set('label', e.target.value)} sx={inputSx} placeholder="Ex: Maison, Bureau..." />
          <TextField fullWidth label="Nom complet" value={form.fullName} onChange={e => set('fullName', e.target.value)} sx={inputSx} />
          <TextField fullWidth label="Téléphone" value={form.phone} onChange={e => set('phone', e.target.value)} sx={inputSx} />
          <TextField fullWidth label="Adresse (rue, numéro)" value={form.line1} onChange={e => set('line1', e.target.value)} sx={inputSx} />
          <Grid container spacing={2} sx={{ mb: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Ville" value={form.city} onChange={e => set('city', e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Département" value={form.department} onChange={e => set('department', e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}>
                <MenuItem value=""><em>— Département —</em></MenuItem>
                {HAITI_DEPTS.filter((d, i, a) => a.indexOf(d) === i).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
          <Button fullWidth variant="contained" onClick={handleSave} disabled={saving}
            sx={{ mt: 2.5, py: 1.4, borderRadius: '10px', fontWeight: 700, textTransform: 'none', bgcolor: OR, '&:hover': { bgcolor: ORD } }}>
            {saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Enregistrer l\'adresse'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step: Delivery ───────────────────────────────────────────────────────────

function DeliveryStep({
  addresses, pickupPoints, deliveryZones, deliveryType, setDeliveryType,
  selectedAddress, setSelectedAddress, selectedPickup, setSelectedPickup,
  selectedZone, setSelectedZone, setShippingCost, onNext, storeInfo,
  profile, onAddressAdded, onContactVendor,
}: any) {
  const [addOpen, setAddOpen] = useState(false);

  // Compute selected address dept for zone-mismatch check
  const selAddr = addresses.find((a: any) => a.id === selectedAddress);
  const selDept = selAddr?.department ?? '';
  const coversDept = (dept: string) => deliveryZones.some((z: any) => {
    const depts: string[] = Array.isArray(z.departments) ? z.departments : (Array.isArray(z) ? z : []);
    return depts.includes(dept);
  });
  const zonesMismatch = deliveryType === 'DELIVERY' && deliveryZones.length > 0 && selDept && !coversDept(selDept);

  // Auto-select zone matching user's dept when address changes
  useEffect(() => {
    if (!selDept || !deliveryZones.length) return;
    const idx = deliveryZones.findIndex((z: any) => {
      const depts: string[] = Array.isArray(z.departments) ? z.departments : [];
      return depts.includes(selDept);
    });
    if (idx >= 0) { setSelectedZone(idx); setShippingCost(deliveryZones[idx].price ?? 0); }
  }, [selectedAddress, deliveryZones.length]);

  return (
    <Box>
      <Typography fontWeight={800} fontSize={16} mb={2} color={TXT}>Choisir la livraison</Typography>

      {/* Type selector */}
      <Box sx={{ display: 'flex', gap: 1.2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { value: 'DELIVERY', label: 'Livraison à domicile', Icon: LocalShipping },
          ...(pickupPoints.length > 0 ? [{ value: 'PICKUP', label: 'Retrait en boutique', Icon: DirectionsWalk }] : []),
          { value: 'CONTACT', label: 'Contact direct vendeur', Icon: WhatsApp },
        ].map(({ value, label, Icon }) => {
          const active = deliveryType === value;
          return (
            <Box key={value} onClick={() => setDeliveryType(value)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.1, px: 2, py: 1.3, cursor: 'pointer',
                borderRadius: '14px', border: `1px solid ${active ? OR : BORD}`,
                bgcolor: active ? alpha(OR, 0.1) : CARD, transition: 'all 0.15s', flex: '1 1 auto', minWidth: 155,
                '&:hover': { borderColor: alpha(OR, 0.5) } }}>
              <Icon sx={{ fontSize: 19, color: active ? OR : TXT2 }} />
              <Typography fontWeight={active ? 700 : 500} color={active ? OR : '#475569'} fontSize={13}>{label}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* DELIVERY */}
      {deliveryType === 'DELIVERY' && (
        <Box>
          {/* Zones */}
          {deliveryZones.length > 0 && !zonesMismatch && (
            <Box sx={{ mb: 2.5 }}>
              <Typography fontSize={12.5} fontWeight={700} color={TXT2} mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Zone de livraison
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {deliveryZones.map((z: any, i: number) => {
                  const active = selectedZone === i;
                  const zName  = z.name || (z.departments?.join(', ') ?? `Zone ${i + 1}`);
                  return (
                    <Box key={i} onClick={() => { setSelectedZone(i); setShippingCost(z.price ?? 0); }}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.6, cursor: 'pointer',
                        borderRadius: '14px', border: `1px solid ${active ? OR : BORD}`,
                        bgcolor: active ? alpha(OR, 0.08) : CARD, transition: 'all 0.15s',
                        '&:hover': { borderColor: alpha(OR, 0.4) } }}>
                      <Radio checked={active} onChange={() => {}} size="small"
                        sx={{ p: 0, color: active ? OR : 'rgba(15,23,42,0.2)', '&.Mui-checked': { color: OR } }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={700} fontSize={13.5} color={active ? OR : TXT}>{zName}</Typography>
                        {z.name && !!z.departments?.length && (
                          <Typography fontSize={11.5} color={TXT2}>{z.departments.join(' · ')}</Typography>
                        )}
                        {(z.minDays || z.maxDays) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.2 }}>
                            <AccessTime sx={{ fontSize: 12, color: TXT2 }} />
                            <Typography fontSize={11.5} color={TXT2}>
                              {z.minDays}{z.maxDays && z.maxDays !== z.minDays ? `-${z.maxDays}` : ''} jour(s)
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      <Typography fontWeight={800} fontSize={14} color={z.price > 0 ? TXT : GRN}>
                        {z.price > 0 ? `+${fmtHTG(z.price)}` : 'Gratuit'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}

          {/* Address */}
          <Typography fontSize={12.5} fontWeight={700} color={TXT2} mb={1.2} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Adresse de livraison
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, mb: 1.5 }}>
            {/* Profile default when no saved addresses */}
            {addresses.length === 0 && profile?.city && (
              <Box onClick={() => {}}
                sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.8,
                  borderRadius: '14px', border: `1px solid ${alpha(OR, 0.35)}`, bgcolor: alpha(OR, 0.06) }}>
                <Person sx={{ fontSize: 18, color: OR, mt: 0.2 }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                    <Typography fontWeight={700} fontSize={13.5} color={TXT}>Mon profil</Typography>
                    <Chip label="Défaut" size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha(GRN, 0.12), color: GRN, fontWeight: 700 }} />
                  </Box>
                  <Typography fontSize={13} color="#475569">
                    {profile.firstName} {profile.lastName} · {profile.phone}
                  </Typography>
                  <Typography fontSize={12} color={TXT2}>{profile.city}, {profile.department}</Typography>
                  <Typography fontSize={11.5} color="#B45309" mt={0.5}>
                    Pour une livraison précise, ajoutez votre adresse complète ci-dessous.
                  </Typography>
                </Box>
              </Box>
            )}

            {addresses.map((addr: any) => {
              const active = selectedAddress === addr.id;
              return (
                <Box key={addr.id} onClick={() => setSelectedAddress(addr.id)}
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.8, cursor: 'pointer',
                    borderRadius: '14px', border: `1px solid ${active ? OR : BORD}`,
                    bgcolor: active ? alpha(OR, 0.07) : CARD, transition: 'all 0.15s',
                    '&:hover': { borderColor: alpha(OR, 0.4) } }}>
                  <Radio checked={active} onChange={() => {}} size="small"
                    sx={{ p: 0, mt: 0.2, color: active ? OR : 'rgba(15,23,42,0.2)', '&.Mui-checked': { color: OR } }} />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                      <Typography fontWeight={700} fontSize={13.5} color={TXT}>{addr.label}</Typography>
                      {addr.isDefault && <Chip label="Défaut" size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha(GRN, 0.12), color: GRN, fontWeight: 700 }} />}
                    </Box>
                    <Typography fontSize={13} color="#475569">{addr.fullName} · {addr.phone}</Typography>
                    <Typography fontSize={12} color={TXT2}>{addr.line1}, {addr.city}, {addr.department}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* Zone mismatch warning */}
          {zonesMismatch && (
            <Box sx={{ p: 2, mb: 2, borderRadius: '14px', border: `1px solid ${alpha('#FBBF24', 0.4)}`, bgcolor: alpha('#FBBF24', 0.07) }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                <Warning sx={{ fontSize: 18, color: '#FBBF24' }} />
                <Typography fontSize={13.5} fontWeight={700} color="#FBBF24">Ce vendeur ne livre pas dans votre région</Typography>
              </Box>
              <Typography fontSize={12.5} color="#475569" mb={1.5}>
                Votre adresse est au <strong style={{ color: '#0F172A' }}>{selDept}</strong> mais ce vendeur ne couvre pas ce département.
                Contactez-le directement pour vous arranger.
              </Typography>
              <Button variant="outlined" startIcon={<ChatBubbleOutline />} onClick={onContactVendor} size="small"
                sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, borderColor: alpha(OR, 0.5), color: OR, '&:hover': { borderColor: OR, bgcolor: alpha(OR, 0.07) } }}>
                Contacter le vendeur
              </Button>
            </Box>
          )}

          {/* Add address button */}
          <Button startIcon={<Add />} onClick={() => setAddOpen(true)} size="small"
            sx={{ color: OR, fontWeight: 700, textTransform: 'none', fontSize: 13, mb: 1, borderRadius: '10px',
              border: `1px dashed ${alpha(OR, 0.4)}`, px: 2, py: 0.8, bgcolor: alpha(OR, 0.03), '&:hover': { bgcolor: alpha(OR, 0.06) } }}>
            Ajouter une autre adresse
          </Button>
        </Box>
      )}

      {/* PICKUP */}
      {deliveryType === 'PICKUP' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1 }}>
          {pickupPoints.map((pt: any, i: number) => {
            const active = selectedPickup === i;
            return (
              <Box key={i} onClick={() => setSelectedPickup(i)}
                sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.8, cursor: 'pointer',
                  borderRadius: '14px', border: `1px solid ${active ? OR : BORD}`,
                  bgcolor: active ? alpha(OR, 0.07) : CARD, transition: 'all 0.15s',
                  '&:hover': { borderColor: alpha(OR, 0.4) } }}>
                <Radio checked={active} onChange={() => {}} size="small"
                  sx={{ p: 0, mt: 0.2, color: active ? OR : 'rgba(15,23,42,0.2)', '&.Mui-checked': { color: OR } }} />
                <Box>
                  <Typography fontWeight={700} fontSize={13.5} mb={0.2} color={TXT}>{pt.name}</Typography>
                  <Typography fontSize={13} color="#475569">
                    <LocationOn sx={{ fontSize: 13, verticalAlign: 'middle', mr: 0.3 }} />
                    {pt.address}, {pt.city} · {pt.dept}
                  </Typography>
                  {pt.phone && <Typography fontSize={12} color={TXT2}><Phone sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.3 }} />{pt.phone}</Typography>}
                  {pt.hours && <Typography fontSize={12} color={TXT2}>{pt.hours}</Typography>}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* CONTACT */}
      {deliveryType === 'CONTACT' && (
        <Box sx={{ p: 2.2, borderRadius: '14px', border: `1px solid ${alpha(OR, 0.25)}`, bgcolor: alpha(OR, 0.06), mb: 2 }}>
          <Typography fontSize={13.5} fontWeight={700} mb={0.5} color={TXT}>Contact direct avec le vendeur</Typography>
          <Typography fontSize={13} color="#475569">
            Votre commande sera envoyée au vendeur. Il vous contactera pour organiser la livraison et le paiement.
          </Typography>
          {storeInfo?.phone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              <Phone sx={{ fontSize: 14, color: TXT2 }} />
              <Typography fontSize={13} color="#475569">{storeInfo.phone}</Typography>
            </Box>
          )}
          {storeInfo?.whatsapp && (
            <Button component="a" href={`https://wa.me/${storeInfo.whatsapp.replace(/\D/g, '')}`}
              target="_blank" size="small" variant="outlined"
              startIcon={<WhatsApp />} sx={{ mt: 1.2, borderColor: '#25D366', color: '#25D366', borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}>
              WhatsApp
            </Button>
          )}
        </Box>
      )}

      <Button fullWidth variant="contained" onClick={onNext}
        disabled={
          (deliveryType === 'DELIVERY' && ((!selectedAddress && addresses.length > 0) || zonesMismatch || (deliveryZones.length > 0 && selectedZone === null && !zonesMismatch && !!selDept))) ||
          (deliveryType === 'PICKUP'   && selectedPickup === null)
        }
        sx={{ mt: 1, py: 1.4, borderRadius: '14px', fontWeight: 800, textTransform: 'none', fontSize: 14.5,
          bgcolor: OR, boxShadow: `0 8px 24px ${alpha(OR, 0.3)}`, '&:hover': { bgcolor: ORD },
          '&.Mui-disabled': { bgcolor: '#F1F5F9', color: '#64748B' } }}>
        Continuer vers le paiement
      </Button>

      <AddAddressModal open={addOpen} onClose={() => setAddOpen(false)} profile={profile}
        onCreated={(addr: any) => { onAddressAdded(addr); setAddOpen(false); }} />
    </Box>
  );
}

// ─── Step: Payment ────────────────────────────────────────────────────────────

function PaymentStep({ paymentMethods, selectedPayment, setSelectedPayment, notes, setNotes, couponCode, setCouponCode, onBack, onNext, storeInfo, placing }: any) {
  return (
    <Box>
      <Typography fontWeight={800} fontSize={16} mb={2} color={TXT}>Mode de paiement</Typography>

      {paymentMethods.length === 0 ? (
        <Box sx={{ p: 2, borderRadius: '14px', border: `1px dashed ${alpha(OR, 0.3)}`, bgcolor: alpha(OR, 0.05), mb: 2 }}>
          <Typography fontSize={13} color="#475569">
            Ce vendeur n'a pas précisé ses modes de paiement. Contactez-le directement.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, mb: 2 }}>
          {paymentMethods.map((m: string) => {
            const info = PAYMENT_INFO[m] ?? { label: m, color: TXT2, Icon: CreditCard, hint: '' };
            const active = selectedPayment === m;
            return (
              <Box key={m} onClick={() => setSelectedPayment(m)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.8, cursor: 'pointer',
                  borderRadius: '14px', border: `1px solid ${active ? info.color : BORD}`,
                  bgcolor: active ? alpha(info.color, 0.08) : CARD, transition: 'all 0.15s',
                  '&:hover': { borderColor: alpha(info.color, 0.5) } }}>
                <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: alpha(info.color, 0.12),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <info.Icon sx={{ fontSize: 21, color: info.color }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700} fontSize={14} color={active ? info.color : TXT}>{info.label}</Typography>
                  <Typography fontSize={11.5} color={TXT2}>{info.hint}</Typography>
                </Box>
                <Radio checked={active} onChange={() => {}} size="small"
                  sx={{ color: active ? info.color : 'rgba(15,23,42,0.2)', '&.Mui-checked': { color: info.color } }} />
              </Box>
            );
          })}
        </Box>
      )}

      {(selectedPayment === 'MONCASH' || selectedPayment === 'NATCASH') && storeInfo?.moncashPhone && (
        <Box sx={{ p: 2, bgcolor: alpha('#FF6B00', 0.08), borderRadius: '14px',
          border: `1px solid ${alpha('#FF6B00', 0.25)}`, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.5 }}>
            <Smartphone sx={{ fontSize: 16, color: '#FF6B00' }} />
            <Typography fontSize={13} fontWeight={700} color="#FF6B00">
              Numéro {selectedPayment === 'MONCASH' ? 'MonCash' : 'NatCash'} du vendeur
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography fontWeight={900} fontSize={20} letterSpacing={2} color={TXT}>{storeInfo.moncashPhone}</Typography>
            <IconButton size="small" onClick={() => navigator.clipboard.writeText(storeInfo.moncashPhone)}>
              <ContentCopy sx={{ fontSize: 14, color: TXT2 }} />
            </IconButton>
          </Box>
          <Typography fontSize={12} color="#64748B" mt={0.5}>
            Après paiement, soumettez votre référence de transaction à l'étape suivante.
          </Typography>
        </Box>
      )}

      {selectedPayment === 'BANK_TRANSFER' && (
        <Box sx={{ p: 2, borderRadius: '14px', border: `1px solid ${alpha('#818CF8', 0.25)}`, bgcolor: alpha('#818CF8', 0.06), mb: 2 }}>
          <Typography fontSize={13} color="#475569">
            Effectuez un virement bancaire et conservez la référence. Vous la soumettrez après confirmation.
          </Typography>
        </Box>
      )}

      {storeInfo?.isPlatformStore && (
        <TextField fullWidth size="small" label="Code promo (optionnel)"
          value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Ex: BIENVENUE30" sx={{ mb: 2 }} />
      )}

      <TextField fullWidth multiline rows={2} label="Note pour le vendeur (optionnel)"
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Instructions spéciales, couleur, taille préférée..."
        InputLabelProps={{ sx: { color: TXT2 } }}
        sx={{ mb: 2,
          '& .MuiOutlinedInput-root': { borderRadius: '14px', color: TXT, bgcolor: CARD,
            '& fieldset': { borderColor: BORD }, '&:hover fieldset': { borderColor: alpha(OR, 0.4) },
            '&.Mui-focused fieldset': { borderColor: OR } } }} />

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button onClick={onBack} variant="outlined" sx={{ px: 2.5, borderRadius: '14px', flex: 1, fontWeight: 700, textTransform: 'none',
          borderColor: BORD, color: '#475569', '&:hover': { borderColor: alpha(OR, 0.5), bgcolor: 'transparent' } }}>
          Retour
        </Button>
        <Button onClick={onNext} variant="contained" disabled={(paymentMethods.length > 0 && !selectedPayment) || placing}
          sx={{ flex: 2, py: 1.4, borderRadius: '14px', fontWeight: 800, textTransform: 'none', fontSize: 14.5,
            bgcolor: OR, boxShadow: `0 8px 24px ${alpha(OR, 0.3)}`, '&:hover': { bgcolor: ORD },
            '&.Mui-disabled': { bgcolor: '#F1F5F9', color: '#64748B' } }}>
          {placing ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'Confirmer la commande'}
        </Button>
      </Box>
    </Box>
  );
}

// ─── Main Checkout ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { fetchCount } = useCartStore();
  const qc = useQueryClient();

  const [step, setStep]     = useState(0);
  const [placing, setPlacing] = useState(false);

  const [deliveryType,     setDeliveryType]     = useState<'DELIVERY' | 'PICKUP' | 'CONTACT'>('DELIVERY');
  const [selectedAddress,  setSelectedAddress]  = useState<string>('');
  const [selectedPickup,   setSelectedPickup]   = useState<number | null>(null);
  const [selectedZone,     setSelectedZone]     = useState<number | null>(null);
  const [shippingCost,     setShippingCost]     = useState(0);
  const [selectedPayment,  setSelectedPayment]  = useState('');
  const [notes, setNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Cart
  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: () => api.get('/cart').then(r => r.data) });
  const items: any[] = cart?.items ?? [];

  // Profile (includes addresses as sub-relation)
  const { data: profile } = useQuery({ queryKey: ['me'], queryFn: () => api.get('/users/me').then(r => r.data) });

  // Addresses (dedicated endpoint — created above)
  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses'],
    queryFn:  () => api.get('/users/me/addresses').then(r => r.data),
  });

  // Store data from first cart item's store
  const firstStoreSlug = items[0]?.product?.store?.slug;
  const { data: storeOptions } = useQuery({
    queryKey: ['storeOptions', firstStoreSlug],
    queryFn:  () => api.get(`/stores/${firstStoreSlug}/options`).then(r => r.data),
    enabled:  !!firstStoreSlug,
  });
  const { data: storeDetail } = useQuery({
    queryKey: ['storeDetail', firstStoreSlug],
    queryFn:  () => api.get(`/stores/${firstStoreSlug}`).then(r => r.data),
    enabled:  !!firstStoreSlug,
  });

  const pickupPoints:  any[]    = storeOptions?.pickupPoints  ?? [];
  const deliveryZones: any[]    = storeOptions?.deliveryZones ?? [];
  const paymentMethods: string[] = (() => {
    try {
      const m = storeOptions?.acceptedPaymentMethods;
      if (Array.isArray(m)) return m;
      return JSON.parse(m || '[]');
    } catch { return []; }
  })();

  // Auto-select default address
  useEffect(() => {
    const def = addresses.find((a: any) => a.isDefault);
    if (def && !selectedAddress) setSelectedAddress(def.id);
    else if (!selectedAddress && addresses.length > 0) setSelectedAddress(addresses[0].id);
  }, [addresses]);

  const subtotal = items.reduce((s: number, i: any) => s + Number(i.product?.salePrice ?? i.product?.price ?? 0) * i.quantity, 0);
  const total = subtotal + shippingCost;

  const handleAddressAdded = (addr: any) => {
    qc.invalidateQueries({ queryKey: ['addresses'] });
    setSelectedAddress(addr.id);
  };

  const handleContactVendor = () => {
    const sellerUserId = storeOptions?.seller?.userId ?? storeDetail?.seller?.userId;
    if (sellerUserId) navigate(`/account/messages/${sellerUserId}`);
    else setDeliveryType('CONTACT');
  };

  const placeOrder = async () => {
    if (items.length === 0) { enqueueSnackbar('Panier vide', { variant: 'error' }); return; }
    setPlacing(true);
    try {
      const pickupPt = selectedPickup !== null ? pickupPoints[selectedPickup] : null;
      const res = await api.post('/orders', {
        addressId:           deliveryType === 'DELIVERY' ? selectedAddress : undefined,
        deliveryType,
        pickupPointName:     pickupPt?.name    || undefined,
        pickupPointAddress:  pickupPt?.address ? `${pickupPt.address}, ${pickupPt.city}` : undefined,
        chosenPaymentMethod: selectedPayment   || undefined,
        notes:               notes             || undefined,
        couponCode:          storeDetail?.isPlatformStore && couponCode ? couponCode : undefined,
      });
      const orders = Array.isArray(res.data) ? res.data : [res.data];
      await fetchCount();
      navigate('/order-received/thank-you', {
        replace: true,
        state: {
          type: 'product',
          orders,
          storeInfo: { ...storeDetail, ...storeOptions },
          sellerUserId: storeOptions?.seller?.userId ?? storeDetail?.seller?.userId ?? null,
        },
      });
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur lors de la commande', { variant: 'error' });
    } finally { setPlacing(false); }
  };

  if (items.length === 0) return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh' }}>
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <ShoppingCart sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
        <Typography fontWeight={800} fontSize={22} color={TXT} mb={1}>Votre panier est vide</Typography>
        <Button component={Link} to="/products" variant="contained"
          sx={{ borderRadius: '14px', textTransform: 'none', fontWeight: 700, bgcolor: OR, '&:hover': { bgcolor: ORD } }}>
          Découvrir des produits
        </Button>
      </Container>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', pb: 6 }}>
      {/* Header */}
      <Box sx={{ bgcolor: CARD2, borderBottom: `1px solid ${BORD}`, py: 2, position: 'sticky', top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => step === 0 ? navigate('/cart') : setStep(s => s - 1)} size="small"
              sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, '&:hover': { borderColor: alpha(OR, 0.5) } }}>
              <ArrowBack fontSize="small" sx={{ color: TXT }} />
            </IconButton>
            <Typography fontWeight={800} fontSize={19} color={TXT}>Passer la commande</Typography>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Lock sx={{ fontSize: 14, color: TXT2 }} />
              <Typography fontSize={11.5} color={TXT2}>Paiement sécurisé</Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ pt: 3 }}>
        {/* Stepper */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, maxWidth: 420 }}>
          {['Livraison', 'Paiement'].map((label, i) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: i === 0 ? 1 : 'unset' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: step >= i ? OR : '#F1F5F9', color: step >= i ? 'white' : '#64748B',
                  fontWeight: 800, fontSize: 12.5, transition: 'all 0.2s' }}>
                  {i + 1}
                </Box>
                <Typography fontSize={13} fontWeight={700} color={step >= i ? TXT : TXT2}>{label}</Typography>
              </Box>
              {i === 0 && <Box sx={{ flex: 1, height: 2, bgcolor: step >= 1 ? OR : '#F1F5F9', borderRadius: 1, transition: 'all 0.2s' }} />}
            </Box>
          ))}
        </Box>

        <Grid container spacing={3}>
          {/* Left: Steps */}
          <Grid item xs={12} md={7}>
            <Box sx={{ bgcolor: CARD2, borderRadius: '20px', p: { xs: 2, md: 3 }, border: `1px solid ${BORD}` }}>
              {step === 0 && (
                <DeliveryStep
                  addresses={addresses} pickupPoints={pickupPoints} deliveryZones={deliveryZones}
                  deliveryType={deliveryType} setDeliveryType={setDeliveryType}
                  selectedAddress={selectedAddress} setSelectedAddress={setSelectedAddress}
                  selectedPickup={selectedPickup} setSelectedPickup={setSelectedPickup}
                  selectedZone={selectedZone} setSelectedZone={setSelectedZone}
                  shippingCost={shippingCost} setShippingCost={setShippingCost}
                  storeInfo={storeDetail} profile={profile}
                  onAddressAdded={handleAddressAdded}
                  onContactVendor={handleContactVendor}
                  onNext={() => setStep(1)}
                />
              )}
              {step === 1 && (
                <PaymentStep
                  paymentMethods={paymentMethods}
                  selectedPayment={selectedPayment} setSelectedPayment={setSelectedPayment}
                  notes={notes} setNotes={setNotes}
                  couponCode={couponCode} setCouponCode={setCouponCode}
                  storeInfo={{ ...storeDetail, ...storeOptions }}
                  onBack={() => setStep(0)} onNext={placeOrder} placing={placing}
                />
              )}
            </Box>
          </Grid>

          {/* Right: Summary */}
          <Grid item xs={12} md={5}>
            <Box sx={{ bgcolor: CARD2, borderRadius: '20px', p: { xs: 2, md: 2.5 }, border: `1px solid ${BORD}`,
              position: { md: 'sticky' }, top: 96 }}>
              <Typography fontWeight={800} fontSize={15} mb={2} color={TXT}>
                Récapitulatif ({items.length} article{items.length > 1 ? 's' : ''})
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                {items.map((item: any) => {
                  const p = item.product;
                  const img = p?.images?.[0]?.urlThumb;
                  const price = Number(p?.salePrice ?? p?.price ?? 0);
                  return (
                    <Box key={item.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Box sx={{ width: 52, height: 52, borderRadius: '12px', overflow: 'hidden',
                        bgcolor: '#F1F5F9', border: `1px solid ${BORD}`, flexShrink: 0, position: 'relative' }}>
                        {img && <Box component="img" src={img} alt={p?.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        <Box sx={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18,
                          borderRadius: '50%', bgcolor: OR, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography sx={{ fontSize: 9, color: 'white', fontWeight: 800 }}>{item.quantity}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontSize={12.5} fontWeight={500} noWrap color="#0F172A">{p?.name}</Typography>
                        {item.color && <Typography fontSize={11} color={TXT2}>{item.color}{item.size ? ` · ${item.size}` : ''}</Typography>}
                      </Box>
                      <Typography fontWeight={700} fontSize={13} color={TXT} flexShrink={0}>{fmtHTG(price * item.quantity)}</Typography>
                    </Box>
                  );
                })}
              </Box>

              <Divider sx={{ mb: 1.5, borderColor: BORD }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontSize={13} color="#64748B">Sous-total</Typography>
                  <Typography fontSize={13} fontWeight={600} color="#0F172A">{fmtHTG(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontSize={13} color="#64748B">Livraison</Typography>
                  <Typography fontSize={13} fontWeight={600} color={shippingCost === 0 ? GRN : '#0F172A'}>
                    {shippingCost === 0 ? 'Gratuite' : fmtHTG(shippingCost)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5, borderColor: BORD }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontSize={16} fontWeight={800} color={TXT}>Total</Typography>
                  <Typography fontSize={18} fontWeight={900} color={OR}>{fmtHTG(total)}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 2.5, justifyContent: 'center' }}>
                <Shield sx={{ fontSize: 14, color: TXT2 }} />
                <Typography fontSize={11} color={TXT2}>Achat protégé DealPam</Typography>
              </Box>

              {placing && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'center' }}>
                  <CircularProgress size={16} sx={{ color: OR }} />
                  <Typography fontSize={13} color={TXT2}>Traitement en cours...</Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
