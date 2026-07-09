import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { io as socketIo } from 'socket.io-client';
import {
  Container, Grid, Box, Typography, Button, Chip, Avatar, Rating,
  Tabs, Tab, alpha, IconButton, Tooltip, TextField,
  CircularProgress, Divider, MenuItem, Select, FormControl, InputLabel,
  Collapse, LinearProgress,
} from '@mui/material';
import {
  Verified, Star, LocationOn, Phone, Email,
  ContentCopy, CheckCircle as CheckCircleIcon, ShoppingBag,
  AccessTime, Security, Description, Gavel, BusinessCenter, Badge, OpenInNew,
  Chat, Close, Send, FiberManualRecord, Share, ArrowBack,
  TrendingUp, ThumbUp, Storefront,
  AttachFile as AttachFileIcon, DoneAll as DoneAllIcon,
  SmartToyOutlined as SmartToyIcon,
} from '@mui/icons-material';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { SkelBox, SkelText, ProductCardSkeletonGrid } from '../../components/shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

// ─── Constants ────────────────────────────────────────────────────────────────
const ORANGE = '#FF6B00';
const GREEN  = '#10B981';
const GOLD   = '#F59E0B';
const RED    = '#EF4444';
const BG     = '#F8FAFC';

const DOC_ICONS: Record<string, any> = {
  ID: Badge, BUSINESS_REGISTRATION: BusinessCenter, TAX: Gavel, OTHER: Description,
};
const DOC_LABELS: Record<string, string> = {
  ID: "Pièce d'identité", BUSINESS_REGISTRATION: 'Registre de commerce', TAX: 'Patente', OTHER: 'Document officiel',
};

const fmtHTG = (v: number) => `${v.toLocaleString('fr-HT')} HTG`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });

// ─── Product mini-card ────────────────────────────────────────────────────────
function ProductCard({ p }: { p: any }) {
  const img  = p.images?.[0]?.urlMedium || p.images?.[0]?.urlThumb;
  const sale = p.salePrice && Number(p.salePrice) < Number(p.price);
  const disc = sale ? Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100) : 0;
  return (
    <Box component={Link} to={`/products/${p.slug}`} sx={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <Box sx={{ bgcolor: 'white', borderRadius: 2.5, border: '1px solid #E5E7EB', overflow: 'hidden', height: '100%',
        transition: 'all 0.18s', '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.1)', transform: 'translateY(-2px)', borderColor: ORANGE } }}>
        <Box sx={{ position: 'relative', aspectRatio: '1', bgcolor: '#F8FAFC', overflow: 'hidden' }}>
          <Box component="img"
            src={img || 'https://placehold.co/300x300/F1F5F9/94A3B8?text=Photo'}
            alt={p.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', '&:hover': { transform: 'scale(1.06)' } }}
          />
          {sale && (
            <Chip label={`-${disc}%`} size="small"
              sx={{ position: 'absolute', top: 6, left: 6, bgcolor: RED, color: 'white', fontWeight: 900, height: 20, fontSize: 10 }} />
          )}
        </Box>
        <Box sx={{ p: 1.4 }}>
          <Typography fontSize={12.5} fontWeight={500} color="#0F1111" lineHeight={1.35}
            sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', mb: 0.6, minHeight: 34 }}>
            {p.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'nowrap', overflow: 'hidden', minWidth: 0 }}>
            <Typography fontWeight={800} fontSize={13.5} color={RED} noWrap sx={{ flexShrink: 0 }}>
              {fmtHTG(Number(p.salePrice || p.price))}
            </Typography>
            {sale && (
              <Typography fontSize={10.5} color="#64748B" noWrap sx={{ textDecoration: 'line-through', flexShrink: 1, minWidth: 0 }}>
                {fmtHTG(Number(p.price))}
              </Typography>
            )}
          </Box>
          {p.avgRating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.5 }}>
              <Star sx={{ fontSize: 11, color: GOLD }} />
              <Typography fontSize={11} color="#64748B">{Number(p.avgRating).toFixed(1)}</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Chat widget (dark modern, socket-based) ───────────────────────────────────
