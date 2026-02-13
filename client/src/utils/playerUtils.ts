export interface NormalizedPlayer {
  steamid: string;
  name: string;
  avatar?: string;
  elo?: number;
}

/**
 * Normalize player data coming from match configs, MatchZy payloads, or legacy formats.
 */
export function normalizeConfigPlayers(players: unknown): NormalizedPlayer[] {
  if (!players) return [];

  if (Array.isArray(players)) {
    return players
      .map((player, index) => normalizeSinglePlayer(player, `player_${index}`))
      .sort(sortByEloDesc);
  }

  if (typeof players === 'object') {
    return Object.entries(players)
      .map(([key, value]) => normalizeSinglePlayer(value, key))
      .sort(sortByEloDesc);
  }

  return [];
}

function sortByEloDesc(a: NormalizedPlayer, b: NormalizedPlayer): number {
  const ae = typeof a.elo === 'number' ? a.elo : -Infinity;
  const be = typeof b.elo === 'number' ? b.elo : -Infinity;
  if (be !== ae) return be - ae;
  return a.steamid.localeCompare(b.steamid);
}

function normalizeSinglePlayer(player: unknown, fallbackKey: string): NormalizedPlayer {
  if (typeof player === 'string') {
    return { steamid: fallbackKey, name: player };
  }

  if (player && typeof player === 'object') {
    const p = player as {
      steamid?: string;
      steamId?: string;
      name?: string | { name?: string; steamId?: string; avatar?: string };
      avatar?: string;
      elo?: unknown;
    };

    if (typeof p.name === 'object' && p.name !== null) {
      const nested = p.name as { name?: string; steamId?: string; avatar?: string };
      return {
        steamid: nested.steamId || p.steamid || p.steamId || fallbackKey,
        name: nested.name || fallbackKey,
        avatar: nested.avatar || p.avatar,
        elo: typeof p.elo === 'number' ? p.elo : undefined,
      };
    }

    return {
      steamid: p.steamid || p.steamId || fallbackKey,
      name: typeof p.name === 'string' ? p.name : fallbackKey,
      avatar: p.avatar,
      elo: typeof p.elo === 'number' ? p.elo : undefined,
    };
  }

  return { steamid: fallbackKey, name: 'Unknown' };
}

