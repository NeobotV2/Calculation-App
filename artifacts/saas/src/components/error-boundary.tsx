import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2 text-foreground">Etwas ist schiefgelaufen</h1>
          <p className="text-muted-foreground mb-6 max-w-xs text-sm">
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
          </p>
          {this.state.error && import.meta.env.DEV && (
            <div className="mb-6 p-3 bg-card border border-border/40 rounded-xl max-w-sm w-full">
              <p className="text-xs text-muted-foreground font-mono break-all">{this.state.error.message}</p>
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <RotateCcw size={16} /> Erneut versuchen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
