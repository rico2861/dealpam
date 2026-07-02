import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, IconButton, CircularProgress, Avatar, alpha,
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';

const OR   = '#FF6B00';
const BG   = '#060B14';
const CARD = 'rgba(255,255,255,0.035)';
const BORD = 'rgba(255,255,255,0.07)';

export default function MessagesPage() {
  const { userId: sellerUserId } = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const qc        = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const [convId, setConvId]   = useState<string | null>(null);

  // Create/get conversation on mount
  useEffect(() => {
    if (!sellerUserId) return;
    api.post('/chat/conversations', { userId: sellerUserId })
      .then(r => setConvId(r.data.id))
      .catch(() => enqueueSnackbar('Impossible d\'ouvrir la conversation', { variant: 'error' }));
  }, [sellerUserId]);

  // Load messages
  const { data: msgData, isLoading } = useQuery({
    queryKey: ['conv-messages', convId],
    queryFn:  () => api.get(`/chat/conversations/${convId}/messages`).then(r => r.data),
    enabled:  !!convId,
    refetchInterval: 4000,
  });

  const messages: any[] = msgData?.data ?? [];

  // Fetch the other participant's basic profile so the header shows their name even before any messages exist
  const { data: sellerProfile } = useQuery({
    queryKey: ['mini-profile', sellerUserId],
    queryFn:  () => api.get(`/users/${sellerUserId}/mini-profile`).then(r => r.data),
    enabled:  !!sellerUserId,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read when conversation is open
  useEffect(() => {
    if (convId) api.post(`/chat/conversations/${convId}/read`).catch(() => {});
  }, [convId, messages.length]);

  const send = async () => {
    if (!text.trim() || !convId || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      await api.post(`/chat/conversations/${convId}/messages`, { content });
      qc.invalidateQueries({ queryKey: ['conv-messages', convId] });
    } catch {
      enqueueSnackbar('Erreur lors de l\'envoi', { variant: 'error' });
      setText(content);
    } finally { setSending(false); }
  };

  const otherParticipant = messages.find((m: any) => m.sender?.id !== user?.id)?.sender ?? sellerProfile;

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.8, borderBottom: `1px solid ${BORD}`,
        display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.02)' }}>
        <IconButton onClick={() => navigate(-1)}
          sx={{ color: 'rgba(255,255,255,0.5)', bgcolor: CARD, border: `1px solid ${BORD}`,
            borderRadius: '10px', width: 36, height: 36, '&:hover': { color: 'white' } }}>
          <ArrowBack sx={{ fontSize: 18 }} />
        </IconButton>
        {otherParticipant ? (
          <>
            <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(OR, 0.15), color: OR, fontSize: 14, fontWeight: 900, border: `1.5px solid ${alpha(OR, 0.2)}` }}>
              {otherParticipant.firstName?.[0]}
            </Avatar>
            <Box>
              <Typography fontWeight={800} fontSize={14.5} color="white">
                {otherParticipant.firstName} {otherParticipant.lastName}
              </Typography>
              <Typography fontSize={11.5} color="rgba(255,255,255,0.3)">Vendeur</Typography>
            </Box>
          </>
        ) : (
          <Typography fontWeight={700} fontSize={15} color="white">Conversation</Typography>
        )}
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2,
        display: 'flex', flexDirection: 'column', gap: 1,
        scrollbarWidth: 'thin', '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 4 },
      }}>
        {!convId || isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
            <CircularProgress size={28} sx={{ color: OR }} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 6 }}>
            <Typography fontSize={13.5} color="rgba(255,255,255,0.25)">
              Envoyez un message pour démarrer la conversation.
            </Typography>
          </Box>
        ) : (
          messages.map((msg: any) => {
            const isMine = msg.sender?.id === user?.id;
            return (
              <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                {!isMine && (
                  <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(OR, 0.15), color: OR, fontSize: 11, fontWeight: 900, mr: 1, mt: 0.5, flexShrink: 0 }}>
                    {msg.sender?.firstName?.[0]}
                  </Avatar>
                )}
                <Box sx={{ maxWidth: '72%' }}>
                  <Box sx={{
                    px: 1.8, py: 1.1, borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    bgcolor: isMine ? OR : CARD,
                    border: isMine ? 'none' : `1px solid ${BORD}`,
                  }}>
                    <Typography fontSize={13.5} color={isMine ? 'white' : 'rgba(255,255,255,0.8)'} lineHeight={1.5}>
                      {msg.content}
                    </Typography>
                  </Box>
                  <Typography fontSize={10.5} color="rgba(255,255,255,0.2)" sx={{ mt: 0.4, textAlign: isMine ? 'right' : 'left', px: 0.5 }}>
                    {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: `1px solid ${BORD}`,
        bgcolor: 'rgba(255,255,255,0.02)', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth multiline maxRows={4}
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écrire un message..."
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '14px', bgcolor: CARD, color: 'white',
              '& fieldset': { borderColor: BORD },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&.Mui-focused fieldset': { borderColor: OR },
            },
            '& .MuiInputBase-input': {
              color: 'white', fontSize: 14,
              '&::placeholder': { color: 'rgba(255,255,255,0.25)', opacity: 1 },
            },
          }}
        />
        <IconButton onClick={send} disabled={!text.trim() || sending || !convId}
          sx={{
            width: 44, height: 44, bgcolor: text.trim() ? OR : 'rgba(255,255,255,0.05)',
            color: text.trim() ? 'white' : 'rgba(255,255,255,0.2)',
            borderRadius: '12px', flexShrink: 0,
            transition: 'all 0.15s',
            '&:hover': { bgcolor: text.trim() ? '#E05A00' : 'rgba(255,255,255,0.05)' },
            '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)' },
          }}>
          {sending ? <CircularProgress size={18} sx={{ color: 'rgba(255,255,255,0.4)' }} /> : <Send sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>
    </Box>
  );
}
