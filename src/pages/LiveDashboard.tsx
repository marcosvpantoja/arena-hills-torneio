import { useState, useEffect, useRef, useMemo } from "react";
import { PHASE_LABELS } from "@/types/tournament";
import type { Podium, Group, Team, GroupMember } from "@/types/tournament";
import { computeStandings } from "@/lib/standings";
import { Trophy, Share2, Medal, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTournamentData } from "@/hooks/use-tournament-data";
import type { EnrichedMatch } from "@/hooks/use-tournament-data";
import logoArenaHills from "@/assets/logo-arena-hills.jpeg";

// ─── Podium Screen ────────────────────────────────────────────────────────────

function PodiumScreen({ podium, teams, categoryName }: { podium: Podium; teams: Team[]; categoryName: string }) {
  const getName = (id: string | null) => (id ? (teams.find((t) => t.id === id)?.name ?? "—") : "—");

  return (
    <div className="card-flat rounded-xl p-8 border-primary/20 text-center slide-up">
      <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
      <h2 className="font-display text-3xl text-primary mb-1">Pódio Final</h2>
      <p className="text-muted-foreground text-sm mb-8 uppercase tracking-widest">{categoryName}</p>

      <div className="flex items-end justify-center gap-4 mb-6">
        <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="text-5xl mb-2">🥈</div>
          <div className="bg-gray-100 rounded-xl px-5 py-3 h-24 flex items-end justify-center mb-3">
            <span className="font-display text-3xl text-muted-foreground">2</span>
          </div>
          <p className="font-display text-base text-center max-w-28 leading-tight">{getName(podium.second_place_id)}</p>
        </div>

        <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: "0s" }}>
          <div className="text-6xl mb-2">🥇</div>
          <div className="bg-primary/10 border-2 border-primary/30 rounded-xl px-7 py-3 h-36 flex items-end justify-center mb-3">
            <span className="font-display text-4xl text-primary">1</span>
          </div>
          <p className="font-display text-xl text-primary text-center max-w-36 leading-tight">
            {getName(podium.first_place_id)}
          </p>
        </div>

        {podium.third_place_id && (
          <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="text-5xl mb-2">🥉</div>
            <div className="bg-gray-100 rounded-xl px-5 py-3 h-16 flex items-end justify-center mb-3">
              <span className="font-display text-3xl text-muted-foreground">3</span>
            </div>
            <p className="font-display text-base text-center max-w-28 leading-tight">
              {getName(podium.third_place_id)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bracket Match Card ───────────────────────────────────────────────────────

function BracketMatchCard({
  match,
  isNew,
  isFinal,
  isThird,
}: {
  match: EnrichedMatch;
  isNew: boolean;
  isFinal?: boolean;
  isThird?: boolean;
}) {
  const winnerA = match.status === "finished" && match.winner_id === match.team_a_id;
  const winnerB = match.status === "finished" && match.winner_id === match.team_b_id;
  const isLive = match.status === "live";
  const isPending = match.status === "pending";

  return (
    <div
      className={`card-flat rounded-xl overflow-hidden transition-all duration-700 ${isNew ? "animate-fade-in" : ""} ${
        isLive
          ? "border-live/40 shadow-[0_0_14px_hsl(var(--live)/0.2)]"
          : isFinal && match.status === "finished"
            ? "border-secondary/40"
            : "border-border"
      }`}
    >
      <div
        className={`px-3 py-1.5 flex items-center justify-between border-b border-border ${
          isLive ? "bg-live/8" : isFinal ? "bg-primary/5" : "bg-gray-50"
        }`}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
            isLive ? "text-live" : isFinal ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-live live-pulse" />}
          {isFinal ? "🏆 Final" : isThird ? "🥉 3º Lugar" : PHASE_LABELS[match.phase]}
        </span>
        {match.status === "finished" && <span className="text-xs text-secondary font-semibold">Encerrada</span>}
        {isLive && <span className="text-xs text-live font-semibold uppercase tracking-wider">Ao Vivo</span>}
      </div>

      <div className="p-2 space-y-1">
        {[
          { name: match.team_a_name, score: match.score_a, winner: winnerA },
          { name: match.team_b_name, score: match.score_b, winner: winnerB },
        ].map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-3 py-2 rounded-lg ${
              row.winner ? "bg-primary/10 border border-primary/20" : "bg-gray-50"
            }`}
          >
            <span
              className={`font-medium text-sm flex-1 truncate ${
                row.winner ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {row.name || "A definir"}
            </span>
            {!isPending && (
              <span className={`font-display text-lg ml-2 shrink-0 ${row.winner ? "text-primary" : "text-foreground"}`}>
                {row.score}
              </span>
            )}
            {row.winner && <ChevronRight className="w-4 h-4 text-primary ml-1 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bracket Column ───────────────────────────────────────────────────────────

function BracketColumn({
  title,
  matches,
  newMatchIds,
  isFinal,
  isThird,
}: {
  title: string;
  matches: EnrichedMatch[];
  newMatchIds: Set<string>;
  isFinal?: boolean;
  isThird?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`text-center text-xs font-semibold uppercase tracking-wider px-2 py-1.5 rounded-lg border ${
          isFinal ? "text-primary border-primary/25 bg-primary/5" : "text-muted-foreground border-border bg-gray-50"
        }`}
      >
        {isFinal && "🏆 "}
        {isThird && "🥉 "}
        {title}
      </div>
      <div className="flex flex-col gap-3">
        {matches.map((m) => (
          <BracketMatchCard key={m.id} match={m} isNew={newMatchIds.has(m.id)} isFinal={isFinal} isThird={isThird} />
        ))}
        {matches.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Aguardando
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tournament Bracket ───────────────────────────────────────────────────────

function TournamentBracket({ matches }: { matches: EnrichedMatch[] }) {
  const [newMatchIds, setNewMatchIds] = useState<Set<string>>(new Set());
  const prevMatchIds = useRef<Set<string>>(new Set(matches.map((m) => m.id)));

  useEffect(() => {
    const current = new Set(matches.map((m) => m.id));
    const added = new Set<string>();
    current.forEach((id) => {
      if (!prevMatchIds.current.has(id)) added.add(id);
    });
    if (added.size > 0) {
      setNewMatchIds(added);
      setTimeout(() => setNewMatchIds(new Set()), 1500);
    }
    prevMatchIds.current = current;
  }, [matches]);

  const quarters = useMemo(() => matches.filter((m) => m.phase === "quarter"), [matches]);
  const semis = useMemo(() => matches.filter((m) => m.phase === "semi"), [matches]);
  const final = useMemo(() => matches.filter((m) => m.phase === "final"), [matches]);
  const third = useMemo(() => matches.filter((m) => m.phase === "third_place"), [matches]);

  const columns = useMemo(() => {
    const cols: { key: string; title: string; matches: EnrichedMatch[]; isFinal?: boolean; isThird?: boolean }[] = [];
    if (quarters.length > 0) cols.push({ key: "quarter", title: "Quartas de Final", matches: quarters });
    if (semis.length > 0) cols.push({ key: "semi", title: "Semifinais", matches: semis });
    if (final.length > 0) cols.push({ key: "final", title: "Final", matches: final, isFinal: true });
    if (third.length > 0) cols.push({ key: "third", title: "3º Lugar", matches: third, isThird: true });
    if (semis.length > 0 && final.length === 0) {
      cols.push({ key: "final-ph", title: "Final", matches: [], isFinal: true });
    }
    return cols;
  }, [quarters, semis, final, third]);

  if (columns.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1 h-5 rounded-full bg-primary" />
        <h2 className="font-display text-xl text-foreground">Chaveamento</h2>
      </div>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <div
          className="grid gap-4 min-w-0"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(180px, 1fr))` }}
        >
          {columns.map((col) => (
            <BracketColumn
              key={col.key}
              title={col.title}
              matches={col.matches}
              newMatchIds={newMatchIds}
              isFinal={col.isFinal}
              isThird={col.isThird}
            />
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-6">
        {columns.map((col) => (
          <div key={col.key}>
            <div className="flex items-center gap-2 mb-3">
              {col.isFinal && <Trophy className="w-4 h-4 text-primary" />}
              {col.isThird && <Medal className="w-4 h-4 text-muted-foreground" />}
              <span
                className={`font-display text-base uppercase tracking-wider ${
                  col.isFinal ? "text-primary" : col.isThird ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {col.title}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {col.matches.length > 0 ? (
                col.matches.map((m) => (
                  <BracketMatchCard
                    key={m.id}
                    match={m}
                    isNew={newMatchIds.has(m.id)}
                    isFinal={col.isFinal}
                    isThird={col.isThird}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Aguardando rodada anterior
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function LiveDashboard() {
  const { toast } = useToast();
  const { categories, teams, groups, groupMembers, matches, podiums, loading, refetch } = useTournamentData({
    refreshMs: 750,
    pollInBackground: true,
  });

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !selectedCat) {
      setSelectedCat(categories[0].id);
    }
  }, [categories, selectedCat]);

  const shareLink = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "Torneio de Vôlei Arena Hills – Placar ao Vivo", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!", description: "Compartilhe com os participantes." });
    }
  };

  // Memoized derived data
  const liveMatches = useMemo(() => matches.filter((m) => m.status === "live"), [matches]);
  const catGroups = useMemo(() => groups.filter((g) => g.category_id === selectedCat), [groups, selectedCat]);
  const catTeams = useMemo(() => teams.filter((t) => t.category_id === selectedCat), [teams, selectedCat]);
  const catMatches = useMemo(() => matches.filter((m) => m.category_id === selectedCat), [matches, selectedCat]);
  const groupMatches = useMemo(() => catMatches.filter((m) => m.phase === "group"), [catMatches]);
  const playoffMatches = useMemo(() => catMatches.filter((m) => m.phase !== "group"), [catMatches]);
  const selectedCatObj = useMemo(() => categories.find((c) => c.id === selectedCat), [categories, selectedCat]);
  const selectedCatName = selectedCatObj?.name ?? "";
  const catPodium = useMemo(() => podiums.find((p) => p.category_id === selectedCat), [podiums, selectedCat]);

  // Memoized standings per group
  const groupStandingsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeStandings>> = {};
    for (const group of catGroups) {
      const memberIds = groupMembers.filter((gm) => gm.group_id === group.id).map((gm) => gm.team_id);
      const groupTeams = catTeams.filter((t) => memberIds.includes(t.id));
      map[group.id] = computeStandings(catMatches as any[], groupTeams, group.id);
    }
    return map;
  }, [catGroups, groupMembers, catTeams, catMatches]);

  const STATUS_STYLE: Record<string, string> = {
    setup: "border-gray-200 text-muted-foreground bg-gray-50",
    groups: "border-secondary/30 text-secondary bg-secondary/8 font-semibold",
    playoffs: "border-primary/30 text-primary bg-primary/8 font-semibold",
    finished: "border-secondary/40 text-secondary bg-secondary/10 font-semibold",
  };
  const STATUS_LABEL: Record<string, string> = {
    setup: "Configuração",
    groups: "⚡ Fase de Grupos",
    playoffs: "🎯 Fase Eliminatória",
    finished: "🏆 Encerrado",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-primary">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoArenaHills}
              alt="Arena Hills"
              className="w-10 h-10 rounded-full object-cover"
              loading="lazy"
              width={40}
              height={40}
            />
            <div>
              <p className="font-display text-base text-white leading-none">Arena Hills</p>
              <p className="text-xs text-brand-lime mt-0.5 uppercase tracking-widest font-semibold">
                Beach Sports Club
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {liveMatches.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-live live-pulse" />
                <span className="text-xs font-semibold text-white">{liveMatches.length} ao vivo</span>
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                setRefreshing(true);
                await refetch();
                setRefreshing(false);
              }}
              disabled={refreshing}
              className="text-white/70 hover:text-white hover:bg-white/10 text-xs h-8 gap-1.5"
              title="Atualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={shareLink}
              className="text-white/70 hover:text-white hover:bg-white/10 text-xs h-8 gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Compartilhar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6 space-y-6">
        {/* Live Ticker */}
        {liveMatches.length > 0 && (
          <div className="card-flat rounded-xl border-live/30 border p-4 slide-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-live live-pulse" />
              <p className="text-sm font-bold text-live uppercase tracking-wider">Ao Vivo Agora</p>
            </div>
            <div className="space-y-2">
              {liveMatches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-live/5 border border-live/10"
                >
                  <span className="font-display text-sm flex-1 text-right truncate">{m.team_a_name}</span>
                  <span className="font-display text-xl text-live px-4 shrink-0">
                    {m.score_a} — {m.score_b}
                  </span>
                  <span className="font-display text-sm flex-1 truncate">{m.team_b_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  selectedCat === cat.id
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "border-border text-foreground hover:border-primary hover:text-primary bg-white"
                }`}
              >
                {cat.name}
                {cat.status === "finished" && " 🏆"}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-flat rounded-xl p-6 animate-pulse h-36 bg-gray-50" />
            ))}
          </div>
        ) : (
          <>
            {/* Phase badge */}
            {selectedCatObj && (
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-3 py-1 rounded-full border ${STATUS_STYLE[selectedCatObj.status] ?? STATUS_STYLE.setup}`}
                >
                  {STATUS_LABEL[selectedCatObj.status] ?? selectedCatObj.status}
                </span>
              </div>
            )}

            {/* Podium */}
            {selectedCatObj?.status === "finished" && catPodium && (
              <PodiumScreen podium={catPodium} teams={catTeams} categoryName={selectedCatName} />
            )}

            {/* Group Stage */}
            {catGroups.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-secondary" />
                  <h2 className="font-display text-xl text-foreground">Fase de Grupos</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {catGroups.map((group) => {
                    const standings = groupStandingsMap[group.id] ?? [];
                    const grpMatches = groupMatches.filter((m) => m.group_id === group.id);

                    return (
                      <div key={group.id} className="card-flat rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gray-50">
                          <p className="font-display text-sm text-foreground">{group.name}</p>
                          {group.is_closed ? (
                            <span className="text-xs text-secondary font-semibold">Encerrado</span>
                          ) : grpMatches.some((m) => m.status === "live") ? (
                            <span className="flex items-center gap-1 text-xs text-live font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-live live-pulse" /> Ao vivo
                            </span>
                          ) : null}
                        </div>

                        {standings.length > 0 && (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-gray-50/50">
                                <th className="text-left px-4 py-2 label-xs">#</th>
                                <th className="text-left px-4 py-2 label-xs">Dupla</th>
                                <th className="text-center px-2 py-2 label-xs">V</th>
                                <th className="text-center px-2 py-2 label-xs">D</th>
                                <th className="text-center px-2 py-2 label-xs">Saldo</th>
                                <th className="text-center px-2 py-2 label-xs">PF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {standings.map((s, i) => (
                                <tr
                                  key={s.team_id}
                                  className={`border-b border-border/30 ${i < 2 ? "bg-primary/5" : ""}`}
                                >
                                  <td className="px-4 py-2.5">
                                    <span
                                      className={`font-display text-sm ${i < 2 ? "text-primary font-bold" : "text-muted-foreground"}`}
                                    >
                                      {i + 1}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 font-medium text-sm">
                                    {s.team_name}
                                    {i < 2 && group.is_closed && (
                                      <span className="ml-1.5 text-xs text-secondary font-bold">↑</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2.5 text-center text-success font-display font-bold">
                                    {s.wins}
                                  </td>
                                  <td className="px-2 py-2.5 text-center text-destructive font-display">{s.losses}</td>
                                  <td
                                    className={`px-2 py-2.5 text-center font-display ${s.saldo >= 0 ? "text-success" : "text-destructive"}`}
                                  >
                                    {s.saldo > 0 ? "+" : ""}
                                    {s.saldo}
                                  </td>
                                  <td className="px-2 py-2.5 text-center text-muted-foreground text-sm">
                                    {s.points_for}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {grpMatches.length > 0 && (
                          <div className="px-4 py-3 border-t border-border space-y-1.5">
                            <p className="label-xs mb-2">Partidas</p>
                            {grpMatches.map((m) => (
                              <div key={m.id} className="flex items-center text-sm gap-2 py-0.5">
                                <span
                                  className={`flex-1 text-right truncate text-sm ${m.winner_id === m.team_a_id ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                                >
                                  {m.team_a_name}
                                </span>
                                <span
                                  className={`font-display text-sm shrink-0 px-2 min-w-[60px] text-center ${
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

                        {grpMatches.length === 0 && standings.length === 0 && (
                          <p className="text-center text-muted-foreground text-sm py-5">Partidas ainda não geradas</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Playoff Bracket */}
            {playoffMatches.length > 0 && <TournamentBracket matches={playoffMatches} />}

            {/* Empty state */}
            {catGroups.length === 0 && playoffMatches.length === 0 && (
              <div className="card-flat rounded-xl p-12 text-center">
                <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p className="font-display text-lg text-foreground">Torneio em configuração</p>
                <p className="text-sm text-muted-foreground mt-1">Os grupos e partidas aparecerão aqui em breve.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-8 py-5">
        <p className="text-center text-xs text-muted-foreground">
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
      </footer>
    </div>
  );
}
