/**
 * Centralized tournament data hook.
 * Uses polling-first refresh for reliability across public and admin views.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Category, Group, Match, Team, GroupMember, Podium } from "@/types/tournament";

export interface EnrichedMatch {
  id: string;
  category_id: string;
  group_id: string | null;
  team_a_id: string;
  team_b_id: string;
  score_a: number;
  score_b: number;
  winner_id: string | null;
  phase: Match["phase"];
  status: Match["status"];
  match_order: number;
  created_at: string;
  updated_at: string;
  team_a_name: string;
  team_b_name: string;
  group_name?: string;
  category_name?: string;
}

export interface TournamentData {
  categories: Category[];
  teams: Team[];
  groups: Group[];
  groupMembers: GroupMember[];
  matches: EnrichedMatch[];
  podiums: Podium[];
}

interface UseTournamentDataOptions {
  refreshMs?: number;
  pollInBackground?: boolean;
}

async function fetchTournamentData(): Promise<TournamentData> {
  const [catsRes, teamsRes, groupsRes, membersRes, matchesRes, podiumRes] = await Promise.all([
    supabase.from("categories").select("id,name,status,created_at").order("name"),
    supabase.from("teams").select("id,name,category_id,created_at"),
    supabase.from("groups").select("id,name,category_id,is_closed,created_at").order("name"),
    supabase.from("group_members").select("id,group_id,team_id,created_at"),
    supabase
      .from("matches")
      .select(
        `id,category_id,group_id,team_a_id,team_b_id,score_a,score_b,winner_id,phase,status,match_order,created_at,updated_at,
           team_a:teams!matches_team_a_id_fkey(id,name),
           team_b:teams!matches_team_b_id_fkey(id,name),
           groups(name),
           categories(name)`,
      )
      .order("match_order"),
    supabase.from("podium" as any).select("id,category_id,first_place_id,second_place_id,third_place_id,created_at"),
  ]);

  const firstErr = [catsRes, teamsRes, groupsRes, membersRes, matchesRes, podiumRes].find((r) => r.error);
  if (firstErr?.error) throw firstErr.error;

  return {
    categories: (catsRes.data ?? []) as unknown as Category[],
    teams: (teamsRes.data ?? []) as unknown as Team[],
    groups: (groupsRes.data ?? []) as unknown as Group[],
    groupMembers: (membersRes.data ?? []) as unknown as GroupMember[],
    matches: ((matchesRes.data ?? []) as any[]).map((match) => ({
      ...match,
      team_a_name: match.team_a?.name ?? "A definir",
      team_b_name: match.team_b?.name ?? "A definir",
      group_name: match.groups?.name,
      category_name: match.categories?.name,
    })),
    podiums: (podiumRes.data ?? []) as unknown as Podium[],
  };
}

export const TOURNAMENT_QUERY_KEY = ["tournament-data"] as const;

export function useTournamentData(options?: UseTournamentDataOptions) {
  const refreshMs = options?.refreshMs ?? 4_000;
  const pollInBackground = options?.pollInBackground ?? false;

  const query = useQuery({
    queryKey: TOURNAMENT_QUERY_KEY,
    queryFn: fetchTournamentData,
    staleTime: 0,
    gcTime: 120_000,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: () => {
      if (refreshMs <= 0) return false;
      if (!pollInBackground && typeof document !== "undefined" && document.visibilityState === "hidden") return false;
      return refreshMs;
    },
    refetchIntervalInBackground: pollInBackground,
    placeholderData: (previousData) => previousData,
  });
  const { refetch } = query;

  useEffect(() => {
    const handleOnline = () => {
      refetch();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      refetch();
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  const empty: TournamentData = {
    categories: [],
    teams: [],
    groups: [],
    groupMembers: [],
    matches: [],
    podiums: [],
  };

  return {
    ...(query.data ?? empty),
    loading: query.isPending && !query.data && !query.error,
    error: query.error,
    refetch,
  };
}
