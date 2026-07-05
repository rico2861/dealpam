import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Slide, Dialog, DialogContent, IconButton, Switch, Divider,
} from '@mui/material';
import { Cookie, Close, Shield, BarChart, Campaign } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const ORANGE = '#FF6B00';
const BG     = '#0A0F1C';
const CARD   = 'rgba(255,255,255,0.03)';
const BORD   = 'rgba(255,255,255,0.09)';

const CONSENT_KEY = 'dp_cookie_consent';
// Bump this whenever the cookie/privacy policy changes materially — it forces
// the banner to reappear for users who already answered under an older policy.
const POLICY_VERSION = 1;

export type ConsentChoice = 'accepted' | 'refused' | 'custom';

interface StoredConsent {
  choice: ConsentChoice;
  version: number;
  categories: { analytics: boolean; marketing: boolean };
  date: string;
}

function readConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== POLICY_VERSION) return null; // policy updated → ask again
    return parsed;
  } catch {
    return null;
  }
}

export function getCookieConsent(): StoredConsent | null {
  return readConsent();
}

function writeConsent(choice: ConsentChoice, categories: { analytics: boolean; marketing: boolean }) {
  const payload: StoredConsent = { choice, version: POLICY_VERSION, categories, date: new Date().toISOString() };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(payload)); } catch {}
}

