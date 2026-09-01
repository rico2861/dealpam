import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress, alpha } from '@mui/material';
import { CheckCircle, ErrorOutline, WorkspacePremium } from '@mui/icons-material';

const API = import.meta.env.VITE_API_URL;
const BG = '#0B0F1A';

type Phase = 'checking' | 'confirmed' | 'pending' | 'error';

interface VerifyResult {
  appTag: string;
  appName: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  planType?: string;
  amountHtg?: number;
  customerName?: string;
  redirectUrl: string;
}

// Page de retour MonCash PARTAGÉE : d'autres apps (ex. PeguyTBN) gardent leur
// propre compte marchand MonCash mais pointent leur URL de retour ici
// (voir backend/src/modules/cross-app-payments). Pendant que le backend
// confirme le paiement auprès de l'app d'origine, on affiche un état de
// traitement animé (pas de header/footer DealPam — un client PeguyTBN n'a
// souvent aucune session DealPam), puis on redirige vers la page d'accueil
// propre à cette app.
export default function CrossAppPaymentReturnPage() {
  const { appTag } = useParams<{ appTag: string }>();
  const { search } = useLocation();
  const [phase, setPhase] = useState<Phase>('checking');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string>('');
  const attemptsRef = useRef(0);

  useEffect(() => {
    const transactionId = new URLSearchParams(search).get('transactionId');
    if (!transactionId || !appTag) {
      setPhase('error');
      setError('Lien de retour incomplet.');
      return;
    }
    // Nettoie l'URL tout de suite — un rechargement/retour arrière ne doit
    // pas rejouer la vérification depuis l'URL (le backend est de toute
    // façon idempotent, mais autant éviter l'appel réseau inutile).
    window.history.replaceState({}, '', `/payments/return/${appTag}`);

    let cancelled = false;
    async function verify() {
      attemptsRef.current += 1;
      try {
        const res = await fetch(`${API}/payments/cross-app/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appTag, transactionId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setPhase('error');
          setError(data?.message || "Impossible de vérifier ce paiement.");
          return;
        }
        setResult(data);
        if (data.status === 'CONFIRMED') {
          setPhase('confirmed');
          setTimeout(() => { if (!cancelled) window.location.href = data.redirectUrl; }, 1800);
        } else if (data.status === 'PENDING' && attemptsRef.current < 5) {
          setPhase('pending');
          setTimeout(() => { if (!cancelled) verify(); }, 3000);
        } else {
          setPhase(data.status === 'PENDING' ? 'pending' : 'error');
          if (data.status !== 'PENDING') setError("Le paiement n'a pas pu être confirmé.");
        }
      } catch {
        if (!cancelled) {
          setPhase('error');
          setError('Erreur réseau — réessayez dans un instant.');
        }
      }
    }
    verify();
    return () => { cancelled = true; };
  }, [appTag, search]);

  return (
    <Box sx={{
      bgcolor: BG, minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', px: 2, color: '#fff',
    }}>
      <Box sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {phase === 'checking' && (
          <>
            <CircularProgress sx={{ color: '#7C3AED', mb: 3 }} size={48} thickness={4} />
            <Typography fontWeight={800} fontSize={19} mb={1}>Vérification du paiement…</Typography>
            <Typography fontSize={13.5} color="rgba(255,255,255,0.6)">
              Un instant, on confirme votre transaction auprès de {appTag}.
            </Typography>
          </>
        )}

        {phase === 'pending' && (
          <>
            <CircularProgress sx={{ color: '#F59E0B', mb: 3 }} size={48} thickness={4} />
            <Typography fontWeight={800} fontSize={19} mb={1}>Paiement en cours de confirmation…</Typography>
            <Typography fontSize={13.5} color="rgba(255,255,255,0.6)">
              Ça peut prendre quelques secondes de plus — merci de patienter.
            </Typography>
          </>
        )}

        {phase === 'confirmed' && result && (
          <>
            <Box sx={{
              width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
              bgcolor: alpha('#10B981', 0.15), border: `1.5px solid ${alpha('#10B981', 0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle sx={{ fontSize: 40, color: '#10B981' }} />
            </Box>
            <Typography fontWeight={900} fontSize={22} mb={1}>
              {result.customerName ? `Merci ${result.customerName} !` : 'Paiement confirmé !'}
            </Typography>
            <Typography fontSize={13.5} color="rgba(255,255,255,0.6)" mb={2}>
              Votre accès {result.appName} {result.planType ? `(${result.planType})` : ''} est activé.
            </Typography>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: '12px', bgcolor: alpha('#7C3AED', 0.15) }}>
              <WorkspacePremium sx={{ fontSize: 16, color: '#A78BFA' }} />
              <Typography fontSize={12.5} color="#A78BFA">Redirection vers {result.appName}…</Typography>
            </Box>
          </>
        )}

        {phase === 'error' && (
          <>
            <Box sx={{
              width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
              bgcolor: alpha('#EF4444', 0.15), border: `1.5px solid ${alpha('#EF4444', 0.4)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ErrorOutline sx={{ fontSize: 40, color: '#EF4444' }} />
            </Box>
            <Typography fontWeight={900} fontSize={20} mb={1}>Vérification impossible</Typography>
            <Typography fontSize={13.5} color="rgba(255,255,255,0.6)">
              {error || 'Une erreur est survenue.'} Contactez le support si le montant a bien été débité.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
