import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, IconButton, CircularProgress, Avatar, LinearProgress, Tooltip,
} from '@mui/material';
import { ArrowBack, Send, AttachFile, PictureAsPdfOutlined, InsertDriveFileOutlined, Refresh, ChatBubbleOutline } from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../../api/axios';
import { useAuthStore } from '../../store/auth.store';
import ConvListPanel, {
  CHAT_NAVY, CHAT_ORANGE, CHAT_ORANGE_HOV, CHAT_SURFACE_1, CHAT_SURFACE_2, CHAT_BORD, CHAT_SUB2, CHAT_SUB,
} from '../../components/chat/ConvListPanel';

function fmtDate(iso: string) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return "aujourd'hui";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function groupByDate<T extends { createdAt: string }>(msgs: T[]) {
  const groups: { date: string; messages: T[] }[] = [];
  msgs.forEach(m => {
    const d = fmtDate(m.createdAt);
    const last = groups[groups.length - 1];
    if (last?.date === d) last.messages.push(m); else groups.push({ date: d, messages: [m] });
  });
  return groups;
}

/* ── Fil de conversation (bulle par bulle) — extrait pour être réutilisé
   tel quel dans le panneau desktop et la vue plein écran mobile. ────────── */
function ChatThread({ sellerUserId }: { sellerUserId: string }) {
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const qc        = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const [failedText, setFailedText] = useState<string | null>(null);
  const [convId, setConvId]   = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setConvId(null);
    if (!sellerUserId) return;
    api.post('/chat/conversations', { userId: sellerUserId })
      .then(r => setConvId(r.data.id))
      .catch(() => enqueueSnackbar("Impossible d'ouvrir la conversation", { variant: 'error' }));
  }, [sellerUserId]); // eslint-disable-line

  const { data: msgData, isLoading } = useQuery({
    queryKey: ['conv-messages', convId],
    queryFn:  () => api.get(`/chat/conversations/${convId}/messages`).then(r => r.data),
    enabled:  !!convId,
    refetchInterval: 4000,
  });
  const messages: any[] = msgData?.data ?? [];

  const { data: sellerProfile } = useQuery({
    queryKey: ['mini-profile', sellerUserId],
    queryFn:  () => api.get(`/users/${sellerUserId}/mini-profile`).then(r => r.data),
    enabled:  !!sellerUserId,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => { if (convId) api.post(`/chat/conversations/${convId}/read`).catch(() => {}); }, [convId, messages.length]);

  const send = async (content?: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', mediaUrl?: string) => {
    const body = content ?? text.trim();
    if (!body.trim() || !convId || sending) return;
    setSending(true); setFailedText(null);
    if (type === 'TEXT') setText('');
    try {
      await api.post(`/chat/conversations/${convId}/messages`, { content: body, type, mediaUrl });
      qc.invalidateQueries({ queryKey: ['conv-messages', convId] });
    } catch {
      enqueueSnackbar("Erreur lors de l'envoi", { variant: 'error' });
      if (type === 'TEXT') setFailedText(body);
    } finally { setSending(false); }
  };

  const retrySend = () => { if (failedText) { const t = failedText; setFailedText(null); send(t); } };

  const handleFile = async (file: File) => {
    if (!convId) return;
    const isImage = file.type.startsWith('image/');
    const form = new FormData();
    form.append('file', file);
    setUploading(true); setUploadProgress(0);
    try {
      const endpoint = isImage ? '/upload/chat-image' : '/upload/chat-file';
      const { data } = await api.post(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setUploadProgress(Math.round((e.loaded * 100) / (e.total ?? 1))),
      });
      const mediaUrl = isImage ? `chatimg:${data.publicId}` : `chatfile:${data.publicId}:${data.fileName}`;
      await send(file.name, isImage ? 'IMAGE' : 'FILE', mediaUrl);
    } catch {
      enqueueSnackbar("Erreur lors de l'envoi du fichier", { variant: 'error' });
    } finally { setUploading(false); setUploadProgress(0); }
  };

  const otherParticipant = messages.find((m: any) => m.sender?.id !== user?.id)?.sender ?? sellerProfile;
  const groups = groupByDate(messages);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: CHAT_SURFACE_2 }}>
      {/* header */}
      <Box sx={{ px: 2.5, py: 1.6, borderBottom: `1px solid ${CHAT_BORD}`, display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
        <IconButton onClick={() => navigate('/account/messages')}
          sx={{ display: { xs: 'inline-flex', lg: 'none' }, color: CHAT_NAVY, bgcolor: CHAT_SURFACE_1, borderRadius: '10px', width: 36, height: 36 }}>
          <ArrowBack sx={{ fontSize: 18 }} />
        </IconButton>
        {otherParticipant ? (
          <>
            <Avatar sx={{ width: 38, height: 38, bgcolor: CHAT_NAVY, color: '#fff', fontSize: 14, fontWeight: 500 }}>
              {otherParticipant.firstName?.[0]}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500, fontSize: 14.5, color: CHAT_NAVY }} noWrap>
                {otherParticipant.firstName} {otherParticipant.lastName}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: CHAT_SUB }}>vendeur</Typography>
            </Box>
          </>
        ) : (
          <Typography sx={{ fontWeight: 500, fontSize: 15, color: CHAT_NAVY }}>conversation</Typography>
        )}
      </Box>

      {/* messages */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {!convId || isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}><CircularProgress size={26} sx={{ color: CHAT_ORANGE }} /></Box>
        ) : messages.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <ChatBubbleOutline sx={{ fontSize: 30, color: CHAT_SUB }} />
            <Typography sx={{ fontSize: 13.5, color: CHAT_SUB2 }}>envoyez un message pour démarrer la conversation.</Typography>
          </Box>
        ) : (
          groups.map((g, gi) => (
            <Box key={gi}>
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 1.5 }}>
                <Typography sx={{ fontSize: 11, color: CHAT_SUB, bgcolor: CHAT_SURFACE_1, px: 1.4, py: 0.4, borderRadius: '10px' }}>{g.date}</Typography>
              </Box>
              {g.messages.map((msg: any) => {
                const isMine = msg.sender?.id === user?.id;
                const isImg  = msg.type === 'IMAGE' && msg.mediaUrl;
                const isFile = msg.type === 'FILE' && msg.mediaUrl;
                return (
                  <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', mb: 1 }}>
                    {!isMine && (
                      <Avatar sx={{ width: 28, height: 28, bgcolor: CHAT_NAVY, color: '#fff', fontSize: 11, fontWeight: 500, mr: 1, mt: 0.5, flexShrink: 0 }}>
                        {msg.sender?.firstName?.[0]}
                      </Avatar>
                    )}
                    <Box sx={{ maxWidth: { xs: '80%', md: '70%' } }}>
                      <Box sx={{
                        px: isImg ? 0.8 : 1.6, py: isImg ? 0.8 : 1,
                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        bgcolor: isMine ? CHAT_ORANGE : CHAT_SURFACE_1,
                        overflow: 'hidden',
                      }}>
                        {isImg && (
                          <Box component="img" src={msg.mediaUrl} alt="" loading="lazy" onClick={() => window.open(msg.mediaUrl, '_blank')}
                            sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: '10px', display: 'block', cursor: 'pointer', objectFit: 'cover' }} />
                        )}
                        {isFile && (
                          <Box component="a" href={msg.mediaUrl} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', px: 0.5 }}>
                            {/\.pdf($|\?)/i.test(msg.mediaUrl)
                              ? <PictureAsPdfOutlined sx={{ fontSize: 20, color: isMine ? '#fff' : '#B3261E', flexShrink: 0 }} />
                              : <InsertDriveFileOutlined sx={{ fontSize: 20, color: isMine ? '#fff' : CHAT_NAVY, flexShrink: 0 }} />}
                            <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: isMine ? '#fff' : CHAT_NAVY, wordBreak: 'break-all' }}>{msg.content}</Typography>
                          </Box>
                        )}
                        {!isImg && !isFile && (
                          <Typography sx={{ fontSize: 13, color: isMine ? '#fff' : CHAT_NAVY, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.content}</Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 10.5, color: CHAT_SUB, mt: 0.4, textAlign: isMine ? 'right' : 'left', px: 0.5 }}>
                        {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))
        )}
        {failedText && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Box sx={{ maxWidth: '70%' }}>
              <Box sx={{ px: 1.6, py: 1, borderRadius: '14px 14px 4px 14px', bgcolor: CHAT_ORANGE, opacity: 0.6 }}>
                <Typography sx={{ fontSize: 13, color: '#fff' }}>{failedText}</Typography>
              </Box>
              <Box onClick={retrySend} sx={{ display: 'flex', alignItems: 'center', gap: 0.4, justifyContent: 'flex-end', mt: 0.4, cursor: 'pointer' }}>
                <Refresh sx={{ fontSize: 12, color: '#B3261E' }} />
                <Typography sx={{ fontSize: 11, color: '#B3261E', fontWeight: 500 }}>échec — réessayer</Typography>
              </Box>
            </Box>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ flexShrink: 0, bgcolor: CHAT_SURFACE_1, '& .MuiLinearProgress-bar': { bgcolor: CHAT_ORANGE } }} />}

      {/* composer */}
      <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${CHAT_BORD}`, flexShrink: 0, display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xlsx" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        <Tooltip title="joindre un fichier ou une image">
          <span>
            <IconButton onClick={() => fileRef.current?.click()} disabled={uploading || !convId}
              sx={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0, color: CHAT_SUB2, bgcolor: CHAT_SURFACE_1,
                '&:hover': { color: CHAT_ORANGE } }}>
              <AttachFile sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>
        <TextField fullWidth multiline maxRows={4} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="écrivez un message…"
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: '20px', bgcolor: CHAT_SURFACE_1, color: CHAT_NAVY,
              '& fieldset': { borderColor: 'transparent' }, '&:hover fieldset': { borderColor: CHAT_BORD },
              '&.Mui-focused fieldset': { borderColor: CHAT_ORANGE, borderWidth: 2 } },
            '& .MuiInputBase-input': { color: CHAT_NAVY, fontSize: 13.5, '&::placeholder': { color: CHAT_SUB, opacity: 1 } },
          }} />
        <IconButton onClick={() => send()} disabled={!text.trim() || sending || !convId}
          sx={{ width: 42, height: 42, bgcolor: text.trim() ? CHAT_ORANGE : CHAT_SURFACE_1, color: text.trim() ? '#fff' : CHAT_SUB,
            borderRadius: '50%', flexShrink: 0, transition: 'background 0.15s ease, transform 0.1s ease',
            '&:hover': { bgcolor: text.trim() ? CHAT_ORANGE_HOV : CHAT_SURFACE_1 },
            '&:active': { transform: 'scale(0.95)' },
            '&:focus-visible': { outline: `2px solid ${CHAT_ORANGE}`, outlineOffset: 2 },
            '&.Mui-disabled': { bgcolor: CHAT_SURFACE_1, color: CHAT_SUB } }}>
          {sending ? <CircularProgress size={17} sx={{ color: CHAT_SUB2 }} /> : <Send sx={{ fontSize: 17 }} />}
        </IconButton>
      </Box>
    </Box>
  );
}

/* ── Page — split desktop (liste persistante + fil), plein écran mobile ─── */
export default function MessagesPage() {
  const { userId: sellerUserId } = useParams();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: { xs: 0, lg: 4 }, px: { xs: 0, lg: 3 } }}>
      <Box sx={{
        width: '100%', maxWidth: 1024, height: { xs: '100vh', lg: 'calc(100vh - 140px)' }, minHeight: { lg: 560 },
        display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '280px 1fr' },
        border: { xs: 'none', lg: `0.5px solid ${CHAT_BORD}` }, borderRadius: { xs: 0, lg: '12px' }, overflow: 'hidden',
      }}>
        <Box sx={{ display: { xs: sellerUserId ? 'none' : 'block', lg: 'block' }, height: '100%', borderRight: { lg: `1px solid ${CHAT_BORD}` } }}>
          <ConvListPanel selectedUserId={sellerUserId} onSelect={(_, otherUserId) => navigate(`/account/messages/${otherUserId}`)} />
        </Box>
        <Box sx={{ display: { xs: sellerUserId ? 'block' : 'none', lg: 'block' }, height: '100%' }}>
          {sellerUserId ? <ChatThread sellerUserId={sellerUserId} /> : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: CHAT_SURFACE_2, gap: 1 }}>
              <ChatBubbleOutline sx={{ fontSize: 34, color: CHAT_SUB }} />
              <Typography sx={{ fontSize: 14, color: CHAT_SUB2 }}>sélectionnez une conversation</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
