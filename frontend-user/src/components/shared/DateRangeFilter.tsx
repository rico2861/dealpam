import { useEffect } from 'react';
import { Box, Typography } from '@mui/material';

// Sur certains navigateurs mobiles (Chrome/Safari Android/iOS), la petite icone
// calendrier native de <input type="date"> peut s'afficher blanche (suivant le
// mode sombre du systeme) meme quand color-scheme:light est force sur l'input
// lui-meme — elle devient alors invisible sur le fond blanc du champ. Cette
// regle force l'icone a un gris visible, quel que soit le mode systeme.
function injectDateInputCss() {
  if (typeof document === 'undefined' || document.getElementById('dp-date-input-css')) return;
  const el = document.createElement('style');
  el.id = 'dp-date-input-css';
  el.textContent = `
    input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); opacity: 1; cursor: pointer; }
    input[type="date"] { color-scheme: light; }
  `;
  document.head.appendChild(el);
}

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onReset?: () => void;
  textColor?: string;
  subColor?: string;
  borderColor?: string;
}

// Champs date natifs partagés par tous les filtres "période" de l'app (commandes,
// produits, wallet, rendez-vous, statistiques...). Remplace des <input type="date">
// dupliqués dans chaque page, qui débordaient/s'écrasaient sur mobile (les deux champs
// + le "à" ne rentraient plus dans la largeur de l'écran) et dont le rendu natif du
// picker pouvait passer en blanc-sur-blanc sur certains navigateurs mobiles qui
// ignorent le color-scheme:light déclaré au niveau du document pour les form controls.
export default function DateRangeFilter({
  from, to, onFromChange, onToChange, onReset,
  textColor = '#0F172A', subColor = '#64748B', borderColor = 'rgba(15,23,42,0.09)',
}: DateRangeFilterProps) {
  useEffect(() => { injectDateInputCss(); }, []);

  const inputStyle: React.CSSProperties = {
    fontSize: 13, color: textColor, border: `1px solid ${borderColor}`, borderRadius: 8,
    padding: '8px 10px', background: '#FFFFFF', colorScheme: 'light',
    minWidth: 0, width: '100%', fontFamily: 'inherit',
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.8,
        width: { xs: '100%', sm: 'auto' },
        '& input': { flex: { xs: 1, sm: 'initial' }, maxWidth: { xs: 'none', sm: 150 } },
      }}>
        <input type="date" value={from} onChange={e => onFromChange(e.target.value)} style={inputStyle} />
        <Typography sx={{ fontSize: 12, color: subColor, flexShrink: 0 }}>à</Typography>
        <input type="date" value={to} onChange={e => onToChange(e.target.value)} style={inputStyle} />
      </Box>
      {onReset && (from || to) && (
        <Typography onClick={onReset}
          sx={{ fontSize: 11.5, color: subColor, cursor: 'pointer', textDecoration: 'underline', flexShrink: 0, '&:hover': { color: textColor } }}>
          Réinitialiser
        </Typography>
      )}
    </Box>
  );
}
