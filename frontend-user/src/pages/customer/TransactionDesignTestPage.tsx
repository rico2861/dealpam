import { useLocation } from 'react-router-dom';
import { Box, Typography, alpha } from '@mui/material';
import { CheckCircle, WorkspacePremium, HelpOutline } from '@mui/icons-material';

const BG = '#F7F8FA';

/**
 * Page de test : lit ?transactionId=... dans l'URL et affiche un design
 * different selon le prefixe de la valeur. Sert uniquement a valider les
 * designs avant de les brancher sur le vrai flux de paiement.
 *
 * Exemples a essayer :
 *  /test/transaction-design?transactionId=deal_pam-abc123
 *  /test/transaction-design?transactionId=predict-abc123
 *  /test/transaction-design?transactionId=autrechose-abc123
 */
export default function TransactionDesignTestPage() {
  const { search } = useLocation();
  const transactionId = new URLSearchParams(search).get('transactionId') ?? '';

  let design: 'dealpam' | 'predict' | 'unknown' = 'unknown';
  if (transactionId.startsWith('deal_pam')) design = 'dealpam';
  else if (transactionId.startsWith('predict')) design = 'predict';

  return (
    <Box sx={{ bgcolor: BG, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 6 }}>
      <Box sx={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <Typography fontSize={12} color="#94A3B8" mb={3}>
          transactionId reçu : <Box component="span" fontFamily="monospace">{transactionId || '(aucun)'}</Box>
        </Typography>

        {design === 'dealpam' && <DealPamDesign />}
        {design === 'predict' && <PredictDesign />}
        {design === 'unknown' && <UnknownDesign />}
      </Box>
    </Box>
  );
}

function DealPamDesign() {
  const OR = '#FF6B00';
  return (
    <Box sx={{ bgcolor: '#FFFFFF', border: `1px solid rgba(15,23,42,0.09)`, boxShadow: '0 2px 12px rgba(15,23,42,0.05)', borderRadius: '20px', px: 3, py: 4 }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: alpha(OR, 0.1), border: `1.5px solid ${alpha(OR, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
        <CheckCircle sx={{ fontSize: 36, color: OR }} />
      </Box>
      <Typography fontWeight={900} fontSize={22} color="#0F172A" mb={1}>Design DealPam</Typography>
      <Typography fontSize={13.5} color="#64748B">Confirmation d'achat marketplace — style orange/marché.</Typography>
    </Box>
  );
}

function PredictDesign() {
  const PURP = '#7C3AED';
  return (
    <Box sx={{ bgcolor: '#0F172A', border: `1px solid rgba(255,255,255,0.08)`, boxShadow: '0 2px 20px rgba(0,0,0,0.3)', borderRadius: '20px', px: 3, py: 4 }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: alpha(PURP, 0.18), border: `1.5px solid ${alpha(PURP, 0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
        <WorkspacePremium sx={{ fontSize: 36, color: PURP }} />
      </Box>
      <Typography fontWeight={900} fontSize={22} color="#FFFFFF" mb={1}>Design Predict</Typography>
      <Typography fontSize={13.5} color="rgba(255,255,255,0.6)">Confirmation style sombre — pour un contexte pronostics/predict.</Typography>
    </Box>
  );
}

function UnknownDesign() {
  return (
    <Box sx={{ bgcolor: '#FFFFFF', border: `1px dashed rgba(15,23,42,0.2)`, borderRadius: '20px', px: 3, py: 4 }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
        <HelpOutline sx={{ fontSize: 36, color: '#94A3B8' }} />
      </Box>
      <Typography fontWeight={900} fontSize={22} color="#0F172A" mb={1}>Préfixe inconnu</Typography>
      <Typography fontSize={13.5} color="#64748B">Aucun design ne correspond à ce transactionId.</Typography>
    </Box>
  );
}
