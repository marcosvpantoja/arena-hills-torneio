// Types matching Supabase schema
export type CategoryStatus = "setup" | "groups" | "playoffs" | "finished";
export type MatchPhase = "group" | "quarter" | "semi" | "third_place" | "final";
export type MatchStatus = "pending" | "live" | "finished";

export interface Category {
  id: string;
  name: string;
  status: CategoryStatus;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  category_id: string;
  is_closed: boolean;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  team_id: string;
  created_at: string;
}

export interface Match {
  id: string;
  category_id: string;
  group_id: string | null;
  team_a_id: string;
  team_b_id: string;
  score_a: number;
  score_b: number;
  winner_id: string | null;
  phase: MatchPhase;
  status: MatchStatus;
  match_order: number;
  created_at: string;
  updated_at: string;
}

export interface Podium {
  id: string;
  category_id: string;
  first_place_id: string | null;
  second_place_id: string | null;
  third_place_id: string | null;
  created_at: string;
}

export interface TeamStanding {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  played: number;
  points_for: number;
  points_against: number;
  saldo: number;
  ratio: number;
}

export const PHASE_LABELS: Record<MatchPhase, string> = {
  group: "Fase de Grupos",
  quarter: "Quartas de Final",
  semi: "Semifinais",
  third_place: "Disputa de 3º Lugar",
  final: "Final",
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  pending: "Pendente",
  live: "Ao Vivo",
  finished: "Encerrada",
};

export const CATEGORY_STATUS_LABELS: Record<CategoryStatus, string> = {
  setup: "Configuração",
  groups: "Fase de Grupos",
  playoffs: "Fase Eliminatória",
  finished: "Encerrado",
};
