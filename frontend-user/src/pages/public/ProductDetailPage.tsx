import React, { useState, useEffect, useRef, useCallback } from 'react';
import OptimizedImg from '../../components/shared/OptimizedImg';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, Avatar,
  CircularProgress, Rating, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import {
  Favorite, FavoriteBorder, Verified,
  LocalShipping, ChevronLeft, ChevronRight,
  FlashOn, LocationOn, CheckCircle, Phone, ContentCopy,
  Inventory, Warning, Close, ExpandMore, ExpandLess,
  NavigateNext, Security, Star, ArrowForward, ShoppingCart,
  Chat, MedicalServices,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { getViewerId } from '../../utils/viewerId';
import { discountPercent } from '../../utils/discount';
import { triggerFlyToCart } from '../../utils/flyToCart';
import { motion } from 'framer-motion';
import { ProductDetailSkeleton } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useFixedBottomBarOffset } from '../../hooks/useFixedBottomBarOffset';
import { parsePriceTiers, getEffectiveUnitPrice } from '../../utils/priceTiers';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';

/* ── palette (spec exacte) ───────────────────────────────────────────────── */
const NAVY       = '#0F1B2E'; // titres, avatar vendeur, boutons secondaires (contour)
const OR         = '#F5711A'; // CTA principal, accents actifs
const OR_HOVER   = '#DB5E0F';
const OR_BG      = '#FDECDF'; // fond badge stock/promo léger
const OR_TXT     = '#B84A0C'; // texte sur fond orange clair
const RED_BG     = '#FBE1DE'; // fond badge promo
const RED_TXT    = '#B3261E';
const GRN_BG     = '#E1F3E6'; // fond badge économie
const GRN_TXT    = '#1E7B3B';
const TEAL_BG    = '#E1F3EF'; // fond badge sécurité/livraison
const TEAL_TXT   = '#116B57';
const CARD       = '#FFFFFF'; // --surface
const BG_MUTED   = '#F5F5F3'; // --surface-muted
const BORD       = 'rgba(15,27,46,0.08)';
const SUB2       = '#5F5E5A'; // --text-secondary
const SUB        = '#888780'; // --text-muted
const TXT        = NAVY;
const BG         = CARD;
// Legacy aliases kept for the sections of this file not yet migrated to the new palette.
const RED  = RED_TXT;
const GRN  = GRN_TXT;
const GLD  = '#F59E0B';

const fmt = (v: number) => `${v.toLocaleString('fr-HT')} HTG`;
const fmtUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COND: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: 'Neuf',          color: GRN_TXT, bg: GRN_BG },
  refurbished: { label: 'Reconditionné', color: TEAL_TXT, bg: TEAL_BG },
  used:        { label: 'Occasion',      color: OR_TXT,  bg: OR_BG },
  damaged:     { label: 'Endommagé',     color: RED_TXT, bg: RED_BG },
};
const PRODUCT_TYPE_LABEL: Record<string, string> = {
  SERVICE: 'Service', RENTAL: 'Location', VEHICLE: 'Véhicule', FOOD: 'Alimentation',
  REAL_ESTATE: 'Immobilier', FREELANCE: 'Freelance',
};
const ATTR: Record<string, string> = {
  brand:'Marque',model:'Modèle',storage:'Stockage',ram:'RAM',network:'Réseau',
  os:'Système',screenSize:'Écran',battery:'Batterie',material:'Matière',
  gender:'Genre',style:'Style',year:'Année',mileage:'Km',fuel:'Carburant',
  transmission:'Boîte',doors:'Portes',weight:'Poids',expiry:'Expiration',
  volume:'Volume',skinType:'Type peau',duration:'Durée',locationType:'Lieu',
};

/* ── countdown "vente flash" banner — only shown when this exact product is
   part of the platform's real, admin-configured active flash sale, using its
   real end date (no fake/generic urgency timers) ─────────────────────────── */
function useCountdown(endAt?: string | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endAt) { setLeft(0); return; }
    const expiry = new Date(endAt).getTime();
    const tick = () => setLeft(Math.max(0, expiry - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);
  const h = String(Math.floor(left / 3_600_000)).padStart(2, '0');
  const m = String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, '0');
  const s = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  return { h, m, s, expired: left<=0 };
}

