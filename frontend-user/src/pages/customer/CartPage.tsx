import { useState, useRef, useEffect } from 'react';
import {
  Typography, Box, Button, IconButton, CircularProgress, alpha, Tooltip,
  Collapse, Dialog, DialogContent,
} from '@mui/material';
import {
  Add, Remove, Delete, ShoppingBag, ArrowForward, LocalShipping, FlashOn,
  Lock, Shield, ChevronLeft, ChevronRight, DirectionsWalk, Phone, AttachMoney,
  AccountBalance, Smartphone, CreditCard, CheckCircle, MyLocation, Email,
  LocationOn, ChatBubbleOutline, Close, KeyboardArrowDown, KeyboardArrowUp,
  Storefront,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useCartStore } from '../../store/cart.store';
import { useAuthStore } from '../../store/auth.store';

const OR   = '#FF6B00';
const ORD  = '#E05A00';
const GRN  = '#10B981';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.09)';
const SHADOW = '0 2px 12px rgba(15,23,42,0.05)';
const fmt  = (v: number) => `${v.toLocaleString('fr-HT')} HTG`;

const HAITI_DEPTS = [
  { name: 'Ouest',      lat: 18.54, lng: -72.34 },
  { name: 'Sud',        lat: 18.20, lng: -73.75 },
  { name: "Grand'Anse", lat: 18.44, lng: -74.12 },
  { name: 'Nippes',     lat: 18.40, lng: -73.38 },
  { name: 'Artibonite', lat: 19.20, lng: -72.67 },
  { name: 'Centre',     lat: 19.15, lng: -71.85 },
  { name: 'Nord',       lat: 19.76, lng: -72.20 },
  { name: 'Nord-Est',   lat: 19.50, lng: -71.55 },
  { name: 'Nord-Ouest', lat: 19.83, lng: -73.08 },
  { name: 'Sud-Est',    lat: 18.24, lng: -72.53 },
];

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestDept(lat: number, lng: number) {
  return HAITI_DEPTS.reduce((b, d) => distKm(lat, lng, d.lat, d.lng) < distKm(lat, lng, b.lat, b.lng) ? d : b).name;
}

const PMI: Record<string, any>    = { MONCASH: Smartphone, NATCASH: Smartphone, CASH: AttachMoney, BANK_TRANSFER: AccountBalance, OTHER: CreditCard };
const PML: Record<string, string> = { MONCASH: 'MonCash', NATCASH: 'NatCash', CASH: 'Cash livraison', BANK_TRANSFER: 'Virement', OTHER: 'Autre' };

// ── Reco card ──────────────────────────────────────────────────────────────────
function RecoCard({ p }: { p: any }) {
  const { enqueueSnackbar } = useSnackbar();
  const qc = useQueryClient();
  const { fetchCount } = useCartStore();
  const [adding, setAdding] = useState(false);
  const isOnSale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const discount = isOnSale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  const img = p.images?.[0]?.urlMedium || p.images?.[0]?.url || '';
  const price = Number(p.salePrice || p.price);
  const addToCart = async () => {
    if (!localStorage.getItem('accessToken')) { enqueueSnackbar('Connectez-vous', { variant: 'info' }); return; }
    setAdding(true);
    try { await api.post('/cart/items', { productId: p.id, quantity: 1 }); qc.invalidateQueries({ queryKey: ['cart'] }); fetchCount(); enqueueSnackbar('Ajouté !', { variant: 'success' }); }
    catch { enqueueSnackbar('Erreur', { variant: 'error' }); } finally { setAdding(false); }
  };
  return (
    <Box sx={{ flexShrink: 0, width: 158, borderRadius: '16px', bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, overflow: 'hidden',
      transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', borderColor: alpha(OR, 0.3) } }}>
      <Box component={Link} to={`/products/${p.slug}`} sx={{ textDecoration: 'none', display: 'block', position: 'relative' }}>
        {isOnSale && <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2, bgcolor: OR, color: 'white', fontWeight: 900, fontSize: 10, px: 0.7, py: 0.15, borderRadius: '6px' }}>-{discount}%</Box>}
        <Box sx={{ height: 115, overflow: 'hidden', bgcolor: '#F1F5F9' }}>
          <Box component="img" src={img || 'https://placehold.co/300x200/111827/444?text=Photo'} alt={p.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.06)' } }} />
        </Box>
        <Box sx={{ p: 1.2 }}>
          <Typography fontSize={10.5} color="#64748B" noWrap>{p.store?.name}</Typography>
          <Typography fontSize={12} fontWeight={600} color="#0F172A" sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.35, minHeight: 30, mb: 0.4 }}>{p.name}</Typography>
          <Typography fontWeight={900} fontSize={13} color={OR}>{price.toLocaleString()} HTG</Typography>
        </Box>
      </Box>
      <Box sx={{ px: 1.2, pb: 1.2 }}>
        <Button fullWidth size="small" onClick={addToCart} disabled={adding}
          sx={{ bgcolor: alpha(OR, 0.1), color: OR, fontWeight: 700, fontSize: 11, borderRadius: '10px', py: 0.6, textTransform: 'none', border: `1px solid ${alpha(OR, 0.2)}`, boxShadow: 'none', '&:hover': { bgcolor: alpha(OR, 0.2) } }}>
          {adding ? <CircularProgress size={13} sx={{ color: OR }} /> : '+ Panier'}
        </Button>
      </Box>
    </Box>
  );
}

