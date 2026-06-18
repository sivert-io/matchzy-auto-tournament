import fetch from 'node-fetch';
import { log } from '../utils/logger';

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || '';
const FACEIT_API_URL = 'https://open.faceit.com/data/v4';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface FaceitPlayer {
  steamId: string;
  nickname: string;
  faceitElo: number;
  skillLevel: number;
  country: string;
  avatar: string;
}

const cache = new Map<string, { data: FaceitPlayer | null; expiresAt: number }>();

async function fetchFaceitBySteamId(steamId: string): Promise<FaceitPlayer | null> {
  if (!FACEIT_API_KEY) return null;
  if (steamId.startsWith('BOT_')) return null;

  const cached = cache.get(steamId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const res = await fetch(
      `${FACEIT_API_URL}/players?game=cs2&game_player_id=${steamId}`,
      { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
    );

    if (res.status === 404) {
      cache.set(steamId, { data: null, expiresAt: Date.now() + CACHE_TTL_MS });
      return null;
    }

    if (!res.ok) {
      log.warn(`FACEIT API error: ${res.status} for ${steamId}`);
      return null;
    }

    const body = await res.json() as {
      nickname?: string;
      avatar?: string;
      country?: string;
      games?: {
        cs2?: {
          faceit_elo?: number;
          skill_level?: number;
        };
      };
    };

    const cs2 = body.games?.cs2;
    const player: FaceitPlayer = {
      steamId,
      nickname: body.nickname || '',
      faceitElo: cs2?.faceit_elo || 0,
      skillLevel: cs2?.skill_level || 0,
      country: body.country || '',
      avatar: body.avatar || '',
    };

    cache.set(steamId, { data: player, expiresAt: Date.now() + CACHE_TTL_MS });
    return player;
  } catch (err) {
    log.warn(`FACEIT API fetch failed for ${steamId}`, err as Error);
    return null;
  }
}

async function fetchMultiple(steamIds: string[]): Promise<Record<string, FaceitPlayer>> {
  const unique = [...new Set(steamIds.filter((id) => !id.startsWith('BOT_')))];
  const results = await Promise.all(unique.map((id) => fetchFaceitBySteamId(id)));
  const map: Record<string, FaceitPlayer> = {};
  for (const r of results) {
    if (r) map[r.steamId] = r;
  }
  return map;
}

export const faceitService = {
  getPlayer: fetchFaceitBySteamId,
  getPlayers: fetchMultiple,
  isConfigured: () => !!FACEIT_API_KEY,
};
