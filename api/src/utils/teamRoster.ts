import type { Player } from '../types/team.types';

export type TeamRosterRole = 'starter' | 'coach' | 'reserve';

/** Default competitive roster: 5 starters, 1 coach, 2 reserves. */
export const CHAMPIONSHIP_ROSTER_LIMITS = {
  starter: 5,
  coach: 1,
  reserve: 2,
} as const;

export const CHAMPIONSHIP_ROSTER_TOTAL =
  CHAMPIONSHIP_ROSTER_LIMITS.starter +
  CHAMPIONSHIP_ROSTER_LIMITS.coach +
  CHAMPIONSHIP_ROSTER_LIMITS.reserve;

export function countRosterRoles(players: Player[]): Record<TeamRosterRole, number> {
  const counts: Record<TeamRosterRole, number> = { starter: 0, coach: 0, reserve: 0 };
  for (const player of players) {
    const role = player.role ?? 'starter';
    if (role === 'starter' || role === 'coach' || role === 'reserve') {
      counts[role]++;
    }
  }
  return counts;
}

export function validateChampionshipRoster(players: Player[]): void {
  const counts = countRosterRoles(players);

  if (players.length !== CHAMPIONSHIP_ROSTER_TOTAL) {
    throw new Error(
      `Championship roster requires exactly ${CHAMPIONSHIP_ROSTER_TOTAL} slots (${CHAMPIONSHIP_ROSTER_LIMITS.starter} starters, ${CHAMPIONSHIP_ROSTER_LIMITS.coach} coach, ${CHAMPIONSHIP_ROSTER_LIMITS.reserve} reserves).`
    );
  }

  for (const [role, limit] of Object.entries(CHAMPIONSHIP_ROSTER_LIMITS) as Array<
    [TeamRosterRole, number]
  >) {
    if (counts[role] !== limit) {
      throw new Error(
        `Championship roster requires exactly ${limit} ${role}(s); found ${counts[role]}.`
      );
    }
  }
}

export function isTeamCaptain(players: Player[], steamId: string): boolean {
  const normalized = steamId.toLowerCase();
  const firstStarter = players.find((p) => p.role === 'starter') ?? players[0];
  return firstStarter?.steamId.toLowerCase() === normalized;
}
