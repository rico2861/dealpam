import { forwardRef } from 'react';
import { SnackbarContent, CustomContentProps, useSnackbar } from 'notistack';
import { Box, Typography, IconButton, alpha } from '@mui/material';
import { Close, CheckCircle, ErrorOutline, InfoOutlined, WarningAmber } from '@mui/icons-material';

const VARIANTS = {
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  Icon: CheckCircle   },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   Icon: ErrorOutline  },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  Icon: WarningAmber  },
  info:    { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  Icon: InfoOutlined  },
};

const CustomSnackbar = forwardRef<HTMLDivElement, CustomContentProps>(
  ({ id, message, variant }, ref) => {
    const { closeSnackbar } = useSnackbar();
    const v = VARIANTS[variant as keyof typeof VARIANTS] ?? VARIANTS.info;
    const { color, bg, border, Icon } = v;

    return (
      <SnackbarContent ref={ref}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 1.4, borderRadius: '14px',
          bgcolor: '#0D1424',
          border: `1px solid ${border}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${alpha(color, 0.08)}`,
          backdropFilter: 'blur(12px)',
          minWidth: 280, maxWidth: 420,
        }}>
          {/* Icon dot */}
          <Box sx={{
            flexShrink: 0, width: 32, height: 32, borderRadius: '10px',
            bgcolor: alpha(color, 0.12), border: `1px solid ${alpha(color, 0.2)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: 17, color }} />
          </Box>

          {/* Message */}
          <Typography flex={1} fontSize={13.5} fontWeight={600}
            color="rgba(255,255,255,0.85)" lineHeight={1.4}>
            {message}
          </Typography>

          {/* Close */}
          <IconButton size="small" onClick={() => closeSnackbar(id)}
            sx={{ flexShrink: 0, color: 'rgba(255,255,255,0.25)', ml: 0.5,
              width: 24, height: 24, borderRadius: '7px',
              '&:hover': { color: 'rgba(255,255,255,0.6)', bgcolor: 'rgba(255,255,255,0.07)' } }}>
            <Close sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </SnackbarContent>
    );
  }
);

CustomSnackbar.displayName = 'CustomSnackbar';
export default CustomSnackbar;
