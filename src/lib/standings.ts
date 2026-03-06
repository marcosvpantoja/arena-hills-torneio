import { Match, Team, TeamStanding } from "@/types/tournament";

export function computeStandings(
  matches: Match[],
  teams: Team[],
  groupId: string
): TeamStanding[] {
  const groupMatches = matches.filter(
    (m) => m.group_id === groupId && m.status === "finished"
  );

  const standingMap: Record<string, TeamStanding> = {};

  for (const team of teams) {
    standingMap[team.id] = {
      team_id: team.id,
      team_name: team.name,
      wins: 0,
      losses: 0,
      played: 0,
      points_for: 0,
      points_against: 0,
      saldo: 0,
      ratio: 0,
    };
  }

  for (const match of groupMatches) {
    const a = standingMap[match.team_a_id];
    const b = standingMap[match.team_b_id];
    if (!a || !b) continue;

    a.played++;
    b.played++;
    a.points_for += match.score_a;
    a.points_against += match.score_b;
    b.points_for += match.score_b;
    b.points_against += match.score_a;

    if (match.winner_id === match.team_a_id) {
      a.wins++;
      b.losses++;
    } else if (match.winner_id === match.team_b_id) {
      b.wins++;
      a.losses++;
    }
  }

  for (const s of Object.values(standingMap)) {
    s.saldo = s.points_for - s.points_against;
    s.ratio = s.points_against === 0
      ? s.points_for
      : s.points_for / s.points_against;
  }

  const standings = Object.values(standingMap);

  // Sort: 1) Wins → 2) Saldo (diferença de pontos) → 3) Head-to-head
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.saldo !== a.saldo) return b.saldo - a.saldo;
    // Head-to-head
    const h2h = groupMatches.find(
      (m) =>
        (m.team_a_id === a.team_id && m.team_b_id === b.team_id) ||
        (m.team_a_id === b.team_id && m.team_b_id === a.team_id)
    );
    if (h2h) {
      if (h2h.winner_id === a.team_id) return -1;
      if (h2h.winner_id === b.team_id) return 1;
    }
    return 0;
  });

  return standings;
}
