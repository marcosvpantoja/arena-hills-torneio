import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { PHASE_LABELS } from "@/types/tournament";
import type { Category } from "@/types/tournament";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTournamentData, TOURNAMENT_QUERY_KEY } from "@/hooks/use-tournament-data";
import type { EnrichedMatch, TournamentData } from "@/hooks/use-tournament-data";
import { withPerf, safeOp, supabase } from "@/lib/dataClient";
import { useQueryClient } from "@tanstack/react-query";
import {
  Play,
  CheckCircle,
  Minus,
  Plus,
  Trophy,
  RefreshCw,
  Lock,
  ChevronRight,
  Loader2,
  Medal,
  Zap,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Score control ────────────────────────────────────────────────────────────

function ScoreControl({
  value,
  onInc,
  onDec,
  disabled,
  saving,
}: {
  value: number;
  onInc: () => void;
  onDec: () => void;
  disabled: boolean;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9 hover:bg-primary/20 hover:text-primary rounded-lg"
        onClick={onInc}
        disabled={disabled}
      >
        <Plus className="w-4 h-4" />
      </Button>
      <div className="relative">
        <span className="font-display text-4xl text-primary w-14 text-center leading-none py-1 block">{value}</span>
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground absolute -top-1 -right-1" />}
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-9 w-9 hover:bg-destructive/20 hover:text-destructive rounded-lg"
        onClick={onDec}
        disabled={disabled || value === 0}
      >
        <Minus className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Match card for bracket ───────────────────────────────────────────────────

function BracketCard({
  match,
  saving,
  scoreSaving,
  catFinished,
  isFinal,
  isThird,
  onStart,
  onFinish,
  onReopen,
  onInc,
  onDec,
}: {
  match: EnrichedMatch;
  saving: boolean;
  scoreSaving?: boolean;
  catFinished: boolean;
  isFinal?: boolean;
  isThird?: boolean;
  onStart: () => void;
  onFinish: () => void;
  onReopen: () => void;
  onInc: (field: "score_a" | "score_b") => void;
  onDec: (field: "score_a" | "score_b") => void;
}) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const isPending = match.status === "pending";
  const winnerA = isFinished && match.winner_id === match.team_a_id;
  const winnerB = isFinished && match.winner_id === match.team_b_id;
  const hasScore = match.score_a !== match.score_b;

  return (
    <div
      className={`card-flat rounded-xl overflow-hidden transition-all duration-300 ${
        isLive
          ? "border-live/40 shadow-[0_0_16px_hsl(var(--live)/0.2)]"
          : isFinished && isFinal
            ? "border-secondary/30"
            : isFinished
              ? "border-border"
              : "border-border"
      }`}
    >
      <div
        className={`px-4 py-2 flex items-center justify-between border-b border-border ${
          isLive ? "bg-live/6" : isFinal ? "bg-primary/5" : "bg-gray-50"
        }`}
      >
        <span
          className={`font-display text-xs uppercase tracking-widest flex items-center gap-1.5 ${
            isLive ? "text-live" : isFinal ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isLive && <span className="w-1.5 h-1.5 rounded-full bg-live live-pulse" />}
          {isFinal ? "🏆 Final" : isThird ? "🥉 3º Lugar" : PHASE_LABELS[match.phase]}
        </span>
        {!catFinished && (
          <div className="flex items-center gap-2">
            {isPending && (
              <Button
                size="sm"
                onClick={onStart}
                disabled={saving}
                className="bg-live/20 border border-live/40 text-live hover:bg-live/30 text-xs h-7 px-3 font-display uppercase tracking-wider"
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Iniciar
                  </>
                )}
              </Button>
            )}
            {isLive && (
              <Button
                size="sm"
                onClick={onFinish}
                disabled={saving || !hasScore}
                className="bg-success/20 border border-success/40 text-success hover:bg-success/30 text-xs h-7 px-3 font-display uppercase tracking-wider"
                title={!hasScore ? "Placar empatado – defina um vencedor" : ""}
              >
                {saving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Encerrar
                  </>
                )}
              </Button>
            )}
            {isFinished && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onReopen}
                disabled={saving}
                className="text-muted-foreground hover:text-foreground text-xs h-7 px-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reabrir
              </Button>
            )}
          </div>
        )}
        {catFinished && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" /> Encerrado
          </span>
        )}
      </div>
      <div className="p-4">
        {isLive ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 text-right">
              <p className="font-display text-lg leading-tight">{match.team_a_name}</p>
            </div>
            <ScoreControl
              value={match.score_a}
              onInc={() => onInc("score_a")}
              onDec={() => onDec("score_a")}
              disabled={saving || catFinished}
              saving={scoreSaving}
            />
            <span className="font-display text-2xl text-muted-foreground">—</span>
            <ScoreControl
              value={match.score_b}
              onInc={() => onInc("score_b")}
              onDec={() => onDec("score_b")}
              disabled={saving || catFinished}
              saving={scoreSaving}
            />
            <div className="flex-1 text-left">
              <p className="font-display text-lg leading-tight">{match.team_b_name}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                winnerA ? "bg-primary/10 border border-primary/20" : "bg-gray-50"
              }`}
            >
              <span
                className={`font-display text-base truncate flex-1 ${winnerA ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"}`}
              >
                {match.team_a_name || "A definir"}
              </span>
              {!isPending && (
                <span
                  className={`font-display text-xl ml-2 shrink-0 ${winnerA ? "text-primary font-bold" : "text-foreground"}`}
                >
                  {match.score_a}
                </span>
              )}
              {winnerA && <ChevronRight className="w-4 h-4 text-primary ml-1 shrink-0" />}
            </div>
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                winnerB ? "bg-primary/10 border border-primary/20" : "bg-gray-50"
              }`}
            >
              <span
                className={`font-display text-base truncate flex-1 ${winnerB ? "text-primary" : isPending ? "text-muted-foreground" : "text-foreground"}`}
              >
                {match.team_b_name || "A definir"}
              </span>
              {!isPending && (
                <span
                  className={`font-display text-xl ml-2 shrink-0 ${winnerB ? "text-primary font-bold" : "text-foreground"}`}
                >
                  {match.score_b}
                </span>
              )}
              {winnerB && <ChevronRight className="w-4 h-4 text-primary ml-1 shrink-0" />}
            </div>
            {isPending && (
              <p className="text-xs text-center text-muted-foreground pt-1">Inicie a partida para registrar o placar</p>
            )}
          </div>
        )}
        {saving && (
          <div className="flex justify-center mt-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Bracket column ───────────────────────────────────────────────────────────

function BracketColumn({
  title,
  matches,
  saving,
  savingId,
  savingScores,
  categories,
  catFinished,
  isFinal,
  isThird,
  onAction,
}: {
  title: string;
  matches: EnrichedMatch[];
  saving: boolean;
  savingId: string | null;
  savingScores: Record<string, boolean>;
  categories: Category[];
  catFinished: (catId: string) => boolean;
  isFinal?: boolean;
  isThird?: boolean;
  onAction: (
    type: "start" | "finish" | "reopen" | "inc" | "dec",
    matchId: string,
    field?: "score_a" | "score_b",
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-[230px]">
      <div
        className={`text-center font-display text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border ${
          isFinal
            ? "text-primary border-primary/25 bg-primary/5"
            : isThird
              ? "text-muted-foreground border-border bg-gray-50"
              : "text-foreground border-border bg-gray-50"
        }`}
      >
        {isFinal && <Trophy className="w-3 h-3 inline mr-1" />}
        {isThird && <Medal className="w-3 h-3 inline mr-1" />}
        {title}
      </div>
      <div className="flex flex-col gap-3 flex-1 justify-around">
        {matches.length > 0 ? (
          matches.map((m) => (
            <BracketCard
              key={m.id}
              match={m}
              saving={savingId === m.id}
              scoreSaving={savingScores[m.id]}
              catFinished={catFinished(m.category_id)}
              isFinal={isFinal}
              isThird={isThird}
              onStart={() => onAction("start", m.id)}
              onFinish={() => onAction("finish", m.id)}
              onReopen={() => onAction("reopen", m.id)}
              onInc={(field) => onAction("inc", m.id, field)}
              onDec={(field) => onAction("dec", m.id, field)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border/40 p-6 text-center text-xs text-muted-foreground">
            Aguardando rodada anterior
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminMatches() {
  const { categories, matches: rawMatches, loading, refetch } = useTournamentData({ refreshMs: 1000 });
  const queryClient = useQueryClient();
  const [filterCat, setFilterCat] = useState("all");
  const [viewMode, setViewMode] = useState<"bracket" | "list">("bracket");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [finalizingCat, setFinalizingCat] = useState<string | null>(null);
  const [localScores, setLocalScores] = useState<Record<string, { a: number; b: number }>>({});
  const pendingUpdates = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [savingScores, setSavingScores] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Ref mirror for localScores — always current, no stale closures
  const localScoresRef = useRef(localScores);
  useEffect(() => {
    localScoresRef.current = localScores;
  }, [localScores]);

  // Clear localScores when fresh data arrives (e.g. after tab focus refetch)
  useEffect(() => {
    if (!rawMatches.length) return;
    setLocalScores((prev) => {
      const next: typeof prev = {};
      let changed = false;
      for (const key of Object.keys(prev)) {
        if (pendingUpdates.current[key]) {
          next[key] = prev[key]; // keep entries with pending debounce
        } else {
          changed = true; // will be removed
        }
      }
      return changed ? next : prev;
    });
  }, [rawMatches]);

  // Safety timeout: if savingScores stays true for >5s, force clear + refetch
  useEffect(() => {
    const savingIds = Object.entries(savingScores)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (savingIds.length === 0) return;
    const timer = setTimeout(() => {
      setSavingScores((s) => {
        const next = { ...s };
        for (const id of savingIds) next[id] = false;
        return next;
      });
      refetch();
    }, 5000);
    return () => clearTimeout(timer);
  }, [savingScores, refetch]);

  // Flush all pending score writes on unmount
  useEffect(() => {
    return () => {
      Object.entries(pendingUpdates.current).forEach(([matchId, timerId]) => {
        clearTimeout(timerId);
        const scores = localScoresRef.current[matchId];
        if (scores) {
          supabase.from("matches").update({ score_a: scores.a, score_b: scores.b }).eq("id", matchId);
        }
      });
      pendingUpdates.current = {};
    };
  }, []);

  // Helper: optimistic cache update for matches
  const optimisticUpdateMatch = (matchId: string, patch: Partial<EnrichedMatch>) => {
    queryClient.setQueryData<TournamentData>(TOURNAMENT_QUERY_KEY as unknown as readonly string[], (old) => {
      if (!old) return old;
      return {
        ...old,
        matches: old.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m)),
      };
    });
  };

  const clearLocalStateForMatches = (matchIds: string[]) => {
    if (matchIds.length === 0) return;

    setLocalScores((prev) => {
      const next = { ...prev };
      matchIds.forEach((id) => delete next[id]);
      localScoresRef.current = next;
      return next;
    });

    setSavingScores((prev) => {
      const next = { ...prev };
      matchIds.forEach((id) => delete next[id]);
      return next;
    });

    matchIds.forEach((id) => {
      if (pendingUpdates.current[id]) {
        clearTimeout(pendingUpdates.current[id]);
        delete pendingUpdates.current[id];
      }
    });
  };

  const optimisticResetDependentProgress = (categoryId: string, phasesToRemove: EnrichedMatch["phase"][]) => {
    const current = queryClient.getQueryData<TournamentData>(TOURNAMENT_QUERY_KEY as unknown as readonly string[]);
    const removedMatchIds = (current?.matches ?? [])
      .filter((match) => match.category_id === categoryId && phasesToRemove.includes(match.phase))
      .map((match) => match.id);

    clearLocalStateForMatches(removedMatchIds);

    queryClient.setQueryData<TournamentData>(TOURNAMENT_QUERY_KEY as unknown as readonly string[], (old) => {
      if (!old) return old;

      return {
        ...old,
        categories: old.categories.map((category) =>
          category.id === categoryId ? { ...category, status: "playoffs" } : category,
        ),
        matches: old.matches.filter(
          (match) => match.category_id !== categoryId || !phasesToRemove.includes(match.phase),
        ),
        podiums: old.podiums.filter((podium) => podium.category_id !== categoryId),
      };
    });
  };

  const rollbackDependentProgress = async (match: EnrichedMatch) => {
    if (match.phase === "group") return;

    const phasesToRemove: EnrichedMatch["phase"][] =
      match.phase === "quarter"
        ? ["semi", "final", "third_place"]
        : match.phase === "semi"
          ? ["final", "third_place"]
          : [];

    optimisticResetDependentProgress(match.category_id, phasesToRemove);

    const operations: Promise<any>[] = [
      supabase
        .from("podium" as any)
        .delete()
        .eq("category_id", match.category_id),
      supabase
        .from("categories")
        .update({ status: "playoffs" as any })
        .eq("id", match.category_id),
    ];

    if (phasesToRemove.length === 1) {
      operations.push(
        supabase
          .from("matches")
          .delete()
          .eq("category_id", match.category_id)
          .eq("phase", phasesToRemove[0] as any),
      );
    } else if (phasesToRemove.length > 1) {
      operations.push(
        (supabase.from("matches").delete().eq("category_id", match.category_id) as any).in("phase", phasesToRemove),
      );
    }

    const results = await Promise.all(operations);
    const failed = results.find((result) => result?.error);
    if (failed?.error) {
      toast({ title: "Erro ao reabrir chaveamento", description: "Tente novamente.", variant: "destructive" });
      await refetch();
      return;
    }

    if (phasesToRemove.length > 0) {
      toast({
        title: "Próxima fase resetada",
        description: "As partidas dependentes foram removidas e serão geradas novamente após os novos resultados.",
      });
    }
  };

  const catFinished = useCallback(
    (catId: string) => categories.find((c: Category) => c.id === catId)?.status === "finished",
    [categories],
  );

  // ── Score updates with optimistic UI + debounced DB write ──────────────────

  const updateScore = (matchId: string, field: "score_a" | "score_b", delta: number) => {
    const match = rawMatches.find((m) => m.id === matchId);
    if (!match || match.status === "finished") return;

    const prev = localScoresRef.current[matchId] ?? { a: match.score_a, b: match.score_b };
    const next = {
      a: field === "score_a" ? Math.max(0, prev.a + delta) : prev.a,
      b: field === "score_b" ? Math.max(0, prev.b + delta) : prev.b,
    };

    localScoresRef.current = { ...localScoresRef.current, [matchId]: next };
    setLocalScores((s) => ({ ...s, [matchId]: next }));

    optimisticUpdateMatch(matchId, { score_a: next.a, score_b: next.b });

    clearTimeout(pendingUpdates.current[matchId]);
    pendingUpdates.current[matchId] = setTimeout(async () => {
      const latest = localScoresRef.current[matchId];
      if (!latest) return;

      setSavingScores((s) => ({ ...s, [matchId]: true }));
      try {
        const res = await supabase.from("matches").update({ score_a: latest.a, score_b: latest.b }).eq("id", matchId);
        if (res.error) {
          toast({ title: "Erro ao salvar placar", description: "Tente novamente.", variant: "destructive" });
          refetch();
        }
      } catch {
        toast({ title: "Erro ao salvar placar", description: "Tente novamente.", variant: "destructive" });
        refetch();
      } finally {
        setSavingScores((s) => ({ ...s, [matchId]: false }));
      }
      delete pendingUpdates.current[matchId];
    }, 150);
  };

  // ── Status changes ─────────────────────────────────────────────────────────

  const setStatus = async (matchId: string, status: "live" | "finished" | "pending") => {
    const match = rawMatches.find((m) => m.id === matchId);
    if (!match) return;
    setSavingId(matchId);

    const localScore = localScores[matchId];
    const scoreA = localScore?.a ?? match.score_a;
    const scoreB = localScore?.b ?? match.score_b;

    const updates: Record<string, unknown> = { status, score_a: scoreA, score_b: scoreB };

    if (status === "finished") {
      if (scoreA > scoreB) updates.winner_id = match.team_a_id;
      else if (scoreB > scoreA) updates.winner_id = match.team_b_id;
      else {
        toast({
          title: "Placar empatado",
          description: "Defina um vencedor antes de encerrar.",
          variant: "destructive",
        });
        setSavingId(null);
        return;
      }
    }
    if (status === "live" || status === "pending") {
      updates.winner_id = null;
    }

    clearTimeout(pendingUpdates.current[matchId]);

    // Optimistic update — UI responds instantly
    optimisticUpdateMatch(matchId, {
      status: status as EnrichedMatch["status"],
      score_a: scoreA,
      score_b: scoreB,
      winner_id: (updates.winner_id as string) ?? null,
    });
    setSavingId(null);

    // Fire DB update directly (no safeOp wrapper)
    try {
      const res = await supabase
        .from("matches")
        .update(updates as any)
        .eq("id", matchId);
      if (res.error) {
        toast({ title: "Erro ao atualizar status", description: "Tente novamente.", variant: "destructive" });
        await refetch();
        return;
      }
    } catch {
      toast({ title: "Erro ao atualizar status", description: "Tente novamente.", variant: "destructive" });
      await refetch();
      return;
    }

    if (status !== "finished" && match.status === "finished" && match.phase !== "group") {
      await rollbackDependentProgress(match);
      await refetch();
      return;
    }

    // Post-finish logic (advance bracket)
    if (status === "finished") {
      const winnerId = (updates.winner_id as string) ?? null;
      if (match.phase === "semi") await advanceSemi(match, winnerId);
      else if (match.phase === "quarter") await advanceQuarter(match, winnerId);
      else if (match.phase === "final" || match.phase === "third_place") {
        await checkFinalize(match, winnerId);
      }
    }
  };

  // ── Bracket sync: quarter → semi → final/3rd → podium ─────────────────────

  const syncBracketProgress = async (
    categoryId: string,
    options?: {
      silent?: boolean;
      refetchAfter?: boolean;
      justFinishedMatch?: EnrichedMatch;
      justFinishedWinnerId?: string | null;
    },
  ): Promise<"semi" | "final" | "finished" | null> => {
    const silent = options?.silent ?? false;
    const refetchAfter = options?.refetchAfter ?? true;

    const [{ data: quarters }, { data: semis }, { data: finals }, { data: thirds }] = await Promise.all([
      supabase.from("matches").select("*").eq("category_id", categoryId).eq("phase", "quarter"),
      supabase.from("matches").select("*").eq("category_id", categoryId).eq("phase", "semi"),
      supabase.from("matches").select("*").eq("category_id", categoryId).eq("phase", "final"),
      supabase.from("matches").select("*").eq("category_id", categoryId).eq("phase", "third_place"),
    ]);

    const patchJustFinished = (rows: any[] | null | undefined) => {
      if (!rows) return [];
      if (!options?.justFinishedMatch) return [...rows];
      return rows.map((row: any) => {
        if (row.id !== options.justFinishedMatch?.id) return row;
        return {
          ...row,
          status: "finished",
          winner_id: options.justFinishedWinnerId ?? row.winner_id,
        };
      });
    };

    const orderedQuarters = patchJustFinished(quarters).sort((a: any, b: any) => a.match_order - b.match_order);
    const orderedSemis = patchJustFinished(semis).sort((a: any, b: any) => a.match_order - b.match_order);
    const finalMatch = patchJustFinished(finals)[0] ?? null;
    const thirdMatch = patchJustFinished(thirds)[0] ?? null;

    if (orderedSemis.length === 0 && orderedQuarters.length >= 2) {
      const allQuartersFinished = orderedQuarters.every(
        (match: any) => match.status === "finished" && !!match.winner_id,
      );
      if (allQuartersFinished) {
        const winners = orderedQuarters.map((match: any) => match.winner_id).filter(Boolean) as string[];

        if (winners.length >= 2 && winners.length % 2 === 0) {
          const semiInserts = [];
          for (let i = 0; i < winners.length; i += 2) {
            if (!winners[i + 1]) continue;
            semiInserts.push({
              category_id: categoryId,
              group_id: null,
              team_a_id: winners[i],
              team_b_id: winners[i + 1],
              phase: "semi",
              match_order: i / 2,
            });
          }

          if (semiInserts.length > 0) {
            const { error } = await supabase.from("matches").insert(semiInserts as any);
            if (error) {
              toast({ title: "Erro ao gerar semifinais", description: "Tente novamente.", variant: "destructive" });
              return null;
            }
            if (!silent) toast({ title: "🎯 Semifinais geradas!" });
            if (refetchAfter) await refetch();
            return "semi";
          }
        }
      }
    }

    if (!finalMatch && orderedSemis.length >= 2) {
      const allSemisFinished = orderedSemis.every((match: any) => match.status === "finished" && !!match.winner_id);
      if (allSemisFinished) {
        const winners = orderedSemis.map((match: any) => match.winner_id).filter(Boolean) as string[];
        const losers = orderedSemis
          .map((match: any) => {
            if (!match.winner_id) return null;
            return match.winner_id === match.team_a_id ? match.team_b_id : match.team_a_id;
          })
          .filter(Boolean) as string[];

        if (winners.length === 2 && losers.length === 2) {
          const { error } = await supabase.from("matches").insert([
            {
              category_id: categoryId,
              group_id: null,
              team_a_id: winners[0],
              team_b_id: winners[1],
              phase: "final",
              match_order: 0,
            },
            {
              category_id: categoryId,
              group_id: null,
              team_a_id: losers[0],
              team_b_id: losers[1],
              phase: "third_place",
              match_order: 1,
            },
          ] as any);
          if (error) {
            toast({ title: "Erro ao gerar final", description: "Tente novamente.", variant: "destructive" });
            return null;
          }
          if (!silent) {
            toast({
              title: "🏆 Final e Disputa de 3º geradas!",
              description: "Inicie as partidas quando estiver pronto.",
            });
          }
          if (refetchAfter) await refetch();
          return "final";
        }
      }
    }

    if (finalMatch?.status === "finished" && (!thirdMatch || thirdMatch.status === "finished")) {
      await finalizeTournament(categoryId, finalMatch, thirdMatch);
      return "finished";
    }

    return null;
  };

  const advanceSemi = async (match: EnrichedMatch, winnerId: string | null) => {
    await syncBracketProgress(match.category_id, {
      justFinishedMatch: match,
      justFinishedWinnerId: winnerId,
    });
  };

  const advanceQuarter = async (match: EnrichedMatch, winnerId: string | null) => {
    await syncBracketProgress(match.category_id, {
      justFinishedMatch: match,
      justFinishedWinnerId: winnerId,
    });
  };

  const checkFinalize = async (match: EnrichedMatch, winnerId: string | null) => {
    await syncBracketProgress(match.category_id, {
      justFinishedMatch: match,
      justFinishedWinnerId: winnerId,
    });
  };

  const finalizeTournament = async (categoryId: string, finalMatch: any, thirdMatch: any) => {
    setFinalizingCat(categoryId);
    if (!finalMatch?.winner_id) {
      setFinalizingCat(null);
      return;
    }
    const first = finalMatch.winner_id;
    const second = finalMatch.winner_id === finalMatch.team_a_id ? finalMatch.team_b_id : finalMatch.team_a_id;
    const third = thirdMatch?.winner_id ?? null;

    await supabase.from("podium" as any).upsert(
      {
        category_id: categoryId,
        first_place_id: first,
        second_place_id: second,
        third_place_id: third,
      } as any,
      { onConflict: "category_id" },
    );
    await supabase
      .from("categories")
      .update({ status: "finished" as any })
      .eq("id", categoryId);
    toast({ title: "🏆 Torneio encerrado! Pódio registrado!" });
    await refetch();
    setFinalizingCat(null);
  };

  // ── Force advance ─────────────────────────────────────────────────────────

  const [forcing, setForcing] = useState(false);

  const forceAdvanceToFinal = async () => {
    const targetCatIds = filterCat === "all" ? categories.map((c) => c.id) : [filterCat];

    setForcing(true);
    let updatedCategories = 0;

    for (const catId of targetCatIds) {
      const result = await syncBracketProgress(catId, { silent: true, refetchAfter: false });
      if (result) updatedCategories++;
    }

    await refetch();
    setForcing(false);

    if (updatedCategories > 0) {
      toast({
        title: "🏆 Chaveamento atualizado!",
        description: `${updatedCategories} categoria(s) avançaram para a próxima fase.`,
      });
    } else {
      toast({
        title: "Nenhuma categoria avançada",
        description: "Verifique se quartas ou semifinais estão todas encerradas e sem empate.",
        variant: "destructive",
      });
    }
  };

  // ── Unified action handler ─────────────────────────────────────────────────

  const handleAction = useCallback(
    (type: "start" | "finish" | "reopen" | "inc" | "dec", matchId: string, field?: "score_a" | "score_b") => {
      if (type === "start") return setStatus(matchId, "live");
      if (type === "finish") return setStatus(matchId, "finished");
      if (type === "reopen") return setStatus(matchId, "live");
      if (type === "inc" && field) return updateScore(matchId, field, 1);
      if (type === "dec" && field) return updateScore(matchId, field, -1);
    },
    [rawMatches, localScores, categories],
  );

  // ── Derived data (memoized) ───────────────────────────────────────────────

  const phaseOrder: Record<string, number> = { group: 0, quarter: 1, semi: 2, third_place: 3, final: 4 };

  const enrichedMatches = useMemo(
    () =>
      rawMatches.map((m) => {
        const local = localScores[m.id];
        return local ? { ...m, score_a: local.a, score_b: local.b } : m;
      }),
    [rawMatches, localScores],
  );

  const filteredMatches = useMemo(
    () => enrichedMatches.filter((m) => filterCat === "all" || m.category_id === filterCat),
    [enrichedMatches, filterCat],
  );

  const groupMatches = useMemo(() => filteredMatches.filter((m) => m.phase === "group"), [filteredMatches]);

  const playoffMatches = useMemo(
    () =>
      filteredMatches
        .filter((m) => m.phase !== "group")
        .sort((a, b) => (phaseOrder[a.phase] ?? 0) - (phaseOrder[b.phase] ?? 0) || a.match_order - b.match_order),
    [filteredMatches],
  );

  const bracketCols = useMemo(() => {
    const quarters = playoffMatches.filter((m) => m.phase === "quarter");
    const semis = playoffMatches.filter((m) => m.phase === "semi");
    const finals = playoffMatches.filter((m) => m.phase === "final");
    const thirds = playoffMatches.filter((m) => m.phase === "third_place");
    const hasPlayoffs = playoffMatches.length > 0;

    return [
      quarters.length > 0 && { key: "quarter", title: "Quartas de Final", matches: quarters },
      (semis.length > 0 || quarters.length > 0) && { key: "semi", title: "Semifinais", matches: semis },
      hasPlayoffs && { key: "final", title: "Final", matches: finals, isFinal: true },
      hasPlayoffs && { key: "third", title: "3º Lugar", matches: thirds, isThird: true },
    ].filter(Boolean) as {
      key: string;
      title: string;
      matches: EnrichedMatch[];
      isFinal?: boolean;
      isThird?: boolean;
    }[];
  }, [playoffMatches]);

  return (
    <AdminLayout>
      <div className="space-y-6 slide-up">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display">Partidas & Placar</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie placares e controle o avanço das fases</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-border text-muted-foreground hover:text-foreground gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-48 bg-blue-light border-border text-sm">
              <SelectValue placeholder="Todas Categorias" />
            </SelectTrigger>
            <SelectContent className="bg-blue-mid border-border">
              <SelectItem value="all" className="focus:bg-blue-light">
                Todas Categorias
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id} className="focus:bg-blue-light">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("bracket")}
              className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider transition-all ${
                viewMode === "bracket"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chaveamento
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-xs font-display uppercase tracking-wider transition-all ${
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Lista
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-glass rounded-xl p-6 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Bracket View ─────────────────────────────────────────────── */}
            {viewMode === "bracket" && (
              <div className="space-y-8">
                {groupMatches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-6 rounded-full bg-accent/60" />
                      <h2 className="font-display text-xl">Fase de Grupos</h2>
                      <span className="text-xs text-muted-foreground">
                        ({groupMatches.filter((m) => m.status === "finished").length}/{groupMatches.length} encerradas)
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupMatches.map((m) => (
                        <BracketCard
                          key={m.id}
                          match={m}
                          saving={savingId === m.id}
                          scoreSaving={savingScores[m.id]}
                          catFinished={catFinished(m.category_id)}
                          onStart={() => handleAction("start", m.id)}
                          onFinish={() => handleAction("finish", m.id)}
                          onReopen={() => handleAction("reopen", m.id)}
                          onInc={(f) => handleAction("inc", m.id, f)}
                          onDec={(f) => handleAction("dec", m.id, f)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {bracketCols.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-6 rounded-full bg-primary" />
                      <h2 className="font-display text-xl">Chaveamento Eliminatório</h2>
                      <div className="ml-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={forceAdvanceToFinal}
                          disabled={forcing}
                          className="border-primary/40 text-primary hover:bg-primary/10 text-xs h-8 px-3 gap-1.5"
                          title="Força a criação da próxima fase com base nas quartas ou semifinais já encerradas"
                        >
                          {forcing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          Gerar Próxima Fase
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto pb-2">
                      <div className="flex gap-4" style={{ minWidth: `${bracketCols.length * 250}px` }}>
                        {bracketCols.map((col) => (
                          <div key={col.key} className="flex-1">
                            <BracketColumn
                              title={col.title}
                              matches={col.matches}
                              saving={false}
                              savingId={savingId}
                              savingScores={savingScores}
                              categories={categories}
                              catFinished={catFinished}
                              isFinal={col.isFinal}
                              isThird={col.isThird}
                              onAction={handleAction}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {groupMatches.length === 0 && playoffMatches.length === 0 && (
                  <div className="card-glass rounded-xl p-12 text-center text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-display text-xl">Nenhuma partida encontrada</p>
                    <p className="text-sm mt-1">Crie grupos e gere as partidas primeiro.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── List View ────────────────────────────────────────────────── */}
            {viewMode === "list" && (
              <div className="space-y-6">
                {(["group", "quarter", "semi", "third_place", "final"] as const).map((phase) => {
                  const phaseMatches = filteredMatches.filter((m) => m.phase === phase);
                  if (phaseMatches.length === 0) return null;
                  return (
                    <div key={phase}>
                      <div className="flex items-center gap-2 mb-3">
                        {phase === "final" && <Trophy className="w-5 h-5 text-primary" />}
                        {phase === "third_place" && <Medal className="w-5 h-5 text-muted-foreground" />}
                        <h2 className={`font-display text-xl ${phase === "final" ? "text-primary" : ""}`}>
                          {PHASE_LABELS[phase]}
                        </h2>
                      </div>
                      <div className="space-y-3">
                        {phaseMatches.map((m) => (
                          <BracketCard
                            key={m.id}
                            match={m}
                            saving={savingId === m.id}
                            scoreSaving={savingScores[m.id]}
                            catFinished={catFinished(m.category_id)}
                            isFinal={phase === "final"}
                            isThird={phase === "third_place"}
                            onStart={() => handleAction("start", m.id)}
                            onFinish={() => handleAction("finish", m.id)}
                            onReopen={() => handleAction("reopen", m.id)}
                            onInc={(f) => handleAction("inc", m.id, f)}
                            onDec={(f) => handleAction("dec", m.id, f)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
