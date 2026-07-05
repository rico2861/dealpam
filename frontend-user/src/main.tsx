import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import CustomSnackbar from './components/shared/CustomSnackbar';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import App from './App';
import theme from './theme';
import './index.css';

// Sur mobile, "bottom-right" chevauche la barre de navigation fixe et le bouton
// de chat flottant — on affiche donc les notifications en haut, centrées, en dessous
// de 600px, et on garde le classique bas-droite sur desktop.
function AppSnackbarProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={isMobile ? { vertical: 'top', horizontal: 'center' } : { vertical: 'bottom', horizontal: 'right' }}
      Components={{ success: CustomSnackbar, error: CustomSnackbar, info: CustomSnackbar, warning: CustomSnackbar }}
    >
      {children}
    </SnackbarProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min — serve from cache without re-fetching
      gcTime:    30 * 60 * 1000,  // 30 min — keep inactive data in memory
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AppSnackbarProvider>
          <App />
        </AppSnackbarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
