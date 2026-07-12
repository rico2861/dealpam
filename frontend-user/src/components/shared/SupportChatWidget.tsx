import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Avatar, Badge, Box, Chip, CircularProgress, Divider, Fab,
  IconButton, LinearProgress, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  AttachFile, CheckCircle, Close, CloseFullscreen, DoneAll,
  Headset, HeadsetMic, Send, SmartToy, SmartToyOutlined, SupportAgent,
  Lock, WarningAmber, LockOutlined,
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';

/* ── colour palette ─────────────────────────────────────────────────────── */

const BG      = 'rgba(10,16,30,0.97)';
const SURFACE = 'rgba(255,255,255,0.05)';
const BORDER  = 'rgba(255,255,255,0.08)';
const ACCENT  = '#00c2ff';
const USER_BG = 'rgba(0,194,255,0.18)';
const BOT_BG  = 'rgba(160,80,255,0.14)';
const SYS_COL = '#4caf50';
const INACTIVE_LIMIT_MS = 10 * 60 * 1000;

const SOCK_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace('/v1', '');

const SOPHIA_NAME = 'Sophia';

function fmt(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function avatarLetter(m: any) {
  return (m.sender?.firstName?.[0] ?? '?').toUpperCase();
}
function sophiaWelcome(firstName: string) {
  const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour';
  return {
    id: `local-welcome-${Date.now()}`,
    type: 'BOT',
    content: `${greeting}\n\nJe suis **${SOPHIA_NAME}**, votre assistante IA DealPam. Je suis là pour répondre à vos questions et résoudre vos problèmes.\n\nDécrivez votre demande et je m'en occupe immédiatement.`,
    senderId: 'bot',
    sender: { firstName: SOPHIA_NAME, lastName: '' },
    createdAt: new Date().toISOString(),
    isRead: true,
  };
}

/* ── Wrapper: guard for unauthenticated users ───────────────────────────── */

// Must stay above MobileBottomNav (56px) on mobile, ET au-dessus de la zone
// d'encoche/home-indicator (safe-area-inset-bottom) — sans ca le bouton se
// retrouvait parfois colle au bord/chevauchant sur certains appareils.
// Pages with their own extra fixed bottom bar (e.g. the mobile buy bar on
// ProductDetailPage) push --dp-fab-extra-bottom higher so the FAB clears it too.
const FAB_BOTTOM   = { xs: 'calc(72px + env(safe-area-inset-bottom, 0px) + var(--dp-fab-extra-bottom, 0px))', md: 24 };
const PANEL_BOTTOM = { xs: 'calc(140px + env(safe-area-inset-bottom, 0px) + var(--dp-fab-extra-bottom, 0px))', md: 90 };
const FAB_RIGHT    = { xs: 14, md: 24 };
const FAB_SIZE     = { xs: 52, md: 58 };

export default function SupportChatWidget() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  const hasToken = !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));

  // Not authenticated → FAB redirects to login
  if (!user || !hasToken) {
    return (
      <Fab
        onClick={() => navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
        sx={{
          position: 'fixed', bottom: FAB_BOTTOM, right: FAB_RIGHT, zIndex: 1400,
          width: FAB_SIZE, height: FAB_SIZE, minHeight: 'unset',
          background: 'linear-gradient(135deg,#00c2ff,#7b2ff7)',
          boxShadow: '0 8px 28px rgba(0,194,255,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset',
          '&:hover': { transform: 'translateY(-2px) scale(1.05)', boxShadow: '0 12px 36px rgba(0,194,255,0.55), 0 0 0 1px rgba(255,255,255,0.18) inset' },
          transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          color: '#fff',
        }}
      >
        <Headset sx={{ fontSize: { xs: 24, md: 27 } }} />
      </Fab>
    );
  }

  return <SupportChatInner user={user} />;
}

/* ── Inner component ────────────────────────────────────────────────────── */

