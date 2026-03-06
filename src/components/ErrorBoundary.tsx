/**
 * React Error Boundary that catches render errors and shows a friendly
 * fallback instead of a white screen — without logging the user out.
 */
import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
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

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-destructive opacity-70" />
        <div>
          <p className="font-display text-xl text-foreground mb-1">
            {this.props.fallbackTitle ?? "Algo deu errado ao renderizar"}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            {this.props.fallbackDescription ??
              "Não se preocupe — nenhuma ação foi perdida. Tente recarregar os dados abaixo."}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-3 text-xs text-left bg-muted rounded-lg p-3 overflow-auto max-w-lg">
              {this.state.error.message}
            </pre>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.handleReset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Recarregar dados
          </Button>
          <Button variant="ghost" onClick={() => window.location.reload()} className="gap-2">
            Recarregar página
          </Button>
        </div>
      </div>
    );
  }
}
