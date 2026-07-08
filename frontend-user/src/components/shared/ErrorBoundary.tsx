import { Component, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { RefreshOutlined, ErrorOutline } from '@mui/icons-material';

const OR = '#FF6B00';

interface Props { children: ReactNode }
interface State { hasError: boolean }

// Aucune protection de ce type n'existait avant — une exception au rendu
// (donnée inattendue, composant cassé...) démontait tout l'arbre React sans
// rien afficher à la place, ce qui se voit comme une page/design "cassé"
// après un refresh, sans aucun indice pour l'utilisateur ni pour nous.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Erreur applicative interceptée par ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box sx={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2, p: 3,
        bgcolor: '#F7F8FA', textAlign: 'center',
      }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '18px', bgcolor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ErrorOutline sx={{ fontSize: 30, color: '#EF4444' }} />
        </Box>
        <Typography fontWeight={800} fontSize={18} color="#0F172A">Un problème est survenu</Typography>
        <Typography fontSize={13.5} color="#64748B" maxWidth={360}>
          Quelque chose s'est mal affiché. Rechargez la page pour continuer — vos données ne sont pas perdues.
        </Typography>
        <Button onClick={() => window.location.reload()} startIcon={<RefreshOutlined sx={{ fontSize: 18 }} />}
          sx={{ mt: 1, bgcolor: OR, color: '#fff', borderRadius: '12px', fontWeight: 700, px: 3, py: 1.2,
            textTransform: 'none', '&:hover': { bgcolor: '#E05A00' } }}>
          Recharger la page
        </Button>
      </Box>
    );
  }
}
