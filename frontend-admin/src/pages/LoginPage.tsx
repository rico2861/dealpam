import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress,
  InputAdornment, IconButton, Chip, LinearProgress, alpha,
} from '@mui/material';
import {
  EmailOutlined, LockOutlined, Visibility, VisibilityOff,
  Security, VerifiedUser, LockPerson, Warning, Timer,
} from '@mui/icons-material';
import { useAdminStore } from '../store/admin.store';

const MAX_ATTEMPTS = 5;
// Progressive client-side delay after each failed attempt (ms)
const DELAYS = [0, 1000, 2000, 4000, 8000];

function LockCountdown({ seconds }: { seconds: number }) {
  const [rem, setRem] = useState(seconds);
  useEffect(() => {
    const id = setInterval(() => setRem(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(rem / 60), s = rem % 60;
  const pct = ((seconds - rem) / seconds) * 100;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
        <Timer sx={{ color: '#EF4444', fontSize: 20 }} />
        <Typography fontWeight={800} fontSize={15} color="#FCA5A5">
          Compte verrouillé
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8, mb: 2 }}>
        {[String(m).padStart(2,'0'), String(s).padStart(2,'0')].map((v, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{ bgcolor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', px: 1.5, py: 0.8, minWidth: 44, textAlign: 'center' }}>
              <Typography fontWeight={900} fontSize={22} color="#FF6B6B" fontFamily="monospace">{v}</Typography>
            </Box>
            {i === 0 && <Typography fontWeight={900} color="#EF4444" fontSize={20}>:</Typography>}
          </Box>
        ))}
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{ borderRadius: 2, height: 4, bgcolor: 'rgba(239,68,68,0.15)', '& .MuiLinearProgress-bar': { bgcolor: '#EF4444' } }} />
      <Typography fontSize={11.5} color="rgba(255,255,255,0.35)" mt={1}>
        Réessayez dans {m}m {s}s
      </Typography>
    </Box>
  );
}

export default function LoginPage() {
  const { login } = useAdminStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [attempts, setAttempts] = useState(0);         // client-side counter
  const [clientDelay, setClientDelay] = useState(0);   // seconds of progressive delay
  const [delayTimer, setDelayTimer] = useState(0);     // countdown for delay
  const [lockoutSeconds, setLockoutSeconds] = useState(0); // server-side lockout
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show revocation banner if session was cut server-side
  useEffect(() => {
    const reason = sessionStorage.getItem('logout_reason');
    if (reason) {
      // Replace raw technical JWT errors with a user-friendly message
      const friendly = /jwt|expired|token|unauthorized/i.test(reason)
        ? 'Session expirée — veuillez vous reconnecter.'
        : reason;
      setError(friendly);
      sessionStorage.removeItem('logout_reason');
    }
  }, []);

  // Animated orbs
  const [orbs] = useState([
    { x: 20, y: 30, size: 500, color: 'rgba(255,153,0,0.10)' },
    { x: 70, y: 65, size: 380, color: 'rgba(99,102,241,0.08)' },
    { x: 45, y: 85, size: 280, color: 'rgba(255,153,0,0.06)' },
  ]);

  // Countdown the delay timer
  useEffect(() => {
    if (delayTimer <= 0) return;
    const id = setInterval(() => setDelayTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [delayTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delayTimer > 0 || lockoutSeconds > 0) return;

    setLoading(true);
    setError('');

    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err: any) {
      const msg: string = err.response?.data?.message || err.message || 'Accès refusé';
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      // Detect server-side lockout (403 with "bloqué")
      if (msg.toLowerCase().includes('bloqué') || msg.toLowerCase().includes('bloque')) {
        const minsMatch = msg.match(/(\d+)\s*min/);
        const mins = minsMatch ? parseInt(minsMatch[1]) : 30;
        setLockoutSeconds(mins * 60);
        setError('');
        return;
      }

      // Apply progressive client-side delay
      const delay = DELAYS[Math.min(newAttempts - 1, DELAYS.length - 1)];
      if (delay > 0) {
        setClientDelay(delay);
        setDelayTimer(Math.ceil(delay / 1000));
      }

      // Parse remaining attempts from server message
      const remMatch = msg.match(/(\d+)\s*tentative/);
      const remAttempts = remMatch ? parseInt(remMatch[1]) : Math.max(0, MAX_ATTEMPTS - newAttempts);

      setError(remAttempts > 0
        ? `Identifiants invalides — encore ${remAttempts} tentative${remAttempts > 1 ? 's' : ''} avant verrouillage`
        : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = lockoutSeconds > 0;
  const isDelayed = delayTimer > 0;
  const canSubmit = !loading && !isBlocked && !isDelayed && form.email && form.password;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#050B18', position: 'relative', overflow: 'hidden', p: 2 }}>

      {/* Orbs */}
      {orbs.map((orb, i) => (
        <Box key={i} sx={{
          position: 'absolute', borderRadius: '50%', pointerEvents: 'none',
          width: orb.size, height: orb.size,
          background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          top: `${orb.y}%`, left: `${orb.x}%`, transform: 'translate(-50%,-50%)', filter: 'blur(2px)',
        }} />
      ))}

      {/* Dot grid */}
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Card */}
      <Box sx={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 440,
        backdropFilter: 'blur(24px)',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        p: { xs: 3.5, sm: 5 },
        overflow: 'hidden',
      }}>
        {/* Top accent */}
        <Box sx={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 2, borderRadius: '0 0 2px 2px', background: 'linear-gradient(90deg, transparent, #FF9900, transparent)' }} />

        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 60, height: 60, borderRadius: '16px', mx: 'auto', mb: 1.8,
            background: 'linear-gradient(135deg, #FF9900 0%, #e68900 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(255,153,0,0.38), 0 0 0 1px rgba(255,153,0,0.12)',
          }}>
            <Typography sx={{ color: '#111', fontWeight: 900, fontSize: 30, lineHeight: 1, letterSpacing: '-1px' }}>D</Typography>
          </Box>
          <Typography sx={{ fontWeight: 900, fontSize: 21, letterSpacing: '-0.5px', color: 'white', lineHeight: 1 }}>
            Deal<span style={{ color: '#FF9900' }}>Pam</span>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, mt: 0.5, letterSpacing: '2.5px', textTransform: 'uppercase' }}>
            Administration
          </Typography>
        </Box>

        {/* Security chips */}
        <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center', mb: 3.5, flexWrap: 'wrap' }}>
          {[
            { icon: Security, label: 'Accès sécurisé' },
            { icon: VerifiedUser, label: 'SSL chiffré' },
            { icon: LockPerson, label: 'Audité' },
          ].map(({ icon: Icon, label }) => (
            <Chip key={label} size="small" icon={<Icon sx={{ fontSize: '12px !important', color: 'rgba(255,153,0,0.7) !important' }} />}
              label={label}
              sx={{ height: 22, fontSize: 10, fontWeight: 500, letterSpacing: 0.3, bgcolor: 'rgba(255,153,0,0.07)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,153,0,0.12)', borderRadius: '6px', '& .MuiChip-icon': { ml: 0.5 } }} />
          ))}
        </Box>

        {/* Lockout countdown */}
        {isBlocked ? (
          <Box sx={{ mb: 3, p: 2.5, borderRadius: '14px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <LockCountdown seconds={lockoutSeconds} />
          </Box>
        ) : (
          <>
            {/* Error */}
            {error && (
              <Alert severity="error" onClose={() => setError('')} icon={<Warning fontSize="small" />}
                sx={{ mb: 2.5, borderRadius: '12px', bgcolor: alpha('#EF4444', 0.1), color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, '& .MuiAlert-icon': { color: '#FCA5A5' } }}>
                {error}
              </Alert>
            )}

            {/* Attempt progress bar */}
            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <Box sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                  <Typography fontSize={11.5} color="rgba(251,191,36,0.8)" fontWeight={600}>Tentatives</Typography>
                  <Typography fontSize={11.5} color="rgba(251,191,36,0.8)" fontWeight={700}>{attempts} / {MAX_ATTEMPTS}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(attempts / MAX_ATTEMPTS) * 100}
                  sx={{ borderRadius: 2, height: 4, bgcolor: 'rgba(251,191,36,0.1)', '& .MuiLinearProgress-bar': { bgcolor: attempts >= 3 ? '#EF4444' : '#FBBF24', transition: 'background 0.3s' } }} />
              </Box>
            )}

            {/* Progressive delay warning */}
            {isDelayed && (
              <Box sx={{ mb: 2.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer sx={{ color: '#EF4444', fontSize: 16, flexShrink: 0 }} />
                <Typography fontSize={12.5} color="rgba(255,150,150,0.9)">
                  Délai de sécurité — nouvelle tentative dans <strong>{delayTimer}s</strong>
                </Typography>
              </Box>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth type="email" value={form.email} autoFocus autoComplete="email" required
                label="Email administrateur" placeholder="admin@dealpam.com"
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={isBlocked || isDelayed}
                sx={fieldSx}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailOutlined sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 18 }} /></InputAdornment> }}
              />

              <TextField
                fullWidth type={showPwd ? 'text' : 'password'} value={form.password} required
                label="Mot de passe" placeholder="••••••••••••"
                autoComplete="current-password"
                onChange={e => setForm({ ...form, password: e.target.value })}
                disabled={isBlocked || isDelayed}
                sx={fieldSx}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockOutlined sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 18 }} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small" tabIndex={-1}
                        sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#FF9900', bgcolor: 'rgba(255,153,0,0.08)' } }}>
                        {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button fullWidth variant="contained" type="submit" disabled={!canSubmit} size="large"
                sx={{
                  mt: 0.5, py: 1.6, fontSize: 14, fontWeight: 700, borderRadius: '12px',
                  background: canSubmit ? 'linear-gradient(135deg, #FF9900 0%, #e68900 100%)' : 'rgba(255,153,0,0.2)',
                  color: canSubmit ? '#111' : 'rgba(255,255,255,0.3)',
                  boxShadow: canSubmit ? '0 8px 24px rgba(255,153,0,0.3)' : 'none',
                  letterSpacing: '0.3px',
                  transition: 'all 0.2s',
                  '&:hover': canSubmit ? { boxShadow: '0 12px 32px rgba(255,153,0,0.45)', transform: 'translateY(-1px)' } : {},
                  '&:active': { transform: 'translateY(0)' },
                  '&.Mui-disabled': { background: 'rgba(255,153,0,0.15)', color: 'rgba(255,255,255,0.2)' },
                }}>
                {loading
                  ? <CircularProgress size={20} sx={{ color: '#111' }} />
                  : isDelayed
                    ? `Patientez ${delayTimer}s…`
                    : 'Accéder au panel'
                }
              </Button>
            </Box>
          </>
        )}

        {/* Footer */}
        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, letterSpacing: '0.3px', lineHeight: 1.6 }}>
            Toutes les actions sont enregistrées et auditées.<br />
            Accès non autorisé passible de poursuites.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ position: 'absolute', bottom: 18, left: 0, right: 0, textAlign: 'center', zIndex: 1 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.1)', fontSize: 10.5, letterSpacing: '1px' }}>
          DEALPAM SECURE ADMIN v2.0 · HAÏTI
        </Typography>
      </Box>
    </Box>
  );
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '12px', color: 'white',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.09)' },
    '&:hover fieldset': { borderColor: 'rgba(255,153,0,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#FF9900', boxShadow: '0 0 0 3px rgba(255,153,0,0.08)' },
    '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.02)' },
  },
  '& .MuiInputBase-input': { color: 'white', '&::placeholder': { color: 'rgba(255,255,255,0.2)', opacity: 1 } },
  '& label': { color: 'rgba(255,255,255,0.4)' },
  '& label.Mui-focused': { color: '#FF9900' },
  '& label.Mui-disabled': { color: 'rgba(255,255,255,0.2)' },
};
