import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress, InputAdornment,
  alpha, InputBase, IconButton,
} from '@mui/material';
import {
  EmailOutlined, ArrowBack, ArrowForward,
  LockOutlined, CheckCircle, Visibility, VisibilityOff,
} from '@mui/icons-material';
import api from '../../api/axios';
import { isPasswordValid, PASSWORD_RULES } from './RegisterPage';

const ORANGE = '#FF6B00';

/* ── Shared field component ── */
function Field({
  label, type = 'text', value, onChange, placeholder, autoFocus, endIcon, accent = ORANGE,
}: {
  label?: string; type?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; autoFocus?: boolean;
  endIcon?: React.ReactNode; accent?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Box>
      {label && (
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, mb: 0.75, color: focused ? alpha(accent, 0.85) : 'rgba(255,255,255,0.4)', letterSpacing: '0.4px', transition: 'color 0.2s' }}>
          {label}
        </Typography>
      )}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.2, px: 1.5, minHeight: 50,
        bgcolor: focused ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${focused ? accent : 'rgba(255,255,255,0.09)'}`,
        borderRadius: '14px',
        boxShadow: focused ? `0 0 0 3px ${alpha(accent, 0.12)}` : 'none',
        transition: 'all 0.22s ease',
      }}>
        <InputBase
          value={value} onChange={onChange} type={type} placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          sx={{
            flex: 1,
            '& input': {
              color: 'white', fontSize: 15, fontWeight: 500, p: 0, lineHeight: '24px',
              '&::placeholder': { color: 'rgba(255,255,255,0.2)', opacity: 1 },
              '&:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px #0F172A inset', WebkitTextFillColor: 'white' },
            },
          }}
        />
        {endIcon && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.3)' }}>{endIcon}</Box>}
      </Box>
    </Box>
  );
}

/* ── OTP 6 boxes ── */
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      onChange(value.slice(0, i - 1));
      refs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const next  = value.slice(0, i) + digit + value.slice(i + 1);
    onChange(next.slice(0, 6));
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); refs.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <Box sx={{ display: 'flex', gap: 1.2, justifyContent: 'center' }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const filled  = i < value.length;
        const current = i === value.length;
        return (
          <Box
            key={i}
            component="input"
            ref={(el: HTMLInputElement | null) => { refs.current[i] = el; }}
            value={value[i] || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(i, e)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKey(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            inputMode="numeric"
            maxLength={1}
            sx={{
              width: 48, height: 58,
              textAlign: 'center',
              fontSize: 24, fontWeight: 900, color: 'white',
              background: filled ? alpha(ORANGE, 0.1) : 'rgba(255,255,255,0.03)',
              border: `2px solid ${filled ? ORANGE : current ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.09)'}`,
              borderRadius: '12px',
              outline: 'none',
              cursor: 'text',
              transition: 'all 0.18s',
              boxShadow: filled ? `0 0 0 3px ${alpha(ORANGE, 0.15)}` : current ? `0 0 0 3px rgba(255,255,255,0.05)` : 'none',
              '&:focus': {
                borderColor: ORANGE,
                boxShadow: `0 0 0 3px ${alpha(ORANGE, 0.2)}`,
              },
              '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
              fontFamily: 'monospace',
            }}
          />
        );
      })}
    </Box>
  );
}

