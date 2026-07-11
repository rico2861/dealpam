import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Avatar, IconButton, Divider,
  Rating, TextField, CircularProgress, alpha,
  Stepper, Step, StepLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  CheckCircle, LocalShipping, Assignment, HourglassEmpty,
  Cancel, ArrowBack, Phone, Star,
  ShoppingBag, ContentCopy, Home, Storefront,
  Smartphone, InfoOutlined, ReceiptLong,
  EmailOutlined, LocationOn, ChatBubbleOutline,
  AddPhotoAlternate, Close,
} from '@mui/icons-material';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { compressImages } from '../../utils/compressImage';
import { ListSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

const OR   = '#FF6B00';
const ORD  = '#E05A00';
const GRN  = '#10B981';
const RED  = '#EF4444';
const GOLD = '#F59E0B';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.09)';
const SHADOW = '0 2px 12px rgba(15,23,42,0.05)';

const fmt = (v: number) => `${Number(v).toLocaleString('fr-HT')} HTG`;

const ORDER_STEPS = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED'];

const STATUS: Record<string, { label: string; color: string; Icon: any }> = {
  PENDING:   { label: 'En attente',     color: GOLD,    Icon: HourglassEmpty },
  CONFIRMED: { label: 'Confirmée',      color: '#38BDF8', Icon: Assignment },
  PREPARING: { label: 'En préparation', color: '#A78BFA', Icon: Assignment },
  SHIPPED:   { label: 'Expédiée',       color: '#22D3EE', Icon: LocalShipping },
  DELIVERED: { label: 'Livrée',         color: GRN,     Icon: CheckCircle },
  CANCELLED: { label: 'Annulée',        color: RED,     Icon: Cancel },
};

const DELIVERY_LABELS: Record<string, string> = {
  DELIVERY: 'Livraison à domicile',
  PICKUP:   'Retrait en boutique',
  CONTACT:  'Contact direct vendeur',
};

// ─── Review form ──────────────────────────────────────────────────────────────

