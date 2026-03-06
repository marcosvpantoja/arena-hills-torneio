import { useState, useEffect, useRef, useMemo } from "react";
import { PHASE_LABELS, CATEGORY_STATUS_LABELS } from "@/types/tournament";
import type { Category, Group, Team, GroupMember, Podium } from "@/types/tournament";
import { computeStandings } from "@/lib/standings";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { EnrichedMatch } from "@/hooks/use-tournament-data";
import { safeOp, supabase } from "@/lib/dataClient";
import { Trophy, Users, Layers, Activity, ArrowRight, Trash2, ChevronRight, Medal, TrendingUp } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    setup: "bg-gray-100 text-gray-500 border-gray-200",
    groups: "bg-secondary/10 text-secondary border-secondary/25",
    playoffs: "bg-primary/10 text-primary border-primary/25",
    finished: "bg-secondary/15 text-secondary border-secondary/30",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${map[status] ?? map.setup}`}>
      {CATEGORY_STATUS_LABELS[status as keyof typeof CATEGORY_STATUS_LABELS] ?? status}
    </span>
  );
}

// ─── Bracket Match Card ───────────────────────────────────────────────────────

function BracketMatchCard({
  match,
  isFinal,
  isThird,
  isNew,
}: {
  match: EnrichedMatch;
  isFinal?: boolean;
  isThird?: boolean;
  isNew?: boolean;
}) {
  const winnerA = match.status === "finished" && match.winner_id === match.team_a_id;
  const winnerB = match.status === "finished" && match.winner_id === match.team_b_id;
  const isLive = match.status === "live";
  const isPending = match.status === "pending";

  return (
    <div
      className={`card-flat rounded-xl overflow-hidden transition-all duration-500 ${isNew ? "animate-fade-in" : ""} ${
        isLive
          ? "border-live/40 shadow-[0_0_12px_hsl(var(--live)/0.2)]"
          : isFinal && match.status === "finished"
            ? "border-secondary/30"
            : "border-border"
      }`}
    >
      <div
        className={`px-3 py-1.5 border-b border-border flex items-center gap-2 ${
          isLive ? "bg-live/6" : isFinal ? "bg-primary/5" : "bg-gray-50"
        }`}
      >
        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-live live-pulse shrink-0" />}
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${
            isLive ? "text-live" : isFinal ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isFinal ? "Final" : isThird ? "3º Lugar" : PHASE_LABELS[match.phase]}
        </span>
        {match.status === "finished" && <span className="ml-auto text-xs text-secondary font-semibold">Encerrada</span>}
      </div>
      <div className="p-2 space-y-1">
        {[
          { name: match.team_a_name, score: match.score_a, winner: winnerA },
          { name: match.team_b_name, score: match.score_b, winner: winnerB },
        ].map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm ${
              row.winner ? "bg-primary/10 border border-primary/20" : "bg-gray-50"
            }`}
          >
            <span
              className={`flex-1 truncate font-medium ${
                row.winner ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {row.name || "A definir"}
            </span>
            {!isPending && (
              <span className={`font-display text-base ml-2 shrink-0 ${row.winner ? "text-primary font-bold" : ""}`}>
                {row.score}
              </span>
            )}
            {row.winner && <ChevronRight className="w-3.5 h-3.5 text-primary ml-1 shrink-0" />}
          </div>
        ))}
        {isPending && <p className="text-xs text-center text-muted-foreground pt-0.5">Aguardando início</p>}
      </div>
    </div>
  );
}

// ─── Tournament Bracket ───────────────────────────────────────────────────────

function TournamentBracket({ matches }: { matches: EnrichedMatch[] }) {
  const [newMatchIds, setNewMatchIds] = useState<Set<string>>(new Set());
  const prevIds = useRef<Set<string>>(new Set(matches.map((m) => m.id)));

  useEffect(() => {
    const current = new Set(matches.map((m) => m.id));
    const added = new Set<string>();
    current.forEach((id) => {
      if (!prevIds.current.has(id)) added.add(id);
    });
    if (added.size > 0) {
      setNewMatchIds(added);
      setTimeout(() => setNewMatchIds(new Set()), 1500);
    }
    prevIds.current = current;
  }, [matches]);

  const quarters = useMemo(() => matches.filter((m) => m.phase === "quarter"), [matches]);
  const semis = useMemo(() => matches.filter((m) => m.phase === "semi"), [matches]);
  const final = useMemo(() => matches.filter((m) => m.phase === "final"), [matches]);
  const third = useMemo(() => matches.filter((m) => m.phase === "third_place"), [matches]);

  const columns = useMemo(() => {
    const cols = [
      quarters.length > 0 && { key: "quarter", title: "Quartas", matches: quarters },
      semis.length > 0 && { key: "semi", title: "Semifinais", matches: semis },
      final.length > 0 && { key: "final", title: "Final", matches: final, isFinal: true },
      third.length > 0 && { key: "third", title: "3º Lugar", matches: third, isThird: true },
      semis.length > 0 &&
        final.length === 0 && { key: "final-ph", title: "Final", matches: [] as EnrichedMatch[], isFinal: true },
    ].filter(Boolean) as {
      key: string;
      title: string;
      matches: EnrichedMatch[];
      isFinal?: boolean;
      isThird?: boolean;
    }[];
    return cols;
  }, [quarters, semis, final, third]);

  if (columns.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full bg-primary" />
        <p className="font-display text-base text-foreground">Chaveamento Eliminatório</p>
      </div>
      <div className="overflow-x-auto">
        <div
          className="grid gap-3 min-w-0"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(160px, 1fr))` }}
        >
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col gap-3">
              <div
                className={`text-center text-xs font-semibold py-1.5 px-2 rounded-lg border ${
                  col.isFinal
                    ? "text-primary border-primary/20 bg-primary/5"
                    : "text-muted-foreground border-border bg-gray-50"
                }`}
              >
                {col.isFinal && "🏆 "}
                {col.isThird && "🥉 "}
                {col.title}
              </div>
              {col.matches.length > 0 ? (
                col.matches.map((m) => (
                  <BracketMatchCard
                    key={m.id}
                    match={m}
                    isFinal={col.isFinal}
                    isThird={col.isThird}
                    isNew={newMatchIds.has(m.id)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Aguardando
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Group standings inline (memoized) ────────────────────────────────────────

function GroupStandings({
  group,
  teams,
  matches,
  groupMembers,
  standings,
}: {
  group: Group;
  teams: Team[];
  matches: EnrichedMatch[];
  groupMembers: GroupMember[];
  standings: ReturnType<typeof computeStandings>;
}) {
  const grpMatches = useMemo(
    () => matches.filter((m) => m.group_id === group.id && m.phase === "group"),
    [matches, group.id],
  );

  return (
    <div className="card-flat rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-gray-50">
        <p className="font-display text-sm text-foreground">{group.name}</p>
        <div className="flex items-center gap-2">
          {grpMatches.some((m) => m.status === "live") && (
            <span className="flex items-center gap-1 text-xs text-live font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-live live-pulse" /> Ao vivo
            </span>
          )}
          {group.is_closed && <span className="text-xs text-secondary font-semibold">Encerrado</span>}
        </div>
      </div>

      {standings.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2 label-xs">#</th>
              <th className="text-left px-4 py-2 label-xs">Dupla</th>
              <th className="text-center px-2 py-2 label-xs">V</th>
              <th className="text-center px-2 py-2 label-xs">D</th>
              <th className="text-center px-2 py-2 label-xs">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team_id} className={`border-b border-border/30 ${i < 2 ? "bg-primary/5" : ""}`}>
                <td className="px-4 py-2.5">
                  <span
                    className={`font-display text-sm ${i < 2 ? "text-primary font-bold" : "text-muted-foreground"}`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-medium text-sm">
                  {s.team_name}
                  {i < 2 && group.is_closed && <span className="ml-1.5 text-xs text-secondary font-bold">↑</span>}
                </td>
                <td className="px-2 py-2.5 text-center text-success font-display font-bold">{s.wins}</td>
                <td className="px-2 py-2.5 text-center text-destructive font-display">{s.losses}</td>
                <td
                  className={`px-2 py-2.5 text-center font-display ${s.saldo >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {s.saldo > 0 ? "+" : ""}
                  {s.saldo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {grpMatches.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border space-y-1.5">
          {grpMatches.map((m) => (
            <div key={m.id} className="flex items-center text-sm py-0.5 gap-2">
              <span
                className={`flex-1 text-right truncate text-sm ${m.winner_id === m.team_a_id ? "text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                {m.team_a_name}
              </span>
              <span
                className={`font-display text-sm shrink-0 px-2 min-w-[52px] text-center ${
                  m.status === "live"
                    ? "text-live"
                    : m.status === "finished"
                      ? "text-foreground font-bold"
                      : "text-muted-foreground"
                }`}
              >
                {m.status === "pending" ? "×" : `${m.score_a}—${m.score_b}`}
                {m.status === "live" && <span className="ml-1 live-pulse">●</span>}
              </span>
              <span
                className={`flex-1 truncate text-sm ${m.winner_id === m.team_b_id ? "text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                {m.team_b_name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  cat,
  groups,
  teams,
  matches,
  groupMembers,
  podium,
  standingsMap,
}: {
  cat: Category;
  groups: Group[];
  teams: Team[];
  matches: EnrichedMatch[];
  groupMembers: GroupMember[];
  podium?: Podium;
  standingsMap: Record<string, ReturnType<typeof computeStandings>>;
}) {
  const catGroups = useMemo(() => groups.filter((g) => g.category_id === cat.id), [groups, cat.id]);
  const catTeams = useMemo(() => teams.filter((t) => t.category_id === cat.id), [teams, cat.id]);
  const catMatches = useMemo(() => matches.filter((m) => m.category_id === cat.id), [matches, cat.id]);
  const playoffMs = useMemo(() => catMatches.filter((m) => m.phase !== "group"), [catMatches]);

  const getName = (id: string | null) => (id ? (catTeams.find((t) => t.id === id)?.name ?? "—") : "—");

  return (
    <div className="card-flat rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gray-50">
        <div className="flex items-center gap-3">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              cat.status === "finished"
                ? "bg-secondary"
                : cat.status === "playoffs"
                  ? "bg-primary"
                  : cat.status === "groups"
                    ? "bg-secondary"
                    : "bg-gray-300"
            }`}
          />
          <p className="font-display text-base text-foreground">{cat.name}</p>
          <StatusBadge status={cat.status} />
        </div>
        <Link to="/admin/matches">
          <Button size="sm" variant="ghost" className="h-8 px-3 text-xs text-muted-foreground hover:text-primary gap-1">
            Partidas <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      <div className="p-5 space-y-5">
        {cat.status === "finished" && podium && (
          <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-5 text-center">
            <Trophy className="w-6 h-6 text-secondary mx-auto mb-2" />
            <p className="font-display text-base text-secondary mb-4">Pódio Final</p>
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-2xl mb-1">🥈</p>
                <p className="text-sm text-muted-foreground font-medium">{getName(podium.second_place_id)}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl mb-1">🥇</p>
                <p className="text-base font-bold text-primary">{getName(podium.first_place_id)}</p>
              </div>
              {podium.third_place_id && (
                <div className="text-center">
                  <p className="text-2xl mb-1">🥉</p>
                  <p className="text-sm text-muted-foreground font-medium">{getName(podium.third_place_id)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {catGroups.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-secondary" />
              <p className="font-display text-sm text-foreground uppercase tracking-wide">Fase de Grupos</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {catGroups.map((g) => (
                <GroupStandings
                  key={g.id}
                  group={g}
                  teams={catTeams}
                  matches={catMatches}
                  groupMembers={groupMembers}
                  standings={standingsMap[g.id] ?? []}
                />
              ))}
            </div>
          </div>
        )}

        {playoffMs.length > 0 && <TournamentBracket matches={playoffMs} />}

        {catGroups.length === 0 && playoffMs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum grupo ou partida configurada ainda.</p>
            <Link to="/admin/groups" className="mt-2 inline-block">
              <Button size="sm" variant="ghost" className="text-sm text-primary">
                Configurar grupos <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { toast } = useToast();
  const { categories, teams, groups, groupMembers, matches, podiums, loading, refetch } = useTournamentData({
    refreshMs: 2000,
  });

  const [resetting, setResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const stats = useMemo(
    () => ({
      teams: teams.length,
      groups: groups.length,
      live: matches.filter((m) => m.status === "live").length,
      finished: matches.filter((m) => m.status === "finished").length,
    }),
    [teams, groups, matches],
  );

  const liveMatches = useMemo(() => matches.filter((m) => m.status === "live"), [matches]);

  // Pre-compute standings for all groups
  const standingsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeStandings>> = {};
    for (const group of groups) {
      const memberIds = groupMembers.filter((gm) => gm.group_id === group.id).map((gm) => gm.team_id);
      const groupTeams = teams.filter((t) => memberIds.includes(t.id));
      const catMatches = matches.filter((m) => m.category_id === group.category_id);
      map[group.id] = computeStandings(catMatches as any[], groupTeams, group.id);
    }
    return map;
  }, [groups, groupMembers, teams, matches]);

  const handleResetAll = async () => {
    setResetting(true);
    await safeOp({ operation: "resetAllData", table: "categories" }, async () => {
      const noop = "00000000-0000-0000-0000-000000000000";
      for (const table of ["podium", "matches", "group_members", "groups", "teams", "categories"] as const) {
        const res = await supabase
          .from(table as any)
          .delete()
          .neq("id", noop);
        if (res.error) throw res.error;
      }
    });
    toast({ title: "Dados resetados", description: "Todos os dados foram apagados." });
    refetch();
    setResetting(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 slide-up max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral do torneio</p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 gap-2 text-xs">
                <Trash2 className="w-3.5 h-3.5" /> Resetar Tudo
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-background border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Resetar todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá apagar <strong>todas</strong> as categorias, duplas, grupos, partidas e pódios. Esta ação não
                  pode ser desfeita.
                  <br />
                  <br />
                  <span className="text-foreground font-medium">Digite "RESETAR" para confirmar:</span>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="RESETAR"
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border text-foreground">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetAll}
                  disabled={resetConfirmText !== "RESETAR" || resetting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {resetting ? "Apagando..." : "Confirmar Reset"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Categorias", value: categories.length, icon: Trophy, color: "text-primary" },
            { label: "Duplas", value: stats.teams, icon: Users, color: "text-foreground" },
            { label: "Ao Vivo", value: stats.live, icon: Activity, color: "text-live" },
            { label: "Finalizadas", value: stats.finished, icon: TrendingUp, color: "text-secondary" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-flat rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className={`font-display text-2xl ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live ticker */}
        {liveMatches.length > 0 && (
          <div className="card-flat rounded-xl border-live/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-live live-pulse" />
              <p className="text-sm font-bold text-live uppercase tracking-wider">Ao Vivo</p>
            </div>
            <div className="space-y-2">
              {liveMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm py-1.5 px-3 rounded-lg bg-live/5">
                  <span className="font-display flex-1 text-right truncate">{m.team_a_name}</span>
                  <span className="font-display text-lg text-live px-3 shrink-0">
                    {m.score_a}—{m.score_b}
                  </span>
                  <span className="font-display flex-1 truncate">{m.team_b_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category sections */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card-flat rounded-xl p-8 animate-pulse h-48 bg-gray-50" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="card-flat rounded-xl p-12 text-center">
            <Layers className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-display text-lg text-foreground">Nenhuma categoria criada</p>
            <Link to="/admin/categories" className="mt-3 inline-block">
              <Button className="bg-primary hover:bg-brand-blue-dark text-white gap-2">
                <Trophy className="w-4 h-4" /> Criar Categorias
              </Button>
            </Link>
          </div>
        ) : (
          categories.map((cat) => (
            <CategorySection
              key={cat.id}
              cat={cat}
              groups={groups}
              teams={teams}
              matches={matches}
              groupMembers={groupMembers}
              podium={podiums.find((p) => p.category_id === cat.id)}
              standingsMap={standingsMap}
            />
          ))
        )}
      </div>
    </AdminLayout>
  );
}