function CountdownBanner({ endAt, title }: { endAt?: string | null; title?: string }) {
  const { h, m, s, expired } = useCountdown(endAt);
  if (!endAt || expired) return null;
  return (
    <Box sx={{ display:'flex', alignItems:'center', gap:1.2, mb:2, px:1.6, py:1, borderRadius:'12px',
      background:`linear-gradient(135deg,#B91C1C,${RED})`, boxShadow:'0 6px 18px rgba(239,68,68,0.3)' }}>
      <FlashOn sx={{ fontSize:17, color:'#fff' }}/>
      <Typography fontSize={12.5} fontWeight={800} color="#fff" sx={{ flex:1 }}>{title||'Vente flash'} — se termine dans</Typography>
      <Box sx={{ display:'flex', gap:0.4 }}>
        {[h,m,s].map((v,i)=>(
          <React.Fragment key={i}>
            <Box sx={{ bgcolor:'rgba(0,0,0,0.25)', color:'#fff', fontWeight:900, fontSize:12.5,
              px:0.8, py:0.3, borderRadius:'6px', minWidth:26, textAlign:'center', fontVariantNumeric:'tabular-nums' }}>{v}</Box>
            {i<2&&<Typography color="#fff" fontWeight={800} sx={{ lineHeight:'22px' }}>:</Typography>}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}

function saveHist(p: any) {
  try {
    const prev: any[] = JSON.parse(localStorage.getItem('viewHistory') || '[]');
    const e = { slug:p.slug, name:p.name, img:p.images?.[0]?.urlThumb||'', price:Number(p.salePrice||p.price), catSlug:p.category?.slug||'' };
    localStorage.setItem('viewHistory', JSON.stringify([e,...prev.filter((x:any)=>x.slug!==p.slug)].slice(0,10)));
  } catch {}
}

/* ── Related product card (dark) ─────────────────────────────────────────── */
function MCard({ p, fluid }: { p: any; fluid?: boolean }) {
  const pr = Number(p.salePrice||p.price);
  const or = Number(p.price);
  const dc = discountPercent(p.price, p.salePrice);
  return (
    <Box component={Link} to={`/products/${p.slug}`}
      sx={fluid
        ? { textDecoration:'none', width:'100%' }
        : { textDecoration:'none', flexShrink:0, width:{ xs:148, sm:168, md:184 }, scrollSnapAlign:'start' }}>
      <Box sx={{ borderRadius:'16px', overflow:'hidden', bgcolor:CARD, border:`1px solid ${BORD}`,
        transition:'all 0.22s', '&:hover':{ transform:'translateY(-4px)', borderColor:'rgba(255,107,0,0.3)', boxShadow:'0 16px 32px rgba(15,23,42,0.12)' } }}>
        <Box sx={{ height:152, bgcolor:'rgba(15,23,42,0.04)', position:'relative', overflow:'hidden' }}>
          <Box component="img"
            src={p.img||p.images?.[0]?.urlThumb||p.images?.[0]?.urlMedium||'https://placehold.co/300x300/F1F5F9/94A3B8?text=+'}
            alt={p.name} loading="lazy" decoding="async"
            sx={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s', '&:hover':{ transform:'scale(1.07)' } }}/>
          {dc>0&&<Box sx={{ position:'absolute', top:8, left:8, bgcolor:RED, color:'#fff', fontWeight:800, fontSize:10, px:0.8, py:0.25, borderRadius:'6px' }}>-{dc}%</Box>}
        </Box>
        <Box sx={{ p:1.5 }}>
          <Typography fontSize={12} fontWeight={500} color={TXT} lineHeight={1.4}
            sx={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', mb:0.8, minHeight:30 }}>{p.name}</Typography>
          <Typography fontWeight={800} fontSize={13} color={OR}>{fmt(pr)}</Typography>
          {dc>0&&<Typography fontSize={11} color={SUB} sx={{ textDecoration:'line-through' }}>{fmt(or)}</Typography>}
        </Box>
      </Box>
    </Box>
  );
}

/* ── Produits similaires — grille responsive pleine largeur, jamais de vide disproportionné ── */
function SimilarProductsSection({ products }: { products:any[] }) {
  if (!products.length) return null;
  const few = products.length < 3;
  return (
    <Box sx={{ bgcolor:BG_MUTED, py:{ xs:4, md:5 } }}>
      <Box sx={{ maxWidth:1200, mx:'auto', px:{ xs:2, md:4 } }}>
        <Typography fontWeight={500} fontSize={19} color={TXT} mb={3}>Produits similaires</Typography>
        <Box sx={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',
          gap:2,
          ...(few ? { maxWidth:few&&products.length===1?280:620, mx:'auto' } : {}),
        }}>
          {products.map((p:any)=><MCard key={p.slug||p.id} p={p} fluid/>)}
        </Box>
      </Box>
    </Box>
  );
}

function MRow({ title, badge, products }: { title:string; badge?:string; products:any[] }) {
  if (!products.length) return null;
  return (
    <Box sx={{ mb:6 }}>
      <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2.5 }}>
        <Typography fontWeight={800} fontSize={17} color={TXT}>{title}</Typography>
        {badge&&<Box sx={{ bgcolor:RED, color:'#fff', fontWeight:800, fontSize:10, px:1, py:0.3, borderRadius:'6px' }}>{badge}</Box>}
      </Box>
      <Box sx={{ display:'flex', gap:1.5, overflowX:'auto', pb:1.5, scrollSnapType:'x mandatory',
        '&::-webkit-scrollbar':{ height:3 }, '&::-webkit-scrollbar-thumb':{ bgcolor:BORD, borderRadius:4 } }}>
        {products.map((p:any)=><MCard key={p.slug||p.id} p={p}/>)}
      </Box>
    </Box>
  );
}

function Skel() {
  return (
    <Box sx={{ bgcolor:BG, minHeight:'100vh' }}>
      <ProductDetailSkeleton />
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug:string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchCount } = useCartStore();
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const [idx,      setIdx]      = useState(0);
  const [lb,       setLb]       = useState(false);
  const [clr,      setClr]      = useState<string|null>(null);
  const [sz,       setSz]       = useState<string|null>(null);
  const [qty,      setQty]      = useState(1);
  const [tab,      setTab]      = useState<'desc'|'spec'|'rev'>('desc');
  const [liked,    setLiked]    = useState(false);
  const [lAnim,    setLAnim]    = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [inCart,   setInCart]   = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [more,     setMore]     = useState(false);
  const [hist,     setHist]     = useState<any[]>([]);
  const [apptOpen, setApptOpen] = useState(false);
  const [selectedSubServices, setSelectedSubServices] = useState<number[]>([]);
  const t0 = useRef(0);
  const zoomWrapRef = useRef<HTMLDivElement>(null);
  const zoomTicking = useRef(false);
  const onZoomMove = useCallback((e: React.MouseEvent) => {
    const wrap = zoomWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (!zoomTicking.current) {
      zoomTicking.current = true;
      requestAnimationFrame(() => {
        const img = wrap.querySelector('img');
        if (img) { img.style.transformOrigin = `${x}% ${y}%`; img.style.transform = 'scale(1.6)'; }
        zoomTicking.current = false;
      });
    }
  }, []);
  const onZoomLeave = useCallback(() => {
    const img = zoomWrapRef.current?.querySelector('img');
    if (img) img.style.transform = 'scale(1)';
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`, { headers: { 'x-viewer-id': getViewerId() } }).then(r => r.data),
    staleTime: 60_000,
  });
  const showSkel = useDelayedLoading(isLoading);
  const catSl = product?.category?.slug;
  const stId  = product?.store?.id || product?.storeId;
  const dept  = product?.department || user?.department || '';

  const { data: flashSale } = useQuery({ queryKey:['flash-sale-active'], queryFn:()=>api.get('/flash-sale/active').then(r=>r.data), staleTime:60_000 });
  const inFlashSale = !!flashSale?.isActive && !!flashSale?.products?.some((p:any)=>p.id===product?.id);

  const { data: simR  } = useQuery({ queryKey:['sim',catSl,slug],  queryFn:()=>api.get(`/products?category=${catSl}&limit=12`).then(r=>r.data?.data??[]), enabled:!!catSl });
  const { data: sponR } = useQuery({ queryKey:['spon',dept],        queryFn:()=>api.get(`/products?sponsored=true&department=${dept}&limit=10`).then(r=>r.data?.data??[]), enabled:true });
  const { data: stR   } = useQuery({ queryKey:['stprod',stId],      queryFn:()=>api.get(`/products?storeId=${stId}&limit=8`).then(r=>r.data?.data??[]), enabled:!!stId });
  // Cross-sell "autres services du même vendeur" — filtré côté serveur par productType pour
  // ne jamais mélanger un produit physique parmi des services (spec anti-bug §6).
  const { data: stSvcR } = useQuery({ queryKey:['stsvc',stId,product?.productType], queryFn:()=>api.get(`/products?storeId=${stId}&productType=${product?.productType}&limit=6`).then(r=>r.data?.data??[]), enabled:!!stId&&!!product?.requiresAppointment });
  useQuery({ queryKey:['wl',product?.id], queryFn:()=>api.get('/wishlist').then(r=>{ setLiked(r.data.some((w:any)=>w.productId===product?.id)); return r.data; }), enabled:!!product?.id&&!!user&&!!localStorage.getItem('accessToken') });
  const { data: miniCart } = useQuery({ queryKey:['cart-check',product?.id], queryFn:()=>api.get('/cart').then(r=>{ setInCart(r.data.items?.some((i:any)=>i.productId===product?.id)); return r.data; }), enabled:!!product?.id&&!!user&&!!localStorage.getItem('accessToken') });

  useEffect(()=>{ setIdx(0); setClr(null); setSz(null); }, [slug]);
  useEffect(()=>{
    if (product) {
      saveHist(product);
      setHist((JSON.parse(localStorage.getItem('viewHistory')||'[]') as any[]).filter((p:any)=>p.slug!==product.slug));
    }
  }, [product?.slug]);

  const variants: any[] = product?.variants ?? [];
  const colors = (()=>{ const a:{ color:string; hex:string; img:string|null }[]=[]; variants.forEach(v=>{ if(v.color&&!a.find(c=>c.color===v.color)) a.push({ color:v.color, hex:v.colorHex||'', img:v.imageUrl||null }); }); return a; })();

  // Variant background system : le fond de page s'adapte subtilement (teinte
  // légère, jamais opaque) à la couleur du variant sélectionné — cartes/texte
  // restent blancs/foncés comme d'habitude pour garder tout lisible.
  const selHex = colors.find(c => c.color === clr)?.hex || '';
  const pageBg = (()=>{
    if (!selHex || !/^#[0-9a-fA-F]{6}$/.test(selHex)) return undefined;
    const r = parseInt(selHex.slice(1,3),16), g = parseInt(selHex.slice(3,5),16), b = parseInt(selHex.slice(5,7),16);
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    // Couleur sombre (ex: noir) → wash sombre ; couleur claire (ex: crème) → wash clair
    return luminance < 0.35
      ? `linear-gradient(180deg, rgba(${r},${g},${b},0.16), ${BG} 55%)`
      : `linear-gradient(180deg, rgba(${r},${g},${b},0.10), ${BG} 45%)`;
  })();
  const sizes  = clr ? [...new Set(variants.filter((v:any)=>v.color===clr&&v.size).map((v:any)=>v.size))] : [...new Set(variants.filter((v:any)=>v.size).map((v:any)=>v.size))];
  const av     = variants.find((v:any)=>(!clr||v.color===clr)&&(!sz||v.size===sz))??null;
  const cur    = av?.priceOverride ? Number(av.priceOverride) : Number(product?.salePrice||product?.price||0);
  const orig   = Number(product?.price||0);
  const sale   = cur < orig;
  const disc   = sale ? Math.round((1-cur/orig)*100) : 0;
  const save   = sale ? orig-cur : 0;

  // Prix dégressifs par quantité (bundles) — jamais inventés, uniquement ceux
  // configurés par le vendeur. Le prix affiché/facturé suit la quantité choisie.
  const priceTiers  = parsePriceTiers(product?.priceTiers);
  const minOrderQty = product?.minOrderQty || 1;
  const effUnit     = getEffectiveUnitPrice(orig, product?.salePrice, product?.priceTiers, qty);

  useEffect(() => { if (product) setQty(minOrderQty); }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Devise d'affichage — les prix sont toujours stockés en HTG en base ;
  // la conversion se fait uniquement à l'affichage, via le taux du vendeur.
  const storeCurrency = product?.store?.currency || 'HTG';
  const exchangeRate  = product?.store?.exchangeRate ? Number(product.store.exchangeRate) : null;
  const [displayCurrency, setDisplayCurrency] = useState<'HTG'|'USD'>(storeCurrency === 'USD' ? 'USD' : 'HTG');
  useEffect(() => { setDisplayCurrency(storeCurrency === 'USD' ? 'USD' : 'HTG'); }, [storeCurrency, product?.id]);
  const fmtDisplay = (v: number) => displayCurrency === 'USD' && exchangeRate
    ? fmtUSD(v / exchangeRate)
    : fmt(v);
  const stock  = (av?.stock??null)!==null ? av!.stock : (product?.stock??0);

  const pImgs: any[] = product?.images??[];
  const vImg  = clr&&av?.imageUrl ? { urlFull:av.imageUrl, urlMedium:av.imageUrl, urlThumb:av.imageUrl } : null;
  const allI  = vImg ? [vImg,...pImgs] : pImgs;
  const ci    = allI[idx];
  const src   = ci?.urlFull||ci?.urlMedium||ci?.urlThumb||'https://placehold.co/900x900/F1F5F9/94A3B8?text=Photo';

  const sim  = (simR ??[]).filter((p:any)=>p.slug!==slug).slice(0,10);
  const spon = (sponR??[]).filter((p:any)=>p.slug!==slug).slice(0,10);
  const stP  = (stR  ??[]).filter((p:any)=>p.slug!==slug).slice(0,8);
  const stSvc = (stSvcR??[]).filter((p:any)=>p.slug!==slug).slice(0,6);
  const attrs: Record<string,string> = typeof product?.attributes==='object'&&product.attributes ? product.attributes : {};
  const hasA  = Object.keys(attrs).length>0;
  const serviceConfig: Record<string,any> = (() => {
    try { return typeof product?.serviceConfig==='string' ? JSON.parse(product.serviceConfig) : (product?.serviceConfig||{}); }
    catch { return {}; }
  })();
  const ingredients = attrs.ingredients || serviceConfig.ingredients;
  const desc  = product?.description||'';
  const descS = desc.length>500&&!more ? desc.slice(0,500)+'…' : desc;

  const prev = useCallback((e?:any)=>{ e?.stopPropagation(); setIdx(i=>Math.max(0,i-1)); }, []);
  const next = useCallback((e?:any)=>{ e?.stopPropagation(); setIdx(i=>Math.min(allI.length-1,i+1)); }, [allI.length]);
  const onTS = (e:React.TouchEvent)=>{ t0.current=e.touches[0].clientX; };
  const onTE = (e:React.TouchEvent)=>{ const d=t0.current-e.changedTouches[0].clientX; if(Math.abs(d)>40){ d>0?next():prev(); } };

  /* ── add to cart (first CTA state) ─────────────────────────────────────── */
  const addToCart = async () => {
    if (!user || !localStorage.getItem('accessToken')) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (colors.length > 0 && !clr) {
      document.getElementById('color-picker')?.scrollIntoView({ behavior:'smooth', block:'center' });
      enqueueSnackbar('Veuillez choisir une couleur', { variant:'warning' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/cart/items', { productId:product.id, quantity:qty, color:clr||undefined, size:sz||undefined, variantId:av?.id||undefined });
      await fetchCount();
      qc.invalidateQueries({ queryKey:['cart'] });
      setInCart(true);
      triggerFlyToCart(zoomWrapRef.current, ci?.urlThumb || ci?.urlMedium);
      enqueueSnackbar('Ajouté au panier !', { variant:'success' });
    } catch(err:any) {
      if (err?.response?.status === 401) navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      else enqueueSnackbar(err?.response?.data?.message || "Erreur lors de l'ajout", { variant:'error' });
    } finally { setLoading(false); }
  };

  /* ── faire une offre de prix ─────────────────────────────────────────────── */
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMsg, setOfferMsg] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);

  const submitOffer = async () => {
    if (!user || !localStorage.getItem('accessToken')) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const val = Number(offerPrice);
    if (!val || val <= 0) {
      enqueueSnackbar('Veuillez entrer un montant valide', { variant:'warning' });
      return;
    }
    if (product?.minOfferPriceHTG && val < Number(product.minOfferPriceHTG)) {
      enqueueSnackbar(`L'offre minimum acceptée est de ${Number(product.minOfferPriceHTG).toLocaleString()} HTG`, { variant:'warning' });
      return;
    }
    setOfferLoading(true);
    try {
      await api.post('/cart/items', { productId: product.id, quantity: 1, offeredPrice: val });
      await fetchCount();
      qc.invalidateQueries({ queryKey:['cart'] });
      enqueueSnackbar("Offre ajoutée au panier — finalisez votre commande pour l'envoyer au vendeur", { variant:'success' });
      setOfferOpen(false);
      setOfferPrice(''); setOfferMsg('');
    } catch(err:any) {
      if (err?.response?.status === 401) navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      else enqueueSnackbar(err?.response?.data?.message || "Erreur lors de l'envoi de l'offre", { variant:'error' });
    } finally { setOfferLoading(false); }
  };

  /* ── go to checkout (second CTA state) ──────────────────────────────────── */
  const placeOrder = () => navigate('/account/checkout');

  /* ── "Acheter maintenant" — add to cart (if needed) then jump straight to checkout ── */
  const buyNow = async () => {
    if (!user || !localStorage.getItem('accessToken')) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (colors.length > 0 && !clr) {
      document.getElementById('color-picker')?.scrollIntoView({ behavior:'smooth', block:'center' });
      enqueueSnackbar('Veuillez choisir une couleur', { variant:'warning' });
      return;
    }
    if (inCart) { placeOrder(); return; }
    setLoading(true);
    try {
      await api.post('/cart/items', { productId:product.id, quantity:qty, color:clr||undefined, size:sz||undefined, variantId:av?.id||undefined });
      await fetchCount();
      qc.invalidateQueries({ queryKey:['cart'] });
      setInCart(true);
      placeOrder();
    } catch(err:any) {
      if (err?.response?.status === 401) navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      else enqueueSnackbar(err?.response?.data?.message || "Erreur lors de l'ajout", { variant:'error' });
    } finally { setLoading(false); }
  };

  /* ── open platform chat with seller ─────────────────────────────────────── */
  const contactSeller = async () => {
    if (!user || !localStorage.getItem('accessToken')) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const sellerUserId = product?.store?.seller?.userId;
    if (!sellerUserId) {
      enqueueSnackbar('Impossible de contacter ce vendeur', { variant:'error' });
      return;
    }
    // La route /account/messages/:userId attend l'ID de l'utilisateur vendeur, pas l'ID
    // de la conversation — MessagesPage se charge elle-même de créer/récupérer la conversation.
    navigate(`/account/messages/${sellerUserId}`);
  };

  const toggleWL = async () => {
    if (!user||!localStorage.getItem('accessToken')) { navigate('/login'); return; }
    try {
      if (liked) { await api.delete(`/wishlist/${product.id}`); setLiked(false); enqueueSnackbar('Retiré des favoris', { variant:'info' }); }
      else { await api.post('/wishlist', { productId:product.id }); setLiked(true); setLAnim(true); setTimeout(()=>setLAnim(false),600); enqueueSnackbar('Ajouté aux favoris', { variant:'success' }); }
    } catch {}
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false),2000); enqueueSnackbar('Lien copié !', { variant:'info' }); };

  const stickyBarRef = useFixedBottomBarOffset<HTMLDivElement>(!!product && !product.requiresAppointment);

  if (isLoading) return showSkel ? <Skel/> : null;
  if (!product) return (
    <Box sx={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', bgcolor:BG, px:3 }}>
      <Box sx={{ textAlign:'center', maxWidth:420 }}>
        <Box sx={{ width:120, height:120, mx:'auto', mb:4, borderRadius:'50%',
          background:'linear-gradient(135deg,rgba(255,107,0,0.12),rgba(255,107,0,0.04))',
          border:`1px solid rgba(255,107,0,0.2)`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Inventory sx={{ fontSize:52, color:'#FF6B00' }}/>
        </Box>
        <Typography sx={{ fontSize:{ xs:22, md:28 }, fontWeight:900, color:TXT, mb:1.5 }}>Produit introuvable</Typography>
        <Typography sx={{ fontSize:15, color:SUB, mb:4, lineHeight:1.7 }}>
          Ce produit n'existe pas ou a été retiré de la vente.
        </Typography>
        <Box sx={{ display:'flex', gap:1.5, justifyContent:'center', flexWrap:'wrap' }}>
          <Button component={Link} to="/products"
            sx={{ bgcolor:OR, color:'#fff', borderRadius:'12px', px:4, py:1.4, fontWeight:700,
              boxShadow:'0 4px 16px rgba(255,107,0,0.3)', '&:hover':{ bgcolor:'#E05A00' } }}>
            Voir tous les produits
          </Button>
          <Button component={Link} to="/home" variant="outlined"
            sx={{ borderRadius:'12px', px:4, py:1.4, fontWeight:600, borderColor:BORD, color:SUB2,
              '&:hover':{ borderColor:'rgba(15,23,42,0.16)' } }}>
            Accueil
          </Button>
        </Box>
      </Box>
    </Box>
  );

  const cond        = COND[product.condition??'new'] ?? COND.new;
  const needsColor  = colors.length > 0 && !clr;
  const ctaDisabled = loading || stock === 0;
  const isPhysical  = !product.productType || product.productType === 'PHYSICAL';
  const showPurchaseFlow = !product.requiresAppointment;
  // Un vendeur ne peut jamais acheter son propre produit — remplacé par une
  // mention discrète plutôt qu'un bouton qui échouerait de toute façon côté serveur.
  const isOwnProduct = !!user && !!product?.store?.seller?.userId && product.store.seller.userId === user.id;

  return (
    <Box sx={{ bgcolor:BG, background:pageBg||BG, minHeight:'100vh', pb:{ xs:14, md:6 }, transition:'background 0.5s ease' }}>

      {/* ══ CONTENT ═════════════════════════════════════════════════════════ */}
      <Box sx={{ maxWidth:1200, mx:'auto', px:{ xs:0, md:4 } }}>
        <Box sx={{ display:'flex', gap:{ xs:0, lg:4 }, alignItems:'flex-start', flexWrap:{ xs:'wrap', lg:'nowrap' } }}>

          {/* ── GALLERY COLUMN ────────────────────────────────────────────── */}
          <Box sx={{
            width:{ xs:'100%', lg:'44%' }, flexShrink:0,
            position:{ lg:'sticky' }, top:{ lg:96 },
          }}>
            <Box sx={{ display:'flex', flexDirection:{ xs:'column', lg:'row' }, gap:1.2 }}>

              {/* vertical thumbnail rail — desktop only, Amazon/Shein-style */}
              {allI.length>1&&(
                <Box sx={{ display:{ xs:'none', lg:'flex' }, flexDirection:'column', gap:1, width:64, flexShrink:0,
                  maxHeight:'100%', overflowY:'auto', alignSelf:'stretch',
                  '&::-webkit-scrollbar':{ width:3 }, '&::-webkit-scrollbar-thumb':{ bgcolor:BORD, borderRadius:4 } }}>
                  {allI.map((im:any,i:number)=>(
                    <Box key={i} onClick={()=>setIdx(i)}
                      sx={{ flexShrink:0, width:64, height:64, borderRadius:'10px', overflow:'hidden', cursor:'pointer',
                        bgcolor:'rgba(15,23,42,0.05)',
                        outline:`2px solid ${i===idx?OR:'transparent'}`, outlineOffset:2,
                        opacity:i===idx?1:0.6,
                        transition:'all 0.15s', '&:hover':{ outlineColor:'rgba(255,107,0,0.5)', opacity:1 } }}>
                      <img src={im.urlThumb||im.urlMedium||im.urlFull} alt={`${product.name} — photo ${i + 1}`} loading="lazy" decoding="async"
                        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                    </Box>
                  ))}
                </Box>
              )}

              <Box sx={{ position:'relative', bgcolor:CARD, borderRadius:{ xs:0, md:'24px' },
                border:{ xs:'none', md:`1px solid ${BORD}` }, flex:1, minWidth:0,
                boxShadow:{ xs:'none', md:'0 8px 32px rgba(15,23,42,0.06)' },
                aspectRatio:'1 / 1', width:'100%', overflow:'hidden' }}>

                <Box ref={zoomWrapRef} onTouchStart={onTS} onTouchEnd={onTE} onClick={()=>setLb(true)}
                  onMouseMove={onZoomMove} onMouseLeave={onZoomLeave}
                  sx={{ width:'100%', height:'100%', cursor:'zoom-in', overflow:'hidden',
                    '& img':{ objectFit:'contain !important', transition:'transform 0.3s ease', willChange:'transform' } }}>
                  <OptimizedImg images={ci ?? {}} alt={product.name} mode="detail" eager={idx === 0} style={{ objectFit:'contain' }}/>
                </Box>

                <Box sx={{ position:'absolute', bottom:0, left:0, right:0, height:120,
                  background:`linear-gradient(to top,${BG},transparent)`, pointerEvents:'none' }}/>

                {sale&&(
                  <Box sx={{ position:'absolute', top:16, left:16,
                    background:`linear-gradient(135deg,#B91C1C,${RED})`,
                    color:'#fff', fontWeight:900, fontSize:{ xs:13, md:16 },
                    px:{ xs:1.5, md:2 }, py:{ xs:0.5, md:0.7 },
                    borderRadius:'12px', boxShadow:'0 6px 18px rgba(239,68,68,0.45)',
                    letterSpacing:'-0.3px' }}>
                    -{disc}%
                  </Box>
                )}

                <Box sx={{ position:'absolute', top:12, right:12, display:'flex', flexDirection:'column', gap:1 }}>
                  {[
                    { icon: liked
                        ? <Favorite sx={{ fontSize:18, color:RED, transform:lAnim?'scale(1.5)':'scale(1)', transition:'transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275)' }}/>
                        : <FavoriteBorder sx={{ fontSize:18, color:TXT }}/>,
                      action: toggleWL },
                    { icon: copied ? <CheckCircle sx={{ fontSize:18, color:GRN }}/> : <ContentCopy sx={{ fontSize:18, color:TXT }}/>, action: copyLink },
                  ].map((b,i)=>(
                    <IconButton key={i} onClick={b.action}
                      sx={{ width:38, height:38, bgcolor:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)',
                        border:`1px solid ${BORD}`, transition:'all 0.16s',
                        '&:hover':{ bgcolor:'rgba(255,107,0,0.15)', borderColor:'rgba(255,107,0,0.4)' } }}>
                      {b.icon}
                    </IconButton>
                  ))}
                </Box>

                {allI.length>1&&idx>0&&(
                  <IconButton onClick={prev} sx={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)',
                    bgcolor:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)', border:`1px solid ${BORD}`,
                    color:TXT, width:38, height:38, '&:hover':{ bgcolor:'rgba(255,107,0,0.15)' }, transition:'all 0.15s' }}>
                    <ChevronLeft/>
                  </IconButton>
                )}
                {allI.length>1&&idx<allI.length-1&&(
                  <IconButton onClick={next} sx={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                    bgcolor:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)', border:`1px solid ${BORD}`,
                    color:TXT, width:38, height:38, '&:hover':{ bgcolor:'rgba(255,107,0,0.15)' }, transition:'all 0.15s' }}>
                    <ChevronRight/>
                  </IconButton>
                )}

                {allI.length>1&&(
                  <Box sx={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', display:'flex', gap:0.7 }}>
                    {allI.map((_:any,i:number)=>(
                      <Box key={i} onClick={e=>{ e.stopPropagation(); setIdx(i); }}
                        sx={{ width:i===idx?20:6, height:6, borderRadius:4,
                          bgcolor:i===idx?OR:'rgba(15,23,42,0.2)', transition:'all 0.22s', cursor:'pointer' }}/>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            {/* thumbnails — mobile / tablet only (horizontal scroll strip) */}
            {allI.length>1&&(
              <Box sx={{ display:{ xs:'flex', lg:'none' }, gap:1, py:1.5, px:{ xs:2, md:0 }, overflowX:'auto',
                '&::-webkit-scrollbar':{ height:3 }, '&::-webkit-scrollbar-thumb':{ bgcolor:BORD, borderRadius:4 } }}>
                {allI.map((im:any,i:number)=>(
                  <Box key={i} onClick={()=>setIdx(i)}
                    sx={{ flexShrink:0, width:56, height:56, borderRadius:'10px', overflow:'hidden', cursor:'pointer',
                      bgcolor:'rgba(15,23,42,0.05)',
                      outline:`2px solid ${i===idx?OR:'transparent'}`, outlineOffset:2,
                      transition:'all 0.15s', '&:hover':{ outlineColor:'rgba(255,107,0,0.5)' } }}>
                    <img src={im.urlThumb||im.urlMedium||im.urlFull} alt={`${product.name} — photo ${i + 1}`} loading="lazy" decoding="async"
                      style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* ── LEFT ──────────────────────────────────────────────────────── */}
          <Box sx={{ flex:1, minWidth:0, px:{ xs:2.5, md:3 }, py:3 }}>

            {/* breadcrumb */}
            <Box sx={{ display:'flex', alignItems:'center', gap:0.5, flexWrap:'wrap', mb:2.5 }}>
              {[['Accueil','/home'],['Produits','/products'],...(product.category?[[product.category.name,`/products?category=${product.category.slug}`]]:[])].map(([label,to])=>(
                <Box key={to} sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                  <Box component={Link} to={to} sx={{ fontSize:12, fontWeight:600, color:OR, textDecoration:'none', '&:hover':{ textDecoration:'underline' } }}>{label}</Box>
                  <NavigateNext sx={{ fontSize:12, color:SUB }}/>
                </Box>
              ))}
              <Typography fontSize={12} color={SUB} noWrap sx={{ maxWidth:180 }}>{product.name}</Typography>
            </Box>

            {product.requiresAppointment ? (
              <ServiceInfoPanel
                product={product} serviceConfig={serviceConfig}
                chatLoading={chatLoading} contactSeller={contactSeller}
                selectedSubServices={selectedSubServices} setSelectedSubServices={setSelectedSubServices}
                onBook={()=>setApptOpen(true)} otherServices={stSvc}
              />
            ) : (<>
            {/* tags */}
            <Box sx={{ display:'flex', gap:1, mb:2.5, flexWrap:'wrap' }}>
              {isPhysical&&(
                <Box sx={{ px:1.4, py:0.4, borderRadius:'20px', bgcolor:cond.bg, border:`1px solid ${cond.color}40` }}>
                  <Typography fontSize={11} fontWeight={700} color={cond.color} letterSpacing="0.5px" textTransform="uppercase">{cond.label}</Typography>
                </Box>
              )}
              {product.brand&&(
                <Box sx={{ px:1.4, py:0.4, borderRadius:'20px', bgcolor:'rgba(15,23,42,0.06)', border:`1px solid ${BORD}` }}>
                  <Typography fontSize={11} fontWeight={700} color={SUB2} letterSpacing="0.5px" textTransform="uppercase">{product.brand.name}</Typography>
                </Box>
              )}
              {sale&&(
                <Box sx={{ px:1.4, py:0.4, borderRadius:'20px', bgcolor:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', display:'flex', alignItems:'center', gap:0.4 }}>
                  <FlashOn sx={{ fontSize:12, color:RED }}/>
                  <Typography fontSize={11} fontWeight={700} color={RED}>PROMO -{disc}%</Typography>
                </Box>
              )}
              {product.productType && product.productType !== 'PHYSICAL' && (
                <Box sx={{ px:1.4, py:0.4, borderRadius:'20px', bgcolor:'rgba(99,102,241,0.14)', border:'1px solid rgba(99,102,241,0.35)' }}>
                  <Typography fontSize={11} fontWeight={700} color="#818CF8" letterSpacing="0.5px" textTransform="uppercase">
                    {PRODUCT_TYPE_LABEL[product.productType] ?? 'Alimentation'}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* limited edition badge — vendeur-activé, réservé aux produits vraiment exclusifs */}
            {product.isLimitedEdition && (
              <Typography sx={{
                fontFamily:'"Segoe Script","Brush Script MT",cursive', fontSize:{ xs:20, md:24 },
                color:'#FF3B3B', mb:0.5, letterSpacing:'0.5px',
                textShadow:'0 0 6px rgba(255,59,59,0.65), 0 0 14px rgba(255,59,59,0.4)',
                animation:'dp-neon-pulse 2.4s ease-in-out infinite',
                '@keyframes dp-neon-pulse': {
                  '0%,100%':{ textShadow:'0 0 6px rgba(255,59,59,0.65), 0 0 14px rgba(255,59,59,0.4)' },
                  '50%':{ textShadow:'0 0 10px rgba(255,59,59,0.9), 0 0 22px rgba(255,59,59,0.6)' },
                },
              }}>
                Édition limitée
              </Typography>
            )}

            {/* title — légèrement réduit quand le badge édition limitée est affiché */}
            <Typography component="h1" fontWeight={500} color={TXT}
              sx={{ fontSize: product.isLimitedEdition ? { xs:20, sm:24, md:27 } : { xs:22, sm:26, md:30 }, lineHeight:1.25, letterSpacing:'-0.3px', mb:0.5 }}>
              {product.name}
            </Typography>
            {product.category?.name&&(
              <Typography fontSize={13} color={SUB} mb={1.5}>{product.category.name}</Typography>
            )}

            {/* rating */}
            {product.avgRating>0 ? (
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:2.5, flexWrap:'wrap' }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:0.4 }}>
                  <Rating value={product.avgRating} precision={0.5} readOnly size="small" sx={{ '& .MuiRating-iconFilled':{ color:GLD } }}/>
                  <Typography fontSize={14} fontWeight={800} color={TXT} ml={0.4}>{product.avgRating.toFixed(1)}</Typography>
                </Box>
                <Typography fontSize={13} color={SUB}>({product.totalReviews} avis)</Typography>
                <Box sx={{ width:'1px', height:14, bgcolor:BORD }}/>
                <Typography fontSize={13} color={SUB}>{product.totalSold??0} vendus</Typography>
              </Box>
            ) : (
              <Typography fontSize={12.5} color={SUB} mb={2.5}>
                Aucun avis — <Box component="span" onClick={()=>setTab('rev')} sx={{ color:OR, fontWeight:500, cursor:'pointer', '&:hover':{ textDecoration:'underline' } }}>soyez le premier</Box>
              </Typography>
            )}

            {/* adresse complète — essentiel pour un produit physique livré/retiré sur place */}
            {product.address&&(
              <Box sx={{ display:'flex', alignItems:'flex-start', gap:0.7, mb:2 }}>
                <LocationOn sx={{ fontSize:15, color:SUB, mt:0.2, flexShrink:0 }}/>
                <Typography fontSize={13.5} color={SUB2}>{product.address}{(product.city||product.department)?`, ${[product.city,product.department].filter(Boolean).join(', ')}`:''}</Typography>
              </Box>
            )}

            {/* price block */}
            <Box sx={{ mb:2 }}>
              {inFlashSale&&sale&&<CountdownBanner endAt={flashSale?.endAt} title={flashSale?.title}/>}
              {exchangeRate&&(
                <Box sx={{ display:'inline-flex', borderRadius:'8px', border:`1px solid ${BORD}`, overflow:'hidden', mb:1 }}>
                  {(['HTG','USD'] as const).map(c=>(
                    <Box key={c} onClick={()=>setDisplayCurrency(c)} sx={{ px:1.4, py:0.4, cursor:'pointer',
                      bgcolor:displayCurrency===c?OR:'transparent', color:displayCurrency===c?'#fff':SUB,
                      fontSize:11, fontWeight:500 }}>{c}</Box>
                  ))}
                </Box>
              )}
              <Box sx={{ display:'flex', alignItems:'baseline', gap:1.5, mb:sale?1:0, flexWrap:'wrap' }}>
                <Typography fontWeight={500} color={TXT} sx={{ fontSize:{ xs:32, md:38 }, lineHeight:1, letterSpacing:'-0.5px' }}>
                  {fmtDisplay(cur)}
                </Typography>
                {sale&&<Typography color={SUB} sx={{ fontSize:{ xs:17, md:19 }, textDecoration:'line-through', fontWeight:400 }}>{fmtDisplay(orig)}</Typography>}
                {sale&&(
                  <Box sx={{ display:'inline-flex', alignItems:'center', px:1.2, py:0.4, borderRadius:'8px', bgcolor:GRN_BG }}>
                    <Typography fontSize={12.5} fontWeight={500} color={GRN_TXT}>économisez {fmtDisplay(save)}</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* info badges row — stock, localisation, livraison */}
            <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:2, flexWrap:'wrap' }}>
              {isPhysical&&(
                stock>0 ? (
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.5, px:1.2, py:0.5, borderRadius:'8px', bgcolor:stock<=5?OR_BG:GRN_BG }}>
                    {stock<=5?<Warning sx={{ fontSize:13, color:OR_TXT }}/>:<CheckCircle sx={{ fontSize:13, color:GRN_TXT }}/>}
                    <Typography fontSize={12.5} fontWeight={500} color={stock<=5?OR_TXT:GRN_TXT}>{stock<=5?`plus que ${stock} en stock`:`${stock} disponibles`}</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.5, px:1.2, py:0.5, borderRadius:'8px', bgcolor:RED_BG }}>
                    <Inventory sx={{ fontSize:13, color:RED_TXT }}/>
                    <Typography fontSize={12.5} fontWeight={500} color={RED_TXT}>rupture de stock</Typography>
                  </Box>
                )
              )}
              {(product.city||product.department)&&(
                <Box sx={{ display:'flex', alignItems:'center', gap:0.5, px:1.2, py:0.5, borderRadius:'8px', bgcolor:BG_MUTED }}>
                  <LocationOn sx={{ fontSize:13, color:SUB2 }}/>
                  <Typography fontSize={12.5} fontWeight={500} color={SUB2}>{[product.city,product.department].filter(Boolean).join(', ')}</Typography>
                </Box>
              )}
              {isPhysical&&(
                <Box sx={{ display:'flex', alignItems:'center', gap:0.5, px:1.2, py:0.5, borderRadius:'8px', bgcolor:TEAL_BG }}>
                  <LocalShipping sx={{ fontSize:13, color:TEAL_TXT }}/>
                  <Typography fontSize={12.5} fontWeight={500} color={TEAL_TXT}>{product.hasDelivery?'livraison disponible':'retrait seulement'}</Typography>
                </Box>
              )}
            </Box>

            {/* description courte — jamais vide */}
            <Typography fontSize={14} color={SUB2} lineHeight={1.6} sx={{ mb:3,
              display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {product.description?.trim() || `Découvrez ${product.name}, disponible chez ${product.store?.name || 'ce vendeur'} sur DealPam.`}
            </Typography>

            {/* bloc vendeur */}
            {product.store&&(
              <Box sx={{ display:'flex', alignItems:'center', gap:1.5, p:2, borderRadius:'12px', bgcolor:BG_MUTED, border:`1px solid ${BORD}`, mb:3, flexWrap:'wrap' }}>
                {product.store.logoUrl
                  ? <Avatar src={product.store.logoUrl} sx={{ width:44, height:44, borderRadius:'10px' }}/>
                  : <Avatar sx={{ width:44, height:44, borderRadius:'10px', bgcolor:NAVY, color:'#fff', fontWeight:500, fontSize:17 }}>{product.store.name?.[0]?.toUpperCase()}</Avatar>}
                <Box sx={{ flex:1, minWidth:120 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.6 }}>
                    <Typography fontWeight={500} fontSize={14} color={TXT} noWrap>{product.store.name}</Typography>
                    {product.store.isVerified&&<Verified sx={{ fontSize:14, color:OR, flexShrink:0 }}/>}
                  </Box>
                  <Typography fontSize={12.5} color={SUB}>{product.store.totalSales||0} vente{(product.store.totalSales||0)>1?'s':''}</Typography>
                </Box>
                <Box sx={{ display:'flex', gap:1, ml:'auto' }}>
                  <Button onClick={contactSeller} disabled={chatLoading} size="small"
                    sx={{ borderRadius:'8px', border:`1px solid ${NAVY}`, color:NAVY, fontWeight:500, fontSize:12.5, px:1.6, py:0.7,
                      transition:'background 0.15s ease, transform 0.1s ease',
                      '&:hover':{ bgcolor:'rgba(15,27,46,0.05)' }, '&:active':{ transform:'scale(0.98)' } }}>
                    Contacter
                  </Button>
                  <Button component={Link} to={`/store/${product.store.slug}`} size="small"
                    sx={{ borderRadius:'8px', border:`1px solid ${NAVY}`, color:NAVY, fontWeight:500, fontSize:12.5, px:1.6, py:0.7,
                      transition:'background 0.15s ease, transform 0.1s ease',
                      '&:hover':{ bgcolor:'rgba(15,27,46,0.05)' }, '&:active':{ transform:'scale(0.98)' } }}>
                    Visiter la boutique
                  </Button>
                </Box>
              </Box>
            )}

            {/* color picker */}
            {colors.length>0&&(
              <Box id="color-picker" sx={{ mb:3 }}>
                <Typography fontSize={12} fontWeight={600} color={SUB} textTransform="uppercase" letterSpacing="0.8px" mb={1.5}>
                  Couleur <Typography component="span" fontWeight={700} color={TXT} textTransform="none" letterSpacing={0} fontSize={13}>— {clr||'—'}</Typography>
                </Typography>
                <Box sx={{ display:'flex', gap:1.5, flexWrap:'wrap' }}>
                  {colors.map(({ color:c, hex, img }, i)=>{
                    const sel = clr===c;
                    return (
                      <Tooltip key={c} title={c} arrow>
                        <Box sx={{ position:'relative' }}>
                          {i===0&&(
                            <Box sx={{ position:'absolute', top:-9, left:-6, bgcolor:RED, color:'#fff', fontWeight:900,
                              fontSize:9, px:0.7, py:0.15, borderRadius:'6px', letterSpacing:'0.3px', zIndex:1,
                              boxShadow:'0 2px 6px rgba(239,68,68,0.4)' }}>HOT</Box>
                          )}
                          <Box onClick={()=>{ if(clr===c){setClr(null);setIdx(0);}else{setClr(c);setSz(null);setIdx(0);} }}
                            sx={{ width:48, height:48, borderRadius:'10px', cursor:'pointer', overflow:'hidden', position:'relative',
                              outline:`2.5px solid ${sel?OR:'transparent'}`, outlineOffset:3,
                              transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)', '&:hover':{ transform:'scale(1.1)' } }}>
                            {img ? <Box component="img" src={img} alt={c} sx={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <Box sx={{ width:'100%', height:'100%', bgcolor:hex||'rgba(15,23,42,0.1)' }}/>}
                            {sel&&<Box sx={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'rgba(0,0,0,0.25)' }}>
                              <CheckCircle sx={{ fontSize:20, color:'#fff' }}/>
                            </Box>}
                          </Box>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* size picker */}
            {sizes.length>0&&(
              <Box sx={{ mb:3 }}>
                <Typography fontSize={12} fontWeight={600} color={SUB} textTransform="uppercase" letterSpacing="0.8px" mb={1.5}>
                  Taille <Typography component="span" fontWeight={700} color={TXT} textTransform="none" letterSpacing={0} fontSize={13}>— {sz||'—'}</Typography>
                </Typography>
                <Box sx={{ display:'flex', gap:1.4, flexWrap:'wrap' }}>
                  {sizes.map((s:any,i:number)=>{
                    const sv  = variants.find((v:any)=>(!clr||v.color===clr)&&v.size===s);
                    const oos = sv&&sv.stock===0;
                    const sel = sz===s;
                    return (
                      <Box key={s} sx={{ position:'relative' }}>
                        {i===0&&!oos&&(
                          <Box sx={{ position:'absolute', top:-9, left:-6, bgcolor:RED, color:'#fff', fontWeight:900,
                            fontSize:9, px:0.7, py:0.15, borderRadius:'6px', letterSpacing:'0.3px', zIndex:1,
                            boxShadow:'0 2px 6px rgba(239,68,68,0.4)' }}>HOT</Box>
                        )}
                        <Box onClick={()=>!oos&&setSz((x:any)=>x===s?null:s)}
                          sx={{ px:2.4, py:1, borderRadius:'10px', cursor:oos?'not-allowed':'pointer',
                            fontWeight:sel?800:600, fontSize:13.5,
                            color:sel?'#fff':oos?SUB:TXT,
                            bgcolor:sel?OR:'#fff',
                            border:`1.5px solid ${sel?OR:oos?BORD:'rgba(15,23,42,0.16)'}`,
                            transition:'all 0.13s', position:'relative', overflow:'hidden',
                            '&:hover':oos?{}:{ borderColor:OR } }}>
                          {s}
                          {oos&&<Box sx={{ position:'absolute', width:'150%', height:'1.5px', bgcolor:'rgba(15,23,42,0.14)', transform:'rotate(-12deg)', top:'50%', left:'-25%' }}/>}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* ingrédients — plats (restaurants) uniquement */}
            {ingredients&&(
              <Box sx={{ mb:3, p:2, borderRadius:'14px', bgcolor:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)' }}>
                <Typography fontSize={12} fontWeight={700} color={GRN} textTransform="uppercase" letterSpacing="0.6px" mb={0.8}>Ingrédients</Typography>
                <Typography fontSize={13.5} color={SUB2} lineHeight={1.6}>{ingredients}</Typography>
              </Box>
            )}


            {/* Propre produit du vendeur connecté — jamais de bouton d'achat qui échouerait de toute façon côté serveur */}
            {showPurchaseFlow && isOwnProduct && (
              <Box sx={{ mb:3.5, maxWidth:{ lg:480 }, p:2, borderRadius:'10px', bgcolor:'rgba(15,27,46,0.04)', border:`1px solid ${BORD}`,
                display:'flex', alignItems:'center', justifyContent:'space-between', gap:1.5, flexWrap:'wrap' }}>
                <Typography fontSize={13.5} color={SUB2} fontWeight={500}>
                  C'est votre produit — l'achat est désactivé pour vous.
                </Typography>
                <Button component={Link} to={`/seller/products/edit/${product.id}`} size="small"
                  sx={{ color:OR, fontWeight:700, fontSize:12.5, textTransform:'none', whiteSpace:'nowrap' }}>
                  Modifier →
                </Button>
              </Box>
            )}

            {/* qty + CTA achat — masqués pour les services nécessitant un RDV (la prise de RDV ci-dessus remplace l'achat) */}
            {showPurchaseFlow && !isOwnProduct && (
              <Box sx={{ mb:3.5, maxWidth:{ lg:480 } }}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1.2, mb:1.5, flexWrap:{ xs:'wrap', sm:'nowrap' } }}>
                  <Typography fontSize={12} fontWeight={600} color={SUB} textTransform="uppercase" letterSpacing="0.8px" sx={{ flexShrink:0, width:{ xs:'100%', sm:'auto' } }}>Quantité</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', bgcolor:'rgba(15,23,42,0.06)', border:`1.5px solid ${BORD}`, borderRadius:'10px', overflow:'hidden', height:44, flexShrink:0 }}>
                    <IconButton size="small" onClick={()=>setQty(q=>Math.max(minOrderQty,q-1))}
                      sx={{ borderRadius:0, px:2, height:'100%', color:TXT, '&:hover':{ bgcolor:'rgba(255,107,0,0.1)' } }}>
                      <Typography fontWeight={600} fontSize={20} lineHeight={1}>−</Typography>
                    </IconButton>
                    <Typography sx={{ px:3, fontWeight:900, fontSize:16, minWidth:44, textAlign:'center', color:TXT }}>{qty}</Typography>
                    <IconButton size="small" onClick={()=>setQty(q=>Math.min(stock||99,q+1))}
                      sx={{ borderRadius:0, px:2, height:'100%', color:TXT, '&:hover':{ bgcolor:'rgba(255,107,0,0.1)' } }}>
                      <Typography fontWeight={600} fontSize={20} lineHeight={1}>+</Typography>
                    </IconButton>
                  </Box>
                  <Button fullWidth onClick={buyNow} disabled={ctaDisabled}
                    endIcon={!loading&&<ArrowForward sx={{ fontSize:18 }}/>}
                    sx={{ py:1.4, px:2.5, borderRadius:'8px', fontWeight:500, fontSize:14.5, color:'#fff',
                      bgcolor: ctaDisabled ? undefined : OR,
                      transition:'background 0.15s ease, transform 0.1s ease',
                      '&:hover:not(:disabled)':{ bgcolor:OR_HOVER },
                      '&:active:not(:disabled)':{ transform:'scale(0.98)' },
                      '&:focus-visible':{ outline:`2px solid ${OR}`, outlineOffset:2 },
                      '&:disabled':{ bgcolor:'rgba(15,27,46,0.07)', color:SUB } }}>
                    {loading ? 'un instant…' : needsColor ? 'choisissez' : 'acheter maintenant'}
                  </Button>
                </Box>

                {minOrderQty>1 && (
                  <Typography fontSize={12} color={SUB2} mb={1.5}>
                    Quantité minimum de commande pour ce produit : {minOrderQty}
                  </Typography>
                )}

                {priceTiers.length>0 && (
                  <Box sx={{ mb:1.5, borderRadius:'10px', border:`1px solid ${BORD}`, overflow:'hidden' }}>
                    <Box sx={{ px:1.6, py:1, bgcolor:'rgba(15,27,46,0.04)' }}>
                      <Typography fontSize={12} fontWeight={600} color={TXT}>Offres par lot</Typography>
                    </Box>
                    {priceTiers.map((t,i)=>{
                      const next = priceTiers[i+1];
                      const rangeLabel = next ? `${t.minQty} - ${next.minQty-1}` : `${t.minQty}+`;
                      const active = qty>=t.minQty && (!next || qty<next.minQty);
                      const perUnit = t.price / t.minQty;
                      return (
                        <Box key={i} sx={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                          px:1.6, py:0.9, bgcolor: active?'rgba(245,113,26,0.08)':'transparent',
                          borderTop: i>0 ? `1px solid ${BORD}` : 'none' }}>
                          <Typography fontSize={13} color={active?OR:TXT} fontWeight={active?600:400}>{rangeLabel} unités</Typography>
                          <Box sx={{ textAlign:'right' }}>
                            <Typography fontSize={13} color={active?OR:TXT} fontWeight={active?600:400}>{fmtDisplay(t.price)} le lot</Typography>
                            <Typography fontSize={10.5} color={SUB2}>soit {fmtDisplay(perUnit)}/unité</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {(priceTiers.length>0 || qty>1) && (
                  <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1.5, px:0.2 }}>
                    <Typography fontSize={13} color={SUB2}>Total pour {qty} unité{qty>1?'s':''}</Typography>
                    <Typography fontSize={16} fontWeight={700} color={TXT}>{fmtDisplay(effUnit*qty)}</Typography>
                  </Box>
                )}

                <motion.div whileTap={!ctaDisabled ? { scale: 0.96 } : undefined}>
                  <Button fullWidth onClick={addToCart} disabled={ctaDisabled}
                    startIcon={loading ? <CircularProgress size={16} color="inherit"/> : <ShoppingCart sx={{ fontSize:18 }}/>}
                    sx={{ py:1.3, borderRadius:'8px', fontWeight:500, fontSize:14, color:NAVY, letterSpacing:0,
                      bgcolor:'transparent', border:`1px solid ${ctaDisabled?BORD:NAVY}`,
                      transition:'background 0.15s ease, transform 0.1s ease',
                      '&:hover:not(:disabled)':{ bgcolor:'rgba(15,27,46,0.05)' },
                      '&:active:not(:disabled)':{ transform:'scale(0.98)' },
                      '&:focus-visible':{ outline:`2px solid ${NAVY}`, outlineOffset:2 },
                      '&:disabled':{ color:SUB, borderColor:BORD } }}>
                    {loading ? 'ajout…' : stock===0 ? 'épuisé' : needsColor ? 'choisir' : 'ajouter au panier'}
                  </Button>
                </motion.div>

                {product.allowOffers && (
                  <Button fullWidth onClick={()=>setOfferOpen(true)}
                    sx={{ mt:1, py:1.3, borderRadius:'8px', fontWeight:600, fontSize:14, color:OR, letterSpacing:0,
                      bgcolor:'transparent', border:`1px solid ${OR}`,
                      transition:'background 0.15s ease, transform 0.1s ease',
                      '&:hover':{ bgcolor:OR_BG },
                      '&:active':{ transform:'scale(0.98)' } }}>
                    faire une offre
                  </Button>
                )}
              </Box>
            )}

            <Dialog open={offerOpen} onClose={()=>setOfferOpen(false)} maxWidth="xs" fullWidth>
              <DialogTitle sx={{ fontWeight:700 }}>Faire une offre de prix</DialogTitle>
              <DialogContent>
                <Typography fontSize={13} color={SUB2} mb={2}>
                  Prix affiché : <strong>{fmtDisplay(effUnit)}</strong>
                </Typography>
                <TextField fullWidth type="number" label="Votre offre (HTG)" value={offerPrice}
                  onChange={e=>setOfferPrice(e.target.value)} sx={{ mb:1 }} inputProps={{ min:0 }} autoFocus />
                {product?.minOfferPriceHTG != null && (
                  <Typography fontSize={11.5} color={SUB} mb={1.5}>
                    Offre minimum acceptée : {Number(product.minOfferPriceHTG).toLocaleString()} HTG
                  </Typography>
                )}
                <TextField fullWidth multiline minRows={2} label="Message (optionnel)" value={offerMsg}
                  onChange={e=>setOfferMsg(e.target.value)} />
              </DialogContent>
              <DialogActions sx={{ px:3, pb:2.5 }}>
                <Button onClick={()=>setOfferOpen(false)}>Annuler</Button>
                <Button variant="contained" onClick={submitOffer} disabled={offerLoading}
                  sx={{ bgcolor:OR, '&:hover':{ bgcolor:OR_HOVER } }}>
                  {offerLoading ? <CircularProgress size={18} color="inherit"/> : 'Envoyer l\'offre'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* trust badges */}
            <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, mb:3.5, maxWidth:{ lg:480 } }}>
              {[
                { Icon:Security,      label:'Paiement sécurisé',   bg:TEAL_BG, c:TEAL_TXT },
                { Icon:LocalShipping, label:product.hasDelivery?'Livraison dispo.':'Retrait vendeur', bg:TEAL_BG, c:TEAL_TXT },
                { Icon:Verified,      label:product.store?.isVerified?'Boutique vérifiée':'Vendeur DealPam', bg:OR_BG, c:OR_TXT },
                { Icon:FlashOn,       label:'Messages chiffrés', bg:OR_BG, c:OR_TXT },
              ].map(({ Icon, label, bg, c },i)=>(
                <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1, p:1.2, borderRadius:'10px', bgcolor:BG_MUTED, border:`1px solid ${BORD}` }}>
                  <Box sx={{ width:24, height:24, borderRadius:'7px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:bg }}>
                    <Icon sx={{ fontSize:13, color:c }}/>
                  </Box>
                  <Typography fontSize={11.5} fontWeight={700} color={TXT} noWrap>{label}</Typography>
                </Box>
              ))}
            </Box>

            {/* delivery */}
            {product.hasDelivery&&(
              <Box sx={{ display:'flex', alignItems:'center', gap:1, mb:3.5, p:1.5, borderRadius:'12px', bgcolor:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)' }}>
                <LocalShipping sx={{ fontSize:16, color:GRN }}/>
                <Typography fontSize={13} color={GRN} fontWeight={600}>
                  Livraison {product.deliveryPriceHTG ? fmt(Number(product.deliveryPriceHTG)) : 'gratuite'}
                  {(product.deliveryDepts||[]).length>0 ? ` · ${(product.deliveryDepts as string[]).join(', ')}` : ''}
                </Typography>
              </Box>
            )}

            {/* specs */}
            <Box sx={{ mb:3 }}>
              <Typography fontSize={12} fontWeight={700} color={SUB} textTransform="uppercase" letterSpacing="0.8px" mb={1.8}>Informations</Typography>
              <Box sx={{ borderRadius:'16px', border:`1px solid ${BORD}`, overflow:'hidden', boxShadow:'0 2px 10px rgba(15,23,42,0.03)' }}>
                {[
                  ...(isPhysical ? [
                    { l:'État',      v:cond.label },
                    { l:'Stock',     v:stock>0?`${stock} disponibles`:'Rupture' },
                    { l:'Livraison', v:product.hasDelivery?(product.deliveryPriceHTG?fmt(Number(product.deliveryPriceHTG)):'Gratuite'):'Retrait seulement' },
                  ] : []),
                  { l:'Lieu',      v:[product.city,product.department].filter(Boolean).join(', ') },
                  { l:'Réf.',      v:product.sku },
                  ...Object.entries(attrs).filter(([,v])=>v).map(([k,v])=>({ l:ATTR[k]??k, v:String(v) })),
                ].filter(r=>r.v).map(({ l, v },i)=>(
                  <Box key={l} sx={{
                    display:'grid', gridTemplateColumns:{ xs:'120px 1fr', sm:'160px 1fr' },
                    columnGap:3, px:2, py:1.5,
                    bgcolor:i%2===0?'rgba(15,23,42,0.03)':'transparent',
                    borderTop:i>0?`1px solid ${BORD}`:'none',
                  }}>
                    <Typography fontSize={13} color={SUB} fontWeight={600}>{l}</Typography>
                    <Typography fontSize={13.5} fontWeight={700} color={TXT}>{String(v)}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {product.conditionNote&&(
              <Box sx={{ p:2, borderRadius:'12px', bgcolor:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)', mb:3 }}>
                <Typography fontSize={13} fontWeight={700} color={GLD} mb={0.5}>Note du vendeur</Typography>
                <Typography fontSize={13.5} color={SUB2} lineHeight={1.7}>{product.conditionNote}</Typography>
              </Box>
            )}
            </>)}

            {/* tabs */}
            <Box sx={{ display:'flex', gap:0.5, mb:3, p:0.5, borderRadius:'14px', bgcolor:'rgba(15,23,42,0.05)', width:'fit-content', maxWidth:'100%', overflowX:'auto' }}>
              {(['desc','spec','rev'] as const)
                .filter(k => k!=='spec'||hasA)
                .map(k => {
                  const label = k==='desc'?'Description':k==='spec'?'Caractéristiques':`Avis (${product.totalReviews||0})`;
                  return (
                    <Box key={k} onClick={()=>setTab(k)}
                      sx={{ px:2.4, py:1.1, fontSize:13.5, fontWeight:tab===k?800:600, whiteSpace:'nowrap',
                        color:tab===k?TXT:SUB, cursor:'pointer', borderRadius:'11px',
                        bgcolor:tab===k?CARD:'transparent',
                        boxShadow:tab===k?'0 2px 8px rgba(15,23,42,0.08)':'none',
                        transition:'all 0.16s', '&:hover':{ color:TXT } }}>
                      {label}
                    </Box>
                  );
                })}
            </Box>

            {tab==='desc'&&(
              <Box sx={{ maxWidth:680 }}>
                <Typography fontSize={14.5} color={SUB2} lineHeight={1.9} sx={{ whiteSpace:'pre-wrap' }}>
                  {descS||'Aucune description disponible.'}
                </Typography>
                {desc.length>500&&(
                  <Box onClick={()=>setMore(o=>!o)} sx={{ display:'inline-flex', alignItems:'center', gap:0.5, mt:2, cursor:'pointer', color:OR, fontWeight:700, fontSize:14 }}>
                    {more?'Voir moins':'Voir plus'}{more?<ExpandLess/>:<ExpandMore/>}
                  </Box>
                )}
              </Box>
            )}

            {tab==='spec'&&hasA&&(
              <Box>
                {Object.entries(attrs).filter(([,v])=>v).map(([k,v],i,arr)=>(
                  <Box key={k} sx={{ display:'flex', py:2, borderBottom:i<arr.length-1?`1px solid ${BORD}`:'none', gap:4 }}>
                    <Typography fontSize={14} color={SUB} fontWeight={500} sx={{ width:160, flexShrink:0 }}>{ATTR[k]??k}</Typography>
                    <Typography fontSize={14} fontWeight={700} color={TXT}>{String(v)}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {tab==='rev'&&(
              <Box>
                {product.avgRating>0 ? (
                  <Box sx={{ display:'flex', gap:6, mb:5, flexWrap:'wrap', alignItems:'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize:68, fontWeight:900, color:TXT, lineHeight:1, letterSpacing:'-4px' }}>{product.avgRating.toFixed(1)}</Typography>
                      <Rating value={product.avgRating} precision={0.5} readOnly sx={{ mt:1, '& .MuiRating-iconFilled':{ color:GLD } }}/>
                      <Typography fontSize={13} color={SUB} mt={0.5}>{product.totalReviews} avis</Typography>
                    </Box>
                    <Box sx={{ flex:1, minWidth:220, pt:1 }}>
                      {[5,4,3,2,1].map(s=>{ const pct=[65,20,10,3,2][5-s]; return (
                        <Box key={s} sx={{ display:'flex', alignItems:'center', gap:1.5, mb:1 }}>
                          <Typography fontSize={13} color={SUB} width={36} sx={{ display:'flex', alignItems:'center', gap:0.3 }}>{s} <Star sx={{ fontSize:12 }}/></Typography>
                          <Box sx={{ flex:1, height:6, bgcolor:'rgba(15,23,42,0.07)', borderRadius:4, overflow:'hidden' }}>
                            <Box sx={{ width:`${pct}%`, height:'100%', bgcolor:GLD, borderRadius:4 }}/>
                          </Box>
                          <Typography fontSize={12} color={SUB} width={32}>{pct}%</Typography>
                        </Box>
                      ); })}
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ py:8, textAlign:'center' }}>
                    <Star sx={{ fontSize:52, color:BORD, mb:2 }}/>
                    <Typography color={SUB} fontSize={15} fontWeight={600}>Aucun avis encore</Typography>
                  </Box>
                )}
                {(product.reviews??[]).map((r:any)=>(
                  <Box key={r.id} sx={{ py:3, borderTop:`1px solid ${BORD}` }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:1.5 }}>
                      <Avatar sx={{ width:40, height:40, bgcolor:`${OR}1A`, color:OR, fontSize:15, fontWeight:800, border:`1px solid rgba(255,107,0,0.2)` }}>{r.user?.firstName?.[0]}</Avatar>
                      <Box sx={{ flex:1 }}>
                        <Typography fontSize={14} fontWeight={800} color={TXT}>{r.user?.firstName} {r.user?.lastName?.[0]}.</Typography>
                        <Rating value={r.rating} readOnly size="small" sx={{ '& .MuiRating-iconFilled':{ color:GLD } }}/>
                      </Box>
                      <Typography fontSize={12} color={SUB}>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</Typography>
                    </Box>
                    {r.comment&&<Typography fontSize={14} color={SUB2} lineHeight={1.8} pl={7}>{r.comment}</Typography>}
                    {(()=>{
                      let imgs:string[]=[];
                      try { imgs = r.images ? JSON.parse(r.images) : []; } catch {}
                      return imgs.length>0 ? (
                        <Box sx={{ display:'flex', gap:1, mt:1.2, pl:7, flexWrap:'wrap' }}>
                          {imgs.map((src,i)=>(
                            <Box key={i} component="a" href={src} target="_blank" rel="noopener noreferrer">
                              <Box component="img" src={src} sx={{ width:64, height:64, borderRadius:'8px', objectFit:'cover', border:`1px solid ${BORD}` }}/>
                            </Box>
                          ))}
                        </Box>
                      ) : null;
                    })()}
                  </Box>
                ))}
              </Box>
            )}
          </Box>

        </Box>

        {/* recommendations (autres que "produits similaires", en dessous) */}
        <Box sx={{ mt:6, px:{ xs:2, md:0 } }}>
          {spon.length>0&&<MRow title={dept?`Sponsorisés · ${dept}`:'Sponsorisés'} badge="PROMO" products={spon}/>}
          {stP.length>0&&<MRow title={`Plus de ${product.store?.name??'cette boutique'}`} products={stP}/>}
          {hist.length>0&&<MRow title="Récemment consultés" products={hist}/>}
        </Box>
      </Box>

      {/* produits similaires — section pleine largeur, fond distinct */}
      <SimilarProductsSection products={sim}/>

      {/* floating cart panel — desktop only, mirrors the Temu-style persistent mini-cart */}
      {miniCart?.items?.length > 0 && (
        <Box sx={{ display:{ xs:'none', xl:'flex' }, flexDirection:'column', position:'fixed', top:100, right:24, width:220, zIndex:1100 }}>
          <Box sx={{ bgcolor:CARD, borderRadius:'18px', border:`1px solid ${BORD}`, boxShadow:'0 12px 32px rgba(15,23,42,0.14)', overflow:'hidden' }}>
            <Box sx={{ p:1.6, background:`linear-gradient(135deg,${OR},#FF8C38)`, display:'flex', alignItems:'center', gap:1 }}>
              <ShoppingCart sx={{ fontSize:16, color:'#fff' }}/>
              <Typography fontSize={12.5} fontWeight={800} color="#fff">Sous-total</Typography>
            </Box>
            <Box sx={{ p:1.8 }}>
              <Typography fontWeight={900} fontSize={22} color={TXT} sx={{ letterSpacing:'-1px', mb:1.5 }}>{fmt(Number(miniCart.total||0))}</Typography>
              <Box sx={{ display:'flex', gap:0.8, mb:1.5 }}>
                {miniCart.items.slice(0,4).map((it:any,i:number)=>(
                  <Box key={it.id||i} sx={{ width:40, height:40, borderRadius:'8px', overflow:'hidden', bgcolor:'rgba(15,23,42,0.04)', border:`1px solid ${BORD}`, flexShrink:0 }}>
                    <Box component="img" src={it.product?.images?.[0]?.urlThumb||it.product?.images?.[0]?.urlMedium||'https://placehold.co/80x80/F1F5F9/94A3B8?text=+'}
                      alt={it.product?.name ?? ''} sx={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  </Box>
                ))}
                {miniCart.items.length>4&&(
                  <Box sx={{ width:40, height:40, borderRadius:'8px', bgcolor:'rgba(15,23,42,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Typography fontSize={11} fontWeight={800} color={SUB2}>+{miniCart.items.length-4}</Typography>
                  </Box>
                )}
              </Box>
              <Button fullWidth onClick={()=>navigate('/cart')}
                sx={{ py:1.2, borderRadius:'10px', fontWeight:800, fontSize:13, color:'#fff',
                  background:`linear-gradient(135deg,#C84D00,${OR})`, boxShadow:'0 4px 14px rgba(255,107,0,0.35)',
                  '&:hover':{ boxShadow:'0 6px 20px rgba(255,107,0,0.45)' } }}>
                Aller au panier
              </Button>
              <Typography fontSize={10.5} color={SUB} textAlign="center" mt={1}>Livraison gratuite dès 3 000 HTG</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* lightbox */}
      {lb&&(
        <Box onClick={()=>setLb(false)} sx={{ position:'fixed', inset:0, bgcolor:'rgba(0,0,0,0.97)', zIndex:9999,
          display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out' }}>
          <Box component="img" src={src} alt={product.name}
            sx={{ maxWidth:'92vw', maxHeight:'90vh', objectFit:'contain', borderRadius:3 }}
            onClick={e=>e.stopPropagation()}/>
          <IconButton onClick={()=>setLb(false)} sx={{ position:'absolute', top:16, right:16,
            bgcolor:'rgba(15,23,42,0.08)', border:`1px solid ${BORD}`, color:TXT,
            '&:hover':{ bgcolor:'rgba(15,23,42,0.12)' } }}>
            <Close/>
          </IconButton>
          {allI.length>1&&<>
            <IconButton onClick={prev} sx={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
              bgcolor:'rgba(15,23,42,0.08)', border:`1px solid ${BORD}`, color:TXT,
              '&:hover':{ bgcolor:'rgba(15,23,42,0.12)' } }}>
              <ChevronLeft sx={{ fontSize:36 }}/>
            </IconButton>
            <IconButton onClick={next} sx={{ position:'absolute', right:16, top:'50%', transform:'translateY(-50%)',
              bgcolor:'rgba(15,23,42,0.08)', border:`1px solid ${BORD}`, color:TXT,
              '&:hover':{ bgcolor:'rgba(15,23,42,0.12)' } }}>
              <ChevronRight sx={{ fontSize:36 }}/>
            </IconButton>
          </>}
        </Box>
      )}

      {/* mobile sticky bottom — les services ont leur propre résumé sticky dans ServiceInfoPanel */}
      {!product.requiresAppointment && (
      <Box ref={stickyBarRef} sx={{ display:{ xs:'flex', lg:'none' }, position:'fixed', bottom:56, left:0, right:0, zIndex:1200,
        bgcolor:'rgba(255,255,255,0.97)', backdropFilter:'blur(20px)',
        borderTop:`1px solid ${BORD}`, boxShadow:'0 -6px 24px rgba(15,23,42,0.10)',
        p:1.5, pb:'calc(12px + env(safe-area-inset-bottom))', gap:1.2, alignItems:'center' }}>
        <Box sx={{ flex:1, minWidth:0 }}>
          <Typography fontWeight={900} sx={{ fontSize:20, color:TXT, lineHeight:1, letterSpacing:'-1px' }}>{fmtDisplay(cur)}</Typography>
          {sale&&<Typography fontSize={11} color={SUB} sx={{ textDecoration:'line-through' }}>{fmtDisplay(orig)}</Typography>}
        </Box>
        <IconButton size="small" onClick={toggleWL}
          sx={{ border:`1px solid ${liked?'rgba(239,68,68,0.4)':BORD}`, borderRadius:'8px', p:0.9,
            color:liked?RED:SUB2, transition:'all 0.15s', '&:hover':{ borderColor:'rgba(239,68,68,0.4)', color:RED } }}>
          {liked?<Favorite sx={{ fontSize:20 }}/>:<FavoriteBorder sx={{ fontSize:20 }}/>}
        </IconButton>
        <Button size="small" onClick={contactSeller} disabled={chatLoading}
          startIcon={chatLoading ? <CircularProgress size={12} color="inherit"/> : <Chat sx={{ fontSize:16 }}/>}
          sx={{ borderRadius:'8px', borderWidth:1, borderColor:BORD, color:SUB2,
            fontWeight:700, py:1.1, flexShrink:0, '&:hover':{ borderColor:'rgba(15,23,42,0.16)', color:TXT } }}
          variant="outlined">
          Vendeur
        </Button>
        {isOwnProduct ? (
          <Typography fontSize={11.5} color={SUB2} sx={{ flexShrink:0, maxWidth:110, textAlign:'right' }}>
            Votre produit
          </Typography>
        ) : !inCart ? (
          <motion.div whileTap={!(loading||stock===0) ? { scale: 0.94 } : undefined}>
            <Button size="small"
              onClick={needsColor ? ()=>document.getElementById('color-picker')?.scrollIntoView({behavior:'smooth',block:'center'}) : addToCart}
              disabled={loading||stock===0}
              startIcon={loading ? <CircularProgress size={13} color="inherit"/> : <ShoppingCart sx={{ fontSize:15 }}/>}
              sx={{ py:1.2, borderRadius:'10px', fontWeight:900, fontSize:13, px:2.2, color:'#fff', flexShrink:0,
                background: stock===0 ? undefined : `linear-gradient(135deg,#C84D00,${OR})`,
                boxShadow: stock>0 ? '0 3px 14px rgba(255,107,0,0.4)' : undefined,
                '&:disabled':{ bgcolor:'rgba(15,23,42,0.07)', color:SUB, boxShadow:'none' } }}>
              {loading?'Ajout…':stock===0?'Épuisé':needsColor?'Couleur':'Ajouter'}
            </Button>
          </motion.div>
        ) : (
          <Button size="small" onClick={placeOrder}
            endIcon={<ArrowForward sx={{ fontSize:15 }}/>}
            sx={{ py:1.2, borderRadius:'10px', fontWeight:900, fontSize:13, px:2.2, color:'#fff', flexShrink:0,
              background:`linear-gradient(135deg,#C84D00,${OR})`,
              boxShadow:'0 3px 14px rgba(255,107,0,0.4)' }}>
            Commander
          </Button>
        )}
      </Box>
      )}

      {apptOpen && product && (
        <BookAppointmentDialog
          product={product}
          isLoggedIn={!!user && !!localStorage.getItem('accessToken')}
          availability={serviceConfig.availability}
          selectedServiceNames={selectedSubServices.map(i=>serviceConfig.subServices?.[i]?.name).filter(Boolean)}
          onClose={() => setApptOpen(false)}
        />
      )}
    </Box>
  );
}

/* ─── Carte "autre service du même vendeur" ─────────────────────────────── */
function ServiceCard({ p }: { p:any }) {
  const price = Number(p.salePrice||p.price||0);
  return (
    <Box component={Link} to={`/products/${p.slug}`}
      sx={{ textDecoration:'none', display:'flex', flexDirection:'column', gap:1, p:2, borderRadius:'14px',
        bgcolor:'#EEEDFE', border:`0.5px solid ${BORD}`, transition:'transform 0.15s ease, border-color 0.15s ease',
        '&:hover':{ borderColor:'rgba(15,27,46,0.18)', transform:'translateY(-2px)' } }}>
      <Box sx={{ width:36, height:36, borderRadius:'10px', bgcolor:'rgba(60,52,137,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <MedicalServices sx={{ fontSize:18, color:'#3C3489' }}/>
      </Box>
      <Typography fontSize={13.5} fontWeight={500} color={TXT} sx={{ display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.name}</Typography>
      <Typography fontSize={13} fontWeight={500} color={OR}>dès {fmt(price)}</Typography>
    </Box>
  );
}

/* ─── "Autres services du même vendeur" — grille 3/2/1, jamais de produit physique ── */
function OtherServicesGrid({ products, storeSlug }: { products:any[]; storeSlug?:string }) {
  if (!products.length) return null;
  const few = products.length < 3;
  return (
    <Box sx={{ mt:2 }}>
      <Typography fontWeight={500} fontSize={15} color={TXT} mb={1.5}>autres services du même vendeur</Typography>
      <Box sx={{
        display:'grid',
        gridTemplateColumns:{ xs:'1fr', sm:'repeat(2, 1fr)', md:'repeat(3, 1fr)' },
        gap:1.5,
        ...(few ? { maxWidth:{ md: products.length===1?260:520 }, mx:{ md:'auto' } } : {}),
      }}>
        {products.map(p=><ServiceCard key={p.slug||p.id} p={p}/>)}
        {storeSlug&&(
          <Box component={Link} to={`/store/${storeSlug}`}
            sx={{ textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0.5,
              p:2, borderRadius:'14px', border:`0.5px dashed ${BORD}`, minHeight:112,
              transition:'background 0.15s ease', '&:hover':{ bgcolor:BG_MUTED } }}>
            <ArrowForward sx={{ fontSize:18, color:OR }}/>
            <Typography fontSize={13} fontWeight={500} color={OR}>voir tous les services</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ─── Sélecteur de soins multi-sélection ─────────────────────────────────── */
function SubServicesSelector({ subServices, selected, onToggle, onRemoveIndices }: {
  subServices:{ name:string; price:number; description?:string }[];
  selected:number[]; onToggle:(i:number)=>void; onRemoveIndices:(idxs:number[])=>void;
}) {
  const [showMore, setShowMore] = useState(false);
  const MAIN_COUNT = 4;
  const main = subServices.slice(0, MAIN_COUNT);
  const more = subServices.slice(MAIN_COUNT);

  const toggleMore = () => {
    if (showMore) onRemoveIndices(more.map((_,i)=>MAIN_COUNT+i));
    setShowMore(s=>!s);
  };

  const total = selected.reduce((sum,i)=>sum+Number(subServices[i]?.price||0), 0);
  const count = selected.length;

  const Row = ({ s, i }: { s:any; i:number }) => {
    const sel = selected.includes(i);
    return (
      <Box onClick={()=>onToggle(i)}
        sx={{ display:'flex', alignItems:'center', gap:1.2, px:{ xs:1.75, sm:1.5 }, py:{ xs:1.5, sm:1.25 }, minHeight:{ xs:48, sm:'auto' },
          borderRadius:'10px', cursor:'pointer',
          border:`0.5px solid ${sel?OR:BORD}`, borderColor:sel?OR:BORD,
          bgcolor:sel?OR_BG:'transparent',
          transition:'background 0.15s ease, border-color 0.15s ease',
          '&:hover':sel?{}:{ borderColor:'rgba(15,27,46,0.18)', bgcolor:BG_MUTED } }}>
        <Box sx={{ width:18, height:18, borderRadius:'5px', flexShrink:0, border:`1.5px solid ${sel?OR:BORD}`,
          bgcolor:sel?OR:'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s ease' }}>
          {sel&&<CheckCircle sx={{ fontSize:13, color:'#fff' }}/>}
        </Box>
        <Typography fontSize={13.5} fontWeight={400} color={sel?OR_TXT:TXT} sx={{ flex:1 }}>{s.name||'Prestation'}</Typography>
        <Typography fontSize={13.5} fontWeight={500} color={sel?OR_TXT:SUB2}>{Number(s.price||0).toLocaleString('fr-FR')} gds</Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth:{ xs:'100%', md:520 } }}>
      <Typography fontSize={12} fontWeight={500} color={SUB} mb={1.5}>
        sélectionnez un ou plusieurs actes — le total se met à jour automatiquement
      </Typography>
      <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
        {main.map((s,i)=><Row key={i} s={s} i={i}/>)}
      </Box>
      {more.length>0&&(
        <>
          <Box onClick={toggleMore}
            sx={{ display:'flex', alignItems:'center', gap:0.6, mt:1.2, py:1, borderRadius:'8px', cursor:'pointer',
              justifyContent:'center', transition:'background 0.15s ease', '&:hover':{ bgcolor:BG_MUTED } }}>
            <Typography fontSize={13} fontWeight={500} color={OR}>
              {showMore ? 'masquer les autres services' : `voir d'autres services (${more.length})`}
            </Typography>
            <ExpandMore sx={{ fontSize:18, color:OR, transition:'transform 0.2s ease', transform:showMore?'rotate(180deg)':'none' }}/>
          </Box>
          {showMore&&(
            <Box sx={{ display:'flex', flexDirection:'column', gap:1, mt:1 }}>
              {more.map((s,i)=><Row key={MAIN_COUNT+i} s={s} i={MAIN_COUNT+i}/>)}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

/* ─── Page info panel — services / RDV (immobilier, véhicules en visite) ──
   Volontairement un composant distinct de la page produit physique : les
   notions d'état/stock/livraison n'ont pas de sens ici et ne doivent jamais
   pouvoir fuiter dans ce template (spec §5). ───────────────────────────── */
function ServiceInfoPanel({ product, serviceConfig, chatLoading, contactSeller, selectedSubServices, setSelectedSubServices, onBook, otherServices }: {
  product:any; serviceConfig:Record<string,any>; chatLoading:boolean; contactSeller:()=>void;
  selectedSubServices:number[]; setSelectedSubServices:React.Dispatch<React.SetStateAction<number[]>>;
  onBook:()=>void; otherServices:any[];
}) {
  const subServices = serviceConfig.subServices || [];
  const total = selectedSubServices.reduce((sum,i)=>sum+Number(subServices[i]?.price||0), 0);
  const count = selectedSubServices.length;

  const toggle = (i:number) => setSelectedSubServices(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i]);
  const removeIndices = (idxs:number[]) => setSelectedSubServices(p=>p.filter(x=>!idxs.includes(x)));

  return (
    <Box>
      {/* badges */}
      <Box sx={{ display:'flex', gap:1, mb:2, flexWrap:'wrap' }}>
        <Box sx={{ px:1.4, py:0.4, borderRadius:'20px', bgcolor:'#EEEDFE' }}>
          <Typography fontSize={11} fontWeight={500} color="#3C3489">service</Typography>
        </Box>
        {serviceConfig.availability?.days?.length>0&&(
          <Box sx={{ px:1.4, py:0.4, borderRadius:'20px', bgcolor:TEAL_BG }}>
            <Typography fontSize={11} fontWeight={500} color={TEAL_TXT}>disponible cette semaine</Typography>
          </Box>
        )}
      </Box>

      {/* titre + catégorie */}
      <Typography component="h1" fontWeight={500} color={TXT} sx={{ fontSize:{ xs:22, sm:26, md:28 }, lineHeight:1.25, mb:0.5 }}>
        {product.name}
      </Typography>
      <Typography fontSize={13} color={SUB} mb={1.5}>
        {product.category?.name||'Service'}
        {product.avgRating>0
          ? <> · {product.avgRating.toFixed(1)} <Star sx={{ fontSize:12, verticalAlign:'middle', mb:'2px' }}/> ({product.totalReviews} avis)</>
          : <> — <Box component="span" sx={{ color:OR, cursor:'pointer', '&:hover':{ textDecoration:'underline' } }}>Aucun avis — soyez le premier</Box></>}
      </Typography>

      {/* localisation */}
      {(product.address||product.city)&&(
        <Box sx={{ display:'flex', alignItems:'flex-start', gap:0.7, mb:2 }}>
          <LocationOn sx={{ fontSize:15, color:SUB, mt:0.2, flexShrink:0 }}/>
          <Typography fontSize={13.5} color={SUB2}>
            {[product.address, product.city, product.department].filter(Boolean).join(', ')}
          </Typography>
        </Box>
      )}

      {/* description — jamais vide */}
      <Typography fontSize={14} color={SUB2} lineHeight={1.6} sx={{ mb:3 }}>
        {product.description?.trim() || `${product.name} — prise de rendez-vous en ligne chez ${product.store?.name||'ce prestataire'}.`}
      </Typography>

      {/* bloc vendeur — Contacter uniquement */}
      {product.store&&(
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5, p:2, borderRadius:'12px', bgcolor:BG_MUTED, border:`1px solid ${BORD}`, mb:3, flexWrap:'wrap' }}>
          {product.store.logoUrl
            ? <Avatar src={product.store.logoUrl} sx={{ width:44, height:44, borderRadius:'10px' }}/>
            : <Avatar sx={{ width:44, height:44, borderRadius:'10px', bgcolor:NAVY, color:'#fff', fontWeight:500, fontSize:17 }}>{product.store.name?.[0]?.toUpperCase()}</Avatar>}
          <Box sx={{ flex:1, minWidth:120 }}>
            <Box sx={{ display:'flex', alignItems:'center', gap:0.6 }}>
              <Typography fontWeight={500} fontSize={14} color={TXT} noWrap>{product.store.name}</Typography>
              {product.store.isVerified&&<Verified sx={{ fontSize:14, color:OR, flexShrink:0 }}/>}
            </Box>
            <Typography fontSize={12.5} color={SUB}>{product.store.totalSales||0} vente{(product.store.totalSales||0)>1?'s':''}</Typography>
          </Box>
          <Button onClick={contactSeller} disabled={chatLoading} size="small"
            sx={{ borderRadius:'8px', border:`1px solid ${NAVY}`, color:NAVY, fontWeight:500, fontSize:12.5, px:1.6, py:0.7, ml:'auto',
              width:{ xs:'100%', sm:'auto' },
              transition:'background 0.15s ease, transform 0.1s ease',
              '&:hover':{ bgcolor:'rgba(15,27,46,0.05)' }, '&:active':{ transform:'scale(0.98)' } }}>
            contacter
          </Button>
        </Box>
      )}

      {/* sélecteur de soins */}
      {subServices.length>0&&(
        <Box sx={{ mb:3 }}>
          <SubServicesSelector subServices={subServices} selected={selectedSubServices} onToggle={toggle} onRemoveIndices={removeIndices}/>
        </Box>
      )}

      {/* résumé + CTA — sticky en bas sur mobile dès qu'une sélection existe */}
      <Box sx={{
        ...(count>0 ? { position:{ xs:'sticky', md:'static' }, bottom:0, bgcolor:CARD,
          boxShadow:{ xs:'0 -2px 8px rgba(0,0,0,0.06)', md:'none' }, zIndex:10 } : {}),
        pt: count>0?1.5:0, pb: count>0?1.5:0, px:{ xs:count>0?2:0, md:0 }, mx:{ xs:count>0?-2:0, md:0 },
      }}>
        {count>0&&(
          <Box sx={{ display:'flex', justifyContent:'space-between', mb:1.2 }}>
            <Typography fontSize={13} fontWeight={500} color={TXT}>total ({count} soin{count>1?'s':''} sélectionné{count>1?'s':''})</Typography>
            <Typography fontSize={14} fontWeight={500} color={OR}>{total.toLocaleString('fr-FR')} gds</Typography>
          </Box>
        )}
        <Button fullWidth disabled={count===0} onClick={onBook}
          sx={{ py:1.4, borderRadius:'8px', fontWeight:500, fontSize:14.5, color:'#fff',
            bgcolor: count>0 ? OR : 'rgba(15,27,46,0.07)',
            transition:'background 0.15s ease, color 0.15s ease, transform 0.1s ease',
            '&:hover:not(:disabled)':{ bgcolor:OR_HOVER },
            '&:active:not(:disabled)':{ transform:'scale(0.98)' },
            '&:focus-visible':{ outline:`2px solid ${OR}`, outlineOffset:2 },
            '&.Mui-disabled':{ bgcolor:'rgba(15,27,46,0.07)', color:SUB } }}>
          {count>0 ? `prendre rendez-vous — ${total.toLocaleString('fr-FR')} gds` : 'sélectionnez au moins un soin'}
        </Button>
      </Box>

      {/* garanties 2x2 */}
      <Box sx={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, mt:3 }}>
        {[
          { Icon:Security, label:'paiement sécurisé', bg:TEAL_BG, c:TEAL_TXT },
          { Icon:Verified,  label:'prestataire vérifié', bg:OR_BG, c:OR_TXT },
          { Icon:Chat,      label:'messages chiffrés', bg:TEAL_BG, c:TEAL_TXT },
          { Icon:Close,     label:'annulation gratuite 24h', bg:OR_BG, c:OR_TXT },
        ].map(({Icon,label,bg,c},i)=>(
          <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1, p:1.2, borderRadius:'10px', bgcolor:BG_MUTED, border:`1px solid ${BORD}` }}>
            <Box sx={{ width:24, height:24, borderRadius:'7px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:bg }}>
              <Icon sx={{ fontSize:13, color:c }}/>
            </Box>
            <Typography fontSize={11.5} fontWeight={500} color={TXT} noWrap>{label}</Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ height:'1px', bgcolor:BORD, my:3 }}/>
      <OtherServicesGrid products={otherServices} storeSlug={product.store?.slug}/>
    </Box>
  );
}

/* ─── Dialogue de prise de rendez-vous ──────────────────────────────────── */
const WEEKDAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];

function BookAppointmentDialog({ product, isLoggedIn, availability, selectedServiceNames, onClose }: {
  product: any; isLoggedIn: boolean; availability?: { days:string[]; start:string; end:string }; selectedServiceNames?: string[]; onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [date,   setDate]   = useState('');
  const [time,   setTime]   = useState('');
  const [note, setNote]               = useState('');
  const [clientName, setClientName]   = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);

  const timeSlots = (() => {
    if (!availability?.start || !availability?.end) return null;
    const slots: string[] = [];
    let [h,m] = availability.start.split(':').map(Number);
    const [endH,endM] = availability.end.split(':').map(Number);
    while (h < endH || (h === endH && m < endM)) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      m += 30; if (m >= 60) { m = 0; h += 1; }
    }
    return slots;
  })();

  const dateIsAllowedDay = (d: string) => {
    if (!availability?.days?.length || !d) return true;
    const weekday = WEEKDAY_KEYS[new Date(d + 'T00:00:00').getDay()];
    return availability.days.includes(weekday);
  };

  const scheduledAt = date && time ? `${date}T${time}` : '';
  const canSubmit = !!date && !!time && dateIsAllowedDay(date) && (isLoggedIn || (clientName.trim() && clientPhone.trim()));
  const serviceType = selectedServiceNames?.length ? selectedServiceNames.join(', ') : undefined;

  const submit = async () => {
    setSubmitting(true);
    try {
      if (isLoggedIn) {
        await api.post('/appointments', { productId: product.id, scheduledAt, note: note || undefined, serviceType });
      } else {
        await api.post('/appointments/public', {
          productId: product.id, scheduledAt, note: note || undefined, serviceType,
          clientName, clientPhone, clientEmail: clientEmail || undefined,
        });
      }
      setDone(true);
    } catch (e: any) {
      enqueueSnackbar(e?.response?.data?.message || 'Erreur lors de la prise de rendez-vous', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#fff', color: TXT } }}>
      <DialogTitle fontWeight={800}>Prendre rendez-vous</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {done ? (
          <Alert severity="success" sx={{ borderRadius: '12px' }}>
            Votre demande de rendez-vous a été envoyée au vendeur. Vous serez contacté pour confirmation.
          </Alert>
        ) : (
          <>
            <Typography fontSize={13} color={SUB2}>
              Pour : <strong style={{ color: TXT }}>{product.name}</strong>
              {serviceType && <> — <strong style={{ color: '#6366F1' }}>{serviceType}</strong></>}
            </Typography>
            <TextField
              type="date" label="Date souhaitée" fullWidth size="small"
              value={date} onChange={e => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().slice(0, 10) }}
              error={!!date && !dateIsAllowedDay(date)}
              helperText={!!date && !dateIsAllowedDay(date) ? 'Le vendeur ne reçoit pas ce jour-là' : (availability?.days?.length ? `Jours disponibles : ${availability.days.map(d=>({mon:'Lun',tue:'Mar',wed:'Mer',thu:'Jeu',fri:'Ven',sat:'Sam',sun:'Dim'} as any)[d]).join(', ')}` : undefined)}
            />
            {timeSlots ? (
              <TextField select label="Heure" fullWidth size="small" value={time} onChange={e => setTime(e.target.value)} SelectProps={{ native:true }} InputLabelProps={{ shrink:true }}>
                <option value="">-- Choisir --</option>
                {timeSlots.map(s => <option key={s} value={s}>{s}</option>)}
              </TextField>
            ) : (
              <TextField type="time" label="Heure souhaitée" fullWidth size="small" value={time} onChange={e => setTime(e.target.value)} InputLabelProps={{ shrink: true }} />
            )}
            {!isLoggedIn && (
              <>
                <TextField label="Votre nom *" fullWidth size="small" value={clientName} onChange={e => setClientName(e.target.value)} />
                <TextField label="Votre téléphone *" fullWidth size="small" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
                <TextField label="Votre email (optionnel)" fullWidth size="small" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
              </>
            )}
            <TextField label="Note (optionnel)" fullWidth size="small" multiline rows={2} value={note} onChange={e => setNote(e.target.value)} />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ color: SUB2 }}>{done ? 'Fermer' : 'Annuler'}</Button>
        {!done && (
          <Button onClick={submit} disabled={!canSubmit || submitting} variant="contained"
            startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ borderRadius: '10px', fontWeight: 700, bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' } }}>
            Confirmer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
