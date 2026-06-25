import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary:   { main: '#2563EB', light: '#3B82F6', dark: '#1D4ED8', contrastText: '#fff' },
    secondary: { main: '#0F172A', light: '#1E293B', dark: '#020617',  contrastText: '#fff' },
    error:     { main: '#EF4444' },
    warning:   { main: '#F59E0B' },
    success:   { main: '#10B981' },
    background:{ default: '#F1F5F9', paper: '#FFFFFF' },
    text:      { primary: '#0F172A', secondary: '#64748B' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06)',
    '0 2px 8px rgba(0,0,0,0.08)',
    '0 4px 16px rgba(0,0,0,0.10)',
    '0 8px 24px rgba(0,0,0,0.12)',
    '0 12px 32px rgba(0,0,0,0.14)',
    ...Array(19).fill('none'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingTop: 10, paddingBottom: 10, fontSize: 14, fontWeight: 600 },
        contained: { boxShadow: '0 2px 8px rgba(37,99,235,0.25)', '&:hover': { boxShadow: '0 4px 16px rgba(37,99,235,0.35)', transform: 'translateY(-1px)', transition: 'all 0.2s ease' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s, transform 0.2s', '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { '& .MuiOutlinedInput-root': { borderRadius: 10 } } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiAppBar: {
      styleOverrides: { root: { boxShadow: '0 1px 0 rgba(0,0,0,0.08)' } },
    },
  },
});

export default theme;
