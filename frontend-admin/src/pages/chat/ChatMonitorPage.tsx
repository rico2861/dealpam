import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Avatar, TextField, IconButton, Chip, CircularProgress,
  ToggleButton, ToggleButtonGroup, alpha, Tooltip, Badge, Card,
  Button, Divider,
} from '@mui/material';
import {
  Send, FiberManualRecord, SupportAgent, Person, Store as StoreIcon,
  CheckCircle, Cancel, Refresh, FilterList,
  PictureAsPdfOutlined, InsertDriveFileOutlined,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import api from '../../api/axios';
import { useAdminStore } from '../../store/admin.store';

const API_URL = import.meta.env.VITE_API_URL?.replace('/v1', '') ?? 'http://localhost:3000';
const OR = '#FF9900';

interface Msg {
  id: string;
  content: string;
  senderId: string;
  conversationId?: string;
  createdAt: string;
  type?: string;
  mediaUrl?: string;
  sender?: { id: string; firstName: string; lastName: string; role?: string };
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
  ticketNumber?: string;
  assignedAgent?: { id: string; firstName: string; lastName: string; avatar?: string };
  participants: ConvUser[];
  messages: Msg[];
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: '#DCFCE7', color: '#15803D' },
  RESOLVED: { bg: '#DBEAFE', color: '#1D4ED8' },
  CLOSED: { bg: '#F3F4F6', color: '#6B7280' },
};

