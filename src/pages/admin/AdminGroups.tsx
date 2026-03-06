import { useState, useEffect, useMemo } from "react";
import { safeOp, supabase, mapDbError } from "@/lib/dataClient";
import type { Category, Team, Group, GroupMember } from "@/types/tournament";
import { computeStandings } from "@/lib/standings";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Layers, X, Lock, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTournamentData } from "@/hooks/use-tournament-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GroupWithMembers extends Group {
  members: (GroupMember & { team_name: string })[];
  matchesGenerated?: boolean;
}

export default function AdminGroups() {
  const {
    categories,
    teams: allTeamsRaw,
    groups: allGroupsRaw,
    groupMembers: allMembersRaw,
    matches: allMatchesRaw,
    loading,
    refetch,
  } = useTournamentData();

  const [selectedCat, setSelectedCat] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [addTeamTo, setAddTeamTo] = useState<string>("");
  const [addTeamId, setAddTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [closingStage, setClosingStage] = useState(false);
  const { toast } = useToast();

  const selectedCatObj = useMemo(() => categories.find((c) => c.id === selectedCat) ?? null, [categories, selectedCat]);

  const teams = useMemo(() => allTeamsRaw.filter((t) => t.category_id === selectedCat), [allTeamsRaw, selectedCat]);

  const groups = useMemo<GroupWithMembers[]>(() => {
    const catGroups = allGroupsRaw.filter((g) => g.category_id === selectedCat);
    const catMembers = allMembersRaw.filter((gm) => catGroups.some((g) => g.id === gm.group_id));
    const matchGroupIds = new Set(
      allMatchesRaw.filter((m) => m.category_id === selectedCat && m.phase === "group").map((m) => m.group_id),
    );

    return catGroups.map((g) => ({
      ...g,
      members: catMembers
        .filter((m) => m.group_id === g.id)
        .map((m) => ({
          ...m,
          team_name: allTeamsRaw.find((t) => t.id === m.team_id)?.name ?? "Desconhecido",
        })),
      matchesGenerated: matchGroupIds.has(g.id),
    }));
  }, [allGroupsRaw, allMembersRaw, allMatchesRaw, allTeamsRaw, selectedCat]);

  const isSetupPhase = selectedCatObj?.status === "setup";
  const isGroupsPhase = selectedCatObj?.status === "groups";

  const createGroup = async () => {
    if (!newGroupName || !selectedCat || !isSetupPhase) return;
    setSaving(true);
    const { error } = await supabase.from("groups").insert({ name: newGroupName, category_id: selectedCat });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar grupo", description: mapDbError(error), variant: "destructive" });
    } else {
      setNewGroupName("");
      refetch();
    }
  };

  const deleteGroup = async (groupId: string) => {
    await supabase.from("groups").delete().eq("id", groupId);
    refetch();
  };

  const addTeamToGroup = async (groupId: string, teamId: string) => {
    if (!isSetupPhase) return;
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, team_id: teamId });
    if (error) {
      toast({ title: "Erro ao adicionar dupla", description: mapDbError(error), variant: "destructive" });
    } else {
      setAddTeamTo("");
      setAddTeamId("");
      refetch();
    }
  };

  const removeFromGroup = async (memberId: string) => {
    if (!isSetupPhase) return;
    await supabase.from("group_members").delete().eq("id", memberId);
    refetch();
  };

  /** Generate round-robin matches for all groups and advance category to 'groups' phase */
  const generateAllMatches = async () => {
    if (!selectedCat) return;

    const assignedTeamIds = groups.flatMap((g) => g.members.map((m) => m.team_id));
    const unassigned = teams.filter((t) => !assignedTeamIds.includes(t.id));
    if (unassigned.length > 0) {
      toast({
        title: "Duplas sem grupo",
        description: `${unassigned.length} dupla(s) ainda não foram alocadas em grupos: ${unassigned.map((t) => t.name).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (groups.length === 0) {
      toast({ title: "Nenhum grupo criado", variant: "destructive" });
      return;
    }

    setSaving(true);

    const allInserts: any[] = [];
    let globalOrder = 0;

    for (const group of groups) {
      if (group.members.length < 2) continue;
      const teamIds = group.members.map((m) => m.team_id);
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          allInserts.push({
            category_id: selectedCat,
            group_id: group.id,
            team_a_id: teamIds[i],
            team_b_id: teamIds[j],
            phase: "group",
            match_order: globalOrder++,
          });
        }
      }
    }

    if (allInserts.length === 0) {
      toast({ title: "Nenhuma partida para gerar", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error: matchError } = await supabase.from("matches").insert(allInserts as any);
    if (matchError) {
      toast({ title: "Erro ao gerar partidas", description: mapDbError(matchError), variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error: catError } = await supabase
      .from("categories")
      .update({ status: "groups" as any })
      .eq("id", selectedCat);

    setSaving(false);
    if (catError) {
      toast({ title: "Erro ao avançar fase", description: mapDbError(catError), variant: "destructive" });
    } else {
      toast({
        title: "Fase de Grupos iniciada! ⚡",
        description: `${allInserts.length} partidas geradas. Agora registre os placares!`,
      });
      refetch();
    }
  };

  /** Close group stage */
  const closeGroupStage = async () => {
    if (!selectedCat) return;
    setClosingStage(true);

    const { data: allMatches } = await supabase
      .from("matches")
      .select("*")
      .eq("category_id", selectedCat)
      .eq("phase", "group");

    const unfinished = (allMatches ?? []).filter((m) => m.status !== "finished");
    if (unfinished.length > 0) {
      toast({
        title: "Há partidas não encerradas",
        description: `${unfinished.length} partida(s) da fase de grupos ainda não foram encerradas.`,
        variant: "destructive",
      });
      setClosingStage(false);
      return;
    }

    const advancingByGroup = groups.map((group) => {
      const memberIds = group.members.map((member) => member.team_id);
      const groupTeams = teams.filter((team) => memberIds.includes(team.id));
      return computeStandings((allMatches ?? []) as any[], groupTeams, group.id)
        .slice(0, 2)
        .map((standing) => standing.team_id);
    });

    if (advancingByGroup.some((teamIds) => teamIds.length < 2)) {
      toast({
        title: "ClassificaÃ§Ã£o insuficiente",
        description: "Cada grupo precisa ter duas duplas classificadas antes de encerrar a fase de grupos.",
        variant: "destructive",
      });
      setClosingStage(false);
      return;
    }

    const advancingTeams = advancingByGroup.flat();

    let phase: "final" | "semi" | "quarter";
    let matchups: [string, string][];

    if (advancingTeams.length === 8 && advancingByGroup.length === 4) {
      phase = "quarter";
      matchups = [
        [advancingByGroup[0][0], advancingByGroup[3][1]],
        [advancingByGroup[1][0], advancingByGroup[2][1]],
        [advancingByGroup[2][0], advancingByGroup[1][1]],
        [advancingByGroup[3][0], advancingByGroup[0][1]],
      ];
    } else if (advancingTeams.length === 4 && advancingByGroup.length === 2) {
      phase = "semi";
      matchups = [
        [advancingByGroup[0][0], advancingByGroup[1][1]],
        [advancingByGroup[1][0], advancingByGroup[0][1]],
      ];
    } else if (advancingTeams.length === 2) {
      phase = "final";
      matchups = [[advancingTeams[0], advancingTeams[1]]];
    } else {
      toast({
        title: "Formato de chaveamento nÃ£o suportado",
        description: "O sistema gera automaticamente mata-mata para 2, 4 ou 8 classificadas.",
        variant: "destructive",
      });
      setClosingStage(false);
      return;
    }

    await supabase.from("groups").update({ is_closed: true }).eq("category_id", selectedCat);
    const playoffInserts = matchups.map(([a, b], idx) => ({
      category_id: selectedCat,
      group_id: null,
      team_a_id: a,
      team_b_id: b,
      phase,
      match_order: idx,
    }));

    const { error: matchErr } = await supabase.from("matches").insert(playoffInserts as any);

    if (matchErr) {
      toast({ title: "Erro ao gerar playoffs", description: mapDbError(matchErr), variant: "destructive" });
      setClosingStage(false);
      return;
    }

    await supabase
      .from("categories")
      .update({ status: "playoffs" as any })
      .eq("id", selectedCat);

    setClosingStage(false);
    const phaseLabel = phase === "quarter" ? "quartas de final" : phase === "semi" ? "semifinais" : "final";
    toast({
      title: "Fase Eliminatória gerada! 🎯",
      description: `${matchups.length} ${phaseLabel} gerada(s). As top 2 de cada grupo avançam automaticamente.`,
    });
    refetch();
  };

  const getAvailableTeams = (groupId: string) =>
    teams.filter((t) => !groups.some((g) => g.members.some((m) => m.team_id === t.id)));

  const allGroupsHaveMatches = groups.length > 0 && groups.every((g) => g.matchesGenerated || g.members.length < 2);
  const canGenerateMatches = isSetupPhase && groups.length > 0;

  return (
    <AdminLayout>
      <div className="max-w-3xl space-y-6 slide-up">
        <div>
          <h1 className="text-3xl font-display text-foreground">Grupos</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie grupos e aloque as duplas (máx. 4 por grupo)</p>
        </div>

        {/* Select Category */}
        <div className="card-flat rounded-xl p-5">
          <h2 className="font-display text-lg mb-3 text-foreground">Selecionar Categoria</h2>
          <Select onValueChange={setSelectedCat} value={selectedCat}>
            <SelectTrigger className="border-border text-foreground text-base h-12 bg-background">
              <SelectValue placeholder="Escolha uma categoria..." />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {categories.map((c) => (
                <SelectItem
                  key={c.id}
                  value={c.id}
                  className="text-foreground text-base focus:bg-primary/10 focus:text-primary"
                >
                  {c.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    (
                    {c.status === "setup"
                      ? "Configuração"
                      : c.status === "groups"
                        ? "Fase de Grupos"
                        : c.status === "playoffs"
                          ? "Playoffs"
                          : "Encerrado"}
                    )
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCat && (
          <>
            {/* Phase info banner */}
            {!isSetupPhase && (
              <div
                className={`card-flat rounded-xl p-4 flex items-center gap-3 ${
                  selectedCatObj?.status === "groups"
                    ? "border-secondary/30 bg-secondary/5"
                    : selectedCatObj?.status === "playoffs"
                      ? "border-primary/25 bg-primary/5"
                      : "border-secondary/30 bg-secondary/5"
                }`}
              >
                {selectedCatObj?.status === "playoffs" || selectedCatObj?.status === "finished" ? (
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <Lock className="w-5 h-5 text-secondary flex-shrink-0" />
                )}
                <div>
                  <p className="font-display text-base text-foreground">
                    {selectedCatObj?.status === "groups" &&
                      "Fase de Grupos em andamento — grupos bloqueados para edição"}
                    {selectedCatObj?.status === "playoffs" && "Fase Eliminatória em andamento — grupos encerrados"}
                    {selectedCatObj?.status === "finished" && "Torneio encerrado para esta categoria"}
                  </p>
                  {(selectedCatObj?.status === "groups" || selectedCatObj?.status === "playoffs") && (
                    <Link to="/admin/matches">
                      <Button size="sm" className="bg-primary hover:bg-brand-blue-dark text-white mt-2">
                        Ver Partidas <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Create Group — only in setup */}
            {isSetupPhase && (
              <div className="card-flat rounded-xl p-5">
                <h2 className="font-display text-lg mb-3 text-foreground">Criar Grupo</h2>
                <div className="flex gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Grupo A, Grupo B, ..."
                    className="border-border text-foreground text-base h-12 bg-background"
                    onKeyDown={(e) => e.key === "Enter" && createGroup()}
                  />
                  <Button
                    onClick={createGroup}
                    disabled={!newGroupName || saving}
                    className="bg-primary hover:bg-brand-blue-dark text-white h-12 px-5"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Groups */}
            <div className="space-y-4">
              {loading ? (
                <div className="card-flat rounded-xl p-8 animate-pulse h-32 bg-gray-50" />
              ) : groups.length === 0 ? (
                <div className="card-flat rounded-xl p-10 text-center">
                  <Layers className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg text-foreground">Nenhum grupo criado para esta categoria.</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.id} className={`card-flat rounded-xl p-5 ${group.is_closed ? "opacity-80" : ""}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Layers className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-display text-2xl text-foreground">{group.name}</h3>
                          <span className="text-xs text-muted-foreground font-medium">
                            {group.members.length}/4 duplas
                          </span>
                        </div>
                        {group.is_closed && (
                          <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-semibold uppercase">
                            <Lock className="w-3 h-3" /> Encerrado
                          </span>
                        )}
                        {group.matchesGenerated && !group.is_closed && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/25 font-semibold uppercase">
                            <Zap className="w-3 h-3 inline mr-1" />
                            Partidas Geradas
                          </span>
                        )}
                      </div>
                      {isSetupPhase && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteGroup(group.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Members */}
                    <div className="space-y-2 mb-3">
                      {group.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">Nenhuma dupla ainda</p>
                      ) : (
                        group.members.map((m, i) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50 border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {i + 1}
                              </span>
                              <span className="font-medium text-base text-foreground">{m.team_name}</span>
                            </div>
                            {isSetupPhase && (
                              <button
                                onClick={() => removeFromGroup(m.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Team — only in setup */}
                    {isSetupPhase && group.members.length < 4 && (
                      <div className="flex gap-2">
                        <Select
                          value={addTeamTo === group.id ? addTeamId : ""}
                          onValueChange={(v) => {
                            setAddTeamTo(group.id);
                            setAddTeamId(v);
                          }}
                        >
                          <SelectTrigger className="border-border text-foreground text-sm h-10 bg-background">
                            <SelectValue placeholder="Adicionar dupla..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-border">
                            {getAvailableTeams(group.id).map((t) => (
                              <SelectItem
                                key={t.id}
                                value={t.id}
                                className="text-foreground focus:bg-primary/10 focus:text-primary"
                              >
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => addTeamToGroup(group.id, addTeamId)}
                          disabled={addTeamTo !== group.id || !addTeamId}
                          className="bg-primary hover:bg-brand-blue-dark text-white h-10 px-4"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Generate Matches CTA — only in setup */}
            {canGenerateMatches && (
              <div className="card-flat rounded-xl p-5 border-primary/25">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-primary">Gerar Partidas da Fase de Grupos</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gera todos os confrontos (todos contra todos) e inicia a fase de grupos. Esta ação não pode ser
                      desfeita.
                    </p>
                  </div>
                  <Button
                    onClick={generateAllMatches}
                    disabled={saving || groups.every((g) => g.members.length < 2)}
                    className="bg-primary hover:bg-brand-blue-dark text-white font-display text-base px-6 py-5 whitespace-nowrap"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Gerando...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" /> Gerar Partidas
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Close Group Stage CTA — only when groups phase is active */}
            {isGroupsPhase && (
              <div className="card-flat rounded-xl p-5 border-primary/25">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-foreground">Encerrar Fase de Grupos</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Todos os jogos devem estar finalizados. As top 2 duplas de cada grupo avançam para as Semifinais.
                    </p>
                  </div>
                  <Button
                    onClick={closeGroupStage}
                    disabled={closingStage}
                    className="bg-primary hover:bg-brand-blue-dark text-white font-display text-base px-6 py-5 whitespace-nowrap"
                  >
                    {closingStage ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Processando...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-2" /> Encerrar Grupos
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
