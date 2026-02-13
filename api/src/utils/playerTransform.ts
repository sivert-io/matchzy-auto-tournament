import { db } from '../config/database';

interface RawPlayer {
  steamid?: string;
  steamId?: string;
  name?: string | { name?: string; steamId?: string };
  avatar?: string;
}

export interface NormalizedServerPlayer {
  steamid: string;
  name: string;
  avatar?: string;
}

export type NormalizedServerPlayerWithElo = NormalizedServerPlayer & { elo?: number };

/**
 * Normalize player objects stored in match configs (arrays or dictionaries) into
 * a consistent `{ steamid, name }` array for API responses.
 */
export function normalizeConfigPlayers(
  players?: Record<string, unknown> | Array<unknown>
): NormalizedServerPlayer[] {
  if (!players) return [];

  if (Array.isArray(players)) {
    return players.map((player, index) => normalizeSinglePlayer(player, `player_${index}`));
  }

  return Object.entries(players).map(([key, value]) => normalizeSinglePlayer(value, key));
}

/**
 * Attach current ELO to players and sort by highest rating first.
 *
 * This is used for UI-facing API responses so rosters are consistently ordered
 * (captain/highest-rated first) while keeping match config storage as maps.
 */
export async function attachAndSortPlayersByElo(
  players: NormalizedServerPlayer[]
): Promise<NormalizedServerPlayerWithElo[]> {
  if (!players || players.length === 0) return [];

  const ids = Array.from(
    new Set(players.map((p) => p.steamid).filter((s): s is string => typeof s === 'string' && s.length > 0))
  );

  let eloMap = new Map<string, number>();
  try {
    const placeholders = ids.map(() => '?').join(', ');
    const rows = await db.queryAsync<{ id: string; current_elo: number }>(
      `SELECT id, current_elo FROM players WHERE id IN (${placeholders})`,
      ids
    );
    eloMap = new Map(rows.map((r) => [r.id.toLowerCase(), r.current_elo]));
  } catch {
    // Best-effort; leave elo undefined if query fails.
  }

  return [...players]
    .map((p) => ({
      ...p,
      elo: eloMap.get(p.steamid.toLowerCase()),
    }))
    .sort((a, b) => {
      const ae = a.elo ?? -Infinity;
      const be = b.elo ?? -Infinity;
      if (be !== ae) return be - ae;
      // Deterministic tie-break (V8 sort is stable, but keep explicit ordering anyway).
      return a.steamid.localeCompare(b.steamid);
    });
}

function normalizeSinglePlayer(value: unknown, fallbackKey: string): NormalizedServerPlayer {
  if (typeof value === 'string') {
    return { steamid: fallbackKey, name: value };
  }

  if (value && typeof value === 'object') {
    const player = value as RawPlayer;

    if (typeof player.name === 'object' && player.name !== null) {
      const nested = player.name as { name?: string; steamId?: string; avatar?: string };
      return {
        steamid: nested.steamId || player.steamid || player.steamId || fallbackKey,
        name: nested.name || fallbackKey,
        avatar: nested.avatar || player.avatar,
      };
    }

    return {
      steamid: player.steamid || player.steamId || fallbackKey,
      name: typeof player.name === 'string' ? player.name : fallbackKey,
      avatar: player.avatar,
    };
  }

  return { steamid: fallbackKey, name: 'Unknown' };
}

