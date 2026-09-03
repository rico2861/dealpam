import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '../store/cart.store';
import { getMoncashTransactionId, stripMoncashTransactionParams, setMoncashVerifyPending, clearMoncashVerifyPending } from '../utils/moncashParam';

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
  const qc = useQueryClient();
  const { fetchCount } = useCartStore();

  useEffect(() => {
    // La page de retour partagée pour les apps externes (PeguyTBN...) gère
    // elle-même son propre transactionId — ne pas lui voler le paramètre.
    if (location.pathname.startsWith('/payments/return/')) return;

    const params = new URLSearchParams(location.search);
    const txId   = getMoncashTransactionId(location.search);
    if (!txId) return;

    // ThankYouPage est chargée en lazy (chunk JS à télécharger) — le temps
    // qu'elle monte, l'URL ci-dessous a déjà été nettoyée par ce composant
    // (monté eagerly, lui). Sans ce flag, ThankYouPage lirait une URL sans
    // transactionId, croirait qu'aucun paiement n'est en cours, et
    // redirigerait vers /account/orders — qui bascule un visiteur non
    // connecté (ex. client PeguyTBN sans compte DealPam) vers login/home
    // avant même que la vérification ait eu une chance de s'exécuter.
    setMoncashVerifyPending();

    stripMoncashTransactionParams(params);
    const cleanSearch = params.toString();
    const cleanUrl    = location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
    window.history.replaceState({}, '', cleanUrl);

    const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
    // Nettoyage défensif — plus utilisés pour le routage mais on évite qu'ils traînent.
    localStorage.removeItem('walletRecharge');
    localStorage.removeItem('adCampaignPay');

    (async () => {
      try {
        await handleVerify();
      } catch {
        showToast('Erè koneksyon pandan verifikasyon pèman', 'error');
      } finally {
        // Quel que soit le chemin de sortie (succès, échec, exception),
        // ThankYouPage doit redevenir libre de bouncer un visiteur qui
        // arrive ensuite sur cette page sans transaction en cours.
        clearMoncashVerifyPending();
      }

      async function handleVerify() {
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
          // Ne laisse jamais l'utilisateur bloqué sur un écran de
          // vérification qui ne se résoudra plus (ou sur la home s'il y a
          // été poussé entre-temps par le routeur) — un état d'erreur
          // explicite avec un moyen de repartir vaut mieux qu'un silence.
          navigate('/order-received/thank-you', {
            replace: true,
            state: { type: 'verify_failed', message: data.message },
          });
          return;
        }

        // Le compte marchand MonCash est partagé avec d'autres apps (ex.
        // PeguyTBN) et son URL de retour est fixe — quand ce transactionId
        // ne correspond à rien côté DealPam, le backend a essayé chaque app
        // externe enregistrée en fallback (voir payments.controller.ts).
        if (data.type === 'external_app') {
          if (data.status === 'FAILED') {
            showToast('Paiement non confirmé — contactez le support si le montant a été débité.', 'error');
            navigate('/order-received/thank-you', {
              replace: true,
              state: { type: 'verify_failed', message: "Le paiement n'a pas pu être confirmé." },
            });
            return;
          }
          showToast(
            data.status === 'CONFIRMED'
              ? `Paiement confirmé — redirection vers ${data.appName}…`
              : `Paiement en cours de confirmation — redirection vers ${data.appName}…`,
            'success',
          );
          window.location.href = data.redirectUrl;
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

        if (data.type === 'payment_review' || data.type === 'order_payment_review') {
          showToast(data.message ?? 'Paiement reçu — vérification admin en cours', 'success');
          if (data.type === 'order_payment_review' && data.order_id) navigate(`/account/orders/${data.order_id}`);
          return;
        }

        if (data.type === 'order') {
          qc.invalidateQueries({ queryKey: ['cart'] });
          qc.invalidateQueries({ queryKey: ['myOrders'] });
          fetchCount();
          // Le paiement MonCash d'une commande DealPam Officiel fait quitter
          // le site (redirection vers la passerelle MonCash) puis revenir ici
          // — l'objet "orders" construit au moment du checkout (voir
          // CheckoutPage) est donc perdu. On le reconstitue via un GET pour
          // afficher la même page "Merci" que le paiement direct (cash...),
          // au lieu du détail de commande brut. Si ce GET échoue pour une
          // raison quelconque, on retombe sur le détail de commande plutôt
          // que de laisser le client sans confirmation du tout.
          try {
            const orderRes = await fetch(`${API}/orders/me/${data.order_id}`, {
              headers: { Authorization: token ? `Bearer ${token}` : '' },
            });
            if (!orderRes.ok) throw new Error('order fetch failed');
            const order = await orderRes.json();
            navigate('/order-received/thank-you', {
              replace: true,
              state: {
                type: 'product',
                orders: [order],
                storeInfo: order.store,
                sellerUserId: order.store?.seller?.userId ?? null,
              },
            });
          } catch {
            showToast(`Paiement confirmé — ${data.amount_htg} HTG`, 'success');
            navigate(`/account/orders/${data.order_id}`);
          }
          return;
        }

        if (data.type === 'ad_campaign') {
          showToast('Paiement confirmé — campagne en cours de révision', 'success');
          navigate('/seller/ads');
          return;
        }

        showToast(`Pèman konfime — ${data.amount_htg} HTG`, 'success');
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
