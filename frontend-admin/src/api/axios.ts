import axios from 'axios';
import { useAdminStore } from '../store/admin.store';

const BASE_URL = import.meta.env.VITE_API_URL || '/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let _refreshPromise: Promise<string> | null = null;

// Purge le store (déclenche AuthGuard → <Navigate to="/login"> côté client,
// sans jamais recharger la page — évite le "crash" sur Hostinger où une
// navigation directe vers une route imbriquée renvoie une 404).
function logout(reason?: string) {
  if (reason) sessionStorage.setItem('logout_reason', reason);
  useAdminStore.getState().logout();
}

async function tryRefresh(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;
  const refreshToken = localStorage.getItem('admin_refresh_token');
  if (!refreshToken) return Promise.reject('no_refresh');

  _refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh`, { refreshToken })
    .then(({ data }) => {
      // Le refresh token tourne à chaque appel (l'ancien est invalidé côté
      // serveur) — il faut stocker le nouveau à chaque fois, sinon le
      // rafraîchissement suivant échoue avec un token déjà consommé.
      localStorage.setItem('admin_token', data.accessToken);
      localStorage.setItem('admin_refresh_token', data.refreshToken);
      return data.accessToken as string;
    })
    .catch((err) => {
      logout('Session expirée');
      return Promise.reject(err);
    })
    .finally(() => { _refreshPromise = null; });

  return _refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const originalConfig = error.config;
    const hasSession = !!localStorage.getItem('admin_token');

    if (!hasSession) return Promise.reject(error);

    // 401 après une tentative de rafraîchissement → refresh token invalide/expiré aussi → déconnexion
    if (status === 401 && originalConfig?._retry) {
      logout('Session expirée');
      return Promise.reject(error);
    }

    // 401 première fois → tente un rafraîchissement silencieux avant d'abandonner
    if (status === 401 && !originalConfig?._retry) {
      originalConfig._retry = true;
      try {
        const newToken = await tryRefresh();
        originalConfig.headers.Authorization = `Bearer ${newToken}`;
        return api(originalConfig);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
