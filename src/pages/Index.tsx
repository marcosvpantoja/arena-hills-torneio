import { Link } from "react-router-dom";
import { Shield, Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoArenaHills from "@/assets/logo-arena-hills.jpeg";

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="text-center max-w-lg slide-up space-y-8">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-4">
          <img src={logoArenaHills} alt="Arena Hills Beach Sports Club" className="w-32 h-32 rounded-full object-cover shadow-md" loading="lazy" width={128} height={128} />
          <div>
            <h1 className="font-display text-4xl text-primary leading-none">Arena Hills</h1>
            <p className="text-secondary text-sm uppercase tracking-[0.2em] mt-1 font-semibold">
              Beach Sports Club
            </p>
          </div>
        </div>

        <p className="text-muted-foreground text-base max-w-xs mx-auto">
          Placar em tempo real, classificação ao vivo e chaveamento automático.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/live">
            <Button className="bg-primary text-white hover:bg-brand-blue-dark gap-2 w-full sm:w-auto h-11 px-6 text-base">
              <Eye className="w-4 h-4" />
              Placar ao Vivo
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/admin/login">
            <Button variant="outline" className="border-border hover:border-primary hover:text-primary gap-2 w-full sm:w-auto h-11 px-6 text-base">
              <Shield className="w-4 h-4" />
              Painel Admin
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-center pt-2">
          {[
            { label: "Tempo Real", emoji: "⚡" },
            { label: "Classificação", emoji: "🏆" },
            { label: "Chaveamento", emoji: "🎯" },
          ].map(({ label, emoji }) => (
            <div key={label} className="card-flat rounded-lg p-4">
              <div className="text-2xl mb-1.5">{emoji}</div>
              <p className="text-sm font-medium text-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Dev credit */}
        <p className="text-xs text-muted-foreground pt-2">
          Sistema desenvolvido por <span className="font-semibold">29Tech</span> ·{" "}
          <a
            href="https://vintenove.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            vintenove.com
          </a>
        </p>
      </div>
    </div>
  );
}