function RecoCarousel({ recos }: { recos: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: 'left' | 'right') => ref.current?.scrollBy({ left: d === 'left' ? -300 : 300, behavior: 'smooth' });
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5 }}>
        <Box sx={{ width: 3, height: 18, bgcolor: OR, borderRadius: 2 }} />
        <Typography fontWeight={800} fontSize={14} color="#475569" flex={1}>Profitez aussi de ces promos</Typography>
        <FlashOn sx={{ color: OR, fontSize: 15 }} />
        {(['left', 'right'] as const).map(d => (
          <IconButton key={d} size="small" onClick={() => scroll(d)}
            sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, width: 28, height: 28, '&:hover': { borderColor: OR } }}>
            {d === 'left' ? <ChevronLeft sx={{ fontSize: 16, color: '#64748B' }} /> : <ChevronRight sx={{ fontSize: 16, color: '#64748B' }} />}
          </IconButton>
        ))}
      </Box>
      <Box ref={ref} sx={{ display: 'flex', gap: 1.2, overflowX: 'auto', pb: 1, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {recos.map((p: any) => <RecoCard key={p.id} p={p} />)}
      </Box>
    </Box>
  );
}

// ── Seller contact modal ───────────────────────────────────────────────────────
function SellerModal({ open, onClose, opts, navigate }: any) {
  if (!opts) return null;
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{
      sx: { bgcolor: '#FFFFFF', border: `1px solid ${BORD}`, borderRadius: '20px', maxWidth: 360, width: '100%', m: 2 },
    }}>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(OR, 0.12), border: `1px solid ${alpha(OR, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Storefront sx={{ fontSize: 17, color: OR }} />
            </Box>
            <Typography fontWeight={800} fontSize={15} color="#0F172A">{opts.storeName}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: '#64748B', '&:hover': { color: '#0F172A' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Box sx={{ px: 2.5, pb: 2.5, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
          {opts.phone && (
            <Box component="a" href={`tel:${opts.phone}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.4, bgcolor: '#F7F8FA', borderRadius: '12px', border: `1px solid ${BORD}`, textDecoration: 'none', '&:hover': { borderColor: 'rgba(15,23,42,0.18)' } }}>
              <Phone sx={{ fontSize: 16, color: GRN }} />
              <Typography fontSize={13.5} fontWeight={600} color="#475569">{opts.phone}</Typography>
            </Box>
          )}
          {opts.email && (
            <Box component="a" href={`mailto:${opts.email}`}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.4, bgcolor: '#F7F8FA', borderRadius: '12px', border: `1px solid ${BORD}`, textDecoration: 'none', '&:hover': { borderColor: 'rgba(15,23,42,0.18)' } }}>
              <Email sx={{ fontSize: 16, color: '#60A5FA' }} />
              <Typography fontSize={13.5} fontWeight={600} color="#475569">{opts.email}</Typography>
            </Box>
          )}
          {(opts.address || opts.city) && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, p: 1.4, bgcolor: '#F7F8FA', borderRadius: '12px', border: `1px solid ${BORD}` }}>
              <LocationOn sx={{ fontSize: 16, color: '#F59E0B', mt: 0.1, flexShrink: 0 }} />
              <Typography fontSize={13} color="#475569">{[opts.address, opts.city, opts.department].filter(Boolean).join(', ')}</Typography>
            </Box>
          )}
          {opts.sellerUserId && (
            <Button fullWidth variant="contained" startIcon={<ChatBubbleOutline sx={{ fontSize: 16 }} />}
              onClick={() => { onClose(); navigate(`/account/messages/${opts.sellerUserId}`); }}
              sx={{ mt: 0.5, py: 1.2, bgcolor: OR, color: 'white', fontWeight: 700, fontSize: 13.5, borderRadius: '12px', textTransform: 'none', '&:hover': { bgcolor: ORD }, boxShadow: `0 4px 16px ${alpha(OR, 0.35)}` }}>
              Écrire au vendeur
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ── Store group ────────────────────────────────────────────────────────────────
function StoreGroup({ group, opts, onRemove, onUpdate, navigate }: any) {
  const [expanded, setExpanded] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <SellerModal open={contactOpen} onClose={() => setContactOpen(false)} opts={opts} navigate={navigate} />

      <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '20px', overflow: 'hidden', mb: 2 }}>

        {/* Store header */}
        <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 1.6, borderBottom: `1px solid ${BORD}`, display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: alpha(OR, 0.1), border: `1px solid ${alpha(OR, 0.18)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography fontSize={13} fontWeight={900} color={OR}>{group.store?.name?.[0]?.toUpperCase()}</Typography>
          </Box>
          <Typography fontWeight={700} fontSize={14} color="#475569" flex={1} noWrap>{group.store?.name}</Typography>
          <Button size="small" startIcon={<Phone sx={{ fontSize: 12 }} />} onClick={() => setContactOpen(true)}
            sx={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'none', borderRadius: '8px', px: 1.1, py: 0.4,
              border: `1px solid ${BORD}`, '&:hover': { color: OR, borderColor: alpha(OR, 0.3), bgcolor: alpha(OR, 0.05) }, flexShrink: 0 }}>
            Contacter
          </Button>
          <IconButton size="small" onClick={() => setExpanded(e => !e)}
            sx={{ color: '#64748B', width: 28, height: 28, ml: 0.5, '&:hover': { color: '#0F172A' } }}>
            {expanded ? <KeyboardArrowUp sx={{ fontSize: 17 }} /> : <KeyboardArrowDown sx={{ fontSize: 17 }} />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          {/* Items */}
          <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {group.items.map((item: any) => {
              const orig = Number(item.product?.price);
              const sale = item.product?.salePrice ? Number(item.product.salePrice) : null;
              const price = sale ?? orig;
              const isOnSale = sale != null && sale < orig;
              const discount = isOnSale ? Math.round((1 - sale! / orig) * 100) : 0;
              const img = item.product?.images?.[0]?.urlMedium || item.product?.images?.[0]?.url || '';
              const stock = item.product?.stock ?? 99;
              const atMax = item.quantity >= stock;

              return (
                <Box key={item.id} sx={{ display: 'flex', gap: { xs: 1.2, sm: 2 }, alignItems: 'center' }}>
                  <Box component={Link} to={`/products/${item.product?.slug}`}
                    sx={{ flexShrink: 0, width: { xs: 68, sm: 80 }, height: { xs: 68, sm: 80 }, borderRadius: '13px',
                      overflow: 'hidden', bgcolor: '#F1F5F9', border: `1px solid ${BORD}`,
                      textDecoration: 'none', display: 'block', position: 'relative' }}>
                    <Box component="img" src={img || 'https://placehold.co/90x90/111827/444?text=Photo'}
                      alt={item.product?.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isOnSale && (
                      <Box sx={{ position: 'absolute', top: 4, left: 4, bgcolor: OR, color: 'white', fontWeight: 900, fontSize: 9, px: 0.5, py: 0.1, borderRadius: '5px' }}>
                        -{discount}%
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography component={Link} to={`/products/${item.product?.slug}`}
                      fontSize={{ xs: 13, sm: 14 }} fontWeight={700} color="#0F172A"
                      sx={{ textDecoration: 'none', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4, mb: 0.4, '&:hover': { color: OR } }}>
                      {item.product?.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6 }}>
                      <Typography fontWeight={900} fontSize={14} color={OR}>{price.toLocaleString()} HTG</Typography>
                      {isOnSale && <Typography fontSize={11} color="#64748B" sx={{ textDecoration: 'line-through' }}>{orig.toLocaleString()}</Typography>}
                    </Box>
                  </Box>
                  <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8 }}>
                    <Typography fontWeight={800} fontSize={13.5} color="#0F172A">{(price * item.quantity).toLocaleString()} HTG</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, bgcolor: '#F1F5F9', borderRadius: '10px', px: 0.3 }}>
                      <IconButton size="small" onClick={() => onUpdate(item.id, item.quantity - 1)} disabled={item.quantity <= 1}
                        sx={{ width: 26, height: 26, color: '#64748B', '&:hover': { color: OR } }}>
                        <Remove sx={{ fontSize: 13 }} />
                      </IconButton>
                      <Typography fontWeight={700} fontSize={13} color="#0F172A" sx={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                      <IconButton size="small" onClick={() => onUpdate(item.id, item.quantity + 1)} disabled={atMax}
                        sx={{ width: 26, height: 26, color: '#64748B', '&:hover': { color: OR } }}>
                        <Add sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Box>
                    {atMax && <Typography fontSize={10.5} color="#F59E0B" fontWeight={700}>Stock max ({stock})</Typography>}
                    <Tooltip title="Retirer">
                      <IconButton size="small" onClick={() => onRemove(item.id)}
                        sx={{ color: '#CBD5E1', width: 24, height: 24, '&:hover': { color: '#EF4444', bgcolor: alpha('#EF4444', 0.08) } }}>
                        <Delete sx={{ fontSize: 13 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>

        </Collapse>
      </Box>
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CartPage() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { fetchCount } = useCartStore();
  const { user }  = useAuthStore();

  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'], queryFn: () => api.get('/cart').then(r => r.data), enabled: !!user, retry: 1,
  });

  const items: any[]    = cart?.items || [];
  const subtotal: number = cart?.total || 0;

  const storeGroups: Record<string, { store: any; items: any[] }> = {};
  items.forEach((item: any) => {
    const slug = item.product?.store?.slug || 'unknown';
    if (!storeGroups[slug]) storeGroups[slug] = { store: item.product?.store, items: [] };
    storeGroups[slug].items.push(item);
  });
  const storeSlugs = Object.keys(storeGroups);

  const optsQueries = useQueries({
    queries: storeSlugs.map(slug => ({
      queryKey: ['storeOptions', slug],
      queryFn:  () => api.get(`/stores/${slug}/options`).then(r => r.data),
      enabled:  !!slug && slug !== 'unknown',
      staleTime: 60_000,
    })),
  });
  const optsMap: Record<string, any> = {};
  storeSlugs.forEach((slug, i) => { optsMap[slug] = optsQueries[i]?.data; });

  const grandTotal = subtotal;

  const savings = items.reduce((acc: number, item: any) => {
    const o = Number(item.product?.price), s = Number(item.product?.salePrice);
    return s && s < o ? acc + (o - s) * item.quantity : acc;
  }, 0);

  const firstCategory = items[0]?.product?.category?.slug || '';
  const { data: recoData } = useQuery({
    queryKey: ['cart-recos', firstCategory],
    queryFn:  () => api.get('/products', { params: { hasSale: 'true', sort: 'discount', limit: 14, ...(firstCategory && { category: firstCategory }) } }).then(r => r.data?.data || []),
    enabled:  items.length > 0,
  });
  const cartIds = new Set(items.map((i: any) => i.product?.id));
  const recos   = ((recoData || []) as any[]).filter((p: any) => !cartIds.has(p.id)).slice(0, 10);

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: any) => api.patch(`/cart/items/${itemId}`, { quantity }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['cart'] }); fetchCount(); },
    onError:    (err: any) => enqueueSnackbar(err?.response?.data?.message || 'Erreur', { variant: 'error' }),
  });
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => api.delete(`/cart/items/${itemId}`),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['cart'] }); fetchCount(); enqueueSnackbar('Article retiré', { variant: 'info' }); },
  });

  if (isLoading) return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CircularProgress sx={{ color: OR }} />
    </Box>
  );

  if (!isLoading && items.length === 0) return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Box sx={{ textAlign: 'center', maxWidth: 380 }}>
        <Box sx={{ width: 80, height: 80, borderRadius: '24px', bgcolor: alpha(OR, 0.07), border: `1px solid ${alpha(OR, 0.13)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
          <ShoppingBag sx={{ fontSize: 36, color: OR }} />
        </Box>
        <Typography fontWeight={900} fontSize={22} color="#0F172A" mb={1}>Votre panier est vide</Typography>
        <Typography color="#64748B" fontSize={14} mb={4} lineHeight={1.7}>Découvrez nos produits et profitez des meilleures offres.</Typography>
        <Button component={Link} to="/products" variant="contained" endIcon={<ArrowForward />}
          sx={{ bgcolor: OR, color: 'white', fontWeight: 800, borderRadius: '14px', px: 3.5, py: 1.4, textTransform: 'none', fontSize: 15, '&:hover': { bgcolor: ORD }, boxShadow: `0 4px 20px ${alpha(OR, 0.4)}` }}>
          Voir les produits
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', pb: 8 }}>

      {/* Header */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 2.5 }, maxWidth: 1160, mx: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <ShoppingBag sx={{ color: OR, fontSize: 21 }} />
        <Typography fontWeight={900} fontSize={{ xs: 20, md: 23 }} color="#0F172A">Mon panier</Typography>
        <Box sx={{ px: 1.2, py: 0.3, borderRadius: '20px', bgcolor: alpha(OR, 0.1), border: `1px solid ${alpha(OR, 0.2)}` }}>
          <Typography fontSize={12} fontWeight={700} color={OR}>{items.length} article{items.length > 1 ? 's' : ''}</Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1160, mx: 'auto', px: { xs: 2, md: 4 }, display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>

        {/* LEFT */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {savings > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(GRN, 0.07), border: `1px solid ${alpha(GRN, 0.16)}`, borderRadius: '14px', px: 2, py: 1.2, mb: 2 }}>
              <FlashOn sx={{ color: GRN, fontSize: 16 }} />
              <Typography fontSize={13} fontWeight={700} color={GRN}>Vous économisez {savings.toLocaleString()} HTG sur cette commande !</Typography>
            </Box>
          )}

          {storeSlugs.map(slug => (
            <StoreGroup key={slug}
              slug={slug} group={storeGroups[slug]}
              opts={optsMap[slug]} navigate={navigate}
              onUpdate={(id: string, qty: number) => updateMutation.mutate({ itemId: id, quantity: qty })}
              onRemove={(id: string) => removeMutation.mutate(id)}
            />
          ))}

          {recos.length > 0 && <RecoCarousel recos={recos} />}
        </Box>

        {/* RIGHT: summary */}
        <Box sx={{ width: { xs: '100%', lg: 310 }, flexShrink: 0, position: { lg: 'sticky' }, top: 24 }}>
          <Box sx={{ bgcolor: CARD, border: `1px solid ${BORD}`, boxShadow: SHADOW, borderRadius: '20px', overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${BORD}` }}>
              <Typography fontWeight={800} fontSize={15} color="#0F172A">Récapitulatif</Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 2 }}>
              {items.map((item: any) => {
                const price = Number(item.product?.salePrice || item.product?.price);
                return (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.7, gap: 1 }}>
                    <Typography fontSize={12} color="#64748B" sx={{ flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                      {item.product?.name} × {item.quantity}
                    </Typography>
                    <Typography fontSize={12} fontWeight={600} color="#475569" flexShrink={0}>
                      {(price * item.quantity).toLocaleString()} HTG
                    </Typography>
                  </Box>
                );
              })}

              <Box sx={{ borderTop: `1px solid ${BORD}`, mt: 1.5, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontSize={13} color="#64748B">Sous-total</Typography>
                  <Typography fontSize={13} fontWeight={600} color="#475569">{fmt(subtotal)}</Typography>
                </Box>
                {savings > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography fontSize={13} color={GRN} fontWeight={600}>Économies</Typography>
                    <Typography fontSize={13} fontWeight={700} color={GRN}>-{savings.toLocaleString()} HTG</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontSize={12} color="#64748B">Livraison</Typography>
                  <Typography fontSize={12} color="#64748B">Calculée à l'étape suivante</Typography>
                </Box>
              </Box>

              <Box sx={{ borderTop: `1px solid ${BORD}`, mt: 1.5, pt: 2, mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography fontWeight={900} fontSize={16} color="#0F172A">Total</Typography>
                  <Typography fontWeight={900} fontSize={22} color={OR}>{fmt(grandTotal)}</Typography>
                </Box>
              </Box>

              <Button fullWidth variant="contained" onClick={() => navigate('/account/checkout')}
                endIcon={<ArrowForward />}
                sx={{ bgcolor: OR, color: 'white', fontWeight: 900, borderRadius: '14px', py: 1.5,
                  fontSize: 14.5, textTransform: 'none', '&:hover': { bgcolor: ORD }, boxShadow: `0 4px 20px ${alpha(OR, 0.45)}` }}>
                Commander maintenant
              </Button>

              <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                {[
                  { Icon: Lock,   text: 'Paiement direct au vendeur' },
                  { Icon: Shield, text: 'Vendeurs vérifiés DealPam' },
                ].map(({ Icon, text }) => (
                  <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Icon sx={{ fontSize: 13, color: '#CBD5E1' }} />
                    <Typography fontSize={12} color="#64748B">{text}</Typography>
                  </Box>
                ))}
              </Box>

              <Button fullWidth variant="text" component={Link} to="/products"
                sx={{ mt: 1.5, color: '#64748B', fontWeight: 600, fontSize: 12.5, textTransform: 'none', borderRadius: '10px', '&:hover': { color: OR } }}>
                ← Continuer mes achats
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
