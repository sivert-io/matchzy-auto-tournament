import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { CS2Economy, CS2_ITEMS } from '@ianlucas/cs2-lib';
import { brazilian } from '@ianlucas/cs2-lib/translations';
import { getVerifiedPlayerSteamId } from '../utils/signedPlayerCookie';
import { log } from '../utils/logger';

const router = Router();
const INVENTORY_BASE_URL = 'https://inventory.cstrike.app';
const REQUEST_TIMEOUT_MS = 8_000;
const STEAM_ID_RE = /^\d{17}$/;
const CACHE_TTL_MS = 30_000;

interface CachedInventory {
  expires: number;
  value: { items: EquippedSkin[]; version: number | null };
}

// Short-lived in-memory cache so repeated profile views / refreshes don't hammer
// cstrike.app for the same player. Only successful responses are cached.
const inventoryCache = new Map<string, CachedInventory>();

interface ExternalInventoryItem {
  equipped?: boolean;
  equippedCT?: boolean;
  equippedT?: boolean;
  id?: number;
  nameTag?: string;
  seed?: number;
  statTrak?: number;
  wear?: number;
}

interface ExternalInventoryResponse {
  items?: Record<string, ExternalInventoryItem>;
  version?: number;
}

export interface EquippedSkin {
  uid: string;
  id: number;
  name: string;
  imageUrl: string;
  rarity?: string;
  category?: string;
  type: string;
  nameTag?: string;
  seed?: number;
  statTrak?: number;
  wear?: number;
  teams: { ct: boolean; t: boolean };
}

if (CS2Economy.items.size === 0) {
  CS2Economy.use({ items: CS2_ITEMS, language: brazilian });
}

/**
 * Fetch a player's public cstrike.app inventory and return only the equipped
 * items, enriched with display metadata from cs2-lib. Throws on network/upstream
 * failure so callers can decide how to surface it.
 */
async function loadEquippedSkins(
  steamId: string
): Promise<{ items: EquippedSkin[]; version: number | null }> {
  const cached = inventoryCache.get(steamId);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstreamUrl = `${INVENTORY_BASE_URL}/api/inventory/${steamId}.json`;
    const response = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`cstrike inventory returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as ExternalInventoryResponse;
    const items = Object.entries(data.items ?? {}).flatMap(([uid, inventoryItem]) => {
      if (
        !inventoryItem.equipped &&
        !inventoryItem.equippedCT &&
        !inventoryItem.equippedT
      ) {
        return [];
      }

      if (typeof inventoryItem.id !== 'number') {
        return [];
      }

      const economyItem = CS2Economy.items.get(inventoryItem.id);
      if (!economyItem) {
        log.warn('Unknown cstrike inventory item', { steamId, itemId: inventoryItem.id });
        return [];
      }

      return [
        {
          uid,
          id: inventoryItem.id,
          name: economyItem.name,
          imageUrl: economyItem.getImage(inventoryItem.wear),
          rarity: economyItem.rarity,
          category: economyItem.category,
          type: economyItem.type,
          nameTag: inventoryItem.nameTag,
          seed: inventoryItem.seed,
          statTrak: inventoryItem.statTrak,
          wear: inventoryItem.wear,
          teams: {
            ct: Boolean(inventoryItem.equipped || inventoryItem.equippedCT),
            t: Boolean(inventoryItem.equipped || inventoryItem.equippedT),
          },
        },
      ];
    });

    const value = { items, version: data.version ?? null };
    inventoryCache.set(steamId, { expires: Date.now() + CACHE_TTL_MS, value });
    return value;
  } finally {
    clearTimeout(timeout);
  }
}

// Equipped skins for the signed-in player (resolved from the signed cookie).
router.get('/equipped', async (req: Request, res: Response) => {
  const steamId = getVerifiedPlayerSteamId(req.headers.cookie);

  if (!steamId) {
    return res.status(401).json({ error: 'Steam authentication required' });
  }

  try {
    const { items, version } = await loadEquippedSkins(steamId);
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.json({ steamId, version, items, editorUrl: INVENTORY_BASE_URL });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn('Failed to load equipped cstrike inventory', { steamId, error: message });
    return res.status(502).json({ error: 'Could not load skins from cstrike.app' });
  }
});

// Public equipped skins for any player by Steam ID (used on public profiles).
// The cstrike.app inventory is already public; we validate the ID format to
// avoid injecting arbitrary values into the upstream URL.
router.get('/:steamId/equipped', async (req: Request, res: Response) => {
  const steamId = req.params.steamId;

  if (!STEAM_ID_RE.test(steamId)) {
    return res.status(400).json({ error: 'Invalid Steam ID' });
  }

  try {
    const { items, version } = await loadEquippedSkins(steamId);
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ steamId, version, items, editorUrl: INVENTORY_BASE_URL });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn('Failed to load public cstrike inventory', { steamId, error: message });
    return res.status(502).json({ error: 'Could not load skins from cstrike.app' });
  }
});

export default router;
