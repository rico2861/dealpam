import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

/**
 * Intercepte ?transactionId=xxx injecté par MonCash après paiement.
 * Si localStorage.walletRecharge=1 → confirme une recharge wallet via API MonCash côté backend.
 * Sinon → vérifie un paiement de commande classique.
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

    const token            = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    const isWalletRecharge = localStorage.getItem('walletRecharge') === '1';
    const adCampaignId     = localStorage.getItem('adCampaignPay');

    (async () => {
      if (adCampaignId) {
        localStorage.removeItem('adCampaignPay');
        try {
          const res  = await fetch(`${API}/payments/verify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
            body:    JSON.stringify({ transaction_id: txId }),
          });
          const data = await res.json();
          if (res.status === 409) { navigate('/seller/ads'); return; }
          if (!res.ok) {
            showToast(`Paiement campagne échoué : ${data.message ?? 'Erreur inconnue'}`, 'error');
            navigate('/seller/ads');
            return;
          }
          showToast('✅ Paiement confirmé — campagne en cours de révision', 'success');
          navigate('/seller/ads');
        } catch {
          showToast('Erreur de connexion lors de la confirmation', 'error');
          navigate('/seller/ads');
        }
        return;
      }

      if (isWalletRecharge) {
        localStorage.removeItem('walletRecharge');
        try {
          const res  = await fetch(`${API}/wallet/recharge/confirm`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
            body:    JSON.stringify({ transactionId: txId }),
          });
          const data = await res.json();
          if (res.status === 409) return;
          if (!res.ok) {
            showToast(`Recharge échouée : ${data.message ?? 'Erreur inconnue'}`, 'error');
            navigate('/seller/wallet');
            return;
          }
          showToast(`✅ Recharge confirmée — ${data.amount} HTG crédités`, 'success');
          navigate('/seller/wallet');
        } catch {
          showToast('Erreur de connexion lors de la confirmation', 'error');
          navigate('/seller/wallet');
        }
        return;
      }

      // Paiement commande classique
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
        showToast(`✅ Pèman konfime — ${data.amount_htg} HTG`, 'success');
        if (data.order_id) navigate(`/account/orders/${data.order_id}`);
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
