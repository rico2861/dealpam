import { useState } from 'react';
import { Box, Typography, Button, Select, MenuItem, IconButton } from '@mui/material';
import { GpsFixed, Close } from '@mui/icons-material';
import { useLocationStore } from '../../store/location.store';
import { HAITI_DEPARTMENTS } from '../../data/haiti-locations';

// Villes principales avec coordonnées pour la simulation
const SIM_CITIES = HAITI_DEPARTMENTS.flatMap((dept) =>
  dept.cities.slice(0, 3).map((city) => ({
    label: `${city.name} (${dept.name})`,
    department: dept.name,
    city: city.name,
    lat: city.lat,
    lng: city.lng,
  }))
);

export default function GpsSimulator() {
  const { setLocation } = useLocationStore();
  const [selected, setSelected] = useState(SIM_CITIES[0].label);
  const [open, setOpen] = useState(false);

  const handleSimulate = () => {
    const entry = SIM_CITIES.find((c) => c.label === selected);
    if (!entry) return;
    setLocation({
      department: entry.department,
      city: entry.city,
      source: 'gps',
      lat: entry.lat,
      lng: entry.lng,
    });
  };

  const handleReset = () => {
    setLocation(null);
  };

  if (!open) {
    return (
      <Box
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed', bottom: 16, left: 16, zIndex: 9999,
          width: 42, height: 42, borderRadius: '50%',
          bgcolor: '#1E293B', color: '#FF6B00',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          border: '2px solid #FF6B00',
          '&:hover': { bgcolor: '#334155' },
          transition: 'background 0.2s',
        }}
        title="GPS Simulator (DEV)"
      >
        <GpsFixed sx={{ fontSize: 20 }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      position: 'fixed', bottom: 16, left: 16, zIndex: 9999,
      bgcolor: '#1E293B', border: '1px solid #334155',
      borderRadius: '12px', p: 2, minWidth: 280,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <GpsFixed sx={{ fontSize: 16, color: '#FF6B00' }} />
          <Typography fontSize={12} fontWeight={700} color="white">GPS Simulator</Typography>
          <Box sx={{ bgcolor: '#EF4444', color: 'white', fontSize: 9, fontWeight: 700,
            borderRadius: '4px', px: '5px', py: '1px' }}>DEV</Box>
        </Box>
        <IconButton size="small" onClick={() => setOpen(false)}
          sx={{ color: '#64748B', p: 0.4, '&:hover': { color: 'white' } }}>
          <Close sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {/* Select */}
      <Select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        size="small"
        fullWidth
        sx={{
          bgcolor: '#0F172A', color: 'white', fontSize: 12, mb: 1.5,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
          '& .MuiSvgIcon-root': { color: '#64748B' },
        }}
      >
        {SIM_CITIES.map((c) => (
          <MenuItem key={c.label} value={c.label} sx={{ fontSize: 12 }}>
            {c.label}
          </MenuItem>
        ))}
      </Select>

      {/* Buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSimulate}
          startIcon={<GpsFixed sx={{ fontSize: 14 }} />}
          sx={{
            flex: 1, bgcolor: '#FF6B00', color: 'white', fontSize: 11,
            fontWeight: 700, textTransform: 'none', borderRadius: '8px',
            '&:hover': { bgcolor: '#E05A00' },
          }}
        >
          Simuler
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={handleReset}
          sx={{
            flex: 1, color: '#64748B', borderColor: '#334155', fontSize: 11,
            fontWeight: 700, textTransform: 'none', borderRadius: '8px',
            '&:hover': { borderColor: '#64748B', color: 'white' },
          }}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
}
