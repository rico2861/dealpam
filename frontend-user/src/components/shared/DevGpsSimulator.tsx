import { useState } from 'react';
import { Box, Typography, TextField, Button, IconButton, Chip, alpha } from '@mui/material';
import { GpsFixed, Close, ExpandMore, ExpandLess } from '@mui/icons-material';
import { setDevGps, clearDevGps } from '../../hooks/useGeo';

// Only rendered in dev mode (caller checks import.meta.env.DEV)
const PRESETS = [
  { city: 'Montréal',   lat: 45.5017, lng: -73.5673 },
  { city: 'Paris',      lat: 48.8566, lng: 2.3522   },
  { city: 'Casablanca', lat: 33.5731, lng: -7.5898  },
  { city: 'Dakar',      lat: 14.7167, lng: -17.4677 },
  { city: 'Genève',     lat: 46.2044, lng: 6.1432   },
  { city: 'Port-au-Prince', lat: 18.5944, lng: -72.3074 },
];

export default function DevGpsSimulator() {
  const [open, setOpen] = useState(false);
  const [lat,  setLat]  = useState('');
  const [lng,  setLng]  = useState('');
  const [city, setCity] = useState('');
  const [active, setActive] = useState('');

  const apply = (l: number, n: number, c: string) => {
    setDevGps(l, n, c);
    setActive(c);
    setLat(String(l));
    setLng(String(n));
    setCity(c);
  };

  const reset = () => {
    clearDevGps();
    setActive('');
    setLat(''); setLng(''); setCity('');
  };

  return (
    <Box sx={{
      position: 'fixed', bottom: 70, left: 8, zIndex: 9999,
      bgcolor: '#1E293B', borderRadius: 2.5, border: '1px solid rgba(255,165,0,0.5)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: 220,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
        bgcolor: 'rgba(255,165,0,0.12)', borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
        <GpsFixed sx={{ fontSize: 14, color: '#FFA500' }} />
        <Typography fontSize={11.5} fontWeight={700} color="#FFA500" sx={{ flex: 1 }}>
          Dev GPS {active ? `· ${active}` : ''}
        </Typography>
        <IconButton size="small" onClick={() => setOpen(p => !p)} sx={{ p: 0.3, color: '#94A3B8' }}>
          {open ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
        </IconButton>
      </Box>

      {open && (
        <Box sx={{ p: 1.5 }}>
          {/* Presets */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {PRESETS.map(p => (
              <Chip key={p.city} label={p.city} size="small" clickable
                onClick={() => apply(p.lat, p.lng, p.city)}
                sx={{ height: 20, fontSize: 10.5, fontWeight: 600,
                  bgcolor: active === p.city ? '#FFA500' : 'rgba(255,255,255,0.08)',
                  color:   active === p.city ? '#111'    : '#CBD5E1',
                  '&:hover': { bgcolor: alpha('#FFA500', 0.7), color: '#111' } }} />
            ))}
          </Box>

          {/* Custom coords */}
          <Box sx={{ display: 'flex', gap: 0.8, mb: 1 }}>
            <TextField size="small" label="Lat" value={lat} onChange={e => setLat(e.target.value)}
              sx={{ flex: 1, input: { color: 'white', fontSize: 12 }, label: { color: '#94A3B8', fontSize: 12 },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } } }} />
            <TextField size="small" label="Lng" value={lng} onChange={e => setLng(e.target.value)}
              sx={{ flex: 1, input: { color: 'white', fontSize: 12 }, label: { color: '#94A3B8', fontSize: 12 },
                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } } }} />
          </Box>
          <TextField fullWidth size="small" label="Ville" value={city} onChange={e => setCity(e.target.value)}
            sx={{ mb: 1, input: { color: 'white', fontSize: 12 }, label: { color: '#94A3B8', fontSize: 12 },
              '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' } } }} />

          <Box sx={{ display: 'flex', gap: 0.8 }}>
            <Button fullWidth size="small" onClick={() => apply(parseFloat(lat), parseFloat(lng), city)}
              disabled={!lat || !lng}
              sx={{ bgcolor: '#FFA500', color: '#111', fontWeight: 700, fontSize: 11, borderRadius: 1.5,
                '&:hover': { bgcolor: '#FFB733' }, '&:disabled': { opacity: 0.4 } }}>
              Appliquer
            </Button>
            <Button size="small" onClick={reset}
              sx={{ color: '#94A3B8', fontSize: 11, borderRadius: 1.5, minWidth: 60,
                border: '1px solid rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
              Reset
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
