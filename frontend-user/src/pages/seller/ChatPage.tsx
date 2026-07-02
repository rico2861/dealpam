import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Avatar, IconButton, CircularProgress, alpha,
  InputBase, Tooltip, Chip,
} from '@mui/material';
import {
  Send, ArrowBack, SupportAgent, AttachFileOutlined,
  DoneAll, Done, PictureAsPdfOutlined, InsertDriveFileOutlined,
  ImageOutlined, KeyboardArrowDown, FiberManualRecord, Search,
  SmartToyOutlined, HeadsetMicOutlined, LockOutlined,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { getOrCreatePublicKey, encryptMsg, decryptMsg, isEncrypted } from '../../utils/e2e-crypto';

const API_URL  = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const ORANGE   = '#FF6B00';
const DARK_BG  = '#060B14';
const PANEL_BG = '#080E1C';
const CARD_BG  = '#0D1424';
const BORD     = 'rgba(255,255,255,0.07)';
const BUBBLE_BG = 'rgba(255,255,255,0.06)';
const PURPLE   = '#8B5CF6';

interface Msg {
  id: string;
  content: string;
  senderId: string;
  type: string; // TEXT | IMAGE | FILE | BOT | SYSTEM
  mediaUrl?: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; firstName: string; lastName: string; avatar?: string; role?: string };
}

interface ConvUser {
  userId: string;
  unreadCount: number;
  user: { id: string; firstName: string; lastName: string; avatar?: string; role?: string };
}

interface Conv {
  id: string;
  isSupport: boolean;
  topic?: string;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
  participants: ConvUser[];
  messages: Msg[];
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByDate(msgs: Msg[]) {
  const groups: { date: string; messages: Msg[] }[] = [];
  msgs.forEach(m => {
    const d = fmtDate(m.createdAt);
    const last = groups[groups.length - 1];
    if (last?.date === d) last.messages.push(m);
    else groups.push({ date: d, messages: [m] });
  });
  return groups;
}

function MediaBubble({ url, name, mine }: { url: string; name?: string; mine: boolean }) {
  const isPdf = /\.pdf$/i.test(url) || url.includes('pdf');
  const isImg = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url);
  if (isImg) return (
    <Box component="a" href={url} target="_blank" rel="noreferrer" sx={{ display: 'block', mt: 0.5 }}>
      <Box component="img" src={url} alt="image" sx={{ maxWidth: 220, maxHeight: 220, borderRadius: '10px', objectFit: 'cover', display: 'block', border: '1px solid rgba(255,255,255,0.1)' }} />
    </Box>
  );
  return (
    <Box component="a" href={url} target="_blank" rel="noreferrer" sx={{
      display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none',
      mt: 0.5, px: 1.5, py: 1, borderRadius: '10px',
      bgcolor: mine ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.07)',
      border: `1px solid ${mine ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)'}`,
    }}>
      {isPdf ? <PictureAsPdfOutlined sx={{ fontSize: 20, color: '#F87171' }} /> : <InsertDriveFileOutlined sx={{ fontSize: 20, color: '#93C5FD' }} />}
      <Typography sx={{ fontSize: 12, color: 'white', fontWeight: 600 }}>{name ?? 'Fichier joint'}</Typography>
    </Box>
  );
}