const CW_BG      = 'rgba(10,16,30,0.97)';
const CW_SURFACE = 'rgba(255,255,255,0.05)';
const CW_BORDER  = 'rgba(255,255,255,0.08)';
const CW_SOCK    = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace('/v1', '');

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ChatWidget({ store, sellerUserId, open, onClose }: {
  store: any; sellerUserId: string; open: boolean; onClose: () => void;
}) {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const [convId,   setConvId]   = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [uploading,setUploading]= useState(false);
  const [uploadPct,setUploadPct]= useState(0);
  const [typing,   setTyping]   = useState(false);
  const [sellerOnline, setSellerOnline] = useState(false);

  const socketRef  = useRef<any>(null);
  const convIdRef  = useRef<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const typingTmr  = useRef<any>(null);

  /* socket */
  useEffect(() => {
    if (!open || !user) return;
    const token = localStorage.getItem('accessToken');
    const s = socketIo(`${CW_SOCK}/chat`, { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;

    s.on('user:online',  ({ userId }: any) => { if (userId === sellerUserId) setSellerOnline(true); });
    s.on('user:offline', ({ userId }: any) => { if (userId === sellerUserId) setSellerOnline(false); });

    s.on('chat:message', (msg: any) => {
      setMessages(prev => {
        const optIdx = prev.findIndex(m => m.id?.startsWith('opt-') && m.senderId === msg.senderId && m.content === msg.content);
        if (optIdx !== -1) { const n = [...prev]; n[optIdx] = msg; return n; }
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    s.on('chat:typing', ({ userId }: any) => {
      if (userId === user.id) return;
      setTyping(true);
      clearTimeout(typingTmr.current);
      typingTmr.current = setTimeout(() => setTyping(false), 3000);
    });
    s.on('connect', () => {
      if (convIdRef.current) s.emit('chat:join', { conversationId: convIdRef.current });
    });
    return () => { s.disconnect(); socketRef.current = null; };
  }, [open, user, sellerUserId]); // eslint-disable-line

  /* create / load conversation */
  useEffect(() => {
    if (!open || !user || convId) return;
    setLoading(true);
    api.post('/chat/conversations', { userId: sellerUserId })
      .then(({ data }) => {
        setConvId(data.id);
        convIdRef.current = data.id;
        const s = socketRef.current;
        if (s?.connected) s.emit('chat:join', { conversationId: data.id });
        else if (s) s.once('connect', () => s.emit('chat:join', { conversationId: data.id }));
        return api.get(`/chat/conversations/${data.id}/messages`);
      })
      .then(({ data }) => {
        setMessages(data.data ?? []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, user]); // eslint-disable-line

  /* send text */
  const send = useCallback(async (content: string, type = 'TEXT', mediaUrl?: string, previewUrl?: string) => {
    if (!content.trim() && !mediaUrl) return;
    if (!convId) return;
    const opt: any = {
      id: `opt-${Date.now()}`, senderId: user!.id,
      sender: { id: user!.id, firstName: user!.firstName, lastName: user!.lastName, avatar: user!.avatar },
      content, type, mediaUrl: previewUrl ?? mediaUrl ?? null, createdAt: new Date().toISOString(), isRead: false,
    };
    setMessages(p => [...p, opt]);
    setInput('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    const s = socketRef.current;
    if (s?.connected) {
      s.emit('chat:send', { conversationId: convId, content, type, mediaUrl });
    } else {
      try {
        const { data: real } = await api.post(`/chat/conversations/${convId}/messages`, { content });
        setMessages(p => p.map(m => m.id === opt.id ? real : m));
      } catch {}
    }
  }, [convId, user]);

  /* file upload */
  const handleFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const form = new FormData();
    form.append('file', file);
    setUploading(true); setUploadPct(0);
    try {
      // Pièces jointes de chat : bucket privé — l'API ne renvoie qu'une
      // référence interne (publicId), jamais une URL exploitable directement.
      const endpoint = isImage ? '/upload/chat-image' : '/upload/chat-file';
      const { data } = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setUploadPct(Math.round((e.loaded * 100) / (e.total ?? 1))),
      });
      const mediaUrl = isImage ? `chatimg:${data.publicId}` : `chatfile:${data.publicId}:${data.fileName}`;
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      await send(file.name, isImage ? 'IMAGE' : 'FILE', mediaUrl, previewUrl);
    } catch {}
    finally { setUploading(false); setUploadPct(0); }
  }, [send]);

  const onInputChange = (val: string) => {
    setInput(val);
    if (convId && socketRef.current?.connected) {
      socketRef.current.emit('chat:typing', { conversationId: convId });
    }
  };

  if (!open) return null;

  /* not logged in */
  if (!user) return (
    <Box sx={{
      position: 'fixed', bottom: 88, right: 20, zIndex: 1400,
      width: 'min(340px, calc(100vw - 24px))',
      background: CW_BG, backdropFilter: 'blur(24px)',
      borderRadius: '20px', border: `1px solid ${CW_BORDER}`,
      boxShadow: '0 24px 64px rgba(0,0,0,0.7)', p: 3, textAlign: 'center',
    }}>
      <Chat sx={{ fontSize: 40, color: ORANGE, mb: 1 }} />
      <Typography fontWeight={700} color="#fff" mb={0.5}>Connectez-vous pour chatter</Typography>
      <Typography fontSize={13} color="#aaa" mb={2}>Créez un compte pour contacter ce vendeur.</Typography>
      <Button fullWidth variant="contained" onClick={() => navigate('/login')}
        sx={{ background: `linear-gradient(135deg,#E05A00,${ORANGE})`, borderRadius: 2, fontWeight: 700 }}>
        Se connecter
      </Button>
      <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 10, right: 10, color: '#aaa' }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 88,
      right: 20,
      zIndex: 1400,
      width: 'min(370px, calc(100vw - 24px))',
      height: 'min(560px, calc(100dvh - 110px))',
      display: 'flex', flexDirection: 'column',
      background: CW_BG,
      backdropFilter: 'blur(24px)',
      borderRadius: '20px',
      border: `1px solid ${CW_BORDER}`,
      boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <Box sx={{
        px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
        background: `linear-gradient(90deg, rgba(255,107,0,0.25), rgba(255,107,0,0.08))`,
        borderBottom: `1px solid ${CW_BORDER}`,
      }}>
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={store.logoUrl} sx={{ width: 42, height: 42, bgcolor: ORANGE, fontSize: 18, fontWeight: 800 }}>
            {store.name?.[0]}
          </Avatar>
          <Box sx={{
            position: 'absolute', bottom: 1, right: 1,
            width: 10, height: 10, borderRadius: '50%',
            bgcolor: sellerOnline ? '#4caf50' : '#64748B',
            border: '2px solid #0a101e',
          }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontSize={14} fontWeight={700} color="#fff" noWrap>{store.name}</Typography>
          <Typography fontSize={11} sx={{ color: sellerOnline ? '#4caf50' : '#aaa' }}>
            {sellerOnline ? '● En ligne' : '○ Hors ligne'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: '#aaa', '&:hover': { color: '#fff' } }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box sx={{
        flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: '#2a3550', borderRadius: 2 },
      }}>
        {loading && <Box sx={{ textAlign: 'center', pt: 4 }}><CircularProgress size={24} sx={{ color: ORANGE }} /></Box>}

        {!loading && messages.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 1.5,
              background: `linear-gradient(135deg,${ORANGE}22,${ORANGE}44)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Chat sx={{ fontSize: 26, color: ORANGE }} />
            </Box>
            <Typography fontSize={14} fontWeight={600} color="#fff" mb={0.5}>Dites bonjour à {store.name} !</Typography>
            <Typography fontSize={12} color="#666">Posez vos questions directement au vendeur.</Typography>
          </Box>
        )}

        {messages.map((m: any) => {
          const mine   = m.senderId === user.id;
          const isBot  = m.type === 'BOT';
          const isFile = m.type === 'FILE';
          const isImg  = m.type === 'IMAGE';

          if (m.type === 'SYSTEM') {
            return (
              <Box key={m.id} sx={{ textAlign: 'center' }}>
                <Chip label={m.content} size="small" sx={{ color: '#4caf50', bgcolor: 'rgba(76,175,80,0.1)', fontSize: 11 }} />
              </Box>
            );
          }

          return (
            <Box key={m.id} sx={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 0.8, alignItems: 'flex-end' }}>
              {!mine && (
                <Avatar src={isBot ? undefined : m.sender?.avatar} sx={{ width: 26, height: 26, bgcolor: isBot ? '#6a1ec2' : ORANGE, fontSize: 11, flexShrink: 0 }}>
                  {isBot ? <SmartToyIcon sx={{ fontSize: 13 }} /> : (m.sender?.firstName?.[0] ?? '?')}
                </Avatar>
              )}
              <Box sx={{ maxWidth: '74%' }}>
                {!mine && (
                  <Typography sx={{ color: isBot ? '#c084fc' : '#aaa', fontSize: 10, mb: 0.2, px: 0.5 }}>
                    {isBot ? '🤖 Message automatique' : `${m.sender?.firstName ?? ''} ${m.sender?.lastName ?? ''}`.trim()}
                  </Typography>
                )}
                <Box sx={{
                  px: 1.4, py: 0.9,
                  bgcolor: isBot ? 'rgba(160,80,255,0.14)' : mine ? `rgba(255,107,0,0.25)` : CW_SURFACE,
                  borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  border: isBot ? '1px solid rgba(160,80,255,0.3)' : mine ? `1px solid rgba(255,107,0,0.3)` : 'none',
                }}>
                  {isImg && m.mediaUrl && (
                    <Box component="img" src={m.mediaUrl} alt="" onClick={() => window.open(m.mediaUrl, '_blank')}
                      sx={{ maxWidth: '100%', borderRadius: 1, display: 'block', cursor: 'pointer', mb: 0.5 }} />
                  )}
                  {isFile && m.mediaUrl ? (
                    <Typography component="a" href={m.mediaUrl} target="_blank" rel="noopener"
                      sx={{ color: ORANGE, fontSize: 13, display: 'block' }}>📎 {m.content}</Typography>
                  ) : (
                    <Typography sx={{ color: '#fff', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.content}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'center', gap: 0.4, px: 0.5, mt: 0.2 }}>
                  <Typography sx={{ color: '#444', fontSize: 10 }}>{fmtTime(m.createdAt)}</Typography>
                  {mine && (m.isRead
                    ? <DoneAllIcon sx={{ fontSize: 11, color: ORANGE }} />
                    : <CheckCircleIcon sx={{ fontSize: 11, color: '#444' }} />
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}

        {/* Typing */}
        {typing && (
          <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'center', pl: 0.5 }}>
            <Avatar src={store.logoUrl} sx={{ width: 24, height: 24, bgcolor: ORANGE, fontSize: 10 }}>{store.name?.[0]}</Avatar>
            <Box sx={{ display: 'flex', gap: 0.4, px: 1.4, py: 0.8, bgcolor: CW_SURFACE, borderRadius: 2 }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#666',
                  animation: 'blink2 1s infinite', animationDelay: `${d}s`,
                  '@keyframes blink2': { '0%,100%': { opacity: 0.3 }, '50%': { opacity: 1 } } }} />
              ))}
            </Box>
          </Box>
        )}

        <div ref={bottomRef} />
      </Box>

      {uploading && <LinearProgress variant="determinate" value={uploadPct} sx={{ bgcolor: CW_SURFACE, '& .MuiLinearProgress-bar': { bgcolor: ORANGE } }} />}

      {/* Input */}
      <Box sx={{ px: 1.5, py: 1.2, display: 'flex', gap: 1, alignItems: 'flex-end', borderTop: `1px solid ${CW_BORDER}` }}>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        <IconButton size="small" onClick={() => fileRef.current?.click()} disabled={uploading}
          sx={{ color: '#666', '&:hover': { color: ORANGE } }}>
          <AttachFileIcon fontSize="small" />
        </IconButton>
        <TextField
          value={input} onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Votre message…" multiline maxRows={3} fullWidth size="small" variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: CW_SURFACE, borderRadius: 3, color: '#fff', fontSize: 13,
              '& fieldset': { borderColor: CW_BORDER },
              '&:hover fieldset': { borderColor: '#444' },
              '&.Mui-focused fieldset': { borderColor: ORANGE },
            },
            '& textarea::placeholder': { color: '#555', opacity: 1 },
          }}
        />
        <IconButton onClick={() => send(input)} disabled={!input.trim() && !uploading}
          sx={{ bgcolor: ORANGE, color: '#fff', flexShrink: 0,
            '&:hover': { bgcolor: '#E05A00' },
            '&.Mui-disabled': { bgcolor: '#1a2540', color: '#444' } }}>
          <Send fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
// Composé pour épouser la mise en page réelle : bannière + identité boutique,
// puis la grille de produits (mêmes proportions que la grille finale).
function PageSkeleton() {
  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh' }}>
      <SkelBox sx={{ height: { xs: 200, md: 300 }, borderRadius: 0 }} />
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-end', pb: 2.5, mt: -5, flexWrap: 'wrap' }}>
            <SkelBox sx={{ width: { xs: 72, md: 96 }, height: { xs: 72, md: 96 }, borderRadius: '12px', flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 200, pb: 0.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <SkelText width="35%" sx={{ height: 22 }} />
              <SkelText width="55%" />
            </Box>
          </Box>
        </Container>
      </Box>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={3.5}>
            <SkelBox sx={{ height: 320, borderRadius: '12px' }} />
          </Grid>
          <Grid item xs={12} md={8.5}>
            <ProductCardSkeletonGrid count={8} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BoutiquePage() {
  const { slug }  = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();

  const [tab,      setTab]      = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [copied,   setCopied]   = useState(false);

  // Filters
  const [filterCat,   setFilterCat]   = useState('');
  const [filterCond,  setFilterCond]  = useState('');
  const [filterPrice, setFilterPrice] = useState('');
  const [filterSort,  setFilterSort]  = useState('newest');

  // Store query
  const { data: store, isLoading } = useQuery({
    queryKey: ['boutique', slug],
    queryFn:  () => api.get(`/stores/${slug}`).then(r => r.data),
    staleTime: 60_000,
  });
  const showSkel = useDelayedLoading(isLoading);

  // Infinite products
  const PAGE_SIZE = 20;
  const {
    data: prodsPages, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['boutique-products', slug, filterCat, filterCond, filterPrice, filterSort],
    queryFn:  ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ storeId: store?.id ?? '', limit: String(PAGE_SIZE), page: String(pageParam), sort: filterSort });
      if (filterCat)   params.set('category', filterCat);
      if (filterCond)  params.set('condition', filterCond);
      if (filterPrice === 'lt1000')  { params.set('maxPrice', '999'); }
      if (filterPrice === '1k-5k')   { params.set('minPrice', '1000'); params.set('maxPrice', '4999'); }
      if (filterPrice === 'gt5k')    { params.set('minPrice', '5000'); }
      return api.get(`/products?${params}`).then(r => r.data);
    },
    getNextPageParam: (last: any) => last.page < last.totalPages ? last.page + 1 : undefined,
    enabled: !!store?.id,
    initialPageParam: 1,
  });

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) fetchNextPage(); }, { threshold: 0.5 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage]);

  const share = () => {
    const url = window.location.href;
    if ('share' in navigator) {
      (navigator as any).share({ title: store?.name, url }).catch(() => {});
    } else {
      (navigator as any).clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      enqueueSnackbar('Lien copié !', { variant: 'info' });
    }
  };

  if (isLoading) return showSkel ? <PageSkeleton /> : null;
  if (!store)    return (
    <Container sx={{ py: 8, textAlign: 'center' }}>
      <Storefront sx={{ fontSize: 64, color: '#E2E8F0', mb: 2 }} />
      <Typography variant="h5" fontWeight={800} mb={2}>Boutique introuvable</Typography>
      <Button component={Link} to="/stores" variant="contained">Voir toutes les boutiques</Button>
    </Container>
  );

  const seller      = store.seller;
  const docs        = (seller?.documents ?? []) as any[];
  const verifiedDoc = docs.some((d: any) => d.isValid);
  const allStores   = (seller?.stores ?? []) as any[];
  const otherStores = allStores.filter((s: any) => s.slug !== slug);
  const products    = (prodsPages?.pages ?? []).flatMap((p: any) => p.data ?? []);
  const totalProds  = prodsPages?.pages?.[0]?.total ?? 0;

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', pb: { xs: 10, md: 6 } }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <Box sx={{ position: 'relative', height: { xs: 220, md: 320 }, overflow: 'hidden', bgcolor: '#0F172A', borderRadius: { xs: 0, md: '0 0 28px 28px' } }}>
        {store.bannerUrl ? (
          <Box component="img" src={store.bannerUrl} alt="banner"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
        ) : (
          <Box sx={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #2D1B00 100%)',
          }}>
            <Box sx={{ position: 'absolute', right: -80, top: -80, width: 320, height: 320, borderRadius: '50%',
              background: `radial-gradient(circle,${alpha(ORANGE, 0.25)},transparent 70%)` }} />
          </Box>
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' }} />

        {/* Back */}
        <IconButton onClick={() => navigate(-1)}
          sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'rgba(0,0,0,0.4)', color: 'white', backdropFilter: 'blur(6px)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
          <ArrowBack />
        </IconButton>

        {/* Share */}
        <IconButton onClick={share}
          sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(0,0,0,0.4)', color: 'white', backdropFilter: 'blur(6px)',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
          {copied ? <CheckCircleIcon /> : <Share />}
        </IconButton>
      </Box>

      {/* ── STORE IDENTITY ────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-end', pb: 2.5, mt: -6, position: 'relative', flexWrap: 'wrap' }}>
            {/* Logo */}
            <Box sx={{ width: { xs: 84, md: 108 }, height: { xs: 84, md: 108 }, borderRadius: '22px',
              border: '4px solid white', overflow: 'hidden', flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', bgcolor: 'white' }}>
              {store.logoUrl ? (
                <Box component="img" src={store.logoUrl} alt={store.name}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Box sx={{ width: '100%', height: '100%', background: `linear-gradient(135deg,${ORANGE},#E05A00)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography fontSize={36} fontWeight={900} color="white">{store.name?.[0]?.toUpperCase()}</Typography>
                </Box>
              )}
            </Box>

            {/* Info */}
            <Box sx={{ flex: 1, minWidth: 0, pb: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography fontWeight={900} fontSize={{ xs: 21, md: 27 }} color="#0F172A" letterSpacing="-0.5px">{store.name}</Typography>
                {(store.isVerified || verifiedDoc) && (
                  <Verified sx={{ fontSize: 22, color: ORANGE }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.7, flexWrap: 'wrap' }}>
                {store.avgRating > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Star sx={{ fontSize: 15, color: GOLD }} />
                    <Typography fontSize={13.5} fontWeight={700}>{Number(store.avgRating).toFixed(1)}</Typography>
                    <Typography fontSize={12.5} color="#64748B">({store._count?.reviews ?? 0} avis)</Typography>
                  </Box>
                )}
                {store.department && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <LocationOn sx={{ fontSize: 14, color: '#64748B' }} />
                    <Typography fontSize={12.5} color="#64748B">{[store.city, store.department].filter(Boolean).join(', ')}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <AccessTime sx={{ fontSize: 13, color: '#64748B' }} />
                  <Typography fontSize={12.5} color="#64748B">Depuis {fmtDate(store.createdAt)}</Typography>
                </Box>
                <Chip label={`${store._count?.products ?? 0} produits`} size="small"
                  sx={{ height: 20, fontSize: 11, bgcolor: alpha(ORANGE, 0.08), color: ORANGE, fontWeight: 700 }} />
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, pb: 0.8 }}>
              <Button variant="contained" startIcon={<Chat />}
                onClick={() => { if (!user) navigate('/login'); else setChatOpen(p => !p); }}
                sx={{ background: `linear-gradient(135deg, #E05A00, ${ORANGE})`,
                  boxShadow: '0 4px 16px rgba(255,107,0,0.35)', borderRadius: 2.5, fontWeight: 700,
                  '&:hover': { boxShadow: '0 6px 24px rgba(255,107,0,0.5)' } }}>
                Chat en direct
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>

          {/* ── LEFT : Tabs content ───────────────────────────────────────── */}
          <Grid item xs={12} md={3.5}>

            {/* Tabs */}
            <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #E5E7EB', overflow: 'hidden',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)', mb: 2 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
                sx={{ borderBottom: '1px solid #E5E7EB', px: 1,
                  '& .MuiTab-root': { fontWeight: 600, fontSize: 13, textTransform: 'none', minWidth: 'auto', px: 2 },
                  '& .Mui-selected': { color: ORANGE },
                  '& .MuiTabs-indicator': { bgcolor: ORANGE, height: 3, borderRadius: '3px 3px 0 0' } }}>
                <Tab label="À propos" />
                {docs.length > 0 && <Tab label={`Documents (${docs.length})`} />}
                <Tab label="Statistiques" />
              </Tabs>

              <Box sx={{ p: 2.5 }}>
                {/* À propos */}
                {tab === 0 && (
                  <Box>
                    {store.description && (
                      <Typography fontSize={13.5} color="#374151" lineHeight={1.75} mb={2}>
                        {store.description}
                      </Typography>
                    )}
                    {[
                      { icon: LocationOn, label: [store.city, store.department].filter(Boolean).join(', ') || null },
                      { icon: Phone,      label: store.phone },
                      { icon: Email,      label: store.email },
                    ].filter(r => r.label).map(({ icon: Icon, label }, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Icon sx={{ fontSize: 16, color: '#64748B', flexShrink: 0 }} />
                        <Typography fontSize={13} color="#475569">{label}</Typography>
                      </Box>
                    ))}
                    {(() => {
                      // acceptedPaymentMethods peut être un tableau, une chaîne JSON
                      // valide, ou (données historiques corrompues) "{}" — jamais
                      // supposer que c'est un tableau sans vérifier, sinon .map()
                      // plante toute la page.
                      let methods: string[] = [];
                      if (Array.isArray(store.acceptedPaymentMethods)) {
                        methods = store.acceptedPaymentMethods;
                      } else if (typeof store.acceptedPaymentMethods === 'string') {
                        try {
                          const parsed = JSON.parse(store.acceptedPaymentMethods || '[]');
                          if (Array.isArray(parsed)) methods = parsed;
                        } catch { /* ignore malformed data */ }
                      }
                      if (methods.length === 0) return null;
                      return (
                        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #F1F5F9' }}>
                          <Typography fontSize={12} fontWeight={700} color="#64748B" mb={0.8}>Paiements acceptés</Typography>
                          <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                            {methods.map((m: string) => (
                              <Chip key={m} label={m} size="small"
                                sx={{ height: 20, fontSize: 11, bgcolor: '#F8FAFC' }} />
                            ))}
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                )}

                {/* Documents */}
                {tab === 1 && docs.length > 0 && (
                  <Box>
                    <Typography fontSize={12.5} color="#64748B" mb={1.5} lineHeight={1.5}>
                      Ces documents officiels ont été soumis par le vendeur pour attester de son identité commerciale.
                    </Typography>
                    {docs.map((doc: any) => {
                      const Icon = DOC_ICONS[doc.type] ?? Description;
                      return (
                        <Box key={doc.id} sx={{
                          display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2,
                          borderRadius: 2, mb: 0.8,
                          bgcolor: doc.isValid ? alpha(GREEN, 0.04) : '#F8FAFC',
                          border: `1px solid ${doc.isValid ? alpha(GREEN, 0.2) : '#E5E7EB'}`,
                        }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
                            bgcolor: doc.isValid ? alpha(GREEN, 0.12) : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon sx={{ fontSize: 16, color: doc.isValid ? GREEN : '#64748B' }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography fontSize={12.5} fontWeight={600} noWrap>{DOC_LABELS[doc.type] ?? doc.type}</Typography>
                              {doc.isValid && <Verified sx={{ fontSize: 13, color: GREEN }} />}
                            </Box>
                            <Typography fontSize={11} color="#64748B" noWrap>{doc.fileName}</Typography>
                          </Box>
                          <IconButton size="small" component="a" href={doc.url} target="_blank" rel="noopener noreferrer"
                            sx={{ width: 26, height: 26, color: '#64748B', '&:hover': { color: ORANGE } }}>
                            <OpenInNew sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      );
                    })}
                  </Box>
                )}

                {/* Statistiques */}
                {(tab === (docs.length > 0 ? 2 : 1)) && (
                  <Box>
                    {[
                      { label: 'Produits en vente',    value: store._count?.products ?? 0 },
                      { label: 'Ventes totales',        value: store.totalSales ?? 0 },
                      { label: 'Avis clients',          value: store._count?.reviews ?? 0 },
                      { label: 'Note moyenne',          value: `${(store.avgRating || 0).toFixed(1)} / 5` },
                      { label: 'Membre depuis',         value: fmtDate(store.createdAt) },
                      { label: 'Boutiques du vendeur',  value: allStores.length },
                    ].map(({ label, value }, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.9,
                        borderBottom: '1px solid #F1F5F9', '&:last-child': { borderBottom: 'none' } }}>
                        <Typography fontSize={13} color="#64748B">{label}</Typography>
                        <Typography fontSize={13} fontWeight={700} color="#1E293B">{value}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Other stores */}
            {otherStores.length > 0 && (
              <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #E5E7EB', p: 2.5,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <Typography fontWeight={800} fontSize={14} mb={1.5} color="#0F1111">
                  Autres boutiques de {seller?.user?.firstName || 'ce vendeur'}
                </Typography>
                {otherStores.map((s: any) => (
                  <Box key={s.id} component={Link} to={`/boutique/${s.slug}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.2, borderRadius: 2, mb: 0.8,
                      border: '1px solid #E5E7EB', textDecoration: 'none',
                      '&:hover': { borderColor: ORANGE, bgcolor: alpha(ORANGE, 0.04) }, transition: 'all 0.15s' }}>
                    <Avatar src={s.logoUrl} sx={{ width: 36, height: 36, bgcolor: ORANGE, fontSize: 14, fontWeight: 700 }}>
                      {s.name?.[0]}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontSize={13} fontWeight={700} color="#0F1111" noWrap>{s.name}</Typography>
                      <Typography fontSize={11.5} color="#64748B">{s._count?.products ?? 0} produits</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Grid>

          {/* ── RIGHT : Products grid ─────────────────────────────────────── */}
          <Grid item xs={12} md={8.5}>

            {/* Filters */}
            <Box sx={{ bgcolor: 'white', borderRadius: 3, border: '1px solid #E5E7EB', p: 2, mb: 2.5,
              display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <Typography fontWeight={700} fontSize={15} mr={1}>
                {totalProds} produit{totalProds > 1 ? 's' : ''}
              </Typography>
              {[
                { label: 'Catégorie', val: filterCat, set: setFilterCat,
                  opts: [['', 'Toutes'], ['electronique', 'Électronique'], ['vetements', 'Vêtements'], ['maison', 'Maison'], ['beaute', 'Beauté']] },
                { label: 'État', val: filterCond, set: setFilterCond,
                  opts: [['', 'Tous'], ['new', 'Neuf'], ['refurbished', 'Reconditionné'], ['used', 'Occasion'], ['damaged', 'Endommagé']] },
                { label: 'Prix', val: filterPrice, set: setFilterPrice,
                  opts: [['', 'Tout'], ['lt1000', '< 1 000 HTG'], ['1k-5k', '1k – 5k HTG'], ['gt5k', '> 5 000 HTG']] },
                { label: 'Trier', val: filterSort, set: setFilterSort,
                  opts: [['newest', 'Plus récents'], ['price_asc', 'Prix ↑'], ['price_desc', 'Prix ↓'], ['rating', 'Mieux notés'], ['popular', 'Plus vendus']] },
              ].map(({ label, val, set, opts }) => (
                <FormControl key={label} size="small" sx={{ minWidth: 130 }}>
                  <InputLabel sx={{ fontSize: 12.5 }}>{label}</InputLabel>
                  <Select value={val} label={label} onChange={e => set(e.target.value as string)}
                    sx={{ fontSize: 12.5, borderRadius: 2 }}>
                    {opts.map(([v, l]) => <MenuItem key={v} value={v} sx={{ fontSize: 12.5 }}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
              ))}
            </Box>

            {/* Grid */}
            <Grid container spacing={2}>
              {products.map((p: any) => (
                <Grid key={p.id} item xs={6} sm={4} md={4} lg={3}>
                  <ProductCard p={p} />
                </Grid>
              ))}
            </Grid>

            {/* Sentinel for infinite scroll */}
            <Box ref={sentinelRef} sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
              {isFetchingNextPage && <CircularProgress size={28} sx={{ color: ORANGE }} />}
              {!hasNextPage && products.length > 0 && (
                <Typography fontSize={12.5} color="#64748B">Tous les produits sont affichés</Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ── Chat Widget ─────────────────────────────────────────────────────── */}
      <ChatWidget
        store={store}
        sellerUserId={seller?.userId}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* ── Floating chat button (mobile) ────────────────────────────────── */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, position: 'fixed', bottom: 72, right: 16, zIndex: 1200 }}>
        {!chatOpen && (
          <Button variant="contained" startIcon={<Chat />}
            onClick={() => { if (!user) navigate('/login'); else setChatOpen(true); }}
            sx={{ background: `linear-gradient(135deg, #E05A00, ${ORANGE})`,
              boxShadow: '0 6px 20px rgba(255,107,0,0.45)', borderRadius: 3, fontWeight: 700 }}>
            Chat
          </Button>
        )}
      </Box>

    </Box>
  );
}
