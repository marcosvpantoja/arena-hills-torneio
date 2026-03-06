import { useState } from "react";
import { CATEGORY_STATUS_LABELS } from "@/types/tournament";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Trophy, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { safeOp, supabase } from "@/lib/dataClient";
import { useTournamentData } from "@/hooks/use-tournament-data";

const PRESET_CATEGORIES = ["Masculino", "Feminino", "Misto"];

const STATUS_STYLE: Record<string, string> = {
  setup:    "bg-gray-100 text-gray-700 border border-gray-200",
  groups:   "bg-secondary/10 text-secondary border border-secondary/30",
  playoffs: "bg-primary/10 text-primary border border-primary/25",
  finished: "bg-secondary/15 text-secondary border border-secondary/30",
};

export default function AdminCategories() {
  const { categories, loading, refetch } = useTournamentData();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addCategory = async (name: string) => {
    if (!name) return;
    setSaving(true);
    const result = await safeOp(
      { operation: "createCategory", table: "categories", extra: { name } },
      async () => {
        const res = await supabase.from("categories").insert({ name, status: "setup" as any });
        if (res.error) throw res.error;
        return res;
      }
    );
    setSaving(false);
    if (result !== null) {
      toast({ title: "Categoria criada!", description: name });
      setNewName("");
      refetch();
    }
  };

  const deleteCategory = async (id: string) => {
    const result = await safeOp(
      { operation: "deleteCategory", table: "categories", extra: { id } },
      async () => {
        const res = await supabase.from("categories").delete().eq("id", id);
        if (res.error) throw res.error;
        return res;
      }
    );
    if (result !== null) refetch();
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6 slide-up">
        <div>
          <h1 className="text-3xl font-display text-foreground">Categorias</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie as categorias do torneio (Masculino, Feminino, Misto)</p>
        </div>

        {/* Quick Add Presets */}
        <div className="card-flat rounded-xl p-5">
          <h2 className="font-display text-lg mb-3 text-foreground">Adicionar Rápido</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_CATEGORIES.map(name => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => addCategory(name)}
                disabled={saving || categories.some(c => c.name === name)}
                className="border-border text-foreground hover:border-primary hover:bg-primary hover:text-white text-base py-2 px-4 transition-all"
              >
                {name}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Nome personalizado..."
              className="border-border text-foreground text-base bg-background"
              onKeyDown={e => e.key === "Enter" && newName && addCategory(newName)}
            />
            <Button
              onClick={() => addCategory(newName)}
              disabled={!newName || saving}
              className="bg-primary hover:bg-brand-blue-dark text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-flat rounded-xl p-5 animate-pulse h-20 bg-gray-50" />
            ))
          ) : categories.length === 0 ? (
            <div className="card-flat rounded-xl p-10 text-center text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-lg text-foreground">Nenhuma categoria ainda. Adicione uma acima!</p>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="card-flat rounded-xl p-4 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-display text-xl text-foreground">{cat.name}</p>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold ${STATUS_STYLE[cat.status] ?? STATUS_STYLE.setup}`}>
                      {CATEGORY_STATUS_LABELS[cat.status] ?? cat.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cat.status === "setup" && (
                    <Link to="/admin/teams">
                      <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary hover:text-white text-sm gap-1 transition-all">
                        Gerenciar <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                  {cat.status === "setup" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCategory(cat.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Next step hint */}
        {categories.length > 0 && (
          <div className="card-flat rounded-xl p-4 border-primary/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display text-sm font-bold">2</span>
            </div>
            <div className="flex-1">
              <p className="font-display text-base text-foreground">Próximo passo: Cadastrar Duplas</p>
              <p className="text-xs text-muted-foreground">Cadastre as duplas participantes em cada categoria</p>
            </div>
            <Link to="/admin/teams">
              <Button size="sm" className="bg-primary hover:bg-brand-blue-dark text-white">
                Ir para Duplas <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}