function SupportChatInner({ user }: { user: any }) {
  const navigate = useNavigate();
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState<any[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [convId, setConvId]           = useState<string | null>(null);
  const [conv, setConv]               = useState<any>(null);
  const [typing, setTyping]           = useState(false);
  const [escalated, setEscalated]     = useState(false);
  const [closed, setClosed]           = useState(false);
  const [inactiveWarning, setInactiveWarning] = useState(false);
  const [convError, setConvError]     = useState<string | null>(null);

  const socketRef    = useRef<Socket | null>(null);
  const convIdRef    = useRef<string | null>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const fileRef      = useRef<HTMLInputElement>(null);
  const typingTimer  = useRef<any>(null);
  const inactiveRef  = useRef<any>(null);

  const resetInactivityTimer = useCallback(() => {
    setInactiveWarning(false);
    clearTimeout(inactiveRef.current);
    inactiveRef.current = setTimeout(() => setInactiveWarning(true), INACTIVE_LIMIT_MS - 2 * 60 * 1000);
  }, []);

  /* ── Socket setup ─────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!open) return;

    // auth as function → token is re-read from localStorage at every reconnection attempt
    // (this ensures the socket uses the refreshed token after axios auto-refresh)
    const s = io(`${SOCK_URL}/chat`, {
      auth: (cb: (o: object) => void) => cb({ token: localStorage.getItem('accessToken') }),
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = s;

    // If socket auth is rejected (token invalid/expired), try to refresh then reconnect
    s.on('connect_error', (err: Error) => {
      if (err.message?.toLowerCase().includes('unauthorized') || err.message?.toLowerCase().includes('jwt')) {
        // Token is bad — axios interceptor will handle refresh on next API call
        // Just let socket.io retry with reconnectionAttempts
      }
    });

    s.on('chat:message', (msg: any) => {
      setMessages(prev => {
        const optIdx = prev.findIndex(
          m => m.id?.startsWith('opt-') && m.senderId === msg.senderId && m.content === msg.content,
        );
        if (optIdx !== -1) {
          const next = [...prev];
          next[optIdx] = msg;
          return next;
        }
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      resetInactivityTimer();
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    });

    s.on('chat:typing', ({ userId }: any) => {
      if (userId === user.id) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 3000);
    });

    s.on('chat:closed', () => {
      setClosed(true);
      setMessages(prev => [
        ...prev,
        {
          id: `sys-closed-${Date.now()}`,
          type: 'SYSTEM',
          content: 'Conversation fermée automatiquement après inactivité.',
          createdAt: new Date().toISOString(),
        },
      ]);
    });

    s.on('connect', () => {
      if (convIdRef.current) s.emit('chat:join', { conversationId: convIdRef.current });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      clearTimeout(inactiveRef.current);
    };
  }, [open]); // eslint-disable-line

  /* ── Reconnect socket when token changes (after axios auto-refresh) ──── */

  useEffect(() => {
    if (!open) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' && e.newValue && socketRef.current) {
        // Token was refreshed — reconnect socket so it authenticates with new token
        socketRef.current.disconnect();
        socketRef.current.connect();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [open]);

  /* ── Load / create support conversation ──────────────────────────────── */

  useEffect(() => {
    if (!open || convId) return;
    setLoading(true);
    setConvError(null);
    api.post('/chat/support')
      .then(({ data }) => {
        setConv(data);
        setConvId(data.id);
        convIdRef.current = data.id;
        setEscalated(data.topic === 'escalated');
        setClosed(data.status === 'CLOSED');
        const s = socketRef.current;
        if (s?.connected) s.emit('chat:join', { conversationId: data.id });
        else if (s) s.once('connect', () => s.emit('chat:join', { conversationId: data.id }));
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401) {
          setConvError('SESSION_EXPIRED');
        } else if (status === 404) {
          // Backend route missing/misconfigured — distinct from a network issue so it's not masked
          setConvError('Le service de support est momentanément indisponible. Réessayez dans un instant.');
        } else if (!err?.response) {
          setConvError('Impossible de se connecter au support. Vérifiez votre connexion.');
        } else {
          setConvError('Une erreur est survenue. Réessayez ou revenez plus tard.');
        }
      })
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line

  /* ── Load messages when conv is ready ────────────────────────────────── */

  useEffect(() => {
    if (!convId) return;
    api.get(`/chat/conversations/${convId}/messages`)
      .then(({ data }) => {
        const msgs: any[] = data.data ?? [];
        // If no messages from server (bot failed), show a local welcome
        if (msgs.length === 0) {
          msgs.push(sophiaWelcome(user.firstName));
        }
        setMessages(msgs);
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
      })
      .catch(() => {
        setMessages([sophiaWelcome(user.firstName)]);
      });
    resetInactivityTimer();
  }, [convId]); // eslint-disable-line

  /* ── Send ─────────────────────────────────────────────────────────────── */

  const send = useCallback(async (content: string, type = 'TEXT', mediaUrl?: string, previewUrl?: string) => {
    if (!content.trim() && !mediaUrl) return;
    if (!convId) return;

    const optimistic: any = {
      id: `opt-${Date.now()}`,
      conversationId: convId,
      senderId: user.id,
      sender: { id: user.id, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar },
      content,
      type,
      mediaUrl: previewUrl ?? mediaUrl ?? null,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    resetInactivityTimer();

    const s = socketRef.current;
    if (s?.connected) {
      s.emit('chat:send', { conversationId: convId, content, type, mediaUrl });
    } else {
      try {
        const { data: real } = await api.post(`/chat/conversations/${convId}/messages`, { content });
        setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m));
      } catch {}
    }
  }, [convId, user, resetInactivityTimer]);

  /* ── File upload ──────────────────────────────────────────────────────── */

  const handleFile = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    setUploadProgress(0);
    try {
      // Pièces jointes de chat : bucket privé — l'API ne renvoie qu'une
      // référence interne (publicId), jamais une URL exploitable directement.
      const endpoint = isImage ? '/upload/chat-image' : '/upload/chat-file';
      const { data } = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded * 100) / (e.total ?? 1))),
      });
      const mediaRef = isImage ? `chatimg:${data.publicId}` : `chatfile:${data.publicId}:${data.fileName}`;
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      await send(file.name, isImage ? 'IMAGE' : 'FILE', mediaRef, previewUrl);
    } catch {}
    finally { setUploading(false); setUploadProgress(0); }
  }, [send]);

  /* ── Typing indicator ─────────────────────────────────────────────────── */

  const onInputChange = (val: string) => {
    setInput(val);
    if (convId && socketRef.current?.connected) {
      socketRef.current.emit('chat:typing', { conversationId: convId });
    }
  };

  /* ── Escalate ─────────────────────────────────────────────────────────── */

  const escalate = useCallback(async () => {
    if (!convId) return;
    try {
      const { data } = await api.post(`/chat/conversations/${convId}/escalate`);
      setEscalated(true);
      if (data) {
        setMessages(prev => [...prev, data]);
        if (data.assignedAgent) setConv((c: any) => ({ ...c, assignedAgent: data.assignedAgent }));
      }
    } catch {}
  }, [convId]);

  /* ── Close ────────────────────────────────────────────────────────────── */

  const closeConversation = useCallback(async () => {
    if (!convId) return;
    try {
      await api.post(`/chat/conversations/${convId}/close`);
      setClosed(true);
    } catch {}
  }, [convId]);

  /* ── Inactivity auto-close ────────────────────────────────────────────── */

  useEffect(() => {
    if (!inactiveWarning || !convId || closed) return;
    const t = setTimeout(() => {
      setClosed(true);
      api.post(`/chat/conversations/${convId}/close`).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearTimeout(t);
  }, [inactiveWarning, convId, closed]);

  /* ── Derived ──────────────────────────────────────────────────────────── */

  const assignedAgent = conv?.assignedAgent;
  const ticketNumber  = conv?.ticketNumber;
  const agentName     = assignedAgent
    ? `${assignedAgent.firstName} ${assignedAgent.lastName}`.trim()
    : SOPHIA_NAME;

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <>
      {/* FAB */}
      <Fab
        onClick={() => setOpen(v => !v)}
        sx={{
          position: 'fixed', bottom: FAB_BOTTOM, right: FAB_RIGHT, zIndex: 1400,
          width: FAB_SIZE, height: FAB_SIZE, minHeight: 'unset',
          background: 'linear-gradient(135deg,#00c2ff,#7b2ff7)',
          boxShadow: '0 8px 28px rgba(0,194,255,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset',
          '&:hover': { transform: 'translateY(-2px) scale(1.05)', boxShadow: '0 12px 36px rgba(0,194,255,0.55), 0 0 0 1px rgba(255,255,255,0.18) inset' },
          transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {open ? <Close sx={{ color: '#fff', fontSize: { xs: 22, md: 25 } }} /> : <Headset sx={{ color: '#fff', fontSize: { xs: 24, md: 27 } }} />}
      </Fab>

      {/* Chat panel */}
      {open && (
        <Box sx={{
          position: 'fixed',
          bottom: PANEL_BOTTOM,
          right: FAB_RIGHT,
          zIndex: 1300,
          width: 'min(390px, calc(100vw - 24px))',
          height: { xs: 'min(520px, calc(100dvh - 160px))', md: 'min(580px, calc(100dvh - 110px))' },
          display: 'flex', flexDirection: 'column',
          background: BG,
          backdropFilter: 'blur(24px)',
          borderRadius: '20px',
          border: `1px solid ${BORDER}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <Box sx={{
            px: 2, py: 1.5,
            background: 'linear-gradient(90deg,rgba(0,194,255,0.15),rgba(123,47,247,0.15))',
            borderBottom: `1px solid ${BORDER}`,
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50', border: '2px solid #0a101e' }} />
              }
            >
              <Avatar
                src={assignedAgent?.avatar ?? undefined}
                sx={{ width: 40, height: 40, fontSize: 16, fontWeight: 800,
                  background: assignedAgent ? '#1565c0' : 'linear-gradient(135deg,#7b2ff7,#00c2ff)' }}
              >
                {!assignedAgent?.avatar && (assignedAgent ? <SupportAgent /> : SOPHIA_NAME[0])}
              </Avatar>
            </Badge>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                {agentName}
              </Typography>
              <Typography sx={{ color: ACCENT, fontSize: 11 }}>
                {ticketNumber ? `${ticketNumber} • ` : ''}{assignedAgent ? 'Agent humain · En ligne' : 'IA · En ligne'}
              </Typography>
            </Box>

            <Stack direction="row">
              {!escalated && !closed && (
                <Tooltip title="Parler à un agent humain">
                  <IconButton size="small" onClick={escalate} sx={{ color: '#aaa' }}>
                    <HeadsetMic fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {!closed && (
                <Tooltip title="Fermer la conversation">
                  <IconButton size="small" onClick={closeConversation} sx={{ color: '#aaa' }}>
                    <CloseFullscreen fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#aaa' }}>
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {/* Inactivity warning banner */}
          {inactiveWarning && !closed && (
            <Box sx={{ px: 2, py: 0.8, bgcolor: 'rgba(255,152,0,0.12)', borderBottom: `1px solid rgba(255,152,0,0.2)` }}>
              <Typography sx={{ color: '#ff9800', fontSize: 12, textAlign: 'center' }}>
                Fermeture automatique dans 2 min (inactivité). Écrivez pour continuer.
              </Typography>
            </Box>
          )}

          {/* Escalated banner */}
          {escalated && (
            <Box sx={{ px: 2, py: 0.8, bgcolor: 'rgba(76,175,80,0.1)', borderBottom: `1px solid rgba(76,175,80,0.2)` }}>
              <Typography sx={{ color: SYS_COL, fontSize: 12, textAlign: 'center' }}>
                {agentName} a été assigné à votre ticket
              </Typography>
            </Box>
          )}

          {/* Messages */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1,
            '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#2a3550', borderRadius: 2 } }}>
            {loading && (
              <Box sx={{ textAlign: 'center', pt: 5 }}>
                <CircularProgress size={28} sx={{ color: ACCENT }} />
                <Typography sx={{ color: '#666', fontSize: 12, mt: 1 }}>Connexion en cours…</Typography>
              </Box>
            )}

            {convError && !loading && (
              <Box sx={{ textAlign: 'center', pt: 5, px: 2.5 }}>
                {/* Sophia avatar in error state */}
                <Box sx={{ width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2,
                  background: convError === 'SESSION_EXPIRED'
                    ? 'linear-gradient(135deg,#1a1a2e,#16213e)'
                    : 'linear-gradient(135deg,#2d1515,#3d1a1a)',
                  border: `2px solid ${convError === 'SESSION_EXPIRED' ? 'rgba(100,120,255,0.4)' : 'rgba(255,80,80,0.4)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {convError === 'SESSION_EXPIRED'
                    ? <Lock sx={{ fontSize: 28, color: 'rgba(120,140,255,0.9)' }} />
                    : <WarningAmber sx={{ fontSize: 28, color: 'rgba(255,120,120,0.9)' }} />}
                </Box>
                <Typography sx={{ color: '#fff', fontSize: 15, fontWeight: 800, mb: 0.8 }}>
                  {convError === 'SESSION_EXPIRED' ? 'Session expirée' : 'Connexion impossible'}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12.5, mb: 3, lineHeight: 1.7 }}>
                  {convError === 'SESSION_EXPIRED'
                    ? `${SOPHIA_NAME} est prête — reconnectez-vous pour continuer la conversation.`
                    : convError}
                </Typography>
                {convError === 'SESSION_EXPIRED' ? (
                  <Box
                    component="button"
                    onClick={() => navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                    sx={{ background: 'linear-gradient(135deg,#00c2ff,#7b2ff7)', color: '#fff', border: 'none',
                      borderRadius: '10px', px: 4, py: 1.2, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(0,194,255,0.3)', '&:hover': { opacity: 0.9 } }}
                  >
                    Se reconnecter
                  </Box>
                ) : (
                  <Box
                    component="button"
                    onClick={() => { setConvError(null); setConvId(null); }}
                    sx={{ background: 'linear-gradient(135deg,#00c2ff,#7b2ff7)', color: '#fff', border: 'none',
                      borderRadius: '10px', px: 4, py: 1.2, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      '&:hover': { opacity: 0.9 } }}
                  >
                    Réessayer
                  </Box>
                )}
              </Box>
            )}

            {closed && (
              <Chip icon={<LockOutlined sx={{ fontSize: 14 }} />} label="Conversation fermée" size="small" sx={{ mx: 'auto', color: '#aaa', bgcolor: SURFACE }} />
            )}

            {messages.map(msg => {
              if (msg.type === 'SYSTEM') {
                return (
                  <Box key={msg.id} sx={{ textAlign: 'center', my: 0.5 }}>
                    <Chip
                      label={msg.content}
                      size="small"
                      sx={{ color: SYS_COL, bgcolor: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.2)', fontSize: 11, height: 'auto', py: 0.5 }}
                    />
                  </Box>
                );
              }

              const isBot  = msg.type === 'BOT';
              const isMe   = msg.senderId === user.id;
              const isImg  = msg.type === 'IMAGE';
              const isFile = msg.type === 'FILE';

              return (
                <Box key={msg.id} sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 1, alignItems: 'flex-end' }}>
                  {!isMe && (
                    <Avatar
                      src={msg.sender?.avatar ?? undefined}
                      sx={{ width: 28, height: 28, fontSize: 12, bgcolor: isBot ? '#6a1ec2' : '#1565c0', flexShrink: 0 }}
                    >
                      {isBot ? <SmartToyOutlined sx={{ fontSize: 14 }} /> : avatarLetter(msg)}
                    </Avatar>
                  )}

                  <Box sx={{ maxWidth: '72%' }}>
                    {!isMe && (
                      <Typography sx={{ color: isBot ? '#c084fc' : '#90caf9', fontSize: 10, mb: 0.3, px: 0.5 }}>
                        {isBot ? SOPHIA_NAME : `${msg.sender?.firstName ?? ''} ${msg.sender?.lastName ?? ''}`.trim()}
                      </Typography>
                    )}

                    <Box sx={{
                      px: 1.5, py: 1,
                      bgcolor: isBot ? BOT_BG : isMe ? USER_BG : SURFACE,
                      borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: isBot ? '1px solid rgba(160,80,255,0.3)' : 'none',
                    }}>
                      {isImg && msg.mediaUrl && (
                        <Box
                          component="img"
                          src={msg.mediaUrl}
                          alt=""
                          onClick={() => window.open(msg.mediaUrl, '_blank')}
                          sx={{ maxWidth: '100%', borderRadius: 1, mb: msg.content ? 0.5 : 0, display: 'block', cursor: 'pointer' }}
                        />
                      )}
                      {isFile && msg.mediaUrl ? (
                        <Typography
                          component="a"
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noopener"
                          sx={{ color: ACCENT, fontSize: 13, display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          <AttachFile sx={{ fontSize: 14 }} /> {msg.content}
                        </Typography>
                      ) : isBot ? (
                        <Typography sx={{ color: '#fff', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.65 }}
                          dangerouslySetInnerHTML={{ __html:
                            msg.content
                              .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                              .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                          }}
                        />
                      ) : (
                        <Typography sx={{ color: '#fff', fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.content}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction={isMe ? 'row-reverse' : 'row'} alignItems="center" spacing={0.5} sx={{ px: 0.5, mt: 0.2 }}>
                      <Typography sx={{ color: '#444', fontSize: 10 }}>{fmt(msg.createdAt)}</Typography>
                      {isMe && (msg.isRead
                        ? <DoneAll sx={{ fontSize: 12, color: ACCENT }} />
                        : <CheckCircle sx={{ fontSize: 12, color: '#444' }} />
                      )}
                    </Stack>
                  </Box>
                </Box>
              );
            })}

            {/* Typing dots */}
            {typing && (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pl: 1 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: '#333' }}>
                  <SmartToy sx={{ fontSize: 13 }} />
                </Avatar>
                <Box sx={{ display: 'flex', gap: 0.4, px: 1.5, py: 1, bgcolor: SURFACE, borderRadius: 2 }}>
                  {[0, 0.15, 0.3].map((d, i) => (
                    <Box key={i} sx={{
                      width: 6, height: 6, borderRadius: '50%', bgcolor: '#666',
                      animation: 'blink 1s infinite', animationDelay: `${d}s`,
                      '@keyframes blink': { '0%,100%': { opacity: 0.3 }, '50%': { opacity: 1 } },
                    }} />
                  ))}
                </Box>
              </Box>
            )}

            <div ref={bottomRef} />
          </Box>

          {/* Upload progress bar */}
          {uploading && (
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ bgcolor: SURFACE, '& .MuiLinearProgress-bar': { bgcolor: ACCENT } }}
            />
          )}

          <Divider sx={{ borderColor: BORDER }} />

          {/* Input area */}
          {!closed ? (
            <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xlsx"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <Tooltip title="Joindre un fichier">
                <IconButton
                  size="small"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  sx={{ color: '#666', '&:hover': { color: ACCENT } }}
                >
                  <AttachFile fontSize="small" />
                </IconButton>
              </Tooltip>

              <TextField
                value={input}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder={convId ? 'Écrivez un message…' : 'Connexion en cours…'}
                multiline
                maxRows={4}
                fullWidth
                size="small"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: SURFACE, borderRadius: 3, color: '#fff', fontSize: 13,
                    '& fieldset': { borderColor: BORDER },
                    '&:hover fieldset': { borderColor: '#444' },
                    '&.Mui-focused fieldset': { borderColor: ACCENT },
                  },
                  '& textarea::placeholder': { color: '#555', opacity: 1 },
                }}
              />

              <IconButton
                onClick={() => send(input)}
                disabled={(!input.trim() && !uploading) || closed || !convId}
                sx={{
                  bgcolor: ACCENT, color: '#000', flexShrink: 0,
                  '&:hover': { bgcolor: '#00a8d8' },
                  '&.Mui-disabled': { bgcolor: '#1a2540', color: '#444' },
                }}
              >
                <Send fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
              <Typography sx={{ color: '#555', fontSize: 12 }}>Cette conversation est fermée.</Typography>
            </Box>
          )}
        </Box>
      )}
    </>
  );
}
