import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL;

interface PreInitResult {
  redirect_url: string;
  payment_id:   string;
  order_id:     string;
  amount_htg:   number;
}

export function useMoncashPayment(orderId: string | null) {
  const [preResult, setPreResult] = useState<PreInitResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-initiation automatique dès que orderId est connu
  useEffect(() => {
    if (!orderId) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('accessToken') ?? sessionStorage.getItem('accessToken');
        const res   = await fetch(`${API}/payments/initiate`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  token ? `Bearer ${token}` : '',
          },
          body:        JSON.stringify({ orderId }),
          credentials: 'include',
        });

        if (!res.ok) {
          const d = await res.json();
          setError(d.message ?? 'Erè lors de l\'initiation MonCash');
          return;
        }

        const data = await res.json() as PreInitResult;
        setPreResult(data);
      } catch {
        setError('Erè koneksyon — réessaie');
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [orderId]);

  // Redirection instantanée vers MonCash au clic
  const pay = () => {
    if (!preResult) return;
    window.location.href = preResult.redirect_url;
  };

  return { preResult, loading, error, pay, ready: !!preResult && !loading };
}