export default function ChatMonitorPage() {
  const { admin } = useAdminStore();
  const token = localStorage.getItem('admin_token');
  const qc = useQueryClient();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'support' | 'p2p'>('support');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [liveConvIds, setLiveConvIds] = useState<Set<string>>(new Set());
  // Map of conversationId → agentName (another agent is writing there)
  const [agentOccupying, setAgentOccupying] = useState<Record<string, string>>({});
  const agentOccupyTimers = useRef<Record<string, any>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, refetch } = useQuery<{ data: Conv[]; total: number }>({
    queryKey: ['admin-convs', filter],
    queryFn: () => api.get(`/chat/admin/conversations?limit=50&supportOnly=${filter === 'support'}`).then(r => r.data),
    enabled: !!token,
    refetchInterval: 20_000,
  });
  const conversations = data?.data ?? [];
  const displayed = filter === 'p2p' ? conversations.filter(c => !c.isSupport) : conversations;

  // Real-time socket
  useEffect(() => {
    if (!token) return;
    const s = io(`${API_URL}/chat`, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = s;
    s.on('connect', () => {
      setSocket(s);
      if (activeIdRef.current) s.emit('chat:join', { conversationId: activeIdRef.current });
    });
    s.on('agent:occupying', ({ agentId, agentName, conversationId }: { agentId: string; agentName: string; conversationId: string }) => {
      // Only show if it's a different agent
      if (agentId === admin?.id) return;
      setAgentOccupying(p => ({ ...p, [conversationId]: agentName }));
      clearTimeout(agentOccupyTimers.current[conversationId]);
      agentOccupyTimers.current[conversationId] = setTimeout(() => {
        setAgentOccupying(p => { const n = { ...p }; delete n[conversationId]; return n; });
      }, 4000);
    });
    s.on('chat:message', (msg: Msg) => {
      // Track which conversations have new messages
      if (msg.conversationId) {
        setLiveConvIds(p => new Set([...p, msg.conversationId!]));
      }
      // If this message belongs to the active conversation, append it
      setMessages(prev => {
        if (!msg.conversationId && !activeIdRef.current) return prev;
        if (msg.conversationId && msg.conversationId !== activeIdRef.current) return prev;
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      qc.invalidateQueries({ queryKey: ['admin-convs'] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    });
    return () => { s.disconnect(); };
  }, [token]);

  // Load messages when conv selected
  useEffect(() => {
    if (!activeId) return;
    activeIdRef.current = activeId;
    setLoadingMsgs(true);
    setLiveConvIds(p => { const n = new Set(p); n.delete(activeId); return n; });
    api.get(`/chat/conversations/${activeId}/messages?page=1`).then(r => {
      setMessages(r.data.data || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }).finally(() => setLoadingMsgs(false));
    // Join room as observer — handle race condition
    const s = socketRef.current;
    if (s?.connected) s.emit('chat:join', { conversationId: activeId });
    else s?.once('connect', () => s.emit('chat:join', { conversationId: activeId }));
  }, [activeId]);

  const sendReply = async () => {
    const content = text.trim();
    if (!content || !activeId || sending || !socket) return;
    setText('');
    setSending(true);
    try {
      socket.emit('admin:reply', { conversationId: activeId, content });
      const optimistic: Msg = {
        id: `opt-${Date.now()}`, content, senderId: admin!.id, createdAt: new Date().toISOString(),
        sender: { id: admin!.id, firstName: admin!.firstName, lastName: admin!.lastName, role: admin!.role },
      };
      setMessages(p => [...p, optimistic]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (convId: string, status: string) => {
    await api.post(`/chat/admin/conversations/${convId}/status`, { status });
    qc.invalidateQueries({ queryKey: ['admin-convs'] });
  };

  const getParticipantLabel = (conv: Conv) => {
    const others = conv.participants.filter(p => !['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(p.user.role ?? ''));
    if (others.length === 0) return 'Inconnu';
    return others.map(p => `${p.user.firstName} ${p.user.lastName}`).join(', ');
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'SELLER') return { label: 'Vendeur', color: '#7C3AED', bg: '#EDE9FE' };
    if (role === 'CUSTOMER') return { label: 'Client', color: '#0369A1', bg: '#E0F2FE' };
    return { label: role ?? '?', color: '#6B7280', bg: '#F3F4F6' };
  };

  const activeConv = conversations.find(c => c.id === activeId);
  const isAdminMsg = (msg: Msg) => ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(msg.sender?.role ?? '');
  const isMine = (msg: Msg) => msg.senderId === admin?.id;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', bgcolor: '#F0F2F5' }}>

      {/* ── Left panel ── */}
      <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', bgcolor: 'white', borderRight: '1px solid #E5E7EB' }}>
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography fontWeight={800} fontSize={16} color="#111827">Conversations</Typography>
            <Tooltip title="Actualiser">
              <IconButton size="small" onClick={() => refetch()}>
                <Refresh sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
          <ToggleButtonGroup
            value={filter} exclusive size="small" fullWidth
            onChange={(_, v) => { if (v) { setFilter(v); setActiveId(null); } }}
            sx={{ '& .MuiToggleButton-root': { fontSize: 11, textTransform: 'none', py: 0.5 } }}
          >
            <ToggleButton value="support">Support</ToggleButton>
            <ToggleButton value="p2p">Vendeur↔Client</ToggleButton>
            <ToggleButton value="all">Tous</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {isLoading && <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
          {!isLoading && displayed.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="#9CA3AF" fontSize={13}>Aucune conversation</Typography>
            </Box>
          )}
          {displayed.map(conv => {
            const sel = conv.id === activeId;
            const hasLive = liveConvIds.has(conv.id);
            const roleInfo = getRoleLabel(conv.participants.find(p => !['ADMIN','SUPER_ADMIN','MODERATOR'].includes(p.user.role ?? ''))?.user.role);
            return (
              <Box key={conv.id} onClick={() => setActiveId(conv.id)} sx={{
                px: 2, py: 1.5, cursor: 'pointer', display: 'flex', gap: 1.5, alignItems: 'flex-start',
                bgcolor: sel ? alpha(OR, 0.06) : 'transparent',
                borderLeft: `3px solid ${sel ? OR : 'transparent'}`,
                transition: 'background 0.12s',
                '&:hover': { bgcolor: sel ? alpha(OR, 0.08) : '#F8FAFC' },
              }}>
                <Badge badgeContent={hasLive ? '●' : 0} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 8, minWidth: 14, height: 14, padding: 0 } }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: conv.isSupport ? OR : '#6B7280', flexShrink: 0 }}>
                    {conv.isSupport ? <SupportAgent sx={{ fontSize: 19 }} /> : <Person sx={{ fontSize: 19 }} />}
                  </Avatar>
                </Badge>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                    <Typography fontSize={12.5} fontWeight={700} noWrap color="#111827">
                      {getParticipantLabel(conv)}
                    </Typography>
                    <Chip label={conv.status === 'OPEN' ? 'Ouvert' : conv.status === 'RESOLVED' ? 'Résolu' : 'Fermé'}
                      size="small" sx={{ fontSize: 9, height: 16, px: 0.3, flexShrink: 0, bgcolor: STATUS_COLORS[conv.status]?.bg, color: STATUS_COLORS[conv.status]?.color }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.2, mb: 0.3, flexWrap: 'wrap' }}>
                    <Chip label={roleInfo.label} size="small"
                      sx={{ fontSize: 9, height: 14, bgcolor: roleInfo.bg, color: roleInfo.color, '& .MuiChip-label': { px: 0.7 } }} />
                    {conv.isSupport && <Chip label={conv.ticketNumber ?? 'Support'} size="small" sx={{ fontSize: 9, height: 14, bgcolor: '#FEF3C7', color: '#B45309', '& .MuiChip-label': { px: 0.7 } }} />}
                    {agentOccupying[conv.id] && (
                      <Chip label={`✍️ ${agentOccupying[conv.id]}`} size="small"
                        sx={{ fontSize: 9, height: 14, bgcolor: '#EDE9FE', color: '#6D28D9', '& .MuiChip-label': { px: 0.7 } }} />
                    )}
                  </Box>
                  <Typography fontSize={11.5} color="#9CA3AF" noWrap>
                    {conv.lastMessage ?? 'Pas de message'}
                  </Typography>
                  {conv.lastMessageAt && (
                    <Typography fontSize={10} color="#CBD5E1" mt={0.3}>
                      {new Date(conv.lastMessageAt).toLocaleString('fr', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Right panel: messages + reply ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeId ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: '#9CA3AF' }}>
            <Box sx={{ fontSize: 56 }}>💬</Box>
            <Typography fontSize={16} fontWeight={700} color="#374151">Moniteur de conversations</Typography>
            <Typography fontSize={13} textAlign="center" maxWidth={320}>
              Sélectionnez une conversation pour lire les messages et répondre en tant que support.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 38, height: 38, bgcolor: activeConv?.isSupport ? OR : '#6B7280' }}>
                {activeConv?.isSupport ? <SupportAgent sx={{ fontSize: 19 }} /> : <Person sx={{ fontSize: 19 }} />}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography fontWeight={700} fontSize={14} color="#111827" noWrap>
                    {activeConv ? getParticipantLabel(activeConv) : ''}
                  </Typography>
                  {activeConv?.ticketNumber && (
                    <Chip label={activeConv.ticketNumber} size="small"
                      sx={{ fontSize: 9, height: 16, bgcolor: '#FEF3C7', color: '#B45309', flexShrink: 0 }} />
                  )}
                </Box>
                <Typography fontSize={11.5} color="#9CA3AF">
                  {activeConv?.isSupport
                    ? `Support · ${activeConv.assignedAgent ? `Agent: ${activeConv.assignedAgent.firstName} ${activeConv.assignedAgent.lastName}` : activeConv.topic ?? 'general'}`
                    : 'Conversation vendeur ↔ client'}
                </Typography>
              </Box>
              {/* Status actions */}
              <Box sx={{ display: 'flex', gap: 0.8, flexShrink: 0 }}>
                {activeConv?.status === 'OPEN' && (
                  <Button size="small" startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                    variant="outlined" color="success"
                    sx={{ fontSize: 11, textTransform: 'none', borderRadius: '8px', py: 0.4 }}
                    onClick={() => setStatus(activeId, 'RESOLVED')}>Résoudre</Button>
                )}
                {activeConv?.status !== 'CLOSED' && (
                  <Button size="small" startIcon={<Cancel sx={{ fontSize: 14 }} />}
                    variant="outlined" color="error"
                    sx={{ fontSize: 11, textTransform: 'none', borderRadius: '8px', py: 0.4 }}
                    onClick={() => setStatus(activeId, 'CLOSED')}>Fermer</Button>
                )}
                {activeConv?.status !== 'OPEN' && (
                  <Button size="small" variant="outlined"
                    sx={{ fontSize: 11, textTransform: 'none', borderRadius: '8px', py: 0.4 }}
                    onClick={() => setStatus(activeId, 'OPEN')}>Rouvrir</Button>
                )}
              </Box>
            </Box>

            {/* Messages */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {loadingMsgs ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={28} sx={{ color: OR }} />
                </Box>
              ) : messages.length === 0 ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="#9CA3AF" fontSize={13}>Aucun message</Typography>
                </Box>
              ) : (
                messages.map(msg => {
                  const mine = isMine(msg);
                  const isAdmin = isAdminMsg(msg);
                  const isImg  = msg.type === 'IMAGE' && msg.mediaUrl;
                  const isFile = msg.type === 'FILE' && msg.mediaUrl;
                  return (
                    <Box key={msg.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 0.8 }}>
                      {!mine && (
                        <Avatar sx={{ width: 28, height: 28, bgcolor: isAdmin ? OR : '#6B7280', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {isAdmin ? <SupportAgent sx={{ fontSize: 14 }} /> : (msg.sender?.firstName?.[0] ?? '?')}
                        </Avatar>
                      )}
                      <Box sx={{ maxWidth: '68%' }}>
                        {!mine && (
                          <Typography fontSize={10} color="#9CA3AF" mb={0.3} ml={0.5}>
                            {isAdmin ? `Support · ${msg.sender?.firstName}` : `${msg.sender?.firstName} ${msg.sender?.lastName}`}
                            {' '}
                            {msg.sender?.role && (
                              <Box component="span" sx={{ fontSize: 9, bgcolor: getRoleLabel(msg.sender.role).bg, color: getRoleLabel(msg.sender.role).color, px: '4px', borderRadius: '4px' }}>
                                {getRoleLabel(msg.sender.role).label}
                              </Box>
                            )}
                          </Typography>
                        )}
                        <Box sx={{
                          px: isImg ? 0.8 : 1.8, py: isImg ? 0.8 : 1,
                          borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          bgcolor: mine ? OR : 'white',
                          boxShadow: mine ? `0 2px 8px ${alpha(OR, 0.3)}` : '0 1px 3px rgba(0,0,0,0.07)',
                          overflow: 'hidden',
                        }}>
                          {isImg && (
                            <Box component="img" src={msg.mediaUrl} alt="" loading="lazy"
                              onClick={() => window.open(msg.mediaUrl, '_blank')}
                              sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: '10px', display: 'block', cursor: 'pointer', objectFit: 'cover' }}
                            />
                          )}
                          {isFile && (
                            <Box component="a" href={msg.mediaUrl} target="_blank" rel="noopener"
                              sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', px: 1, py: 0.2 }}>
                              {/\.pdf($|\?)/i.test(msg.mediaUrl!)
                                ? <PictureAsPdfOutlined sx={{ fontSize: 20, color: mine ? 'white' : '#DC2626', flexShrink: 0 }} />
                                : <InsertDriveFileOutlined sx={{ fontSize: 20, color: mine ? 'white' : '#2563EB', flexShrink: 0 }} />}
                              <Typography fontSize={12.5} fontWeight={600} color={mine ? 'white' : '#111827'} sx={{ wordBreak: 'break-all' }}>
                                {msg.content}
                              </Typography>
                            </Box>
                          )}
                          {!isImg && !isFile && (
                            <Typography fontSize={13.5} color={mine ? 'white' : '#111827'} lineHeight={1.5}>{msg.content}</Typography>
                          )}
                        </Box>
                        <Typography fontSize={10} color="#CBD5E1" mt={0.3} textAlign={mine ? 'right' : 'left'}>
                          {new Date(msg.createdAt).toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={bottomRef} />
            </Box>

            {/* Reply input — only for support conversations */}
            {activeConv?.isSupport ? (
              <Box sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: OR, flexShrink: 0, mb: 0.5 }}>
                  <SupportAgent sx={{ fontSize: 16 }} />
                </Avatar>
                <TextField
                  fullWidth multiline maxRows={4} placeholder="Répondre en tant que support…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '14px', fontSize: 13.5, '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: OR } } }}
                />
                <IconButton onClick={sendReply} disabled={!text.trim() || sending}
                  sx={{ width: 44, height: 44, bgcolor: OR, color: 'white', borderRadius: '12px', flexShrink: 0, '&:hover': { bgcolor: '#E68900' }, '&:disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' } }}>
                  {sending ? <CircularProgress size={18} color="inherit" /> : <Send sx={{ fontSize: 19 }} />}
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ p: 2, bgcolor: '#FFFBF0', borderTop: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontSize={12.5} color="#92400E">
                  Mode lecture seule — conversation entre utilisateurs.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
