import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes for code splitting
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminTeams = lazy(() => import("./pages/admin/AdminTeams"));
const AdminGroups = lazy(() => import("./pages/admin/AdminGroups"));
const AdminMatches = lazy(() => import("./pages/admin/AdminMatches"));
const LiveDashboard = lazy(() => import("./pages/LiveDashboard"));

// Lazy-loaded route guards
const ProtectedLayout = lazy(() =>
  import("./components/AdminRouteGuard").then(m => ({ default: m.ProtectedLayout }))
);
const AdminAuthLayout = lazy(() =>
  import("./components/AdminRouteGuard").then(m => ({ default: m.AdminAuthLayout }))
);

// ─── QueryClient: hardened for resilience ────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      gcTime: 120_000,
      retry: (failureCount, error) => {
        const anyErr = error as any;
        const status = Number(anyErr?.status ?? anyErr?.code ?? 0);
        if (status === 401 || status === 403) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        const anyErr = error as any;
        const status = Number(anyErr?.status ?? anyErr?.code ?? 0);
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
    },
  },
});

// ─── Suspense fallback ────────────────────────────────────────────────────────

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <OfflineBanner />
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<LazyFallback />}>
            <Routes>
              <Route path="/" element={
                <ErrorBoundary fallbackTitle="Erro ao carregar a página inicial">
                  <Index />
                </ErrorBoundary>
              } />
              <Route path="/live" element={
                <ErrorBoundary fallbackTitle="Erro no painel ao vivo">
                  <LiveDashboard />
                </ErrorBoundary>
              } />

              {/* Single shared AuthProvider for ALL admin routes */}
              <Route element={<AuthProvider />}>
                <Route element={<AdminAuthLayout />}>
                  <Route path="/admin/login" element={<AdminLogin />} />
                </Route>
                <Route element={<ProtectedLayout />}>
                  <Route path="/admin" element={<ErrorBoundary fallbackTitle="Erro no painel admin"><AdminDashboard /></ErrorBoundary>} />
                  <Route path="/admin/categories" element={<ErrorBoundary fallbackTitle="Erro ao carregar categorias"><AdminCategories /></ErrorBoundary>} />
                  <Route path="/admin/teams" element={<ErrorBoundary fallbackTitle="Erro ao carregar duplas"><AdminTeams /></ErrorBoundary>} />
                  <Route path="/admin/groups" element={<ErrorBoundary fallbackTitle="Erro ao carregar grupos"><AdminGroups /></ErrorBoundary>} />
                  <Route path="/admin/matches" element={<ErrorBoundary fallbackTitle="Erro ao carregar partidas"><AdminMatches /></ErrorBoundary>} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
