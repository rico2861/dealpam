import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

// Variante silencieuse d'ErrorBoundary pour les widgets globaux montés sur
// TOUTES les pages (LocationModal, SupportChatWidget...) : une exception dans
// l'un d'eux ne doit jamais faire planter le reste de l'app (checkout, panier,
// fiche produit...) via l'ErrorBoundary racine. En cas d'erreur, ce widget
// disparaît simplement au lieu de tout casser.
export default class SilentErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Widget global interrompu (isolé, reste de la page intact):', error, info);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
