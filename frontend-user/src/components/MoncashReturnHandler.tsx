import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

/**
 * Intercepte ?transactionId=xxx sur n'importe quelle page (injecté par MonCash).
 * Nettoie l'URL immédiatement, vérifie en arrière-plan, redirige vers la commande.
 */
export default function MoncashReturnHandler() {
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const txId   = params.get('transactionId');
    if (!txId) return;

    // Nettoyer l'URL immédiatement (retire ?transactionId=xxx)
    params.delete('transactionId');
    const cleanSearch = params.toString();
    const cleanUrl    = location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
    window.history.replaceState({}, '', cleanUrl);

    // Vérification silencieuse en arrière-plan
    (async () => {
      try {
        const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
        const res = await fetch(`${API}/payments/verify`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ transaction_id: txId }),
          credentials: 'include',
        });

        const data = await res.json();

        if (res.status === 409) {
          // Déjà crédité — silencieux
          return;
        }

        if (!res.ok) {
          showToast(`Pèman echwe: ${data.message ?? 'Erè enkoni'}`, 'error');
          return;
        }

        showToast(`✅ Pèman konfime — ${data.amount_htg} HTG`, 'success');

        // Rediriger vers la commande
        if (data.order_id) {
          navigate(`/account/orders/${data.order_id}`);
        }
      } catch {
        showToast('Erè koneksyon pandan verifikasyon pèman', 'error');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return null;
}

function showToast(message: string, type: 'success' | 'error') {
  const div       = document.createElement('div');
  div.textContent = message;
  div.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${type === 'success' ? '#2e7d32' : '#c62828'};
    color: white; padding: 14px 24px; border-radius: 10px;
    font-family: Inter, sans-serif; font-size: 15px; font-weight: 600;
    z-index: 99999; box-shadow: 0 4px 20px rgba(0,0,0,.3);
    animation: slideUp .3s ease;
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}
