import { Component, type ErrorInfo, type ReactNode } from "react";
import { House, RotateCcw } from "lucide-react";
import { StateView } from "@/components/ui/state-view";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Fängt Renderfehler ab und zeigt einen ruhigen Fehlerzustand mit Wiederholen. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unerwarteter Fehler:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHome = () => {
    if (typeof window !== "undefined") window.location.hash = "#/";
    this.handleReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-4 pb-safe pt-safe">
          <StateView
            kind="error"
            titleAs="h1"
            title="Etwas ist schiefgelaufen"
            description="Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
            action={{ label: "Erneut versuchen", icon: RotateCcw, onClick: this.handleReset }}
            secondaryAction={{ label: "Zur Startseite", icon: House, onClick: this.handleHome }}
          >
            {this.state.error && import.meta.env.DEV && (
              <pre className="max-w-sm overflow-x-auto whitespace-pre-wrap break-all rounded-md border border-border bg-surface-sunken p-3 text-left font-mono text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            )}
          </StateView>
        </main>
      );
    }

    return this.props.children;
  }
}
