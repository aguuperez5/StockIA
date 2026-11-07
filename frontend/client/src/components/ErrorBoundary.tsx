import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-shell" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-icon" aria-hidden="true">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h2 className="error-boundary-title">
                Se produjo un problema inesperado en la vista
              </h2>
              <p className="error-boundary-desc">
                Los datos de tu inventario están seguros. Podés recargar la
                aplicación o volver al panel principal para continuar operando.
              </p>
            </div>

            {this.state.error && (
              <details className="error-boundary-details">
                <summary>Ver detalle técnico del error</summary>
                <pre>
                  {this.state.error.message}
                  {this.state.error.stack ? `\n\n${this.state.error.stack}` : ""}
                </pre>
              </details>
            )}

            <div className="error-boundary-actions">
              <button
                type="button"
                className="button-primary"
                onClick={() => window.location.reload()}
              >
                <RotateCcw size={16} />
                Recargar aplicación
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/";
                }}
              >
                <Home size={16} />
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