function ReviewForm({ storeId, orderId, onDone }: { storeId: string; orderId: string; onDone: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [rating,  setRating]  = useState<number | null>(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages]   = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 6 - images.length);
    e.target.value = '';
    if (!picked.length) return;
    setUploadingImg(true);
    try {
      const compressed = await compressImages(picked);
      setImages(p => [...p, ...compressed]);
      setPreviews(p => [...p, ...compressed.map(f => URL.createObjectURL(f))]);
    } finally { setUploadingImg(false); }
  };
  const removeImage = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setImages(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (images.length) {
        const fd = new FormData();
        images.forEach(f => fd.append('files', f));
        fd.append('folder', 'reviews');
        const { data } = await api.post('/upload/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        imageUrls = (data as any[]).map(d => d.urlMedium || d.urlFull);
      }
      await api.post('/reviews', { storeId, orderId, rating, comment, images: imageUrls.length ? imageUrls : undefined });
      enqueueSnackbar('Avis publié — merci !', { variant: 'success' });
      onDone();
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' });
    } finally { setSubmitting(false); }
  };

  return (
    <Box sx={{ p: 2.5, bgcolor: alpha(GOLD, 0.06), border: `1.5px solid ${alpha(GOLD, 0.2)}`, borderRadius: '18px', mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Star sx={{ color: GOLD, fontSize: 18 }} />
        <Typography fontWeight={800} fontSize={14.5} color="#0F172A">Évaluer cette commande</Typography>
      </Box>
      <Typography fontSize={13} color="#64748B" mb={1.5}>
        Votre commande a été livrée. Comment s'est passée l'expérience ?
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Typography fontSize={13} fontWeight={600} color="#0F172A">Note :</Typography>
        <Rating value={rating} onChange={(_, v) => setRating(v)} precision={1}
          sx={{ '& .MuiRating-iconFilled': { color: GOLD }, '& .MuiRating-iconEmpty': { color: '#64748B' } }} />
        <Typography fontSize={13} color={GOLD}>{rating}/5</Typography>
      </Box>
      <TextField fullWidth multiline rows={2}
        label="Commentaire" value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Produit conforme ? Vendeur réactif ? Livraison rapide ?"
        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px', bgcolor: '#FFFFFF', color: '#0F172A',
          '& fieldset': { borderColor: BORD }, '&:hover fieldset': { borderColor: alpha(GOLD, 0.4) },
          '&.Mui-focused fieldset': { borderColor: GOLD } },
          '& .MuiInputLabel-root': { color: '#64748B' },
          '& .MuiInputBase-input': { color: '#0F172A', '&::placeholder': { color: '#64748B' } },
        }} />

      <input type="file" ref={fileRef} accept="image/*" multiple hidden onChange={addImages} />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {previews.map((src, i) => (
          <Box key={i} sx={{ position: 'relative', width: 60, height: 60 }}>
            <Box component="img" src={src} sx={{ width: 60, height: 60, borderRadius: '10px', objectFit: 'cover', border: `1px solid ${BORD}` }} />
            <Box onClick={() => removeImage(i)}
              sx={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', bgcolor: RED,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Close sx={{ fontSize: 11, color: '#fff' }} />
            </Box>
          </Box>
        ))}
        {images.length < 6 && (
          <Box onClick={() => !uploadingImg && fileRef.current?.click()}
            sx={{ width: 60, height: 60, borderRadius: '10px', border: `1.5px dashed ${BORD}`, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: uploadingImg ? 'wait' : 'pointer',
              '&:hover': uploadingImg ? {} : { borderColor: GOLD } }}>
            {uploadingImg ? <CircularProgress size={16} sx={{ color: GOLD }} /> : <AddPhotoAlternate sx={{ fontSize: 18, color: '#64748B' }} />}
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button fullWidth variant="contained" disabled={!rating || submitting} onClick={handleSubmit}
          startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <Star sx={{ fontSize: 15 }} />}
          sx={{ bgcolor: GOLD, color: '#111', fontWeight: 800, borderRadius: '12px', textTransform: 'none',
            '&:hover': { bgcolor: '#d97706' }, '&.Mui-disabled': { bgcolor: '#FFFFFF', color: '#64748B' } }}>
          {submitting ? 'Publication...' : 'Publier mon avis'}
        </Button>
        <Button variant="outlined" onClick={onDone}
          sx={{ borderRadius: '12px', borderColor: BORD, color: '#64748B', textTransform: 'none', px: 2,
            '&:hover': { borderColor: 'rgba(15,23,42,0.09)', color: '#0F172A' } }}>
          Plus tard
        </Button>
      </Box>
    </Box>
  );
}

// ─── Offer status (négociation de prix) ────────────────────────────────────────

const BLU = '#3B82F6';

