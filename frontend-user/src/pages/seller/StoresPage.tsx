import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Grid,
  Select, MenuItem, InputLabel, FormControl, Avatar, Menu,
} from '@mui/material';
import {
  Add, Delete, Star, Inventory2Outlined, ShoppingBagOutlined, Verified,
  ContentCopy, OpenInNew, StorefrontOutlined, LocationOnOutlined, ArrowForward,
  PhoneOutlined, LocalShippingOutlined, AccountBalanceWalletOutlined,
  PlaceOutlined, Close, AccessTimeOutlined, VisibilityOutlined, PeopleAltOutlined,
  PauseCircleOutline, PlayCircleOutline, SettingsOutlined, MoreVert,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { StoreCardSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { StoreForm } from '../../components/shared/StoreConfigForm';

const OR   = '#FF6B00';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.06)';
const TXT  = '#0F172A';
const SUB  = '#64748B';
const SUB2 = '#64748B';
const GRN  = '#10B981';
const RED  = '#EF4444';
const BLU  = '#3B82F6';


function StoreDialog({ open, title, initial, onClose, onSave, loading }: {
  open: boolean; title: string; initial?: any; onClose: () => void; onSave: (d: any) => void; loading: boolean;
}) {
  const [formData, setFormData] = useState<any>(null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper"
      PaperProps={{ sx: {
        bgcolor: '#F7F8FA', border: `1px solid ${BORD}`, borderRadius: '20px',
        display: 'flex', flexDirection: 'column', maxHeight: '92vh',
      }}}>
      {/* Sticky header */}
      <Box sx={{
        px: 3, py: 2.5, borderBottom: `1px solid ${BORD}`, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(180deg,rgba(255,107,0,0.06) 0%,transparent 100%)',
      }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <StorefrontOutlined sx={{ fontSize: 18, color: OR }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={900} fontSize={17} color={TXT}>{title}</Typography>
          <Typography fontSize={12} color={SUB}>{initial ? 'Modifiez les informations de votre boutique' : 'Remplissez les informations pour créer votre boutique'}</Typography>
        </Box>
        <Box onClick={onClose} sx={{ width: 32, height: 32, borderRadius: '9px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${BORD}`,
          '&:hover': { bgcolor: 'rgba(15,23,42,0.04)' } }}>
          <Close sx={{ fontSize: 16, color: SUB }} />
        </Box>
      </Box>

      {/* Scrollable content */}
      <DialogContent sx={{ px: 3, py: 2.5, overflowY: 'auto', flex: 1,
        '&::-webkit-scrollbar': { width: 5 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(15,23,42,0.09)', borderRadius: 3 },
      }}>
        <StoreForm initial={initial} onSave={d => setFormData(d)} loading={loading} _onDataChange={setFormData} />
      </DialogContent>

      {/* Sticky footer */}
      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${BORD}`, flexShrink: 0,
        display: 'flex', gap: 1.5, alignItems: 'center',
        bgcolor: '#FFFFFF' }}>
        <Button onClick={onClose} sx={{ color: SUB2, borderRadius: '11px', px: 2.5, fontWeight: 600 }}>
          Annuler
        </Button>
        <Button onClick={() => formData && onSave(formData)} disabled={loading || !formData?.name?.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ flex: 1, py: 1.3, borderRadius: '12px', fontWeight: 800, fontSize: 14,
            bgcolor: OR, color: '#fff', boxShadow: '0 4px 14px rgba(255,107,0,0.3)',
            '&:hover': { bgcolor: '#E05A00' }, '&:disabled': { bgcolor: 'rgba(15,23,42,0.04)', color: SUB } }}>
          {loading ? 'Enregistrement…' : initial ? 'Enregistrer les modifications' : 'Créer la boutique'}
        </Button>
      </Box>
    </Dialog>
  );
}

function StoreCard({ store, onEdit, onDelete, onCopy, onToggleActive }: any) {
  const hue = (store.name?.charCodeAt(0) ?? 65) * 53 % 360;
  const [menuEl, setMenuEl] = useState<null | HTMLElement>(null);
  return (
    <Box sx={{
      borderRadius: '16px', bgcolor: CARD, overflow: 'hidden', transition: 'all 0.18s',
      border: `1px solid ${store.isPrimary ? 'rgba(255,107,0,0.28)' : BORD}`,
      '&:hover': { borderColor: store.isPrimary ? 'rgba(255,107,0,0.45)' : 'rgba(15,23,42,0.09)', transform: 'translateY(-1px)' },
    }}>
      {store.isPrimary && <Box sx={{ height: 2.5, background: `linear-gradient(90deg,${OR},#D95500)` }} />}

      <Box sx={{ p: 2 }}>
        {/* Row 1: avatar + info + actions */}
        <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', mb: 1.5 }}>
          {store.logoUrl ? (
            <Avatar src={store.logoUrl} variant="rounded" sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0, border: `1px solid ${BORD}` }} />
          ) : (
            <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0,
              background: `linear-gradient(135deg,hsl(${hue},50%,25%),hsl(${hue},40%,16%))`,
              border: `1.5px solid hsl(${hue},40%,30%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography fontWeight={900} fontSize={17} color={`hsl(${hue},80%,72%)`}>{store.name?.[0]?.toUpperCase()}</Typography>
            </Box>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.2 }}>
              <Typography fontWeight={800} fontSize={14} color={TXT} noWrap>{store.name}</Typography>
              {store.isPrimary && (
                <Box sx={{ px: 0.8, py: 0.1, borderRadius: '5px', bgcolor: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.22)' }}>
                  <Typography fontSize={9.5} fontWeight={800} color={OR}>PRINCIPALE</Typography>
                </Box>
              )}
              {store.isVerified && <Verified sx={{ fontSize: 13, color: GRN }} />}
              {!store.isActive && (
                <Box sx={{ px: 0.8, py: 0.1, borderRadius: '5px', bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Typography fontSize={9.5} fontWeight={800} color={RED}>INACTIVE</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <LocationOnOutlined sx={{ fontSize: 11, color: SUB }} />
              <Typography fontSize={11.5} color={SUB} noWrap>
                {[store.city, store.department].filter(Boolean).join(', ') || 'Localisation non définie'}
              </Typography>
            </Box>
          </Box>

          {/* Menu secondaire (copier / pause / supprimer) */}
          <Box sx={{ flexShrink: 0 }}>
            <Box onClick={(e) => setMenuEl(e.currentTarget)} sx={{ width: 30, height: 30, borderRadius: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: SUB2,
              border: `1px solid ${BORD}`, transition: 'all 0.13s',
              '&:hover': { bgcolor: 'rgba(15,23,42,0.06)' } }}>
              <MoreVert sx={{ fontSize: 17 }} />
            </Box>
            <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { borderRadius: '12px', border: `1px solid ${BORD}`, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', minWidth: 200 } }}>
              <MenuItem onClick={() => { setMenuEl(null); onCopy(store.slug); }} sx={{ fontSize: 13, gap: 1.2, py: 1.1 }}>
                <ContentCopy sx={{ fontSize: 16, color: SUB2 }} /> Copier le lien
              </MenuItem>
              {store.isActive ? (
                <MenuItem onClick={() => { setMenuEl(null); onToggleActive(store, false); }} sx={{ fontSize: 13, gap: 1.2, py: 1.1, color: '#B45309' }}>
                  <PauseCircleOutline sx={{ fontSize: 16 }} /> Mettre en pause
                </MenuItem>
              ) : (
                <MenuItem onClick={() => { setMenuEl(null); onToggleActive(store, true); }} sx={{ fontSize: 13, gap: 1.2, py: 1.1, color: '#047857' }}>
                  <PlayCircleOutline sx={{ fontSize: 16 }} /> Réactiver
                </MenuItem>
              )}
              {!store.isPrimary && (
                <MenuItem onClick={() => { setMenuEl(null); onDelete(store); }} sx={{ fontSize: 13, gap: 1.2, py: 1.1, color: RED }}>
                  <Delete sx={{ fontSize: 16 }} /> Supprimer définitivement
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Box>

        {/* Row 2: stats inline + link */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: '10px', overflow: 'hidden',
          border: `1px solid ${BORD}`, bgcolor: 'rgba(15,23,42,0.09)', mb: 1.2 }}>
          {[
            { icon: <Inventory2Outlined sx={{ fontSize: 12, color: OR }} />, val: store._count?.products ?? 0, lbl: 'produits' },
            { icon: <Star sx={{ fontSize: 12, color: '#F59E0B' }} />, val: (store.avgRating ?? 0).toFixed(1), lbl: `(${store.totalReviews ?? 0})` },
            { icon: <ShoppingBagOutlined sx={{ fontSize: 12, color: BLU }} />, val: store.totalSales ?? 0, lbl: 'ventes' },
            { icon: <VisibilityOutlined sx={{ fontSize: 12, color: '#8B5CF6' }} />, val: (store.totalViews ?? 0).toLocaleString(), lbl: 'vues' },
            { icon: <PeopleAltOutlined sx={{ fontSize: 12, color: GRN }} />, val: (store.followersCount ?? 0).toLocaleString(), lbl: 'abonnés' },
          ].map(({ icon, val, lbl }, i, arr) => (
            <Box key={i} sx={{ flex: 1, py: 0.9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
              borderRight: i < arr.length - 1 ? `1px solid ${BORD}` : 'none' }}>
              {icon}
              <Typography fontSize={12.5} fontWeight={800} color={TXT}>{val}</Typography>
              <Typography fontSize={10.5} color={SUB}>{lbl}</Typography>
            </Box>
          ))}
        </Box>

        {/* CTA principal — bien visible, c'est l'action la plus recherchée sur cette carte */}
        <Button fullWidth onClick={() => onEdit(store)} startIcon={<SettingsOutlined sx={{ fontSize: 16 }} />}
          sx={{ mb: 1.2, py: 1, borderRadius: '10px', fontWeight: 800, fontSize: 12.8, textTransform: 'none',
            bgcolor: 'rgba(255,107,0,0.1)', color: OR, border: '1px solid rgba(255,107,0,0.28)',
            '&:hover': { bgcolor: 'rgba(255,107,0,0.16)', borderColor: 'rgba(255,107,0,0.4)' } }}>
          Configurer la boutique
        </Button>

        {/* Link */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.2, py: 0.7, borderRadius: '8px',
          bgcolor: 'rgba(15,23,42,0.09)', border: `1px solid ${BORD}` }}>
          <Typography fontSize={11} color={SUB} sx={{ flex: 1, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            dealpam.com/store/{store.slug}
          </Typography>
          <Box onClick={() => window.open(`/store/${store.slug}`, '_blank')}
            sx={{ flexShrink: 0, cursor: 'pointer', display: 'flex', '&:hover': { color: TXT } }}>
            <OpenInNew sx={{ fontSize: 12, color: SUB }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function SellerStoresPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteStore, setDeleteStore] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['myStores'],
    queryFn: () => api.get('/stores/me/all').then(r => r.data),
  });
  const showSkel = useDelayedLoading(isLoading);

  const stores: any[]      = data?.stores   ?? [];
  const maxStores: number  = data?.maxStores ?? 1;
  const canCreate: boolean = data?.canCreate ?? false;

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/stores/me', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myStores'] }); qc.invalidateQueries({ queryKey: ['sellerStats'] }); setCreateOpen(false); enqueueSnackbar('Boutique créée !', { variant: 'success' }); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/stores/me/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['myStores'] }); setDeleteStore(null); enqueueSnackbar('Boutique supprimée', { variant: 'info' }); },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });
  // Alternative non destructive a la suppression : met la boutique et ses
  // produits publies en pause (reversible), au lieu de supprimer definitivement.
  const toggleActiveMut = useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      api.patch(`/stores/me/${id}/${activate ? 'reactivate' : 'deactivate'}`),
    onSuccess: (_data, { activate }) => {
      qc.invalidateQueries({ queryKey: ['myStores'] });
      qc.invalidateQueries({ queryKey: ['sellerProducts'] });
      enqueueSnackbar(activate ? 'Boutique réactivée' : 'Boutique mise en pause', { variant: 'success' });
    },
    onError: (e: any) => enqueueSnackbar(e.response?.data?.message || 'Erreur', { variant: 'error' }),
  });

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://dealpam.com/store/${slug}`);
    enqueueSnackbar('Lien copié !', { variant: 'info' });
  };

  const dialogPaper = { sx: { bgcolor: CARD, border: `1px solid ${BORD}`, borderRadius: '20px', color: TXT } };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: BG, minHeight: '100vh' }}>

      {/* Hero header — fusionne titre + statut du quota + CTA unique (plus de bouton dupliqué) */}
      <Box sx={{
        mb: 3, p: { xs: 2.5, md: 3 }, borderRadius: '20px', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 55%,#1E293B 100%)',
        display: 'flex', flexDirection: 'column', gap: canCreate ? 0 : 2,
      }}>
        <Box sx={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle,${(canCreate ? OR : BLU)}30,transparent 70%)` }} />

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${OR}22`, border: `1px solid ${OR}44` }}>
              <StorefrontOutlined sx={{ color: OR, fontSize: 26 }} />
            </Box>
            <Box>
              <Typography fontWeight={900} fontSize={{ xs: 19, md: 23 }} color="#fff" letterSpacing="-0.4px">Mes boutiques</Typography>
              <Typography fontSize={12.5} color="rgba(255,255,255,0.55)">
                {stores.length} / {maxStores} boutique{maxStores > 1 ? 's' : ''} utilisée{maxStores > 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          {canCreate ? (
            <Button onClick={() => setCreateOpen(true)} startIcon={<Add sx={{ fontSize: 18 }} />}
              sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2,
                boxShadow: '0 4px 14px rgba(255,107,0,0.35)', '&:hover': { bgcolor: '#E05A00' } }}>
              Nouvelle boutique
            </Button>
          ) : (
            <Button onClick={() => navigate('/seller/subscription')} endIcon={<ArrowForward sx={{ fontSize: 15 }} />}
              sx={{ bgcolor: BLU, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 2.5, py: 1.2,
                boxShadow: '0 4px 14px rgba(59,130,246,0.35)', '&:hover': { bgcolor: '#2563EB' } }}>
              Voir les plans
            </Button>
          )}
        </Box>

        {!canCreate && (
          <Box sx={{ position: 'relative', mt: 0.5, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography fontSize={12.5} color="rgba(255,255,255,0.6)">
              <strong style={{ color: '#fff' }}>Limite de {maxStores} boutique{maxStores > 1 ? 's' : ''} atteinte</strong> — passez
              au plan supérieur pour en créer davantage et développer votre activité.
            </Typography>
          </Box>
        )}
      </Box>

      {isLoading ? (
        showSkel ? (
          <Grid container spacing={2.5}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Grid item xs={12} md={6} key={i}><StoreCardSkeleton /></Grid>
            ))}
          </Grid>
        ) : null
      ) : stores.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 12, borderRadius: '20px', bgcolor: CARD, border: `1px dashed rgba(15,23,42,0.09)` }}>
          <Box sx={{ width: 80, height: 80, borderRadius: '24px', bgcolor: 'rgba(255,107,0,0.1)',
            border: '1px solid rgba(255,107,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <StorefrontOutlined sx={{ fontSize: 36, color: OR }} />
          </Box>
          <Typography fontWeight={800} fontSize={17} color={TXT} mb={0.8}>Aucune boutique créée</Typography>
          <Typography fontSize={13.5} color={SUB} mb={3.5}>Créez votre première boutique pour commencer à vendre sur DealPam</Typography>
          <Button startIcon={<Add />} onClick={() => setCreateOpen(true)}
            sx={{ bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 3, py: 1.2,
              boxShadow: '0 4px 14px rgba(255,107,0,0.3)', '&:hover': { bgcolor: '#E05A00' } }}>
            Créer ma première boutique
          </Button>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {stores.map((store: any) => (
            <Grid item xs={12} md={6} key={store.id}>
              <StoreCard store={store} onEdit={() => navigate('/seller/store')} onDelete={setDeleteStore} onCopy={copyLink}
                onToggleActive={(s: any, activate: boolean) => toggleActiveMut.mutate({ id: s.id, activate })} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create dialog */}
      <StoreDialog
        open={createOpen}
        title="Nouvelle boutique"
        onClose={() => setCreateOpen(false)}
        onSave={(d) => createMut.mutate(d)}
        loading={createMut.isPending}
      />

      <Dialog open={!!deleteStore} onClose={() => setDeleteStore(null)} maxWidth="xs" fullWidth PaperProps={dialogPaper}>
        <DialogTitle sx={{ color: TXT, fontWeight: 900, fontSize: 17 }}>Supprimer la boutique ?</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, borderRadius: '14px', bgcolor: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', mb: 1.5 }}>
            <Typography fontSize={13.5} color={SUB2} lineHeight={1.6}>
              La boutique <strong style={{ color: TXT }}>"{deleteStore?.name}"</strong> sera définitivement supprimée.
              Les produits associés doivent d'abord être déplacés.
            </Typography>
          </Box>
          <Typography fontSize={12.5} color={SUB} lineHeight={1.6}>
            Vous ne voulez pas la supprimer définitivement ? Utilisez plutôt l'icône <PauseCircleOutline sx={{ fontSize: 13, verticalAlign: 'middle' }} /> "Mettre en pause" sur la carte de la boutique — elle et ses produits publiés sont retirés de la vente sans rien supprimer, et vous pourrez les réactiver plus tard.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeleteStore(null)} sx={{ color: SUB2, borderRadius: '10px' }}>Annuler</Button>
          <Button onClick={() => deleteMut.mutate(deleteStore?.id)} disabled={deleteMut.isPending}
            startIcon={deleteMut.isPending ? <CircularProgress size={14} color="inherit" /> : <Delete sx={{ fontSize: 16 }} />}
            sx={{ bgcolor: RED, color: '#fff', borderRadius: '10px', fontWeight: 700, px: 2.5, '&:hover': { bgcolor: '#DC2626' } }}>
            {deleteMut.isPending ? 'Suppression…' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
