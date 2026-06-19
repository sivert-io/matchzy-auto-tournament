import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { CS2Economy, CS2_ITEMS } from '@ianlucas/cs2-lib';
import { brazilian } from '@ianlucas/cs2-lib/translations';
import { getVerifiedPlayerSteamId } from '../utils/signedPlayerCookie';
import { log } from '../utils/logger';

const router = Router();
const INVENTORY_BASE_URL = 'https://inventory.cstrike.app';
const REQUEST_TIMEOUT_MS = 8_000;

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

if (CS2Economy.items.size === 0) {
  CS2Economy.use({ items: CS2_ITEMS, language: brazilian });
}

router.get('/equipped', async (req: Request, res: Response) => {
  const steamId = getVerifiedPlayerSteamId(req.headers.cookie);

  if (!steamId) {
    return res.status(401).json({ error: 'Steam authentication required' });
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
    const equippedItems = Object.entries(data.items ?? {}).flatMap(([uid, inventoryItem]) => {
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

    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.json({
      steamId,
      version: data.version ?? null,
      items: equippedItems,
      editorUrl: INVENTORY_BASE_URL,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn('Failed to load equipped cstrike inventory', { steamId, error: message });
    return res.status(502).json({ error: 'Could not load skins from cstrike.app' });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