function OfferStatusBlock({ order, item }: { order: any; item: any }) {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');

  const respondMut = useMutation({
    mutationFn: ({ action, counterPrice }: { action: 'ACCEPT' | 'REJECT' | 'COUNTER'; counterPrice?: number }) =>
      api.patch(`/orders/me/${order.id}/items/${item.id}/offer-response`, { action, counterPrice }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', order.id] });
      qc.invalidateQueries({ queryKey: ['myOrders'] });
      enqueueSnackbar('Réponse envoyée au vendeur', { variant: 'success' });
      setCounterOpen(false);
      setCounterPrice('');
    },
    onError: (e: any) => enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  if (item.offerStatus === 'PENDING') {
    return (
      <Box sx={{ mt: 1, mb: 1, p: 1.4, borderRadius: '10px', bgcolor: alpha(GOLD, 0.08), border: `1px solid ${alpha(GOLD, 0.25)}` }}>
        <Typography fontSize={12.5} fontWeight={700} color={GOLD}>
          ⏳ Votre offre de {fmt(Number(item.offeredPrice))} est en attente de la réponse du vendeur.
        </Typography>
      </Box>
    );
  }
  if (item.offerStatus === 'REJECTED') {
    return (
      <Box sx={{ mt: 1, mb: 1, p: 1.4, borderRadius: '10px', bgcolor: alpha(RED, 0.08), border: `1px solid ${alpha(RED, 0.25)}` }}>
        <Typography fontSize={12.5} fontWeight={700} color={RED} mb={0.3}>Négociation terminée — offre refusée définitivement</Typography>
        {item.offerRejectionReason && <Typography fontSize={12} color="#64748B">Motif : {item.offerRejectionReason}</Typography>}
      </Box>
    );
  }
  if (item.offerStatus === 'COUNTERED') {
    return (
      <Box sx={{ mt: 1, mb: 1, p: 1.6, borderRadius: '10px', bgcolor: alpha(BLU, 0.08), border: `1px solid ${alpha(BLU, 0.25)}` }}>
        <Typography fontSize={12.5} fontWeight={700} color={BLU} mb={1}>
          🔄 Le vendeur propose {fmt(Number(item.counterPrice))} au lieu de votre offre de {fmt(Number(item.offeredPrice))}.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" disabled={respondMut.isPending} onClick={() => respondMut.mutate({ action: 'ACCEPT' })}
            sx={{ borderRadius: '9px', fontWeight: 700, fontSize: 12, px: 1.8, py: 0.6,
              bgcolor: GRN, color: '#fff', '&:hover': { bgcolor: '#0EA271' } }}>
            Accepter ce prix
          </Button>
          <Button size="small" disabled={respondMut.isPending} onClick={() => setCounterOpen(true)}
            sx={{ borderRadius: '9px', fontWeight: 700, fontSize: 12, px: 1.8, py: 0.6,
              bgcolor: 'transparent', color: BLU, border: '1px solid rgba(59,130,246,0.35)',
              '&:hover': { bgcolor: 'rgba(59,130,246,0.1)' } }}>
            Proposer un autre prix
          </Button>
          <Button size="small" disabled={respondMut.isPending} onClick={() => respondMut.mutate({ action: 'REJECT' })}
            sx={{ borderRadius: '9px', fontWeight: 700, fontSize: 12, px: 1.8, py: 0.6,
              bgcolor: 'transparent', color: RED, border: '1px solid rgba(239,68,68,0.35)',
              '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}>
            Refuser définitivement
          </Button>
        </Box>

        <Dialog open={counterOpen} onClose={() => setCounterOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>Proposer un autre prix</DialogTitle>
          <DialogContent>
            <Typography fontSize={12.5} color="#64748B" mb={1.2}>
              Le vendeur propose {fmt(Number(item.counterPrice))}. Faites votre nouvelle proposition —
              le vendeur pourra l'accepter, la refuser définitivement, ou vous recontre-proposer.
            </Typography>
            <TextField fullWidth type="number" label="Votre prix (HTG)" value={counterPrice}
              onChange={e => setCounterPrice(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2.5 }}>
            <Button onClick={() => setCounterOpen(false)}>Annuler</Button>
            <Button variant="contained" disabled={!(Number(counterPrice) > 0) || respondMut.isPending}
              onClick={() => respondMut.mutate({ action: 'COUNTER', counterPrice: Number(counterPrice) })}
              sx={{ bgcolor: BLU, '&:hover': { bgcolor: '#2563EB' } }}>
              {respondMut.isPending ? <CircularProgress size={16} color="inherit" /> : 'Envoyer ma proposition'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
  if (item.offerStatus === 'ACCEPTED') {
    return (
      <Box sx={{ mt: 1, mb: 1, p: 1.4, borderRadius: '10px', bgcolor: alpha(GRN, 0.08), border: `1px solid ${alpha(GRN, 0.25)}` }}>
        <Typography fontSize={12.5} fontWeight={700} color={GRN}>✓ Offre acceptée à {fmt(Number(item.unitPrice))}.</Typography>
      </Box>
    );
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const [showReview, setShowReview] = useState(true);
  const [txRef, setTxRef] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => api.get(`/orders/me/${id}`).then(r => r.data),
    enabled:  !!id,
  });

  const showSkel = useDelayedLoading(isLoading);
  const statusInfo = order ? (STATUS[order.status] ?? STATUS.PENDING) : null;
  const stepIdx    = order ? ORDER_STEPS.indexOf(order.status) : -1;
  const isCancelled = order?.status === 'CANCELLED';
  const isDelivered = order?.status === 'DELIVERED';

  // Needs TX: only for MonCash/NatCash/bank, only if not yet submitted
  const needsTx = order?.chosenPaymentMethod
    && ['MONCASH', 'NATCASH', 'BANK_TRANSFER'].includes(order.chosenPaymentMethod)
    && !order.paymentTxRef;

  const submitTx = async () => {
    if (!txRef.trim()) return;
    setSubmittingTx(true);
    try {
      await api.post(`/orders/me/${id}/payment-tx`, { txRef: txRef.trim(), method: order?.chosenPaymentMethod });
      qc.invalidateQueries({ queryKey: ['order', id] });
      enqueueSnackbar('Référence soumise avec succès !', { variant: 'success' });
      setTxRef('');
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur', { variant: 'error' });
    } finally { setSubmittingTx(false); }
  };

  if (isLoading) return showSkel ? (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', maxWidth: 800, mx: 'auto', px: 2, py: 3 }}>
      <ListSkeleton rows={3} />
    </Box>
  ) : null;
  if (error || !order) return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
      <Typography color="#0F172A">Commande introuvable.</Typography>
      <Button component={Link} to="/account/orders" variant="outlined"
        sx={{ borderColor: BORD, color: '#0F172A', borderRadius: '12px', textTransform: 'none' }}>
        Mes commandes
      </Button>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', pb: 8 }}>

      {/* ── Top bar ── */}
      <Box sx={{ px: { xs: 2, sm: 3, lg: 4 }, pt: 3, pb: 2, maxWidth: 960, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <IconButton onClick={() => navigate('/account/orders')}
            sx={{ color: '#0F172A', bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '12px', width: 38, height: 38,
              '&:hover': { color: '#0F172A', borderColor: 'rgba(15,23,42,0.09)' } }}>
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={900} fontSize={{ xs: 17, sm: 20 }} color="#0F172A" letterSpacing="-0.4px">
              Commande #{order.id.slice(-8).toUpperCase()}
            </Typography>
            <Typography fontSize={12.5} color="#64748B">
              Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
          {statusInfo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, px: 1.4, py: 0.6, borderRadius: '10px',
              bgcolor: alpha(statusInfo.color, 0.12), border: `1px solid ${alpha(statusInfo.color, 0.25)}` }}>
              <statusInfo.Icon sx={{ fontSize: 13, color: statusInfo.color }} />
              <Typography fontSize={12.5} fontWeight={700} color={statusInfo.color}>{statusInfo.label}</Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Content ── */}
      <Box sx={{ maxWidth: 960, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, display: 'flex', gap: 2.5, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>

        {/* ── LEFT ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Order tracker */}
          {!isCancelled && (
            <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '18px', p: { xs: 2, sm: 2.5 }, mb: 2 }}>
              <Typography fontWeight={700} fontSize={13.5} color="#0F172A" textTransform="uppercase" letterSpacing="0.8px" mb={2.5}>
                Suivi de commande
              </Typography>
              <Stepper activeStep={Math.max(0, stepIdx)} alternativeLabel
                sx={{
                  '& .MuiStepLabel-label': { fontSize: 11.5, mt: 0.5, color: '#64748B !important' },
                  '& .MuiStepLabel-label.Mui-active': { color: '#0F172A !important', fontWeight: 700 },
                  '& .MuiStepLabel-label.Mui-completed': { color: `${GRN} !important` },
                  '& .MuiStepConnector-line': { borderColor: BORD },
                  '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': { borderColor: GRN },
                }}>
                {['Reçue', 'Confirmée', 'Préparation', 'Expédiée', 'Livrée'].map((label, i) => (
                  <Step key={label} completed={i < stepIdx}>
                    <StepLabel StepIconProps={{ sx: {
                      color: '#64748B !important',
                      '&.Mui-completed': { color: `${GRN} !important` },
                      '&.Mui-active': { color: `${OR} !important` },
                    }}}>
                      {label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {isCancelled && (
            <Box sx={{ bgcolor: alpha(RED, 0.08), border: `1px solid ${alpha(RED, 0.2)}`, borderRadius: '18px', p: 2.5, mb: 2, display: 'flex', gap: 1.5 }}>
              <Cancel sx={{ color: RED, fontSize: 20, flexShrink: 0, mt: 0.2 }} />
              <Box>
                <Typography fontWeight={700} fontSize={14} color={RED} mb={0.3}>Commande annulée</Typography>
                <Typography fontSize={13} color="#64748B">
                  Si vous avez déjà effectué un paiement, contactez directement le vendeur ou le support DealPam.
                </Typography>
              </Box>
            </Box>
          )}

          {/* ── Payment notice (direct client→seller) ── */}
          {order.chosenPaymentMethod && !isDelivered && !isCancelled && (
            <Box sx={{ bgcolor: alpha(OR, 0.07), border: `1px solid ${alpha(OR, 0.18)}`, borderRadius: '18px', p: 2.5, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                <InfoOutlined sx={{ fontSize: 16, color: OR }} />
                <Typography fontWeight={700} fontSize={13.5} color={OR}>Paiement direct au vendeur</Typography>
              </Box>
              <Typography fontSize={13} color="#64748B" lineHeight={1.7} mb={1.5}>
                DealPam ne collecte pas les paiements pour les commandes de vendeurs tiers.
                Vous devez payer directement le vendeur via le mode choisi.
              </Typography>

              {/* MonCash / NatCash number */}
              {(order.chosenPaymentMethod === 'MONCASH' || order.chosenPaymentMethod === 'NATCASH') && order.store?.moncashPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
                  bgcolor: '#FFFFFF', borderRadius: '12px', border: `1px solid ${BORD}`, mb: 1.5 }}>
                  <Smartphone sx={{ fontSize: 18, color: OR, flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize={11} color="#64748B" textTransform="uppercase" letterSpacing="0.6px">
                      {order.chosenPaymentMethod === 'MONCASH' ? 'MonCash' : 'NatCash'} du vendeur
                    </Typography>
                    <Typography fontWeight={900} fontSize={18} color="#0F172A" letterSpacing={1}>
                      {order.store.moncashPhone}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => { navigator.clipboard.writeText(order.store.moncashPhone); enqueueSnackbar('Numéro copié !', { variant: 'info' }); }}
                    sx={{ color: '#64748B', '&:hover': { color: OR } }}>
                    <ContentCopy sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              )}

              {/* Submit TX ref */}
              {needsTx && (
                <Box>
                  <Typography fontSize={12.5} color="#64748B" mb={1}>
                    Après avoir payé, entrez votre référence de transaction pour confirmation :
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField fullWidth size="small" value={txRef} onChange={e => setTxRef(e.target.value)}
                      placeholder="Ex: MCX-1234567890"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#FFFFFF', color: '#0F172A',
                        '& fieldset': { borderColor: BORD }, '&.Mui-focused fieldset': { borderColor: OR } },
                        '& .MuiInputBase-input': { color: '#0F172A', fontSize: 13, '&::placeholder': { color: '#64748B' } } }} />
                    <Button variant="contained" disabled={!txRef.trim() || submittingTx} onClick={submitTx}
                      sx={{ bgcolor: OR, borderRadius: '10px', fontWeight: 700, px: 2.5, flexShrink: 0, textTransform: 'none',
                        '&:hover': { bgcolor: ORD }, '&.Mui-disabled': { bgcolor: '#FFFFFF', color: '#64748B' } }}>
                      {submittingTx ? <CircularProgress size={16} color="inherit" /> : 'Envoyer'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* TX already submitted */}
              {order.paymentTxRef && (
                <Box sx={{ display: 'flex', gap: 1, p: 1.5, bgcolor: '#FFFFFF', borderRadius: '12px', border: `1px solid ${BORD}`, mt: 1 }}>
                  <ReceiptLong sx={{ fontSize: 16, color: order.paymentTxStatus === 'APPROVED' ? GRN : order.paymentTxStatus === 'REJECTED' ? RED : GOLD, flexShrink: 0, mt: 0.2 }} />
                  <Box>
                    <Typography fontSize={12.5} fontWeight={700} color="#0F172A">Réf. : {order.paymentTxRef}</Typography>
                    <Typography fontSize={12} color={order.paymentTxStatus === 'APPROVED' ? GRN : order.paymentTxStatus === 'REJECTED' ? RED : GOLD}>
                      {order.paymentTxStatus === 'APPROVED' ? 'Validé par DealPam' : order.paymentTxStatus === 'REJECTED' ? 'Rejeté — contactez le support' : 'En attente de validation'}
                    </Typography>
                    {order.paymentTxNote && <Typography fontSize={11.5} color="#64748B" mt={0.3}>Note : {order.paymentTxNote}</Typography>}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* ── Articles ── */}
          <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '18px', p: { xs: 2, sm: 2.5 }, mb: 2 }}>
            <Typography fontWeight={700} fontSize={13.5} color="#0F172A" textTransform="uppercase" letterSpacing="0.8px" mb={2}>
              Articles commandés
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {order.items?.map((item: any, i: number) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: '#FFFFFF',
                      border: `1px solid ${BORD}`, flexShrink: 0, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.imageUrl
                        ? <Box component="img" src={item.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <ShoppingBag sx={{ fontSize: 22, color: '#64748B' }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600} fontSize={13.5} noWrap color="#0F172A">{item.productName}</Typography>
                      {(item.color || item.size) && (
                        <Typography fontSize={12} color="#64748B">{[item.color, item.size].filter(Boolean).join(' · ')}</Typography>
                      )}
                      <Typography fontSize={12} color="#64748B">{fmt(Number(item.unitPrice))} × {item.quantity}</Typography>
                    </Box>
                    <Typography fontWeight={700} fontSize={14} color="#0F172A" flexShrink={0}>
                      {fmt(Number(item.subtotal ?? Number(item.unitPrice) * item.quantity))}
                    </Typography>
                  </Box>
                  {item.offerStatus && <OfferStatusBlock order={order} item={item} />}
                </Box>
              ))}
            </Box>
            <Box sx={{ borderTop: `1px solid ${BORD}`, mt: 2, pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography fontWeight={700} fontSize={14} color="#0F172A">Total</Typography>
              <Typography fontWeight={900} fontSize={20} color={OR}>{fmt(Number(order.totalHTG))}</Typography>
            </Box>
          </Box>

          {/* Review */}
          {isDelivered && showReview && <ReviewForm storeId={order.storeId} orderId={order.id} onDone={() => setShowReview(false)} />}
          {isDelivered && !showReview && (
            <Box sx={{ bgcolor: alpha(GRN, 0.08), border: `1px solid ${alpha(GRN, 0.2)}`, borderRadius: '14px', p: 2, display: 'flex', gap: 1 }}>
              <CheckCircle sx={{ color: GRN, fontSize: 16, mt: 0.2 }} />
              <Typography fontSize={13} color={GRN}>Merci pour votre avis ! Il aide la communauté DealPam.</Typography>
            </Box>
          )}
        </Box>

        {/* ── RIGHT: seller card ── */}
        <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0, position: { md: 'sticky' }, top: 16 }}>

          {/* Seller */}
          {order.store && (
            <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '18px', p: 2.5, mb: 2 }}>
              <Typography fontSize={11} fontWeight={700} color="#64748B" textTransform="uppercase" letterSpacing="0.8px" mb={1.5}>
                Vendeur
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(OR, 0.15), color: OR, fontSize: 16, fontWeight: 900, border: `1.5px solid ${alpha(OR, 0.25)}` }}>
                  {order.store.name?.[0]}
                </Avatar>
                <Typography fontWeight={800} fontSize={14} color="#0F172A">{order.store.name}</Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Phone */}
                {order.store.phone && (
                  <Box component="a" href={`tel:${order.store.phone}`} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2, textDecoration: 'none',
                    bgcolor: '#FFFFFF', borderRadius: '10px', border: `1px solid ${BORD}`,
                    transition: 'all 0.15s', '&:hover': { borderColor: 'rgba(15,23,42,0.18)', bgcolor: '#F7F8FA' },
                  }}>
                    <Phone sx={{ fontSize: 15, color: '#64748B' }} />
                    <Typography fontSize={13} color="#0F172A">{order.store.phone}</Typography>
                  </Box>
                )}

                {/* Email */}
                {order.store.email && (
                  <Box component="a" href={`mailto:${order.store.email}`} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2, textDecoration: 'none',
                    bgcolor: '#FFFFFF', borderRadius: '10px', border: `1px solid ${BORD}`,
                    transition: 'all 0.15s', '&:hover': { borderColor: 'rgba(15,23,42,0.18)', bgcolor: '#F7F8FA' },
                  }}>
                    <EmailOutlined sx={{ fontSize: 15, color: '#64748B' }} />
                    <Typography fontSize={13} color="#0F172A" noWrap>{order.store.email}</Typography>
                  </Box>
                )}

                {/* Address */}
                {(order.store.address || order.store.city) && (
                  <Box sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.2, p: 1.2,
                    bgcolor: '#FFFFFF', borderRadius: '10px', border: `1px solid ${BORD}`,
                  }}>
                    <LocationOn sx={{ fontSize: 15, color: '#64748B', mt: 0.2, flexShrink: 0 }} />
                    <Typography fontSize={13} color="#0F172A" lineHeight={1.5}>
                      {[order.store.address, order.store.city, order.store.department].filter(Boolean).join(', ')}
                    </Typography>
                  </Box>
                )}

                {/* Chat with seller */}
                {order.store.seller?.userId && (
                  <Button
                    component={Link}
                    to={`/account/messages/${order.store.seller.userId}`}
                    variant="contained"
                    startIcon={<ChatBubbleOutline sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: alpha(OR, 0.12), color: OR, fontWeight: 700, fontSize: 13,
                      borderRadius: '10px', textTransform: 'none', border: `1px solid ${alpha(OR, 0.25)}`,
                      boxShadow: 'none', py: 1.1,
                      '&:hover': { bgcolor: alpha(OR, 0.2), boxShadow: 'none' },
                    }}>
                    Écrire au vendeur
                  </Button>
                )}
              </Box>

              <Box sx={{ my: 2, borderTop: `1px solid ${BORD}` }} />

              {/* Order meta */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {order.deliveryType && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontSize={12} color="#64748B">Livraison</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {order.deliveryType === 'DELIVERY' ? <Home sx={{ fontSize: 12, color: '#0F172A' }} /> :
                       order.deliveryType === 'PICKUP'   ? <Storefront sx={{ fontSize: 12, color: '#0F172A' }} /> :
                       <Phone sx={{ fontSize: 12, color: '#0F172A' }} />}
                      <Typography fontSize={12} fontWeight={600} color="#0F172A">
                        {DELIVERY_LABELS[order.deliveryType] ?? order.deliveryType}
                      </Typography>
                    </Box>
                  </Box>
                )}
                {order.chosenPaymentMethod && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontSize={12} color="#64748B">Paiement</Typography>
                    <Typography fontSize={12} fontWeight={600} color="#0F172A">{order.chosenPaymentMethod}</Typography>
                  </Box>
                )}
                {order.shippingHTG > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography fontSize={12} color="#64748B">Livraison</Typography>
                    <Typography fontSize={12} fontWeight={600} color="#0F172A">{fmt(Number(order.shippingHTG))}</Typography>
                  </Box>
                )}
              </Box>

              <Button component={Link} to={`/store/${order.store.slug}`} fullWidth variant="outlined"
                sx={{ mt: 2, borderRadius: '12px', borderColor: BORD, color: '#64748B', fontSize: 13,
                  textTransform: 'none', '&:hover': { borderColor: 'rgba(15,23,42,0.18)', color: '#0F172A', bgcolor: '#F7F8FA' } }}>
                Voir la boutique
              </Button>
            </Box>
          )}

          <Button component={Link} to="/account/orders" fullWidth variant="text"
            startIcon={<ArrowBack sx={{ fontSize: 15 }} />}
            sx={{ borderRadius: '12px', color: '#64748B', fontSize: 13, textTransform: 'none',
              '&:hover': { color: '#0F172A', bgcolor: CARD } }}>
            Mes commandes
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
