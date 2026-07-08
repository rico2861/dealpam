import { useState } from 'react';
import { Button, ButtonProps, CircularProgress } from '@mui/material';
import { Check, Close } from '@mui/icons-material';

export type ActionState = 'idle' | 'loading' | 'success' | 'error';

interface LoadingButtonProps extends Omit<ButtonProps, 'onClick'> {
  state: ActionState;
  onClick?: () => void;
  loadingText?: React.ReactNode;
  successText?: React.ReactNode;
  errorText?: React.ReactNode;
}

/**
 * Bouton avec indicateur de chargement intégré (jamais un indicateur plein
 * écran pour une action locale). Taille/position fixes entre tous les états
 * — le texte change, jamais les dimensions. Désactivé pendant le chargement
 * pour empêcher les doubles clics.
 */
export default function LoadingButton({
  state, onClick, children, loadingText, successText, errorText, disabled, sx, ...rest
}: LoadingButtonProps) {
  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  return (
    <Button
      {...rest}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      sx={{
        position: 'relative',
        transition: 'background 0.15s ease, border-color 0.15s ease',
        ...(isError && { borderColor: '#E8432E', color: '#E8432E' }),
        ...(isSuccess && { borderColor: '#116B57', color: '#116B57' }),
        ...sx,
      }}
      startIcon={
        isLoading ? <CircularProgress size={16} color="inherit" />
        : isSuccess ? <Check sx={{ fontSize: 18 }} />
        : isError ? <Close sx={{ fontSize: 18 }} />
        : rest.startIcon
      }
    >
      {isLoading ? (loadingText ?? children) : isSuccess ? (successText ?? children) : isError ? (errorText ?? children) : children}
    </Button>
  );
}

/**
 * Gère la petite machine à états idle → loading → success/error → idle pour
 * une action ponctuelle (clic bouton), avec confirmation brève avant retour
 * à l'état normal — jamais un retour instantané qui pourrait passer inaperçu.
 */
export function useActionState(successHoldMs = 1200, errorHoldMs = 2200) {
  const [state, setState] = useState<ActionState>('idle');

  const run = async (fn: () => Promise<any>) => {
    setState('loading');
    try {
      await fn();
      setState('success');
      setTimeout(() => setState('idle'), successHoldMs);
      return true;
    } catch (e) {
      setState('error');
      setTimeout(() => setState('idle'), errorHoldMs);
      throw e;
    }
  };

  return { state, run };
}
