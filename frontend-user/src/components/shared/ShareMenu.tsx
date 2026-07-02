import { useState, useRef } from 'react';
import { IconButton, Popover, Box, Typography, Tooltip, alpha } from '@mui/material';
import { Share, ContentCopy, WhatsApp, Facebook, Check } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface Props {
  url?: string;
  title?: string;
  size?: 'small' | 'medium';
}

const ORANGE = '#FF6B00';

export default function ShareMenu({ url, title, size = 'small' }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const targetUrl = url || window.location.href;
  const shareTitle = title || document.title;

  const handleShare = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if ('share' in navigator) {
      (navigator as any).share({ title: shareTitle, url: targetUrl }).catch(() => {});
    } else {
      setAnchor(e.currentTarget);
    }
  };

  const copyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (navigator as any).clipboard?.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    enqueueSnackbar('Lien copié !', { variant: 'info', autoHideDuration: 1800 });
    setAnchor(null);
  };

  const options = [
    {
      label: copied ? 'Copié !' : 'Copier le lien',
      icon: copied ? <Check sx={{ fontSize: 16, color: '#10B981' }} /> : <ContentCopy sx={{ fontSize: 16 }} />,
      onClick: copyLink,
    },
    {
      label: 'WhatsApp',
      icon: <WhatsApp sx={{ fontSize: 16, color: '#25D366' }} />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + '\n' + targetUrl)}`, '_blank');
        setAnchor(null);
      },
    },
    {
      label: 'Facebook',
      icon: <Facebook sx={{ fontSize: 16, color: '#1877F2' }} />,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`, '_blank');
        setAnchor(null);
      },
    },
  ];

  return (
    <>
      <Tooltip title="Partager" arrow>
        <IconButton
          ref={btnRef}
          size={size}
          onClick={handleShare}
          sx={{
            p: size === 'small' ? 0.5 : 0.8,
            bgcolor: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(0,0,0,0.08)',
            '&:hover': { bgcolor: alpha(ORANGE, 0.06), borderColor: alpha(ORANGE, 0.25) },
            transition: 'all 0.2s',
          }}
        >
          <Share sx={{ fontSize: size === 'small' ? 16 : 20, color: '#64748B' }} />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 2.5, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #E5E7EB', mt: 0.5 } }}
        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      >
        <Box sx={{ py: 0.8, minWidth: 180 }}>
          <Typography fontSize={11} fontWeight={700} color="#94A3B8" px={2} py={0.5} textTransform="uppercase" letterSpacing={0.5}>
            Partager
          </Typography>
          {options.map(({ label, icon, onClick }) => (
            <Box key={label} onClick={onClick}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
                cursor: 'pointer', '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 0.12s' }}>
              {icon}
              <Typography fontSize={13.5} fontWeight={500}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}
