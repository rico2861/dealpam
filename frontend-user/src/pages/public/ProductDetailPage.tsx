import React, { useState, useEffect, useRef, useCallback } from 'react';
import OptimizedImg from '../../components/shared/OptimizedImg';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, Avatar,
  CircularProgress, Rating, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
} from '@mui/material';
import {
  Favorite, FavoriteBorder, Store, Verified,
  LocalShipping, ChevronLeft, ChevronRight,
  FlashOn, LocationOn, CheckCircle, Phone, ContentCopy,
  Inventory, Warning, Close, ExpandMore, ExpandLess,
  NavigateNext, Security, Star, ArrowForward, ShoppingCart,
  Chat,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useCartStore } from '../../store/cart.store';

/* ── palette ─────────────────────────────────────────────────────────────── */
const OR   = '#FF6B00';
const RED  = '#EF4444';
const GRN  = '#10B981';
const GLD  = '#F59E0B';
const BG   = '#F7F8FA';
const CARD = '#FFFFFF';
const BORD = 'rgba(15,23,42,0.09)';
const TXT  = '#0F172A';
const SUB  = '#94A3B8';
const SUB2 = '#475569';

const fmt = (v: number) => `${v.toLocaleString('fr-HT')} HTG`;
const fmtUSD = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COND: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: 'Neuf',          color: GRN,       bg: 'rgba(16,185,129,0.12)' },
  refurbished: { label: 'Reconditionné', color: '#818CF8', bg: 'rgba(129,140,248,0.12)' },
  used:        { label: 'Occasion',      color: GLD,       bg: 'rgba(245,158,11,0.12)' },
  damaged:     { label: 'Endommagé',     color: RED,       bg: 'rgba(239,68,68,0.12)' },
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
function MCard({ p }: { p: any }) {
  const pr = Number(p.salePrice||p.price);
  const or = Number(p.price);
  const dc = p.salePrice&&pr<or ? Math.round((1-pr/or)*100) : 0;
  return (
    <Box component={Link} to={`/products/${p.slug}`}
      sx={{ textDecoration:'none', flexShrink:0, width:{ xs:148, sm:168, md:184 }, scrollSnapAlign:'start' }}>
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
      <Box sx={{ height:520, bgcolor:CARD }}/>
      <Box sx={{ maxWidth:1200, mx:'auto', px:4, py:4 }}>
        {[[200,28],[300,52],[240,20]].map(([w,h],i)=>(
          <Box key={i} sx={{ width:w, height:h, bgcolor:CARD, borderRadius:2, mb:2, opacity:0.6 }}/>
        ))}
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug:string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { fetchCount } = useCartStore();
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
  const t0 = useRef(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`).then(r => r.data),
    staleTime: 60_000,
  });
  const catSl = product?.category?.slug;
  const stId  = product?.store?.id || product?.storeId;
  const dept  = product?.department || user?.department || '';

  const { data: flashSale } = useQuery({ queryKey:['flash-sale-active'], queryFn:()=>api.get('/flash-sale/active').then(r=>r.data), staleTime:60_000 });
  const inFlashSale = !!flashSale?.isActive && !!flashSale?.products?.some((p:any)=>p.id===product?.id);

  const { data: simR  } = useQuery({ queryKey:['sim',catSl,slug],  queryFn:()=>api.get(`/products?category=${catSl}&limit=12`).then(r=>r.data?.data??[]), enabled:!!catSl });
  const { data: sponR } = useQuery({ queryKey:['spon',dept],        queryFn:()=>api.get(`/products?sponsored=true&department=${dept}&limit=10`).then(r=>r.data?.data??[]), enabled:true });
  const { data: stR   } = useQuery({ queryKey:['stprod',stId],      queryFn:()=>api.get(`/products?storeId=${stId}&limit=8`).then(r=>r.data?.data??[]), enabled:!!stId });
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
  const sizes  = clr ? [...new Set(variants.filter((v:any)=>v.color===clr&&v.size).map((v:any)=>v.size))] : [...new Set(variants.filter((v:any)=>v.size).map((v:any)=>v.size))];
  const av     = variants.find((v:any)=>(!clr||v.color===clr)&&(!sz||v.size===sz))??null;
  const cur    = av?.priceOverride ? Number(av.priceOverride) : Number(product?.salePrice||product?.price||0);
  const orig   = Number(product?.price||0);
  const sale   = cur < orig;
  const disc   = sale ? Math.round((1-cur/orig)*100) : 0;
  const save   = sale ? orig-cur : 0;

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
  const attrs: Record<string,string> = typeof product?.attributes==='object'&&product.attributes ? product.attributes : {};
  const hasA  = Object.keys(attrs).length>0;
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
      setInCart(true);
      enqueueSnackbar('Ajouté au panier !', { variant:'success' });
    } catch(err:any) {
      if (err?.response?.status === 401) navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      else enqueueSnackbar(err?.response?.data?.message || "Erreur lors de l'ajout", { variant:'error' });
    } finally { setLoading(false); }
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
      else { await api.post('/wishlist', { productId:product.id }); setLiked(true); setLAnim(true); setTimeout(()=>setLAnim(false),600); enqueueSnackbar('Ajouté aux favoris ❤️', { variant:'success' }); }
    } catch {}
  };

  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false),2000); enqueueSnackbar('Lien copié !', { variant:'info' }); };

  if (isLoading) return <Skel/>;
  if (!product) return (
    <Box sx={{ minHeight:'80vh', display:'flex', alignItems:'center', justifyContent:'center', bgcolor:BG, px:3 }}>
      <Box sx={{ textAlign:'center', maxWidth:420 }}>
        <Box sx={{ width:120, height:120, mx:'auto', mb:4, borderRadius:'50%',
          background:'linear-gradient(135deg,rgba(255,107,0,0.12),rgba(255,107,0,0.04))',
          border:`1px solid rgba(255,107,0,0.2)`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Box component="span" sx={{ fontSize:52 }}>📦</Box>
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

  return (
    <Box sx={{ bgcolor:BG, minHeight:'100vh', pb:{ xs:14, md:6 } }}>

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
                      <img src={im.urlThumb||im.urlMedium||im.urlFull} alt="" loading="lazy" decoding="async"
                        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
                    </Box>
                  ))}
                </Box>
              )}

              <Box sx={{ position:'relative', bgcolor:CARD, borderRadius:{ xs:0, md:'24px' },
                border:{ xs:'none', md:`1px solid ${BORD}` }, flex:1, minWidth:0,
                boxShadow:{ xs:'none', md:'0 8px 32px rgba(15,23,42,0.06)' },
                aspectRatio:'1 / 1', width:'100%', overflow:'hidden' }}>

                <Box onTouchStart={onTS} onTouchEnd={onTE} onClick={()=>setLb(true)}
                  sx={{ width:'100%', height:'100%', cursor:'zoom-in', '& img':{ objectFit:'contain !important' } }}>
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
                    <img src={im.urlThumb||im.urlMedium||im.urlFull} alt="" loading="lazy" decoding="async"
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

            {/* tags */}
            <Box sx={{ display:'flex', gap:1, mb:2.5, flexWrap:'wrap' }}>
              <Box sx={{ px:1.4, py:0.4, borderRadius:'20px', bgcolor:cond.bg, border:`1px solid ${cond.color}40` }}>
                <Typography fontSize={11} fontWeight={700} color={cond.color} letterSpacing="0.5px" textTransform="uppercase">{cond.label}</Typography>
              </Box>
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
                    {product.productType === 'SERVICE' ? 'Service' : product.productType === 'RENTAL' ? 'Location' : product.productType === 'VEHICLE' ? 'Véhicule' : 'Alimentation'}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* title */}
            <Typography fontWeight={900} color={TXT}
              sx={{ fontSize:{ xs:22, sm:26, md:30 }, lineHeight:1.18, letterSpacing:'-0.6px', mb:1.5 }}>
              {product.name}
            </Typography>

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
              <Typography fontSize={12.5} color={SUB} mb={2.5}>Aucun avis</Typography>
            )}

            {/* Rendez-vous — pour les services/prestations qui en nécessitent un */}
            {product.requiresAppointment && (
              <Box sx={{ mb:3, p:2, borderRadius:'14px', bgcolor:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)' }}>
                <Typography fontSize={13.5} fontWeight={700} color="#818CF8" mb={1}>
                  📅 Ce service nécessite une prise de rendez-vous
                </Typography>
                <Button fullWidth onClick={()=>setApptOpen(true)}
                  sx={{ py:1.3, borderRadius:'12px', fontWeight:800, fontSize:14, color:'#fff',
                    background:'linear-gradient(135deg,#4338CA,#6366F1)',
                    '&:hover':{ background:'linear-gradient(135deg,#3730A3,#4F46E5)' } }}>
                  Prendre rendez-vous
                </Button>
              </Box>
            )}

            {/* price — mobile only: desktop shows it in the sticky buy box on the right */}
            <Box sx={{ display:{ xs:'block', lg:'none' } }}>
              {inFlashSale&&sale&&<CountdownBanner endAt={flashSale?.endAt} title={flashSale?.title}/>}
              {exchangeRate&&(
                <Box sx={{ display:'inline-flex', borderRadius:'8px', border:`1px solid ${BORD}`, overflow:'hidden', mb:1 }}>
                  {(['HTG','USD'] as const).map(c=>(
                    <Box key={c} onClick={()=>setDisplayCurrency(c)} sx={{ px:1.4, py:0.4, cursor:'pointer',
                      bgcolor:displayCurrency===c?OR:'transparent', color:displayCurrency===c?'#fff':SUB,
                      fontSize:11, fontWeight:800 }}>{c}</Box>
                  ))}
                </Box>
              )}
              <Box sx={{ display:'flex', alignItems:'baseline', gap:2, mb:sale?0.5:3 }}>
                <Typography fontWeight={900} color={TXT} sx={{ fontSize:{ xs:36, md:44 }, lineHeight:1, letterSpacing:'-2px' }}>
                  {fmtDisplay(cur)}
                </Typography>
                {sale&&<Typography color={SUB} sx={{ fontSize:{ xs:20, md:24 }, textDecoration:'line-through', fontWeight:400 }}>{fmtDisplay(orig)}</Typography>}
              </Box>
              {sale&&(
                <Box sx={{ display:'inline-flex', alignItems:'center', gap:0.6, px:1.4, py:0.5, borderRadius:'8px',
                  bgcolor:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', mb:3 }}>
                  <Typography fontSize={13} fontWeight={700} color={GRN}>Vous économisez {fmtDisplay(save)}</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ height:'1px', bgcolor:BORD, mb:3 }}/>

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

            {/* stock — badge hidden on desktop (already shown in the sticky buy box); location always visible */}
            <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:3, flexWrap:'wrap' }}>
              <Box sx={{ display:{ xs:'flex', lg:'none' } }}>
                {stock>10
                  ? <Box sx={{ display:'flex', alignItems:'center', gap:0.6, px:1.4, py:0.5, borderRadius:'20px', bgcolor:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)' }}><CheckCircle sx={{ fontSize:13, color:GRN }}/><Typography fontSize={12.5} color={GRN} fontWeight={700}>En stock · {stock} dispo.</Typography></Box>
                  : stock>0
                  ? <Box sx={{ display:'flex', alignItems:'center', gap:0.6, px:1.4, py:0.5, borderRadius:'20px', bgcolor:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)' }}><Warning sx={{ fontSize:13, color:GLD }}/><Typography fontSize={12.5} color={GLD} fontWeight={700}>Plus que {stock} !</Typography></Box>
                  : <Box sx={{ display:'flex', alignItems:'center', gap:0.6, px:1.4, py:0.5, borderRadius:'20px', bgcolor:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)' }}><Inventory sx={{ fontSize:13, color:RED }}/><Typography fontSize={12.5} color={RED} fontWeight={700}>Rupture de stock</Typography></Box>}
              </Box>
              {(product.city||product.department)&&(
                <Box sx={{ display:'flex', alignItems:'center', gap:0.5 }}>
                  <LocationOn sx={{ fontSize:13, color:SUB }}/>
                  <Typography fontSize={13} color={SUB}>{[product.city,product.department].filter(Boolean).join(', ')}</Typography>
                </Box>
              )}
            </Box>

            {/* qty — mobile only: desktop has its own compact stepper inside the sticky buy box */}
            <Box sx={{ display:{ xs:'flex', lg:'none' }, alignItems:'center', gap:3, mb:3 }}>
              <Typography fontSize={12} fontWeight={600} color={SUB} textTransform="uppercase" letterSpacing="0.8px">Quantité</Typography>
              <Box sx={{ display:'flex', alignItems:'center', bgcolor:'rgba(15,23,42,0.06)', border:`1.5px solid ${BORD}`, borderRadius:'10px', overflow:'hidden', height:44 }}>
                <IconButton size="small" onClick={()=>setQty(q=>Math.max(1,q-1))}
                  sx={{ borderRadius:0, px:2, height:'100%', color:TXT, '&:hover':{ bgcolor:'rgba(255,107,0,0.1)' } }}>
                  <Typography fontWeight={600} fontSize={20} lineHeight={1}>−</Typography>
                </IconButton>
                <Typography sx={{ px:3, fontWeight:900, fontSize:16, minWidth:44, textAlign:'center', color:TXT }}>{qty}</Typography>
                <IconButton size="small" onClick={()=>setQty(q=>Math.min(stock||99,q+1))}
                  sx={{ borderRadius:0, px:2, height:'100%', color:TXT, '&:hover':{ bgcolor:'rgba(255,107,0,0.1)' } }}>
                  <Typography fontWeight={600} fontSize={20} lineHeight={1}>+</Typography>
                </IconButton>
              </Box>
            </Box>

            {/* ── MAIN CTA — mobile only: desktop uses the sticky buy box on the right ── */}
            <Box sx={{ display:{ xs:'flex', lg:'none' }, flexDirection:'column', gap:1.5, mb:3.5 }}>
              <Box sx={{ display:'flex', gap:1.2 }}>
                <Button fullWidth onClick={addToCart} disabled={ctaDisabled}
                  startIcon={loading ? <CircularProgress size={16} color="inherit"/> : <ShoppingCart sx={{ fontSize:18 }}/>}
                  sx={{ py:1.8, borderRadius:'14px', fontWeight:800, fontSize:13.5, color:OR, letterSpacing:'0.2px',
                    bgcolor:'#fff', border:`2px solid ${ctaDisabled?BORD:OR}`,
                    '&:hover:not(:disabled)':{ bgcolor:'rgba(255,107,0,0.06)' },
                    '&:disabled':{ color:SUB, borderColor:BORD } }}>
                  {loading ? '…' : stock===0 ? 'Épuisé' : needsColor ? 'Choisir' : 'Ajouter'}
                </Button>
                <Button fullWidth onClick={buyNow} disabled={ctaDisabled}
                  endIcon={!loading&&<ArrowForward sx={{ fontSize:18 }}/>}
                  sx={{ py:1.8, borderRadius:'14px', fontWeight:900, fontSize:14.5, color:'#fff', letterSpacing:'0.2px',
                    background: ctaDisabled ? undefined : `linear-gradient(135deg,#C84D00,${RED},#FF8C38)`,
                    boxShadow: ctaDisabled ? undefined : '0 6px 28px rgba(239,68,68,0.4)',
                    transition:'all 0.2s',
                    '&:hover:not(:disabled)':{ transform:'translateY(-2px)', boxShadow:'0 10px 36px rgba(239,68,68,0.5)' },
                    '&:disabled':{ bgcolor:'rgba(15,23,42,0.07)', color:SUB, boxShadow:'none' } }}>
                  {loading ? 'Ajout…' : needsColor ? 'Choisissez' : 'Acheter maintenant'}
                </Button>
              </Box>

              <Button fullWidth variant="outlined"
                onClick={contactSeller}
                disabled={chatLoading}
                startIcon={chatLoading ? <CircularProgress size={18} color="inherit"/> : <Chat sx={{ fontSize:20 }}/>}
                sx={{ py:1.7, borderRadius:'14px', fontWeight:700, fontSize:14.5,
                  borderWidth:1.5, borderColor:BORD, color:SUB2,
                  '&:hover':{ bgcolor:'rgba(15,23,42,0.06)', borderColor:'rgba(15,23,42,0.16)', color:TXT }, transition:'all 0.18s' }}>
                Contacter le vendeur
              </Button>
            </Box>

            {/* trust badges — mobile only: same info shown in the desktop sticky buy box */}
            <Box sx={{ display:{ xs:'grid', lg:'none' }, gridTemplateColumns:'1fr 1fr', gap:1, mb:3.5 }}>
              {[
                { Icon:Security,      label:'Paiement sécurisé',   c:'#6366F1' },
                { Icon:LocalShipping, label:product.hasDelivery?'Livraison dispo.':'Retrait vendeur', c:GRN },
                { Icon:Verified,      label:product.store?.isVerified?'Boutique vérifiée':'Vendeur DealPam', c:OR },
                { Icon:FlashOn,       label:'Messages chiffrés', c:'#F472B6' },
              ].map(({ Icon, label, c },i)=>(
                <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1, p:1.2, borderRadius:'10px', bgcolor:'rgba(15,23,42,0.03)', border:`1px solid ${BORD}` }}>
                  <Box sx={{ width:24, height:24, borderRadius:'7px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:`${c}1A` }}>
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

            {/* store card */}
            {product.store&&(
              <Box sx={{ display:'flex', gap:{ xs:1.2, sm:2 }, alignItems:'center', p:2, borderRadius:'16px', bgcolor:CARD, border:`1px solid ${BORD}`, mb:3.5,
                boxShadow:'0 2px 10px rgba(15,23,42,0.04)', transition:'box-shadow 0.2s', '&:hover':{ boxShadow:'0 6px 20px rgba(15,23,42,0.08)' } }}>
                {product.store.logoUrl
                  ? <Box component="img" src={product.store.logoUrl} alt={product.store.name} sx={{ width:50, height:50, borderRadius:'10px', objectFit:'cover', flexShrink:0 }}/>
                  : <Avatar sx={{ width:50, height:50, bgcolor:`${OR}1A`, color:OR, fontWeight:900, fontSize:20, borderRadius:'10px', flexShrink:0, border:`1px solid rgba(255,107,0,0.2)` }}>{product.store.name?.[0]?.toUpperCase()}</Avatar>}
                <Box sx={{ flex:1, minWidth:0 }}>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.7, minWidth:0 }}>
                    <Typography fontWeight={800} fontSize={14} color={TXT} noWrap sx={{ minWidth:0 }}>{product.store.name}</Typography>
                    {product.store.isVerified&&<Verified sx={{ fontSize:13, color:OR, flexShrink:0 }}/>}
                  </Box>
                  <Box sx={{ display:'flex', alignItems:'center', gap:0.5, minWidth:0 }}>
                    <Star sx={{ fontSize:12, color:GLD, flexShrink:0 }}/>
                    <Typography fontSize={12} color={SUB} noWrap>{(product.store.avgRating||0).toFixed(1)} · {product.store.totalSales||0} ventes</Typography>
                  </Box>
                </Box>
                <Box sx={{ display:'flex', gap:1, flexShrink:0 }}>
                  <Button component={Link} to={`/store/${product.store.slug}`} size="small"
                    startIcon={<Store sx={{ fontSize:12 }}/>}
                    sx={{ borderRadius:'8px', border:`1px solid ${BORD}`, color:SUB2, fontWeight:600, fontSize:12,
                      px:{ xs:1, sm:1.5 }, py:0.6, minWidth:0,
                      '& .MuiButton-startIcon':{ mr:{ xs:0, sm:0.7 } },
                      '&:hover':{ borderColor:'rgba(15,23,42,0.16)', color:TXT } }}>
                    <Box component="span" sx={{ display:{ xs:'none', sm:'inline' } }}>Boutique</Box>
                  </Button>
                  {product.store.phone&&(
                    <IconButton component="a" href={`tel:${product.store.phone}`} size="small"
                      sx={{ border:`1px solid ${BORD}`, borderRadius:'8px', color:SUB2, flexShrink:0,
                        '&:hover':{ borderColor:'rgba(15,23,42,0.16)', color:TXT } }}>
                      <Phone sx={{ fontSize:14 }}/>
                    </IconButton>
                  )}
                </Box>
              </Box>
            )}

            {/* specs */}
            <Box sx={{ mb:3 }}>
              <Typography fontSize={12} fontWeight={700} color={SUB} textTransform="uppercase" letterSpacing="0.8px" mb={1.8}>Informations</Typography>
              <Box sx={{ borderRadius:'16px', border:`1px solid ${BORD}`, overflow:'hidden', boxShadow:'0 2px 10px rgba(15,23,42,0.03)' }}>
                {[
                  { l:'État',      v:cond.label },
                  { l:'Stock',     v:stock>0?`${stock} disponibles`:'Rupture' },
                  { l:'Livraison', v:product.hasDelivery?(product.deliveryPriceHTG?fmt(Number(product.deliveryPriceHTG)):'Gratuite'):'Retrait seulement' },
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
                          <Typography fontSize={13} color={SUB} width={36}>{s} ★</Typography>
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
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* ── RIGHT sticky buy box ───────────────────────────────────────── */}
          <Box sx={{ display:{ xs:'none', lg:'block' }, width:320, flexShrink:0, position:'sticky', top:80, alignSelf:'flex-start', pt:3 }}>
            <Box sx={{ bgcolor:CARD, borderRadius:'22px', p:3, border:`1px solid ${BORD}`,
              boxShadow:'0 12px 40px rgba(15,23,42,0.10)', position:'relative', overflow:'hidden',
              '&::before':{ content:'""', position:'absolute', top:0, left:0, right:0, height:4,
                background:`linear-gradient(90deg,${OR},#FF8C38)` } }}>
              <Typography fontSize={13} fontWeight={600} color={SUB} mb={0.5} noWrap sx={{ maxWidth:280 }}>{product.name}</Typography>
              {inFlashSale&&sale&&<CountdownBanner endAt={flashSale?.endAt} title={flashSale?.title}/>}
              {exchangeRate&&(
                <Box sx={{ display:'inline-flex', borderRadius:'8px', border:`1px solid ${BORD}`, overflow:'hidden', mb:1 }}>
                  {(['HTG','USD'] as const).map(c=>(
                    <Box key={c} onClick={()=>setDisplayCurrency(c)} sx={{ px:1.4, py:0.4, cursor:'pointer',
                      bgcolor:displayCurrency===c?OR:'transparent', color:displayCurrency===c?'#fff':SUB,
                      fontSize:11, fontWeight:800 }}>{c}</Box>
                  ))}
                </Box>
              )}
              <Box sx={{ display:'flex', alignItems:'baseline', gap:1.5, mb:sale?0.5:2 }}>
                <Typography fontWeight={900} color={TXT} sx={{ fontSize:32, letterSpacing:'-1.5px', lineHeight:1 }}>{fmtDisplay(cur)}</Typography>
                {sale&&<Typography color={SUB} sx={{ fontSize:17, textDecoration:'line-through' }}>{fmtDisplay(orig)}</Typography>}
              </Box>
              {sale&&(
                <Box sx={{ display:'inline-flex', px:1.2, py:0.4, borderRadius:'8px', bgcolor:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', mb:2 }}>
                  <Typography fontSize={12} fontWeight={700} color={GRN}>-{disc}% · Éco. {fmtDisplay(save)}</Typography>
                </Box>
              )}

              {stock>0
                ? <Box sx={{ display:'flex', alignItems:'center', gap:0.6, mb:2.5 }}><CheckCircle sx={{ fontSize:13, color:GRN }}/><Typography fontSize={12.5} color={GRN} fontWeight={700}>En stock ({stock} dispo.)</Typography></Box>
                : <Box sx={{ display:'flex', alignItems:'center', gap:0.6, mb:2.5 }}><Inventory sx={{ fontSize:13, color:RED }}/><Typography fontSize={12.5} color={RED} fontWeight={700}>Rupture de stock</Typography></Box>}

              {!inCart && stock>0 && (
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
                  <Typography fontSize={11.5} fontWeight={600} color={SUB} textTransform="uppercase" letterSpacing="0.6px">Quantité</Typography>
                  <Box sx={{ display:'flex', alignItems:'center', bgcolor:'rgba(15,23,42,0.06)', border:`1.5px solid ${BORD}`, borderRadius:'10px', overflow:'hidden', height:36 }}>
                    <IconButton size="small" onClick={()=>setQty(q=>Math.max(1,q-1))}
                      sx={{ borderRadius:0, px:1.4, height:'100%', color:TXT, '&:hover':{ bgcolor:'rgba(255,107,0,0.1)' } }}>
                      <Typography fontWeight={600} fontSize={16} lineHeight={1}>−</Typography>
                    </IconButton>
                    <Typography sx={{ px:1.8, fontWeight:900, fontSize:13.5, minWidth:30, textAlign:'center', color:TXT }}>{qty}</Typography>
                    <IconButton size="small" onClick={()=>setQty(q=>Math.min(stock||99,q+1))}
                      sx={{ borderRadius:0, px:1.4, height:'100%', color:TXT, '&:hover':{ bgcolor:'rgba(255,107,0,0.1)' } }}>
                      <Typography fontWeight={600} fontSize={16} lineHeight={1}>+</Typography>
                    </IconButton>
                  </Box>
                </Box>
              )}

              <Box sx={{ display:'flex', gap:1, mb:1.5 }}>
                <Button fullWidth onClick={addToCart} disabled={ctaDisabled}
                  startIcon={loading ? <CircularProgress size={14} color="inherit"/> : <ShoppingCart sx={{ fontSize:15 }}/>}
                  sx={{ py:1.6, borderRadius:'12px', fontWeight:800, fontSize:12.5, color:OR,
                    bgcolor:'#fff', border:`2px solid ${ctaDisabled?BORD:OR}`,
                    '&:hover:not(:disabled)':{ bgcolor:'rgba(255,107,0,0.06)' },
                    '&:disabled':{ color:SUB, borderColor:BORD } }}>
                  {loading ? '…' : stock===0 ? 'Épuisé' : 'Ajouter'}
                </Button>
                <Button fullWidth onClick={buyNow} disabled={ctaDisabled}
                  sx={{ py:1.6, borderRadius:'12px', fontWeight:900, fontSize:13, color:'#fff',
                    background: ctaDisabled ? undefined : `linear-gradient(135deg,#C84D00,${RED})`,
                    boxShadow: ctaDisabled ? undefined : '0 6px 22px rgba(239,68,68,0.35)',
                    '&:disabled':{ bgcolor:'rgba(15,23,42,0.07)', color:SUB, boxShadow:'none' },
                    '&:hover:not(:disabled)':{ boxShadow:'0 10px 28px rgba(239,68,68,0.45)', transform:'translateY(-1px)' }, transition:'all 0.18s' }}>
                  Acheter
                </Button>
              </Box>

              <Box onClick={toggleWL}
                sx={{ display:'flex', alignItems:'center', justifyContent:'center', gap:1, py:1.4, borderRadius:'12px',
                  border:`1px solid ${liked?'rgba(239,68,68,0.4)':BORD}`, color:liked?RED:SUB2, cursor:'pointer', mb:1.5,
                  '&:hover':{ borderColor:'rgba(239,68,68,0.4)', color:RED, bgcolor:'rgba(239,68,68,0.05)' }, transition:'all 0.15s' }}>
                {liked?<Favorite sx={{ fontSize:16 }}/>:<FavoriteBorder sx={{ fontSize:16 }}/>}
                <Typography fontSize={13} fontWeight={600}>{liked?'Dans vos favoris':'Ajouter aux favoris'}</Typography>
              </Box>

              <Button fullWidth variant="outlined" onClick={contactSeller}
                disabled={chatLoading}
                startIcon={chatLoading ? <CircularProgress size={15} color="inherit"/> : <Chat sx={{ fontSize:16 }}/>}
                sx={{ py:1.4, borderRadius:'12px', fontWeight:700, fontSize:13.5, mb:2.5,
                  borderWidth:1, borderColor:BORD, color:SUB2,
                  '&:hover':{ bgcolor:'rgba(15,23,42,0.05)', borderColor:'rgba(15,23,42,0.16)', color:TXT } }}>
                Contacter le vendeur
              </Button>

              <Box sx={{ display:'flex', flexDirection:'column', gap:1 }}>
                {[
                  { Icon:Security,      label:'Paiement sécurisé', sub:'via MonCash', c:'#6366F1' },
                  { Icon:LocalShipping, label:product.hasDelivery?'Livraison disponible':'Retrait sur place', sub:product.hasDelivery?'Suivi de commande':'Chez le vendeur', c:GRN },
                  { Icon:Verified,      label:product.store?.isVerified?'Boutique vérifiée':'Vendeur DealPam', sub:'Identité contrôlée', c:OR },
                ].map(({ Icon, label, sub, c },i)=>(
                  <Box key={i} sx={{ display:'flex', alignItems:'center', gap:1.2, p:1, borderRadius:'10px',
                    bgcolor:'rgba(15,23,42,0.02)', border:`1px solid ${BORD}` }}>
                    <Box sx={{ width:28, height:28, borderRadius:'8px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                      bgcolor:`${c}1A` }}>
                      <Icon sx={{ fontSize:15, color:c }}/>
                    </Box>
                    <Box sx={{ minWidth:0 }}>
                      <Typography fontSize={12} color={TXT} fontWeight={700} lineHeight={1.3} noWrap>{label}</Typography>
                      <Typography fontSize={10.5} color={SUB2} lineHeight={1.3} noWrap>{sub}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* recommendations */}
        <Box sx={{ mt:6, px:{ xs:2, md:0 } }}>
          <MRow title="Produits similaires" products={sim}/>
          {spon.length>0&&<MRow title={dept?`Sponsorisés · ${dept}`:'Sponsorisés'} badge="PROMO" products={spon}/>}
          {stP.length>0&&<MRow title={`Plus de ${product.store?.name??'cette boutique'}`} products={stP}/>}
          {hist.length>0&&<MRow title="Récemment consultés" products={hist}/>}
        </Box>
      </Box>

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
                      alt="" sx={{ width:'100%', height:'100%', objectFit:'cover' }}/>
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

      {/* mobile sticky bottom */}
      <Box sx={{ display:{ xs:'flex', lg:'none' }, position:'fixed', bottom:56, left:0, right:0, zIndex:1200,
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
        {!inCart ? (
          <Button size="small"
            onClick={needsColor ? ()=>document.getElementById('color-picker')?.scrollIntoView({behavior:'smooth',block:'center'}) : addToCart}
            disabled={loading||stock===0}
            startIcon={loading ? <CircularProgress size={13} color="inherit"/> : <ShoppingCart sx={{ fontSize:15 }}/>}
            sx={{ py:1.2, borderRadius:'10px', fontWeight:900, fontSize:13, px:2.2, color:'#fff', flexShrink:0,
              background: stock===0 ? undefined : `linear-gradient(135deg,#C84D00,${OR})`,
              boxShadow: stock>0 ? '0 3px 14px rgba(255,107,0,0.4)' : undefined,
              '&:disabled':{ bgcolor:'rgba(15,23,42,0.07)', color:SUB, boxShadow:'none' } }}>
            {loading?'…':stock===0?'Épuisé':needsColor?'Couleur':'Ajouter'}
          </Button>
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

      {apptOpen && product && (
        <BookAppointmentDialog
          product={product}
          isLoggedIn={!!user && !!localStorage.getItem('accessToken')}
          onClose={() => setApptOpen(false)}
        />
      )}
    </Box>
  );
}

/* ─── Dialogue de prise de rendez-vous ──────────────────────────────────── */
function BookAppointmentDialog({ product, isLoggedIn, onClose }: { product: any; isLoggedIn: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [scheduledAt, setScheduledAt] = useState('');
  const [note, setNote]               = useState('');
  const [clientName, setClientName]   = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);

  const canSubmit = !!scheduledAt && (isLoggedIn || (clientName.trim() && clientPhone.trim()));

  const submit = async () => {
    setSubmitting(true);
    try {
      if (isLoggedIn) {
        await api.post('/appointments', { productId: product.id, scheduledAt, note: note || undefined });
      } else {
        await api.post('/appointments/public', {
          productId: product.id, scheduledAt, note: note || undefined,
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
            </Typography>
            <TextField
              type="datetime-local" label="Date et heure souhaitées" fullWidth size="small"
              value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: new Date().toISOString().slice(0, 16) }}
            />
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
