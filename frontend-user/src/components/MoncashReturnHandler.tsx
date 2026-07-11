import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

/**
 * Intercepte ?transactionId=xxx injecté par MonCash après paiement.
 *
 * Un seul endpoint (/payments/verify) est appelé pour tous les scénarios
 * (recharge wallet, abonnement, campagne pub) : le backend détermine lui-même
 * le type via le préfixe de la référence que MONCASH renvoie (WALLET-/sub-/ad-),
 * jamais via un flag côté client. On NE dépend plus de localStorage.walletRecharge
 * / adCampaignPay pour router — ces flags sont scopés par origine (host) et
 * pouvaient être perdus si le retour MonCash atterrissait sur un host différent
 * de celui où le paiement a été initié (www vs non-www par ex.), ce qui envoyait
 * la vérification vers le mauvais flux et affichait "Paiement pending introuvable".
 */
export default function MoncashReturnHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const txId   = params.get('transactionId');
    if (!txId) return;

    params.delete('transactionId');
    const cleanSearch = params.toString();
    const cleanUrl    = location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
    window.history.replaceState({}, '', cleanUrl);

    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    // Nettoyage défensif — plus utilisés pour le routage mais on évite qu'ils traînent.
    localStorage.removeItem('walletRecharge');
    localStorage.removeItem('adCampaignPay');

    (async () => {
      try {
        const res = await fetch(`${API}/payments/verify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
          body:    JSON.stringify({ transaction_id: txId }),
          credentials: 'include',
        });
        const data = await res.json();
        if (res.status === 409) return;
        if (!res.ok) {
          showToast(`Pèman echwe: ${data.message ?? 'Erè enkoni'}`, 'error');
          return;
        }

        if (data.type === 'wallet') {
          showToast(`Recharge confirmée — ${data.amount} HTG crédités`, 'success');
          navigate('/seller/wallet');
          return;
        }

        if (data.type === 'subscription' || data.type === 'subscription_scheduled') {
          navigate('/order-received/thank-you', {
            replace: true,
            state: {
              type: data.type,
              tier: data.tier,
              amount_htg: data.amount_htg,
              effective_date: data.effective_date,
            },
          });
          return;
        }

        if (data.type === 'payment_review') {
          showToast(data.message ?? 'Paiement reçu — vérification admin en cours', 'success');
          return;
        }

        if (data.type === 'ad_campaign') {
          showToast('Paiement confirmé — campagne en cours de révision', 'success');
          navigate('/seller/ads');
          return;
        }

        showToast(`Pèman konfime — ${data.amount_htg} HTG`, 'success');
      } catch {
        showToast('Erè koneksyon pandan verifikasyon pèman', 'error');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return null;
}

function showToast(message: string, type: 'success' | 'error') {
  const div         = document.createElement('div');
  div.textContent   = message;
  div.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${type === 'success' ? '#2e7d32' : '#c62828'};
    color:white;padding:14px 24px;border-radius:10px;
    font-family:Inter,sans-serif;font-size:15px;font-weight:600;
    z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.3);
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}
