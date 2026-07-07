import { useMemo, useState } from 'react';
import { Box, Typography, InputBase, CircularProgress, Avatar, alpha } from '@mui/material';
import { Search, SupportAgent, ChatBubbleOutline } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

const OR     = '#FF6B00';
const BG     = '#F7F8FA';
const CARD   = '#FFFFFF';
const CARD_H = '#F1F5F9';
const BORD   = 'rgba(15,23,42,0.09)';

interface ConvUser {
  userId: string;
  unreadCount: number;
  user: { id: string; firstName: string; lastName: string; avatar?: string };
}
interface Conv {
  id: string;
  isSupport: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  participants: ConvUser[];
}

function fmtTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function ConversationsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: conversations = [], isLoading } = useQuery<Conv[]>({
    queryKey: ['my-conversations'],
    queryFn: () => api.get('/chat/conversations').then(r => r.data),
    refetchInterval: 20_000,
    refetchOnMount: 'always',
  });

  const getOther = (conv: Conv) => conv.participants.find(p => p.userId !== user?.id);
  const getMe    = (conv: Conv) => conv.participants.find(p => p.userId === user?.id);

  const label = (conv: Conv) => {
    if (conv.isSupport) return 'Support DealPam';
    const o = getOther(conv);
    return o ? `${o.user.firstName} ${o.user.lastName}`.trim() : 'Utilisateur';
  };

  const filtered = useMemo(() => {
    const list = search.trim()
      ? conversations.filter(c => label(c).toLowerCase().includes(search.trim().toLowerCase()))
      : conversations;
    return [...list].sort((a, b) => {
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return tb - ta;
    });
  }, [conversations, search]); // eslint-disable-line

  const totalUnread = conversations.reduce((s, c) => s + (getMe(c)?.unreadCount ?? 0), 0);

  const openConv = (conv: Conv) => {
    const other = getOther(conv);
    if (other) navigate(`/account/messages/${other.userId}`);
  };

  return (
    <Box sx={{
      bgcolor: { xs: BG, sm: 'transparent' },
      minHeight: { xs: '100vh', sm: 'auto' },
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      py: { xs: 0, sm: 4 }, px: { xs: 0, sm: 3 },
      position: 'relative',
    }}>
      {/* Ambient glow behind the card — desktop only */}
      <Box sx={{
        display: { xs: 'none', sm: 'block' },
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 900, height: 500, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, ${alpha(OR, 0.09)}, transparent 70%)`,
        filter: 'blur(10px)',
      }} />

      <Box sx={{
        width: '100%', maxWidth: { xs: '100%', sm: 720 },
        height: { xs: 'auto', sm: 'calc(100vh - 140px)' },
        minHeight: { xs: '100vh', sm: 560 },
        display: 'flex', flexDirection: 'column',
        bgcolor: BG,
        borderRadius: { xs: 0, sm: '20px' },
        border: { xs: 'none', sm: `1px solid ${BORD}` },
        boxShadow: { xs: 'none', sm: '0 8px 32px rgba(15,23,42,0.08)' },
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Accent top line — desktop only */}
        <Box sx={{
          display: { xs: 'none', sm: 'block' },
          position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
          background: `linear-gradient(90deg, transparent, ${OR}, transparent)`, opacity: 0.7,
        }} />

        {/* Header */}
        <Box sx={{
          px: { xs: 2, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: 2, flexShrink: 0,
          borderBottom: `1px solid ${BORD}`,
          background: '#FFFFFF',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box sx={{
                width: 34, height: 34, borderRadius: '11px', flexShrink: 0,
                bgcolor: alpha(OR, 0.12), border: `1px solid ${alpha(OR, 0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChatBubbleOutline sx={{ fontSize: 16, color: OR }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 19, color: '#0F172A', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                  Messages
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.2 }}>
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>
            {totalUnread > 0 && (
              <Box sx={{
                minWidth: 28, height: 28, px: 1, borderRadius: '9px',
                background: `linear-gradient(135deg,${OR},#D95500)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(255,107,0,0.35)',
              }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: 'white' }}>{totalUnread}</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: '#F7F8FA', border: `1px solid ${BORD}`,
            borderRadius: '12px', px: 1.8, py: 1.05,
            '&:focus-within': { borderColor: 'rgba(255,107,0,0.5)', bgcolor: 'rgba(255,107,0,0.04)', boxShadow: `0 0 0 3px rgba(255,107,0,0.08)` },
            transition: 'all 0.2s',
          }}>
            <Search sx={{ fontSize: 17, color: '#64748B', flexShrink: 0 }} />
            <InputBase
              placeholder="Rechercher une conversation…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ flex: 1, '& input': { color: '#0F172A', fontSize: 13.5, padding: 0, '&::placeholder': { color: '#64748B', opacity: 1 } } }}
            />
          </Box>
        </Box>

        {/* List */}
        <Box sx={{
          flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 1.2, sm: 1.5 }, py: 1.5,
          scrollbarWidth: 'thin', '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(15,23,42,0.12)', borderRadius: 4 },
        }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
              <CircularProgress size={28} sx={{ color: OR }} />
            </Box>
          )}

          {!isLoading && filtered.length === 0 && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pt: 8, px: 3 }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: '18px', mx: 'auto', mb: 2,
                bgcolor: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChatBubbleOutline sx={{ fontSize: 27, color: 'rgba(255,107,0,0.5)' }} />
              </Box>
              <Typography sx={{ color: '#475569', fontSize: 14.5, fontWeight: 700, mb: 0.6 }}>
                {search ? 'Aucun résultat' : 'Aucune conversation'}
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: 12.5 }}>
                {search ? 'Essayez un autre nom.' : 'Contactez un vendeur depuis une fiche produit pour démarrer.'}
              </Typography>
            </Box>
          )}

          {!isLoading && filtered.map((conv, idx) => {
            const other  = getOther(conv);
            const unread = getMe(conv)?.unreadCount ?? 0;
            const sup    = conv.isSupport;
            const initial = sup ? 'S' : (other?.user.firstName?.[0]?.toUpperCase() ?? '?');
            const hue = ((other?.user.firstName ?? 'X').charCodeAt(0) * 53) % 360;

            return (
              <Box
                key={conv.id}
                onClick={() => openConv(conv)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 1.5, py: 1.4, mb: 0.5, borderRadius: '14px', cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.18s cubic-bezier(.2,.8,.2,1)',
                  bgcolor: 'transparent', border: '1px solid transparent',
                  '&::after': idx < filtered.length - 1 ? {
                    content: '""', position: 'absolute', left: 62, right: 12, bottom: -1,
                    height: '1px', bgcolor: 'rgba(15,23,42,0.06)',
                  } : undefined,
                  '&:hover': {
                    bgcolor: CARD_H, borderColor: 'rgba(15,23,42,0.1)',
                    transform: 'translateX(3px)',
                    boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                    '&::after': { opacity: 0 },
                  },
                  '&:active': { transform: 'translateX(3px) scale(0.99)' },
                }}
              >
                {/* Avatar */}
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  {sup ? (
                    <Box sx={{
                      width: 46, height: 46, borderRadius: '14px',
                      background: 'linear-gradient(135deg,rgba(255,107,0,0.25),rgba(255,107,0,0.1))',
                      border: '1.5px solid rgba(255,107,0,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <SupportAgent sx={{ fontSize: 21, color: OR }} />
                    </Box>
                  ) : other?.user.avatar ? (
                    <Avatar src={other.user.avatar} sx={{ width: 46, height: 46, borderRadius: '14px' }} />
                  ) : (
                    <Box sx={{
                      width: 46, height: 46, borderRadius: '14px',
                      background: `linear-gradient(135deg,hsl(${hue},50%,28%),hsl(${hue},40%,18%))`,
                      border: `1.5px solid hsl(${hue},40%,32%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 17, color: `hsl(${hue},80%,72%)` }}>{initial}</Typography>
                    </Box>
                  )}
                  {unread > 0 && (
                    <Box sx={{
                      position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: '6px',
                      bgcolor: OR, border: `2px solid ${BG}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(255,107,0,0.5)',
                      animation: 'dp-conv-pulse 2s ease-in-out infinite',
                      '@keyframes dp-conv-pulse': {
                        '0%,100%': { boxShadow: '0 2px 8px rgba(255,107,0,0.5)' },
                        '50%':     { boxShadow: '0 2px 14px rgba(255,107,0,0.85)' },
                      },
                    }}>
                      <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: 'white', px: 0.3 }}>
                        {unread > 9 ? '9+' : unread}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Text */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                    <Typography sx={{
                      fontSize: 14, fontWeight: unread > 0 ? 800 : 600,
                      color: unread > 0 ? '#0F172A' : '#475569',
                    }} noWrap>
                      {label(conv)}
                    </Typography>
                    {conv.lastMessageAt && (
                      <Typography sx={{
                        fontSize: 10.5, flexShrink: 0, ml: 1,
                        color: unread > 0 ? OR : '#64748B',
                        fontWeight: unread > 0 ? 700 : 400,
                      }}>
                        {fmtTime(conv.lastMessageAt)}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{
                    fontSize: 12.5, lineHeight: 1.4,
                    color: unread > 0 ? '#475569' : '#64748B',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {conv.lastMessage ?? 'Démarrez la conversation'}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