type Stage = 'email' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const navigate   = useNavigate();
  const [stage, setStage]     = useState<Stage>('email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [countdown, setCountdown]   = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  /* ── Step 1: send code ── */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setStage('code');
      setCountdown(60);
    } catch {
      // Silent — never reveal if email exists
      setStage('code');
      setCountdown(60);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try { await api.post('/auth/forgot-password', { email }); } catch { /* silent */ }
    setLoading(false);
    setCountdown(60);
    setCode('');
    setError('');
  };

  /* ── Step 2: verify code ── */
  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/verify-reset-code', { email, code });
      setResetToken(data.resetToken);
      setStage('password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stage === 'code' && code.length === 6) handleVerifyCode();
  }, [code]);

  /* ── Step 3: set new password ── */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) { setError('Le mot de passe ne respecte pas les critères de sécurité'); return; }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { token: resetToken, password });
      navigate('/login', { state: { message: 'Mot de passe mis à jour. Connectez-vous.' } });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const submitSx = {
    py: 1.55, fontWeight: 800, fontSize: 15, borderRadius: '14px', textTransform: 'none' as const,
    background: `linear-gradient(135deg, ${ORANGE}, #e05e00)`,
    color: 'white',
    boxShadow: '0 8px 24px rgba(255,107,0,0.35)',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(255,107,0,0.48)' },
    '&:active': { transform: 'translateY(0)' },
    // Fond bien visible pendant le chargement — pas un orange presque transparent
    // avec un texte/spinner quasi invisible dessus (illisible signalé).
    '&.Mui-disabled': { background: alpha(ORANGE, 0.7), color: '#fff' },
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 60%, #0F172A 100%)',
      position: 'relative', overflow: 'hidden', p: 2,
    }}>
      {/* Background glows */}
      <Box sx={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', top: '-10%', left: '-10%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${alpha(ORANGE, 0.07)} 0%, transparent 65%)` }} />
      <Box sx={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', bottom: '-5%', right: '-5%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 65%)' }} />
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

      {/* Card */}
      <Box sx={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,0.035)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        p: { xs: 3.5, sm: 5 },
        overflow: 'hidden',
      }}>
        {/* Top accent */}
        <Box sx={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px', borderRadius: '0 0 2px 2px',
          background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)` }} />

        {/* ── Stage: email ── */}
        {stage === 'email' && (
          <Box component="form" onSubmit={handleSendCode}>
            <Typography fontWeight={900} fontSize={24} color="white" mb={0.8} letterSpacing="-0.5px">
              Mot de passe oublié ?
            </Typography>
            <Typography fontSize={14} color="rgba(255,255,255,0.38)" mb={3.5} lineHeight={1.7}>
              Saisissez votre adresse email. Si un compte existe, vous recevrez un code valable <strong style={{ color: 'rgba(255,255,255,0.6)' }}>15 minutes</strong>.
            </Typography>

            <Field
              label="Adresse email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              autoFocus
              endIcon={<EmailOutlined sx={{ fontSize: 19 }} />}
            />

            {error && (
              <Typography sx={{ fontSize: 12.5, color: '#F87171', mt: 1.5, px: 0.5 }}>{error}</Typography>
            )}

            <Button fullWidth type="submit" disabled={loading || !email} variant="contained"
              endIcon={!loading && <ArrowForward sx={{ fontSize: 17 }} />}
              sx={{ ...submitSx, mt: 3 }}>
              {loading ? <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.5)' }} /> : 'Recevoir le code'}
            </Button>

            <Button component={Link} to="/login" startIcon={<ArrowBack sx={{ fontSize: 14 }} />}
              sx={{ mt: 2, display: 'flex', mx: 'auto', color: 'rgba(255,255,255,0.28)', fontWeight: 500, fontSize: 13, textTransform: 'none',
                '&:hover': { color: 'rgba(255,255,255,0.6)', bgcolor: 'transparent' } }}>
              Retour à la connexion
            </Button>
          </Box>
        )}

        {/* ── Stage: code ── */}
        {stage === 'code' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <IconButton onClick={() => { setStage('email'); setError(''); setCode(''); }}
                sx={{ color: 'rgba(255,255,255,0.35)', p: 0.5, '&:hover': { color: 'white', bgcolor: 'transparent' } }}>
                <ArrowBack sx={{ fontSize: 18 }} />
              </IconButton>
              <Box>
                <Typography fontWeight={900} fontSize={21} color="white" letterSpacing="-0.4px">
                  Vérification
                </Typography>
                <Typography fontSize={13} color="rgba(255,255,255,0.35)">
                  Code envoyé à <strong style={{ color: 'rgba(255,255,255,0.65)' }}>{email}</strong>
                </Typography>
              </Box>
            </Box>

            <Typography fontSize={13.5} color="rgba(255,255,255,0.45)" mb={3} lineHeight={1.7}>
              Saisissez le code à 6 chiffres reçu par email. Il expire dans 15 minutes.
            </Typography>

            <OtpInput value={code} onChange={setCode} disabled={loading} />

            {error && (
              <Typography sx={{ fontSize: 12.5, color: '#F87171', mt: 2, textAlign: 'center' }}>{error}</Typography>
            )}

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mt: 3 }}>
                <CircularProgress size={18} sx={{ color: ORANGE }} />
                <Typography fontSize={13.5} color="rgba(255,255,255,0.4)">Vérification en cours…</Typography>
              </Box>
            )}

            {/* Vérifier manuellement si les 6 chiffres sont saisis mais loading est false (erreur) */}
            {!loading && code.length === 6 && error && (
              <Button fullWidth variant="contained"
                onClick={() => { setCode(''); setError(''); }}
                sx={{ ...submitSx, mt: 3 }}>
                Réessayer
              </Button>
            )}

            <Box sx={{ mt: 3.5, textAlign: 'center' }}>
              <Button onClick={handleResend} disabled={countdown > 0 || loading}
                sx={{ fontSize: 13, textTransform: 'none', color: 'rgba(255,255,255,0.5)', fontWeight: 500,
                  '&:hover': { color: 'rgba(255,255,255,0.8)', bgcolor: 'transparent' },
                  // Assez visible pour lire le décompte, sans pour autant ressembler à un lien actif.
                  '&.Mui-disabled': { color: 'rgba(255,255,255,0.45)' } }}>
                {countdown > 0 ? `Renvoyer le code dans ${countdown}s` : 'Renvoyer le code'}
              </Button>
            </Box>
          </Box>
        )}

        {/* ── Stage: password ── */}
        {stage === 'password' && (
          <Box component="form" onSubmit={handleResetPassword}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: alpha('#10B981', 0.15), border: '2px solid rgba(16,185,129,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle sx={{ color: '#10B981', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography fontWeight={900} fontSize={21} color="white" letterSpacing="-0.4px">
                  Nouveau mot de passe
                </Typography>
                <Typography fontSize={13} color="rgba(255,255,255,0.35)">Code vérifié avec succès</Typography>
              </Box>
            </Box>

            <Typography fontSize={13.5} color="rgba(255,255,255,0.4)" mb={3} lineHeight={1.7}>
              Choisissez un mot de passe fort pour sécuriser votre compte.
            </Typography>

            {/* Nouveau mot de passe */}
            <Field
              label="Nouveau mot de passe"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              endIcon={
                <IconButton onClick={() => setShowPwd(!showPwd)} size="small" tabIndex={-1}
                  sx={{ p: 0.3, color: 'rgba(255,255,255,0.25)', '&:hover': { color: ORANGE, bgcolor: 'transparent' } }}>
                  {showPwd ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                </IconButton>
              }
            />

            {/* Password rules */}
            {password && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mt: 1.5, mb: 0.5 }}>
                {PASSWORD_RULES.map(({ label, ok }) => {
                  const valid = ok(password);
                  return (
                    <Box key={label} sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      px: 1.2, py: 0.4, borderRadius: '20px',
                      bgcolor: valid ? alpha('#10B981', 0.12) : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${valid ? alpha('#10B981', 0.3) : 'transparent'}`,
                      transition: 'all 0.2s',
                    }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: valid ? '#34D399' : 'rgba(255,255,255,0.2)', transition: 'background 0.2s' }} />
                      <Typography fontSize={10.5} color={valid ? '#34D399' : 'rgba(255,255,255,0.3)'} fontWeight={valid ? 700 : 400}>
                        {label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Confirmer mot de passe */}
            <Box sx={{ mt: password ? 2 : 2 }}>
              <Field
                label="Confirmer le mot de passe"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                accent={
                  confirm.length > 0
                    ? confirm === password ? '#10B981' : '#F87171'
                    : ORANGE
                }
                endIcon={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {confirm.length > 0 && (
                      confirm === password
                        ? <CheckCircle sx={{ fontSize: 17, color: '#34D399' }} />
                        : <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#F87171' }} />
                    )}
                    <IconButton onClick={() => setShowConfirm(!showConfirm)} size="small" tabIndex={-1}
                      sx={{ p: 0.3, color: 'rgba(255,255,255,0.25)', '&:hover': { color: ORANGE, bgcolor: 'transparent' } }}>
                      {showConfirm ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </Box>
                }
              />
              {confirm.length > 0 && confirm !== password && (
                <Typography sx={{ fontSize: 12, color: '#F87171', mt: 0.7, px: 0.5 }}>
                  Les mots de passe ne correspondent pas
                </Typography>
              )}
              {confirm.length > 0 && confirm === password && (
                <Typography sx={{ fontSize: 12, color: '#34D399', mt: 0.7, px: 0.5 }}>
                  Les mots de passe correspondent
                </Typography>
              )}
            </Box>

            {error && (
              <Typography sx={{ fontSize: 12.5, color: '#F87171', mt: 1.5, px: 0.5 }}>{error}</Typography>
            )}

            <Button fullWidth type="submit"
              disabled={loading || !isPasswordValid(password) || password !== confirm}
              variant="contained"
              endIcon={!loading && <LockOutlined sx={{ fontSize: 17 }} />}
              sx={{ ...submitSx, mt: 3 }}>
              {loading ? <CircularProgress size={20} sx={{ color: 'rgba(255,255,255,0.5)' }} /> : 'Enregistrer le mot de passe'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
