import axios from 'axios';

// En dev : VITE_API_URL vide → proxy Vite /v1 → localhost:3000 (fonctionne aussi sur mobile via IP réseau)
// En production : VITE_API_URL=https://gw-07.dealpam.com/v1 (injecté par .env.production au build)
const BASE_URL = import.meta.env.VITE_API_URL || '/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let _refreshPromise: Promise<string> | null = null;

function hasSession(): boolean {
  return !!(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));
}

// Clears tokens + dispatches a custom event so components can react with navigate()
// Does NOT use window.location.href to avoid full-page reloads
function clearSession(reason?: string) {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  if (reason) sessionStorage.setItem('logout_reason', reason);
  window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { reason } }));
}

// Hard redirect only for critical auth failures (403 = banned, or retry-after-fresh-token still 401)
function forceLogout(reason?: string) {
  clearSession(reason);
  window.location.href = '/login';
}

async function tryRefresh(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return Promise.reject('no_refresh');

  _refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 15000 })
    .then(({ data }) => {
      // Le refresh token tourne à chaque appel (l'ancien est invalidé côté
      // serveur) — il faut stocker le nouveau à chaque fois, sinon le
      // rafraîchissement suivant échoue avec un token déjà consommé.
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken as string;
    })
    .catch((err) => {
      // Refresh failed — clear tokens but let components handle navigation
      // (avoids brutal window.location.href reload on normal pages)
      clearSession();
      return Promise.reject(err);
    })
    .finally(() => { _refreshPromise = null; });

  return _refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status: number = error.response?.status;
    const originalConfig = error.config;

    // No active session → never redirect anonymous users, just reject
    if (!hasSession()) return Promise.reject(error);

    // 403 handling:
    // – On the login endpoint: NEVER logout — just propagate so LoginPage can show the message.
    // – On any other endpoint during an active session: logout only if the account is truly
    //   banned/suspended (not for business errors like "boutique non approuvée", "limite atteinte").
    if (status === 403) {
      const isLoginCall = !!originalConfig.url?.includes('/auth/login');
      if (isLoginCall) return Promise.reject(error); // LoginPage handles it

      const msg: string = error.response?.data?.message || '';
      const isBanned = /banni|suspendu|banned|suspended|désactivé|disabled/i.test(msg);
      if (isBanned) {
        forceLogout(msg);
        return Promise.reject(error);
      }
      // All other 403s (boutique not approved, limits exceeded…) → just reject.
      return Promise.reject(error);
    }

    // Les endpoints d'auth eux-mêmes ne doivent jamais déclencher un refresh :
    // un 401 sur /auth/login (mauvais mot de passe) ou /auth/refresh (refresh
    // token expiré/déjà utilisé) est une réponse finale à propager telle
    // quelle — sinon on masque l'échec du login derrière un refresh qui,
    // s'il traîne ou échoue silencieusement, laisse le bouton de connexion
    // tourner indéfiniment (le finally { setLoading(false) } n'arrive jamais).
    const isAuthEndpoint = /\/auth\/(login|register|refresh)\b/.test(originalConfig?.url || '');
    if (isAuthEndpoint) return Promise.reject(error);

    // 401 after a retry → fresh token still rejected by server → hard logout
    if (status === 401 && originalConfig?._retry) {
      forceLogout('Session expirée');
      return Promise.reject(error);
    }

    // 401 first attempt + session exists → try refresh once
    if (status === 401 && !originalConfig?._retry) {
      originalConfig._retry = true;
      try {
        const newToken = await tryRefresh();
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return api(originalConfig);
      } catch {
        // tryRefresh already cleared tokens; propagate so component can navigate()
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
