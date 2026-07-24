import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Rede de segurança contra tela em branco: qualquer erro não tratado durante a
 * renderização de uma tela mostra uma mensagem visível com opção de recarregar,
 * em vez de deixar o app inteiro sumir silenciosamente.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro não tratado na interface do ROTA:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream-50 px-6 text-center">
          <span className="text-4xl">🌿</span>
          <p className="text-lg font-extrabold text-brand-900">Algo não saiu como esperado</p>
          <p className="text-sm text-brand-500">
            Tivemos um problema para carregar esta tela. Tente novamente — se persistir, avise sua profissional ou
            equipe de suporte.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-bold text-white active:scale-[0.98]"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