export default function SellerChatPage() {
  const { user } = useAuthStore();
  const token = localStorage.getItem('accessToken');
  const qc = useQueryClient();

  const [active, setActive]         = useState<string | null>(null);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [onlineIds, setOnlineIds]   = useState<Set<string>>(new Set());
  const [typing, setTyping]         = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [uploadPct, setUploadPct]   = useState<number | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [search, setSearch]         = useState('');

  const socketRef   = useRef<Socket | null>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const msgBoxRef   = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const activeRef   = useRef<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache of peer public keys: userId → base64 spki
  const peerKeys    = useRef<Map<string, string>>(new Map());

  // Upload our public key on mount
  useEffect(() => {
    getOrCreatePublicKey().then(pub =>
      api.patch('/users/me/public-key', { publicKey: pub }).catch(() => {})
    );
  }, []);

  const getPeerPub = useCallback(async (peerId: string): Promise<string | null> => {
    if (peerKeys.current.has(peerId)) return peerKeys.current.get(peerId)!;
    try {
      const { data } = await api.get(`/users/${peerId}/public-key`);
      if (data?.publicKey) { peerKeys.current.set(peerId, data.publicKey); return data.publicKey; }
    } catch { /* peer may not support E2E */ }
    return null;
  }, []);

  const { data: conversations = [] } = useQuery<Conv[]>({
    queryKey: ['seller-conversations'],
    queryFn: () => api.get('/chat/conversations').then(r => r.data),
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const scrollBottom = (force = false) => {
    setTimeout(() => {
      if (!msgBoxRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = msgBoxRef.current;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 120;
      if (force || nearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        setShowScrollBtn(false);
      } else {
        setShowScrollBtn(true);
      }
    }, 50);
  };

  // Connect socket once
  useEffect(() => {
    if (!token) return;
    const s = io(`${API_URL.replace('/v1', '')}/chat`, {
      auth: (cb: (o: object) => void) => cb({ token: localStorage.getItem('accessToken') }),
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = s;

    s.on('connect', () => {
      if (activeRef.current) s.emit('chat:join', { conversationId: activeRef.current });
    });

    s.on('user:online',  ({ userId }: { userId: string }) => setOnlineIds(p => new Set([...p, userId])));
    s.on('user:offline', ({ userId }: { userId: string }) => setOnlineIds(p => { const n = new Set(p); n.delete(userId); return n; }));

    s.on('chat:message', async (msg: Msg) => {
      qc.invalidateQueries({ queryKey: ['seller-conversations'] });
      const msgConvId = (msg as any).conversationId;
      if (msgConvId && msgConvId !== activeRef.current) return;

      // Decrypt if encrypted and it's a P2P TEXT message from the peer
      let decrypted = msg;
      if (msg.type === 'TEXT' && msg.senderId !== user?.id && isEncrypted(msg.content)) {
        try {
          const peerPub = await getPeerPub(msg.senderId);
          if (peerPub) decrypted = { ...msg, content: await decryptMsg(msg.content, peerPub) };
        } catch { /* leave ciphertext if decrypt fails */ }
      }

      setMessages(prev => {
        const optIdx = prev.findIndex(m => m.id.startsWith('opt-') && m.senderId === decrypted.senderId && m.content === decrypted.content);
        if (optIdx !== -1) { const next = [...prev]; next[optIdx] = decrypted; return next; }
        if (prev.find(m => m.id === decrypted.id)) return prev;
        return [...prev, decrypted];
      });
      scrollBottom();
    });

    s.on('chat:read', ({ userId }: { userId: string }) => {
      if (userId !== user?.id) {
        setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
      }
    });

    s.on('chat:typing', ({ conversationId }: { conversationId: string }) => {
      if (conversationId !== activeRef.current) return;
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 2500);
    });

    return () => { s.disconnect(); };
  }, [token]);

  // Load messages when conversation selected
  const selectConv = useCallback(async (convId: string) => {
    setActive(convId);
    activeRef.current = convId;
    setMessages([]);
    setTyping(false);
    setLoadingMsgs(true);

    const s = socketRef.current;
    if (s?.connected) {
      s.emit('chat:join', { conversationId: convId });
    } else {
      s?.once('connect', () => s.emit('chat:join', { conversationId: convId }));
    }

    try {
      const r = await api.get(`/chat/conversations/${convId}/messages`);
      const raw: Msg[] = r.data.data ?? [];
      // Decrypt E2E messages
      const decrypted = await Promise.all(raw.map(async (msg) => {
        if (msg.type !== 'TEXT' || msg.senderId === user?.id || !isEncrypted(msg.content)) return msg;
        try {
          const peerPub = await getPeerPub(msg.senderId);
          if (peerPub) return { ...msg, content: await decryptMsg(msg.content, peerPub) };
        } catch { /* return original on failure */ }
        return msg;
      }));
      setMessages(decrypted);
      scrollBottom(true);
    } catch { /* ignore */ }
    finally { setLoadingMsgs(false); }

    api.post(`/chat/conversations/${convId}/read`).catch(() => {});
    socketRef.current?.emit('chat:read', { conversationId: convId });
  }, []);

  const sendMsg = async () => {
    const content = text.trim();
    if (!content || !active || sending) return;
    setText('');
    setSending(true);

    // Show plaintext optimistically
    const opt: Msg = {
      id: `opt-${Date.now()}`, content, type: 'TEXT', isRead: false,
      senderId: user!.id, createdAt: new Date().toISOString(),
      sender: { id: user!.id, firstName: user!.firstName ?? '', lastName: user!.lastName ?? '', role: user?.role },
    };
    setMessages(p => [...p, opt]);
    scrollBottom(true);

    // Encrypt for P2P conversations only (support chat stays plaintext so AI can read it)
    let payload = content;
    const conv = conversations.find(c => c.id === active);
    if (conv && !conv.isSupport) {
      const peer = conv.participants.find(p => p.userId !== user?.id);
      if (peer) {
        const peerPub = await getPeerPub(peer.userId);
        if (peerPub) {
          try { payload = await encryptMsg(content, peerPub); } catch { /* send plaintext on crypto failure */ }
        }
      }
    }

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('chat:send', { conversationId: active, content: payload });
      } else {
        const { data: saved } = await api.post(`/chat/conversations/${active}/messages`, { content: payload });
        // Show decrypted version locally
        setMessages(p => p.map(m => m.id === opt.id ? { ...saved, content } : m));
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    e.target.value = '';
    const formData = new FormData();
    formData.append('file', file);
    const isImage = file.type.startsWith('image/');
    const endpoint = isImage ? '/upload/image' : '/upload/document';
    setUploadPct(0);
    try {
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: p => setUploadPct(Math.round((p.loaded / (p.total ?? 1)) * 100)),
      });
      const mediaUrl = isImage
        ? (data.urlMedium ?? data.urlFull ?? data.url)
        : (data.url ?? data.path);
      const type = isImage ? 'IMAGE' : 'FILE';
      const opt: Msg = {
        id: `opt-${Date.now()}`, content: file.name, type, mediaUrl, isRead: false,
        senderId: user!.id, createdAt: new Date().toISOString(),
        sender: { id: user!.id, firstName: user!.firstName ?? '', lastName: user!.lastName ?? '', role: user?.role },
      };
      setMessages(p => [...p, opt]);
      scrollBottom(true);
      socketRef.current?.emit('chat:send', { conversationId: active, content: file.name, type, mediaUrl });
    } catch { /* ignore */ }
    finally { setUploadPct(null); }
  };

  const getOther  = (conv: Conv) => conv.participants.find(p => p.userId !== user?.id);
  const getMe     = (conv: Conv) => conv.participants.find(p => p.userId === user?.id);
  const isMine    = (msg: Msg) => msg.senderId === user?.id;
  const isAdmin   = (msg: Msg) => ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(msg.sender?.role ?? '');

  const convLabel = (conv: Conv) => {
    if (conv.isSupport) return 'Support DealPam';
    const o = getOther(conv);
    return o ? `${o.user.firstName} ${o.user.lastName}` : 'Inconnu';
  };

  const activeConv = conversations.find(c => c.id === active);
  const otherParticipant = activeConv ? getOther(activeConv) : null;

  const filtered = search.trim()
    ? conversations.filter(c => convLabel(c).toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const groups = groupByDate(messages);

  return (
    <Box sx={{ display: 'flex', height: { xs: 'calc(100vh - 60px)', md: '100vh' }, overflow: 'hidden', bgcolor: DARK_BG }}>
      <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleFile} />

      {/* ── LEFT ── */}
      <Box sx={{
        width: { xs: active ? 0 : '100%', sm: 300 },
        flexShrink: 0, overflow: 'hidden',
        display: { xs: active ? 'none' : 'flex', sm: 'flex' },
        flexDirection: 'column',
        background: 'linear-gradient(180deg,#0a1020 0%,#080E1C 100%)',
        borderRight: `1px solid ${BORD}`,
      }}>
        {/* Header */}
        <Box sx={{ px: 2.5, pt: 3, pb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 18, color: 'white', letterSpacing: '-0.5px', lineHeight: 1 }}>
                Messages
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', mt: 0.4 }}>
                {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            {/* Unread total badge */}
            {conversations.reduce((s, c) => s + (getMe(c)?.unreadCount ?? 0), 0) > 0 && (
              <Box sx={{ width: 32, height: 32, borderRadius: '10px',
                background: `linear-gradient(135deg,${ORANGE},#D95500)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(255,107,0,0.35)' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: 'white' }}>
                  {conversations.reduce((s, c) => s + (getMe(c)?.unreadCount ?? 0), 0)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Search */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', px: 1.5, py: 1.1,
            '&:focus-within': { borderColor: 'rgba(255,107,0,0.5)', bgcolor: 'rgba(255,107,0,0.04)', boxShadow: '0 0 0 3px rgba(255,107,0,0.08)' },
            transition: 'all 0.2s',
          }}>
            <Search sx={{ fontSize: 15, color: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
            <InputBase placeholder="Rechercher une conversation…" value={search} onChange={e => setSearch(e.target.value)}
              sx={{ flex: 1, '& input': { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, padding: 0, '&::placeholder': { color: 'rgba(255,255,255,0.18)', opacity: 1 } } }}
            />
          </Box>
        </Box>

        {/* Section label */}
        {filtered.length > 0 && (
          <Box sx={{ px: 2.5, mb: 1 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Récentes
            </Typography>
          </Box>
        )}

        {/* Conv list */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 2,
          '&::-webkit-scrollbar': { width: 0 } }}>
          {filtered.length === 0 && (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.16)', fontSize: 13 }}>Aucune conversation</Typography>
            </Box>
          )}
          {filtered.map((conv) => {
            const sel    = conv.id === active;
            const unread = getMe(conv)?.unreadCount ?? 0;
            const sup    = conv.isSupport;
            const other  = getOther(conv);
            const online = onlineIds.has(other?.userId ?? '');
            const name   = sup ? 'S' : (other?.user.firstName?.[0]?.toUpperCase() ?? '?');
            const hue    = ((other?.user.firstName ?? 'X').charCodeAt(0) * 53) % 360;

            return (
              <Box key={conv.id} onClick={() => selectConv(conv.id)} sx={{
                display: 'flex', gap: 1.5, alignItems: 'center',
                px: 1.5, py: 1.5, mb: 0.5, borderRadius: '14px', cursor: 'pointer',
                transition: 'all 0.15s',
                background: sel
                  ? 'linear-gradient(135deg,rgba(255,107,0,0.18),rgba(255,107,0,0.08))'
                  : 'transparent',
                border: '1px solid',
                borderColor: sel ? 'rgba(255,107,0,0.35)' : 'transparent',
                boxShadow: sel ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
                '&:hover': {
                  background: sel
                    ? 'linear-gradient(135deg,rgba(255,107,0,0.2),rgba(255,107,0,0.1))'
                    : 'rgba(255,255,255,0.04)',
                  borderColor: sel ? 'rgba(255,107,0,0.4)' : 'rgba(255,255,255,0.07)',
                },
              }}>

                {/* Avatar */}
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  {sup ? (
                    <Box sx={{ width: 46, height: 46, borderRadius: '14px',
                      background: 'linear-gradient(135deg,rgba(255,107,0,0.25),rgba(255,107,0,0.1))',
                      border: '1.5px solid rgba(255,107,0,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: sel ? '0 4px 12px rgba(255,107,0,0.2)' : 'none' }}>
                      <SupportAgent sx={{ fontSize: 20, color: ORANGE }} />
                    </Box>
                  ) : other?.user.avatar ? (
                    <Box component="img" src={other.user.avatar} alt={name}
                      sx={{ width: 46, height: 46, borderRadius: '14px', objectFit: 'cover',
                        border: `2px solid ${sel ? 'rgba(255,107,0,0.4)' : 'rgba(255,255,255,0.08)'}` }}/>
                  ) : (
                    <Box sx={{ width: 46, height: 46, borderRadius: '14px',
                      background: `linear-gradient(135deg,hsl(${hue},50%,28%),hsl(${hue},40%,18%))`,
                      border: `1.5px solid hsl(${hue},40%,32%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 17, color: `hsl(${hue},80%,72%)` }}>
                        {name}
                      </Typography>
                    </Box>
                  )}
                  {!sup && online && (
                    <Box sx={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%',
                      bgcolor: '#10B981', border: `2.5px solid #0a1020`, boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                  )}
                  {unread > 0 && (
                    <Box sx={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: '6px',
                      bgcolor: ORANGE, border: '2px solid #0a1020',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(255,107,0,0.5)' }}>
                      <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: 'white', px: 0.4, lineHeight: 1 }}>
                        {unread > 9 ? '9+' : unread}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Text */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{
                      fontSize: 13.5, lineHeight: 1,
                      fontWeight: sel ? 800 : unread > 0 ? 700 : 500,
                      color: sel ? 'white' : unread > 0 ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.5)',
                    }} noWrap>
                      {convLabel(conv)}
                    </Typography>
                    {conv.lastMessageAt && (
                      <Typography sx={{ fontSize: 10.5, flexShrink: 0, ml: 1,
                        color: unread > 0 ? ORANGE : 'rgba(255,255,255,0.2)',
                        fontWeight: unread > 0 ? 700 : 400 }}>
                        {fmtTime(conv.lastMessageAt)}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 12, lineHeight: 1.3,
                    color: unread > 0 ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.2)',
                    fontWeight: unread > 0 ? 500 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.lastMessage ?? 'Démarrez la conversation'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── RIGHT: chat area ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', bgcolor: DARK_BG }}>
        {!active ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, p: 4 }}>
            {/* Decorative rings */}
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Box sx={{ width: 96, height: 96, borderRadius: '50%', border: '1px solid rgba(255,107,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ width: 72, height: 72, borderRadius: '50%', border: '1px solid rgba(255,107,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ width: 52, height: 52, borderRadius: '16px',
                    bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 24px rgba(255,107,0,0.1)' }}>
                    <HeadsetMicOutlined sx={{ fontSize: 24, color: 'rgba(255,107,0,0.55)' }} />
                  </Box>
                </Box>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.35)', mb: 0.8, letterSpacing: '-0.2px' }}>
              Aucune conversation sélectionnée
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.15)', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
              Choisissez une conversation à gauche pour commencer à échanger avec vos clients
            </Typography>
            {/* Mini stats */}
            {conversations.length > 0 && (
              <Box sx={{ mt: 3, display: 'flex', gap: 1.5 }}>
                {[
                  { label: 'Conversations', value: conversations.length },
                  { label: 'Non lues', value: conversations.reduce((s, c) => s + (getMe(c)?.unreadCount ?? 0), 0) },
                ].map(({ label, value }) => (
                  <Box key={label} sx={{ px: 2, py: 1.2, borderRadius: '10px',
                    bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: value > 0 ? ORANGE : 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
                      {value}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', mt: 0.3 }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <Box sx={{
              px: 2.5, py: 1.5, bgcolor: PANEL_BG,
              borderBottom: `1px solid ${BORD}`,
              display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
              position: 'relative',
            }}>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, rgba(255,107,0,0.3), transparent)` }} />

              <IconButton size="small" sx={{ display: { sm: 'none' }, color: 'rgba(255,255,255,0.5)' }} onClick={() => { setActive(null); activeRef.current = null; }}>
                <ArrowBack />
              </IconButton>

              {activeConv?.isSupport ? (
                <Avatar sx={{ width: 40, height: 40, bgcolor: alpha(ORANGE, 0.18), border: `1.5px solid ${alpha(ORANGE, 0.3)}` }}>
                  <SupportAgent sx={{ fontSize: 20, color: ORANGE }} />
                </Avatar>
              ) : (
                <Box sx={{ position: 'relative' }}>
                  <Avatar src={otherParticipant?.user.avatar ?? undefined} sx={{ width: 40, height: 40, bgcolor: 'rgba(255,255,255,0.08)', fontWeight: 800, fontSize: 15, color: 'white', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                    {otherParticipant?.user.firstName?.[0] ?? '?'}
                  </Avatar>
                  {onlineIds.has(otherParticipant?.userId ?? '') && (
                    <Box sx={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', bgcolor: '#10B981', border: `2px solid ${PANEL_BG}` }} />
                  )}
                </Box>
              )}

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'white' }} noWrap>
                  {activeConv ? convLabel(activeConv) : ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.1 }}>
                  {typing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                      {[0,1,2].map(i => (
                        <Box key={i} sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: ORANGE,
                          animation: 'bounce 1.2s ease infinite', animationDelay: `${i * 0.2}s`,
                          '@keyframes bounce': { '0%,80%,100%': { transform: 'scale(0.7)', opacity: 0.5 }, '40%': { transform: 'scale(1)', opacity: 1 } } }} />
                      ))}
                      <Typography sx={{ fontSize: 11.5, color: alpha(ORANGE, 0.8), ml: 0.3 }}>est en train d'écrire…</Typography>
                    </Box>
                  ) : activeConv?.isSupport ? (
                    <Typography sx={{ fontSize: 11.5, color: '#10B981', fontWeight: 600 }}>Support · répond rapidement</Typography>
                  ) : (
                    <>
                      <FiberManualRecord sx={{ fontSize: 8, color: onlineIds.has(otherParticipant?.userId ?? '') ? '#10B981' : 'rgba(255,255,255,0.2)' }} />
                      <Typography sx={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)' }}>
                        {onlineIds.has(otherParticipant?.userId ?? '') ? 'En ligne' : 'Hors ligne'}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              {/* E2E lock badge (non-support only) */}
              {activeConv && !activeConv.isSupport && (
                <Tooltip title="Chiffrement de bout en bout actif" arrow placement="bottom">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.35, borderRadius: '20px', flexShrink: 0,
                    bgcolor: alpha('#10B981', 0.1), border: `1px solid ${alpha('#10B981', 0.2)}` }}>
                    <LockOutlined sx={{ fontSize: 11, color: '#10B981' }} />
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#10B981' }}>E2E</Typography>
                  </Box>
                </Tooltip>
              )}

              {/* Status badge */}
              {activeConv?.status && (
                <Box sx={{ px: 1, py: 0.35, borderRadius: '20px', flexShrink: 0,
                  bgcolor: activeConv.status === 'OPEN' ? alpha('#10B981', 0.12) : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${activeConv.status === 'OPEN' ? alpha('#10B981', 0.25) : 'rgba(255,255,255,0.08)'}` }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: activeConv.status === 'OPEN' ? '#10B981' : 'rgba(255,255,255,0.3)' }}>
                    {activeConv.status === 'OPEN' ? 'Ouvert' : activeConv.status === 'RESOLVED' ? 'Résolu' : 'Fermé'}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* ── Messages ── */}
            <Box ref={msgBoxRef} onScroll={() => {
              if (!msgBoxRef.current) return;
              const { scrollTop, scrollHeight, clientHeight } = msgBoxRef.current;
              setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120);
            }} sx={{
              flex: 1, overflowY: 'auto', px: { xs: 1.5, sm: 2.5 }, py: 2,
              display: 'flex', flexDirection: 'column', gap: 0.3,
              scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.07) transparent',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
            }}>
              {loadingMsgs && (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} sx={{ color: ORANGE }} />
                </Box>
              )}

              {!loadingMsgs && messages.length === 0 && (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Aucun message — envoyez le premier !</Typography>
                </Box>
              )}

              {!loadingMsgs && groups.map(({ date, messages: gMsgs }) => (
                <Box key={date}>
                  {/* Date separator */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.2)', fontWeight: 600, px: 1 }}>{date}</Typography>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)' }} />
                  </Box>

                  {gMsgs.map((msg, idx) => {
                    const mine   = isMine(msg);
                    const admin  = isAdmin(msg);
                    const bot    = msg.type === 'BOT';
                    const system = msg.type === 'SYSTEM';
                    const showAvatar = !mine && (idx === 0 || gMsgs[idx - 1]?.senderId !== msg.senderId);
                    const isLast = mine && (idx === gMsgs.length - 1 || gMsgs[idx + 1]?.senderId !== msg.senderId);

                    // System / escalation notice
                    if (system) return (
                      <Box key={msg.id} sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                        <Chip label={msg.content} size="small" sx={{
                          bgcolor: alpha('#10B981', 0.12), color: '#10B981', border: `1px solid ${alpha('#10B981', 0.25)}`,
                          fontSize: 11.5, fontWeight: 600, height: 'auto', py: 0.5,
                        }} />
                      </Box>
                    );

                    return (
                      <Box key={msg.id} sx={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 0.8, mb: 0.4 }}>
                        {/* Avatar */}
                        {!mine && (
                          <Box sx={{ width: 30, flexShrink: 0 }}>
                            {showAvatar && (
                              <Avatar src={msg.sender?.avatar ?? undefined} sx={{ width: 30, height: 30,
                                bgcolor: bot ? alpha(PURPLE, 0.18) : admin ? alpha(ORANGE, 0.18) : 'rgba(255,255,255,0.07)',
                                fontSize: 12, fontWeight: 700,
                                border: `1px solid ${bot ? alpha(PURPLE, 0.3) : admin ? alpha(ORANGE, 0.25) : 'rgba(255,255,255,0.08)'}` }}>
                                {bot ? <SmartToyOutlined sx={{ fontSize: 14, color: PURPLE }} />
                                     : admin ? <SupportAgent sx={{ fontSize: 14, color: ORANGE }} />
                                     : (msg.sender?.firstName?.[0] ?? '?')}
                              </Avatar>
                            )}
                          </Box>
                        )}

                        <Box sx={{ maxWidth: { xs: '80%', sm: '65%' }, display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                          {!mine && showAvatar && (
                            <Typography sx={{ fontSize: 10, mb: 0.4, ml: 0.5, fontWeight: 700,
                              color: bot ? alpha(PURPLE, 0.7) : admin ? alpha(ORANGE, 0.7) : 'rgba(255,255,255,0.3)' }}>
                              {bot ? '🤖 DealPam IA' : admin ? 'Support DealPam' : `${msg.sender?.firstName ?? ''} ${msg.sender?.lastName ?? ''}`}
                            </Typography>
                          )}

                          <Box sx={{
                            px: 1.5, py: 1,
                            bgcolor: mine ? ORANGE : bot ? alpha(PURPLE, 0.12) : BUBBLE_BG,
                            borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            boxShadow: mine ? `0 2px 10px ${alpha(ORANGE, 0.35)}` : bot ? `0 0 0 1px ${alpha(PURPLE, 0.25)}` : 'none',
                            border: mine ? 'none' : bot ? `1px solid ${alpha(PURPLE, 0.2)}` : '1px solid rgba(255,255,255,0.07)',
                          }}>
                            {msg.mediaUrl && <MediaBubble url={msg.mediaUrl} name={msg.type !== 'IMAGE' ? msg.content : undefined} mine={mine} />}
                            {(msg.type === 'TEXT' || msg.type === 'BOT' || !msg.mediaUrl) && (
                              <Typography sx={{ fontSize: 13.5, color: mine ? 'white' : 'rgba(255,255,255,0.8)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                {msg.content}
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.3, px: 0.5 }}>
                            <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.18)' }}>{fmtTime(msg.createdAt)}</Typography>
                            {mine && isLast && (
                              <Tooltip title={msg.isRead ? 'Lu' : 'Envoyé'} placement="left">
                                {msg.isRead
                                  ? <DoneAll sx={{ fontSize: 13, color: '#60A5FA' }} />
                                  : <Done sx={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }} />
                                }
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ))}

              {/* Typing indicator */}
              {typing && (
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.8, mb: 0.4 }}>
                  <Box sx={{ width: 30 }} />
                  <Box sx={{ bgcolor: BUBBLE_BG, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px 18px 18px 4px', px: 1.5, py: 1, display: 'flex', gap: 0.4, alignItems: 'center' }}>
                    {[0,1,2].map(i => (
                      <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.3)',
                        animation: 'dp-bounce 1.2s ease infinite', animationDelay: `${i * 0.2}s`,
                        '@keyframes dp-bounce': { '0%,80%,100%': { transform: 'scale(0.7)', opacity: 0.5 }, '40%': { transform: 'scale(1)', opacity: 1 } } }} />
                    ))}
                  </Box>
                </Box>
              )}

              <div ref={bottomRef} />
            </Box>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
              <Box onClick={() => scrollBottom(true)} sx={{
                position: 'absolute', bottom: 80, right: 20,
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                bgcolor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)', transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' }, zIndex: 5,
              }}>
                <KeyboardArrowDown sx={{ fontSize: 21, color: 'white' }} />
              </Box>
            )}

            {/* Upload progress */}
            {uploadPct !== null && (
              <Box sx={{ px: 2.5, py: 0.8, bgcolor: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                  <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Envoi en cours…</Typography>
                  <Typography sx={{ fontSize: 11, color: ORANGE, fontWeight: 700 }}>{uploadPct}%</Typography>
                </Box>
                <Box sx={{ height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${uploadPct}%`, bgcolor: ORANGE, borderRadius: 2, transition: 'width 0.2s' }} />
                </Box>
              </Box>
            )}

            {/* ── Input bar ── */}
            <Box sx={{ px: 2, py: 1.5, bgcolor: PANEL_BG, borderTop: `1px solid ${BORD}`, display: 'flex', gap: 1.2, alignItems: 'flex-end', flexShrink: 0 }}>
              <Tooltip title="Joindre image ou fichier" placement="top">
                <IconButton size="small" onClick={() => fileRef.current?.click()} sx={{
                  color: 'rgba(255,255,255,0.3)', borderRadius: '10px', width: 38, height: 38,
                  border: `1px solid ${BORD}`, bgcolor: 'rgba(255,255,255,0.03)', flexShrink: 0,
                  '&:hover': { color: ORANGE, borderColor: 'rgba(255,107,0,0.35)', bgcolor: 'rgba(255,107,0,0.08)' },
                  transition: 'all 0.18s',
                }}>
                  <AttachFileOutlined sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>

              <Box sx={{
                flex: 1, display: 'flex', alignItems: 'flex-end',
                bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`,
                borderRadius: '12px', px: 1.5, py: 1,
                '&:focus-within': { borderColor: 'rgba(255,107,0,0.5)', boxShadow: '0 0 0 3px rgba(255,107,0,0.08)', bgcolor: 'rgba(255,107,0,0.03)' },
                transition: 'all 0.18s',
              }}>
                <InputBase
                  multiline maxRows={5}
                  placeholder="Écrire un message… (Entrée pour envoyer)"
                  value={text}
                  onChange={e => {
                    setText(e.target.value);
                    if (active && socketRef.current) socketRef.current.emit('chat:typing', { conversationId: active });
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                  sx={{ flex: 1, '& textarea, & input': { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, lineHeight: 1.5, '&::placeholder': { color: 'rgba(255,255,255,0.18)', opacity: 1 } } }}
                />
              </Box>

              <IconButton onClick={sendMsg} disabled={!text.trim() || sending} sx={{
                width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                background: text.trim() ? `linear-gradient(135deg,${ORANGE},#D95500)` : 'rgba(255,255,255,0.05)',
                color: text.trim() ? 'white' : 'rgba(255,255,255,0.18)',
                boxShadow: text.trim() ? '0 4px 14px rgba(255,107,0,0.35)' : 'none',
                transition: 'all 0.18s',
                '&:hover': { transform: text.trim() ? 'scale(1.06)' : 'none', boxShadow: text.trim() ? '0 6px 18px rgba(255,107,0,0.45)' : 'none' },
                '&.Mui-disabled': { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.1)' },
              }}>
                {sending ? <CircularProgress size={15} sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <Send sx={{ fontSize: 17 }} />}
              </IconButton>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
