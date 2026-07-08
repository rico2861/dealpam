import { useSnackbar } from 'notistack';

/**
 * Interface optimiste générique : applique le changement visuel
 * immédiatement (`apply`), envoie la requête serveur en arrière-plan, et
 * revient automatiquement à l'état précédent (`rollback`) si le serveur
 * répond une erreur — avec un avertissement non intrusif, jamais silencieux.
 *
 * Réservé aux actions à faible risque (favoris, panier, like, quantité).
 * Ne jamais utiliser pour paiement, suppression définitive, ou toute action
 * irréversible/coûteuse — celles-ci doivent attendre la confirmation réelle
 * du serveur (voir LoadingButton / useActionState).
 */
export function useOptimisticAction() {
  const { enqueueSnackbar } = useSnackbar();

  async function run<T>({
    apply, request, rollback, errorMessage,
  }: {
    apply: () => void;
    request: () => Promise<T>;
    rollback: () => void;
    errorMessage?: string;
  }): Promise<T | undefined> {
    apply();
    try {
      return await request();
    } catch (err: any) {
      rollback();
      enqueueSnackbar(
        errorMessage || err?.response?.data?.message || "L'action n'a pas abouti — réessayez.",
        { variant: 'error' },
      );
      return undefined;
    }
  }

  return { run };
}
