import { useAuth } from "@/hooks/use-auth";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export function ProtectedLayout() {
  const { user, isAdmin, loading, sessionInvalid } = useAuth();
  if (loading) return <LazyFallback />;
  if (sessionInvalid || !user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

export function AdminAuthLayout() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <LazyFallback />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
