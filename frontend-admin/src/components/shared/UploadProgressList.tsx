import { useEffect, useState } from 'react';
import { Box, Typography, IconButton, LinearProgress } from '@mui/material';
import { Close, Refresh, CheckCircle, ErrorOutline, InsertDriveFileOutlined } from '@mui/icons-material';
import type { UploadItem } from '../../hooks/useFileUploads';

const OR = '#F5711A', GRN = '#116B57', RED = '#E8432E', TXT = '#0F1B2E', SUB = '#888780';

function Row({ item, onCancel, onRetry, onDismiss }: {
  item: UploadItem; onCancel: () => void; onRetry: () => void; onDismiss: () => void;
}) {
  // Confirmation de succès affichée brièvement avant disparition automatique.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (item.status === 'success') {
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }
  }, [item.status]);
  useEffect(() => { if (!visible) onDismiss(); }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <Box role="status" aria-live="polite" sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, p: 1.2, borderRadius: '10px', bgcolor: '#F5F5F3', border: '1px solid rgba(15,27,46,0.08)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InsertDriveFileOutlined sx={{ fontSize: 16, color: SUB, flexShrink: 0 }} />
        <Typography fontSize={12.5} color={TXT} sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.file.name}
        </Typography>
        {item.status === 'uploading' && (
          <>
            <Typography fontSize={11.5} color={SUB} fontWeight={600}>{item.progress}%</Typography>
            <IconButton size="small" onClick={onCancel} aria-label="Annuler l'envoi"><Close sx={{ fontSize: 14 }} /></IconButton>
          </>
        )}
        {item.status === 'success' && <CheckCircle sx={{ fontSize: 17, color: GRN }} />}
        {item.status === 'error' && (
          <>
            <IconButton size="small" onClick={onRetry} aria-label="Réessayer l'envoi"><Refresh sx={{ fontSize: 15, color: OR }} /></IconButton>
            <IconButton size="small" onClick={onDismiss} aria-label="Retirer"><Close sx={{ fontSize: 14 }} /></IconButton>
          </>
        )}
      </Box>
      {item.status === 'uploading' && (
        <LinearProgress variant="determinate" value={item.progress}
          sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(15,27,46,0.08)', '& .MuiLinearProgress-bar': { bgcolor: OR, borderRadius: 2 } }} />
      )}
      {item.status === 'error' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ErrorOutline sx={{ fontSize: 13, color: RED }} />
          <Typography fontSize={11} color={RED}>{item.error || "Échec de l'envoi — réessayez"}</Typography>
        </Box>
      )}
    </Box>
  );
}

export default function UploadProgressList({ items, onCancel, onRetry, onDismiss }: {
  items: UploadItem[];
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 1 }}>
      {items.map(item => (
        <Row key={item.id} item={item}
          onCancel={() => onCancel(item.id)}
          onRetry={() => onRetry(item.id)}
          onDismiss={() => onDismiss(item.id)} />
      ))}
    </Box>
  );
}
