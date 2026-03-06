import { useState, useMemo } from "react";
import type { Category } from "@/types/tournament";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { safeOp, supabase } from "@/lib/dataClient";
import { useTournamentData } from "@/hooks/use-tournament-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminTeams() {
  const { categories, teams, loading, refetch } = useTournamentData();
  const [newName, setNewName] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const teamsWithCategory = useMemo(() =>
    teams.map(t => ({
      ...t,
      category_name: categories.find(c => c.id === t.category_id)?.name ?? "",
    })),
    [teams, categories]
  );

  const editableCategories = useMemo(() =>
    categories.filter(c => c.status === "setup"),
    [categories]
  );

  const filtered = useMemo(() =>
    filterCat === "all" ? teamsWithCategory : teamsWithCategory.filter(t => t.category_id === filterCat),
    [teamsWithCategory, filterCat]
  );

  const addTeam = async () => {
    if (!newName || !selectedCat) return;
    setSaving(true);
    const result = await safeOp(
      { operation: "createTeam", table: "teams", extra: { name: newName } },
      async () => {
        const res = await supabase.from("teams").insert({ name: newName, category_id: selectedCat });
        if (res.error) throw res.error;
        return res;
      }
    );
    setSaving(false);
    if (result !== null) {
      toast({ title: "Dupla cadastrada!", description: newName });
      setNewName("");
      refetch();
    }
  };

  const deleteTeam = async (id: string, catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (cat && cat.status !== "setup") {
      toast({ title: "Não permitido", description: "Esta categoria já saiu da fase de configuração.", variant: "destructive" });
      return;
    }
    const result = await safeOp(
      { operation: "deleteTeam", table: "teams", extra: { id } },
      async () => {
        const res = await supabase.from("teams").delete().eq("id", id);
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
          <h1 className="text-3xl font-display text-foreground">Duplas</h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastre as duplas participantes do torneio</p>
        </div>

        {/* Add Team */}
        <div className="card-flat rounded-xl p-5">
          <h2 className="font-display text-lg mb-3 text-foreground">Cadastrar Nova Dupla</h2>
          {editableCategories.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              <p>Todas as categorias já saíram da fase de configuração.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Select onValueChange={setSelectedCat} value={selectedCat}>
                <SelectTrigger className="border-border text-foreground text-base h-12 bg-background">
                  <SelectValue placeholder="Selecionar categoria..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  {editableCategories.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-foreground text-base focus:bg-primary/10 focus:text-primary">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome da dupla (ex: João / Pedro)"
                  className="border-border text-foreground text-base h-12 bg-background"
                  onKeyDown={e => e.key === "Enter" && addTeam()}
                />
                <Button
                  onClick={addTeam}
                  disabled={!newName || !selectedCat || saving}
                  className="bg-primary hover:bg-brand-blue-dark text-white h-12 px-5"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCat("all")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
              filterCat === "all"
                ? "bg-primary text-white border-primary"
                : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
            }`}
          >
            Todas ({teamsWithCategory.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                filterCat === c.id
                  ? "bg-primary text-white border-primary"
                  : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
              }`}
            >
              {c.name} ({teamsWithCategory.filter(t => t.category_id === c.id).length})
            </button>
          ))}
        </div>

        {/* Teams List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-flat rounded-xl p-4 animate-pulse h-16 bg-gray-50" />
            ))
          ) : filtered.length === 0 ? (
            <div className="card-flat rounded-xl p-10 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-lg text-foreground">Nenhuma dupla cadastrada ainda.</p>
            </div>
          ) : (
            filtered.map((team, i) => {
              const cat = categories.find(c => c.id === team.category_id);
              const canDelete = cat?.status === "setup";
              return (
                <div key={team.id} className="card-flat rounded-xl p-4 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-display text-primary font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-display text-lg text-foreground">{team.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">{team.category_name}</p>
                    </div>
                  </div>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTeam(team.id, team.category_id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Next step */}
        {teamsWithCategory.length >= 2 && (
          <div className="card-flat rounded-xl p-4 border-primary/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-white font-display text-sm font-bold">3</span>
            </div>
            <div className="flex-1">
              <p className="font-display text-base text-foreground">Próximo passo: Criar Grupos</p>
              <p className="text-xs text-muted-foreground">Crie grupos e aloque as duplas</p>
            </div>
            <Link to="/admin/groups">
              <Button size="sm" className="bg-primary hover:bg-brand-blue-dark text-white">
                Ir para Grupos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}