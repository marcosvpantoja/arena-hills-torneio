import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logoArenaHills from "@/assets/logo-arena-hills.jpeg";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const { signIn }              = useAuth();
  const { toast }               = useToast();
  const navigate                = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Falha no login", description: error.message, variant: "destructive" });
    } else {
      navigate("/admin", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm slide-up">

        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <img src={logoArenaHills} alt="Arena Hills" className="w-16 h-16 rounded-full object-cover shadow-sm flex-shrink-0" loading="lazy" width={64} height={64} />
          <div>
            <p className="font-display text-2xl text-primary">Arena Hills</p>
            <p className="text-xs text-secondary uppercase tracking-widest mt-0.5 font-semibold">
              Admin · Beach Sports Club
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="card-flat rounded-xl p-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Entre com sua conta de administrador.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@arenahoma.com"
                required
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-11 border-border focus:border-primary focus:ring-primary"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary text-white hover:bg-brand-blue-dark font-semibold text-base"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Placar público →{" "}
          <a href="/live" className="text-primary font-medium hover:underline">/live</a>
        </p>

        {/* Dev credit */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Sistema desenvolvido por <span className="font-semibold">29Tech</span> ·{" "}
          <a
            href="https://vintenove.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            vintenove.com
          </a>
        </p>
      </div>
    </div>
  );
}
