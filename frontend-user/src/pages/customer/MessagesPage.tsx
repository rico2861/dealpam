import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, IconButton, CircularProgress, Avatar, alpha, LinearProgress, Tooltip,
} from '@mui/material';
import { ArrowBack, Send, AttachFile, PictureAsPdfOutlined, InsertDriveFileOutlined } from '@mui/icons-material';
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
  const fileRef   = useRef<HTMLInputElement>(null);
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const [convId, setConvId]   = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const send = async (content?: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', mediaUrl?: string) => {
    const body = content ?? text.trim();
    if (!body.trim() || !convId || sending) return;
    setSending(true);
    if (type === 'TEXT') setText('');
    try {
      await api.post(`/chat/conversations/${convId}/messages`, { content: body, type, mediaUrl });
      qc.invalidateQueries({ queryKey: ['conv-messages', convId] });
    } catch {
      enqueueSnackbar('Erreur lors de l\'envoi', { variant: 'error' });
      if (type === 'TEXT') setText(body);
    } finally { setSending(false); }
  };

  const handleFile = async (file: File) => {
    if (!convId) return;
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
      const mediaUrl = isImage ? `chatimg:${data.publicId}` : `chatfile:${data.publicId}:${data.fileName}`;
      await send(file.name, isImage ? 'IMAGE' : 'FILE', mediaUrl);
    } catch {
      enqueueSnackbar('Erreur lors de l\'envoi du fichier', { variant: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const otherParticipant = messages.find((m: any) => m.sender?.id !== user?.id)?.sender ?? sellerProfile;

  return (
    <Box sx={{
      bgcolor: { xs: BG, sm: 'transparent' },
      minHeight: { xs: '100vh', sm: 'auto' },
      display: 'flex', flexDirection: 'column',
      py: { xs: 0, sm: 4 }, px: { xs: 0, sm: 3 },
      alignItems: 'center',
    }}>
      <Box sx={{
        width: '100%', maxWidth: { xs: '100%', sm: 720 },
        height: { xs: 'auto', sm: 'calc(100vh - 140px)' },
        minHeight: { xs: '100vh', sm: 560 },
        display: 'flex', flexDirection: 'column',
        bgcolor: BG,
        borderRadius: { xs: 0, sm: '20px' },
        border: { xs: 'none', sm: `1px solid ${BORD}` },
        boxShadow: { xs: 'none', sm: '0 20px 60px rgba(0,0,0,0.45)' },
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}>

      {/* Header */}
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.8, borderBottom: `1px solid ${BORD}`,
        display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
        <IconButton onClick={() => navigate(-1)}
          sx={{ color: 'rgba(255,255,255,0.5)', bgcolor: CARD, border: `1px solid ${BORD}`,
            borderRadius: '10px', width: 36, height: 36, transition: 'all 0.15s',
            '&:hover': { color: 'white', borderColor: 'rgba(255,255,255,0.2)', transform: 'translateX(-1px)' } }}>
          <ArrowBack sx={{ fontSize: 18 }} />
        </IconButton>
        {otherParticipant ? (
          <>
            <Avatar sx={{ width: 38, height: 38, bgcolor: alpha(OR, 0.15), color: OR, fontSize: 14, fontWeight: 900, border: `1.5px solid ${alpha(OR, 0.2)}` }}>
              {otherParticipant.firstName?.[0]}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} fontSize={14.5} color="white" noWrap>
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
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2,
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 60, height: 60, borderRadius: '18px',
              bgcolor: alpha(OR, 0.08), border: `1px solid ${alpha(OR, 0.18)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Send sx={{ fontSize: 24, color: alpha(OR, 0.5) }} />
            </Box>
            <Typography fontSize={13.5} color="rgba(255,255,255,0.3)">
              Envoyez un message pour démarrer la conversation.
            </Typography>
          </Box>
        ) : (
          messages.map((msg: any) => {
            const isMine = msg.sender?.id === user?.id;
            const isImg  = msg.type === 'IMAGE' && msg.mediaUrl;
            const isFile = msg.type === 'FILE' && msg.mediaUrl;
            return (
              <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                {!isMine && (
                  <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(OR, 0.15), color: OR, fontSize: 11, fontWeight: 900, mr: 1, mt: 0.5, flexShrink: 0 }}>
                    {msg.sender?.firstName?.[0]}
                  </Avatar>
                )}
                <Box sx={{ maxWidth: '72%' }}>
                  <Box sx={{
                    px: isImg ? 0.8 : 1.8, py: isImg ? 0.8 : 1.1,
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    bgcolor: isMine ? OR : CARD,
                    border: isMine ? 'none' : `1px solid ${BORD}`,
                    overflow: 'hidden',
                  }}>
                    {isImg && (
                      <Box
                        component="img" src={msg.mediaUrl} alt="" loading="lazy"
                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                        sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: '12px', display: 'block', cursor: 'pointer', objectFit: 'cover' }}
                      />
                    )}
                    {isFile && (
                      <Box component="a" href={msg.mediaUrl} target="_blank" rel="noopener"
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', px: 1, py: 0.3 }}>
                        {/\.pdf($|\?)/i.test(msg.mediaUrl)
                          ? <PictureAsPdfOutlined sx={{ fontSize: 22, color: isMine ? 'white' : '#F87171', flexShrink: 0 }} />
                          : <InsertDriveFileOutlined sx={{ fontSize: 22, color: isMine ? 'white' : '#93C5FD', flexShrink: 0 }} />}
                        <Typography fontSize={13} fontWeight={600} color={isMine ? 'white' : 'rgba(255,255,255,0.85)'} sx={{ wordBreak: 'break-all' }}>
                          {msg.content}
                        </Typography>
                      </Box>
                    )}
                    {!isImg && !isFile && (
                      <Typography fontSize={13.5} color={isMine ? 'white' : 'rgba(255,255,255,0.8)'} lineHeight={1.5}>
                        {msg.content}
                      </Typography>
                    )}
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

      {/* Upload progress */}
      {uploading && (
        <LinearProgress variant="determinate" value={uploadProgress}
          sx={{ flexShrink: 0, bgcolor: CARD, '& .MuiLinearProgress-bar': { bgcolor: OR } }} />
      )}

      {/* Input */}
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: `1px solid ${BORD}`, flexShrink: 0,
        bgcolor: 'rgba(255,255,255,0.02)', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <input
          ref={fileRef} type="file" accept="image/*,.pdf,.doc,.docx,.xlsx"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }}
        />
        <Tooltip title="Joindre un fichier ou une image">
          <span>
            <IconButton
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !convId}
              sx={{
                width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                color: 'rgba(255,255,255,0.4)', bgcolor: CARD, border: `1px solid ${BORD}`,
                '&:hover': { color: OR, borderColor: alpha(OR, 0.4), bgcolor: alpha(OR, 0.08) },
              }}>
              <AttachFile sx={{ fontSize: 19 }} />
            </IconButton>
          </span>
        </Tooltip>
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
        <IconButton onClick={() => send()} disabled={!text.trim() || sending || !convId}
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
    </Box>
  );
}