function Category({ icon, title, desc, checked, locked, onChange }: {
  icon: React.ReactNode; title: string; desc: string; checked: boolean; locked?: boolean; onChange?: (v: boolean) => void;
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.8,
      borderRadius: '14px', bgcolor: CARD, border: `1px solid ${BORD}`,
    }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
        bgcolor: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: 'white', mb: 0.3 }}>{title}</Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{desc}</Typography>
      </Box>
      <Switch
        checked={checked}
        disabled={locked}
        onChange={e => onChange?.(e.target.checked)}
        sx={{
          flexShrink: 0,
          '& .MuiSwitch-switchBase.Mui-checked': { color: ORANGE },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: ORANGE, opacity: 0.5 },
          '& .MuiSwitch-switchBase.Mui-disabled': { color: 'rgba(255,255,255,0.35)' },
        }}
      />
    </Box>
  );
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    if (!readConsent()) {
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = (choice: ConsentChoice, categories: { analytics: boolean; marketing: boolean }) => {
    writeConsent(choice, categories);
    setDetailsOpen(false);
    setVisible(false);
  };

  const acceptAll  = () => finish('accepted', { analytics: true, marketing: true });
  const refuseAll  = () => finish('refused', { analytics: false, marketing: false });
  const saveCustom = () => finish('custom', { analytics, marketing });

  return (
    <>
      <Slide direction="up" in={visible && !detailsOpen} mountOnEnter unmountOnExit>
        <Box sx={{
          position: 'fixed', bottom: { xs: 0, sm: 20 }, left: { xs: 0, sm: 20 }, right: { xs: 0, sm: 'auto' },
          zIndex: 2000,
          width: { xs: '100%', sm: 440 },
          bgcolor: BG,
          border: { xs: 'none', sm: `1px solid ${BORD}` },
          borderTop: `1px solid ${BORD}`,
          borderRadius: { xs: 0, sm: '18px' },
          boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
          p: { xs: 2.5, sm: 3 },
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
              bgcolor: 'rgba(255,107,0,0.12)', border: '1px solid rgba(255,107,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Cookie sx={{ fontSize: 19, color: ORANGE }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'white', mb: 0.4 }}>
                Nous respectons votre vie privée
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                DealPam utilise des cookies essentiels au fonctionnement du site, ainsi que des cookies analytiques
                et marketing optionnels pour améliorer votre expérience. Vous pouvez tout accepter, tout refuser,
                ou personnaliser vos choix.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 1.2 }}>
            <Button
              fullWidth onClick={refuseAll}
              sx={{
                py: 1.1, borderRadius: '12px', fontWeight: 700, fontSize: 12.5,
                color: 'rgba(255,255,255,0.6)', border: `1px solid ${BORD}`,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)', color: 'white' },
              }}
            >
              Refuser
            </Button>
            <Button
              fullWidth onClick={acceptAll}
              sx={{
                py: 1.1, borderRadius: '12px', fontWeight: 800, fontSize: 12.5, color: 'white',
                background: `linear-gradient(135deg,${ORANGE},#D95500)`,
                boxShadow: '0 6px 20px rgba(255,107,0,0.35)',
                '&:hover': { boxShadow: '0 8px 26px rgba(255,107,0,0.45)', transform: 'translateY(-1px)' },
                transition: 'all 0.15s',
              }}
            >
              Tout accepter
            </Button>
          </Box>

          <Button
            fullWidth onClick={() => setDetailsOpen(true)}
            sx={{
              py: 0.9, borderRadius: '10px', fontWeight: 700, fontSize: 12,
              color: ORANGE, '&:hover': { bgcolor: 'rgba(255,107,0,0.06)' },
            }}
          >
            Personnaliser / tout lire
          </Button>
        </Box>
      </Slide>

      {/* ── Details modal — full policy + granular choices, like major platforms ── */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: BG, borderRadius: { xs: 0, sm: '22px' }, border: `1px solid ${BORD}`, m: { xs: 0, sm: 2 } } }}
      >
        <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography sx={{ fontWeight: 900, fontSize: 18, color: 'white', letterSpacing: '-0.3px' }}>
              Gérer mes préférences de cookies
            </Typography>
            <IconButton onClick={() => setDetailsOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, mb: 3 }}>
            Retrouvez le détail complet de nos pratiques dans notre{' '}
            <Box component={Link} to="/privacy" onClick={() => setDetailsOpen(false)} sx={{ color: ORANGE, fontWeight: 600 }}>
              politique de confidentialité
            </Box>{' '}
            et notre{' '}
            <Box component={Link} to="/cookies" onClick={() => setDetailsOpen(false)} sx={{ color: ORANGE, fontWeight: 600 }}>
              politique de cookies
            </Box>. Vous pouvez modifier vos choix à tout moment depuis le pied de page du site.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            <Category
              icon={<Shield sx={{ fontSize: 16, color: ORANGE }} />}
              title="Essentiels (toujours actifs)"
              desc="Nécessaires au fonctionnement du site : connexion, panier, sécurité. Ne peuvent pas être désactivés."
              checked
              locked
            />
            <Category
              icon={<BarChart sx={{ fontSize: 16, color: ORANGE }} />}
              title="Analytiques"
              desc="Nous aident à comprendre l'usage du site pour l'améliorer (pages visitées, performance)."
              checked={analytics}
              onChange={setAnalytics}
            />
            <Category
              icon={<Campaign sx={{ fontSize: 16, color: ORANGE }} />}
              title="Marketing"
              desc="Permettent des recommandations et publicités plus pertinentes sur DealPam."
              checked={marketing}
              onChange={setMarketing}
            />
          </Box>

          <Divider sx={{ borderColor: BORD, mb: 2.5 }} />

          <Box sx={{ display: 'flex', gap: 1.2 }}>
            <Button
              fullWidth onClick={refuseAll}
              sx={{ py: 1.1, borderRadius: '12px', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.6)', border: `1px solid ${BORD}`,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' } }}
            >
              Tout refuser
            </Button>
            <Button
              fullWidth onClick={saveCustom}
              sx={{ py: 1.1, borderRadius: '12px', fontWeight: 800, fontSize: 13, color: 'white',
                background: `linear-gradient(135deg,${ORANGE},#D95500)`,
                boxShadow: '0 6px 20px rgba(255,107,0,0.35)',
                '&:hover': { boxShadow: '0 8px 26px rgba(255,107,0,0.45)' } }}
            >
              Enregistrer mes choix
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
