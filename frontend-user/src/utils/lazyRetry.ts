import { lazy, type ComponentType } from 'react';

/**
 * Remplace React.lazy() : un onglet resté ouvert depuis avant un nouveau
 * déploiement référence des noms de chunks JS qui n'existent plus sur le
 * serveur (remplacés par de nouveaux noms hashés) — l'import() échoue
 * silencieusement et, sans ça, la page reste bloquée en chargement
 * indéfiniment (aucune erreur visible, seul un hard refresh la débloque —
 * vu en prod : "je dois faire un hard refresh sinon ça tourne en rond").
 *
 * On détecte cet échec précis et on recharge la page UNE SEULE fois
 * (sessionStorage évite une boucle de rechargement infinie si l'échec a une
 * autre cause) — le rechargement récupère un index.html à jour référençant
 * les bons chunks, donc la page suivante s'ouvre normalement.
 */
export function lazyRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const RELOAD_FLAG = 'dp_chunk_reload_attempted';
    try {
      const module = await factory();
      sessionStorage.removeItem(RELOAD_FLAG);
      return module;
    } catch (err) {
      const alreadyRetried = sessionStorage.getItem(RELOAD_FLAG) === '1';
      if (!alreadyRetried) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
        // Ne résout jamais — le reload prend le relais avant que ça compte.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
}
