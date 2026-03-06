import { createContext, useEffect, useRef, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { classifyError } from "@/lib/dataClient";
import { toast } from "@/hooks/use-toast";

export interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  sessionInvalid: boolean;
  signIn: (email: string, password: string) => ReturnType<typeof supabase.auth.signInWithPassword>;
  signOut: () => ReturnType<typeof supabase.auth.signOut>;
  handleSessionExpired: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionInvalid, setSessionInvalid] = useState(false);
  const initializedRef = useRef(false);
  const isAdminRef = useRef(false);

  const checkAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    } catch (err) {
      const classified = classifyError(err, "checkAdminRole");
      if (classified.category === "network" || classified.category === "server") {
        if (import.meta.env.DEV) console.warn("[AUTH] checkAdmin network error — keeping current admin state");
        return isAdminRef.current;
      }
      return false;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        setSessionInvalid(false);
      }

      setUser(session?.user ?? null);

      if (session?.user) {
        const admin = await checkAdmin(session.user.id);
        isAdminRef.current = admin;
        setIsAdmin(admin);
      } else {
        isAdminRef.current = false;
        setIsAdmin(false);
      }

      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    });

    const timeout = setTimeout(() => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        setLoading(false);
      }
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (!result.error) setSessionInvalid(false);
    return result;
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  const handleSessionExpired = () => {
    setSessionInvalid(true);
    toast({
      title: "Sessão expirada",
      description: "Sua sessão expirou. Por favor, faça login novamente.",
      variant: "destructive",
      duration: 8_000,
    });
    supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, sessionInvalid, signIn, signOut, handleSessionExpired }}>
      {children ?? <Outlet />}
    </AuthContext.Provider>
  );
}
