import { useMemo, useState } from 'react';
import { Box, Typography, InputBase, Avatar } from '@mui/material';
import { Search, SupportAgent, ChatBubbleOutline } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import { ListSkeleton } from '../shared/Skeletons';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';

/* ── palette exacte (spec messagerie) ────────────────────────────────────── */
export const CHAT_NAVY       = '#0F1B2E';
export const CHAT_ORANGE     = '#F5711A';
export const CHAT_ORANGE_HOV = '#DB5E0F';
export const CHAT_ORANGE_BG  = '#FDECDF';
export const CHAT_TEAL_TXT   = '#116B57';
export const CHAT_SURFACE_1  = '#F5F5F3';
export const CHAT_SURFACE_2  = '#FFFFFF';
export const CHAT_BORD       = 'rgba(15,27,46,0.08)';
export const CHAT_SUB2       = '#5F5E5A';
export const CHAT_SUB        = '#888780';

interface ConvUser { userId: string; unreadCount: number; user: { id: string; firstName: string; lastName: string; avatar?: string } }
export interface Conv { id: string; isSupport: boolean; lastMessage?: string; lastMessageAt?: string; participants: ConvUser[] }

function fmtTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export default function ConvListPanel({ selectedUserId, onSelect }: { selectedUserId?: string; onSelect: (conv: Conv, otherUserId: string) => void }) {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  const { data: conversations = [], isLoading } = useQuery<Conv[]>({
    queryKey: ['my-conversations'],
    queryFn: () => api.get('/chat/conversations').then(r => r.data),
    refetchInterval: 20_000,
    refetchOnMount: 'always',
  });
  const showSkel = useDelayedLoading(isLoading);

  const getOther = (conv: Conv) => conv.participants.find(p => p.userId !== user?.id);
  const getMe    = (conv: Conv) => conv.participants.find(p => p.userId === user?.id);
  const label = (conv: Conv) => conv.isSupport ? 'Support DealPam' : (getOther(conv) ? `${getOther(conv)!.user.firstName} ${getOther(conv)!.user.lastName}`.trim() : 'Utilisateur');

  const filtered = useMemo(() => {
    const list = search.trim() ? conversations.filter(c => label(c).toLowerCase().includes(search.trim().toLowerCase())) : conversations;
    return [...list].sort((a, b) => (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0) - (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0));
  }, [conversations, search]); // eslint-disable-line

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: CHAT_SURFACE_1 }}>
      {/* header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${CHAT_BORD}`, flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 500, fontSize: 18, color: CHAT_NAVY, mb: 1.5 }}>messages</Typography>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, bgcolor: CHAT_SURFACE_2, border: `1px solid ${CHAT_BORD}`,
          borderRadius: '10px', px: 1.5, py: 0.9,
          '&:focus-within': { outline: `2px solid ${CHAT_ORANGE}`, outlineOffset: 1 },
        }}>
          <Search sx={{ fontSize: 16, color: CHAT_SUB, flexShrink: 0 }} />
          <InputBase placeholder="rechercher une conversation…" value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, '& input': { color: CHAT_NAVY, fontSize: 13, padding: 0, '&::placeholder': { color: CHAT_SUB, opacity: 1 } } }} />
        </Box>
      </Box>

      {/* list */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {isLoading && showSkel && (
          <Box sx={{ px: 1.5, pt: 1 }}><ListSkeleton rows={5} withImage /></Box>
        )}
        {!isLoading && filtered.length === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', pt: 6, px: 3 }}>
            <ChatBubbleOutline sx={{ fontSize: 30, color: CHAT_SUB, mb: 1.5 }} />
            <Typography sx={{ color: CHAT_SUB2, fontSize: 13.5, fontWeight: 500 }}>{search ? 'Aucun résultat' : 'vos conversations apparaîtront ici'}</Typography>
          </Box>
        )}
        {!isLoading && filtered.map(conv => {
          const other = getOther(conv);
          const unread = getMe(conv)?.unreadCount ?? 0;
          const active = other?.userId === selectedUserId;
          const initial = conv.isSupport ? 'S' : (other?.user.firstName?.[0]?.toUpperCase() ?? '?');
          return (
            <Box key={conv.id} onClick={() => other && onSelect(conv, other.userId)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1.4, cursor: 'pointer',
                bgcolor: active ? CHAT_ORANGE_BG : 'transparent',
                borderLeft: active ? `2px solid ${CHAT_ORANGE}` : '2px solid transparent',
                transition: 'background 0.15s ease',
                '&:hover': { bgcolor: active ? CHAT_ORANGE_BG : 'rgba(15,27,46,0.03)' },
              }}>
              {conv.isSupport ? (
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: CHAT_NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <SupportAgent sx={{ fontSize: 18, color: '#fff' }} />
                </Box>
              ) : other?.user.avatar ? (
                <Avatar src={other.user.avatar} sx={{ width: 40, height: 40, flexShrink: 0 }} />
              ) : (
                <Avatar sx={{ width: 40, height: 40, bgcolor: CHAT_NAVY, color: '#fff', fontWeight: 500, fontSize: 15, flexShrink: 0 }}>{initial}</Avatar>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 500, color: CHAT_NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label(conv)}</Typography>
                  {conv.lastMessageAt && <Typography sx={{ fontSize: 11, color: CHAT_SUB, flexShrink: 0, ml: 1 }}>{fmtTime(conv.lastMessageAt)}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography sx={{ fontSize: 12.5, color: CHAT_SUB2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {conv.lastMessage ?? 'démarrez la conversation'}
                  </Typography>
                  {unread > 0 && (
                    <Box sx={{ minWidth: 18, height: 18, px: 0.5, borderRadius: '9px', bgcolor: CHAT_ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 500, color: '#fff' }}>{unread > 9 ? '9+' : unread}</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
