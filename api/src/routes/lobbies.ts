import { Router, Request, Response } from 'express';
import { lobbyService } from '../services/lobbyService';
import { serverService } from '../services/serverService';
import { faceitService } from '../services/faceitService';
import { getVerifiedPlayerSteamId } from '../utils/signedPlayerCookie';
import { getWebhookBaseUrl } from '../utils/urlHelper';
import { requireAuth } from '../middleware/auth';
import { db } from '../config/database';
import { log } from '../utils/logger';
import type { GameMode } from '../types/lobby.types';

const router = Router();

function getPlayerSteamId(req: Request): string | null {
  const cookieSteamId = getVerifiedPlayerSteamId(req.headers.cookie);
  if (cookieSteamId) return cookieSteamId;
  const anyReq = req as Request & { user?: { steamId?: string } };
  if (anyReq.user?.steamId && anyReq.user.steamId.trim().length > 0) {
    return anyReq.user.steamId.trim();
  }
  return null;
}

async function getPlayerInfo(req: Request): Promise<{ steamId: string; name: string; avatar?: string } | null> {
  const steamId = getPlayerSteamId(req);
  if (!steamId) return null;

  // Try session first
  const anyReq = req as Request & { user?: { displayName?: string; avatarUrl?: string } };
  let name = anyReq.user?.displayName;
  let avatar = anyReq.user?.avatarUrl;

  // Fall back to database if session doesn't have profile info
  if (!name || name === steamId) {
    try {
      const row = await db.queryOneAsync<{ name: string; avatar_url?: string }>(
        'SELECT name, avatar_url FROM players WHERE id = ?', [steamId]
      );
      if (row) {
        name = row.name || name;
        avatar = row.avatar_url || avatar;
      }
    } catch { /* ignore */ }
  }

  return { steamId, name: name || steamId, avatar };
}

async function requirePlayer(req: Request, res: Response): Promise<{ steamId: string; name: string; avatar?: string } | null> {
  const player = await getPlayerInfo(req);
  if (!player) {
    res.status(401).json({ success: false, error: 'Sign in with Steam to use lobbies' });
    return null;
  }
  return player;
}

// ── Game Modes CRUD ──

router.get('/game-modes', async (_req: Request, res: Response) => {
  try {
    const builtIn = [
      { id: 'competitive', name: 'Competitive', commands: [] },
      { id: 'deathmatch', name: 'Deathmatch', commands: ['game_type 1; game_mode 2'] },
      { id: 'gungame', name: 'Gun Game', commands: ['game_type 1; game_mode 0'] },
    ];
    const rows = await db.queryAsync<{ id: string; name: string; commands: string }>(
      'SELECT id, name, commands FROM game_modes ORDER BY created_at'
    );
    const custom = rows.map((r) => ({ id: r.id, name: r.name, commands: JSON.parse(r.commands) }));
    return res.json({ success: true, gameModes: [...builtIn, ...custom] });
  } catch (error) {
    log.error('Failed to list game modes', error);
    return res.status(500).json({ success: false, error: 'Failed to list game modes' });
  }
});

router.post('/game-modes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id, name, commands } = req.body as GameMode;
    if (!id || !name) return res.status(400).json({ success: false, error: 'id and name are required' });
    const now = Math.floor(Date.now() / 1000);
    await db.insertAsync('game_modes', {
      id,
      name,
      commands: JSON.stringify(commands || []),
      created_at: now,
      updated_at: now,
    });
    return res.json({ success: true });
  } catch (error) {
    log.error('Failed to create game mode', error);
    return res.status(500).json({ success: false, error: 'Failed to create game mode' });
  }
});

router.put('/game-modes/:modeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, commands } = req.body as Partial<GameMode>;
    await db.updateAsync(
      'game_modes',
      { name, commands: JSON.stringify(commands || []), updated_at: Math.floor(Date.now() / 1000) },
      'id = ?',
      [req.params.modeId]
    );
    return res.json({ success: true });
  } catch (error) {
    log.error('Failed to update game mode', error);
    return res.status(500).json({ success: false, error: 'Failed to update game mode' });
  }
});

router.delete('/game-modes/:modeId', requireAuth, async (req: Request, res: Response) => {
  try {
    await db.deleteAsync('game_modes', 'id = ?', [req.params.modeId]);
    return res.json({ success: true });
  } catch (error) {
    log.error('Failed to delete game mode', error);
    return res.status(500).json({ success: false, error: 'Failed to delete game mode' });
  }
});

// ── Servers list (for lobby dropdowns) ──

router.get('/servers/list', async (_req: Request, res: Response) => {
  try {
    const servers = await serverService.getAllServers(true);
    return res.json({
      success: true,
      servers: servers.map((s) => ({ id: s.id, name: s.name, host: s.host, port: s.port, status: s.status })),
    });
  } catch (error) {
    log.error('Failed to list servers', error);
    return res.status(500).json({ success: false, error: 'Failed to list servers' });
  }
});

// ── Maps & Map pools (public, for lobby) ──

router.get('/maps', async (_req: Request, res: Response) => {
  try {
    const rows = await db.queryAsync<{ id: string; display_name: string; image_url: string | null }>(
      'SELECT id, display_name, image_url FROM maps ORDER BY display_name'
    );
    const maps = rows.map((r) => ({ id: r.id, displayName: r.display_name, imageUrl: r.image_url }));
    return res.json({ success: true, maps });
  } catch (error) {
    log.error('Failed to list maps', error);
    return res.status(500).json({ success: false, error: 'Failed to list maps' });
  }
});

router.get('/map-pools', async (_req: Request, res: Response) => {
  try {
    const rows = await db.queryAsync<{ id: number; name: string; map_ids: string; is_default: number }>(
      'SELECT id, name, map_ids, is_default FROM map_pools WHERE enabled = 1 ORDER BY is_default DESC, name'
    );
    const mapPools = rows.map((r) => ({
      id: r.id,
      name: r.name,
      maps: JSON.parse(r.map_ids || '[]'),
      isDefault: r.is_default === 1,
    }));
    return res.json({ success: true, mapPools });
  } catch (error) {
    log.error('Failed to list map pools', error);
    return res.status(500).json({ success: false, error: 'Failed to list map pools' });
  }
});

// ── FACEIT ──

router.get('/faceit/players', async (req: Request, res: Response) => {
  try {
    if (!faceitService.isConfigured()) {
      return res.json({ success: true, players: {}, configured: false });
    }
    const steamIds = (req.query.steamIds as string || '').split(',').filter(Boolean);
    if (steamIds.length === 0) {
      return res.json({ success: true, players: {} });
    }
    const players = await faceitService.getPlayers(steamIds);
    return res.json({ success: true, players, configured: true });
  } catch (error) {
    log.error('Failed to fetch FACEIT data', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch FACEIT data' });
  }
});

// ── Player's active lobby ──

router.get('/my-lobby', async (req: Request, res: Response) => {
  try {
    const steamId = getPlayerSteamId(req);
    if (!steamId) return res.json({ success: true, lobby: null });

    const rows = await db.queryAsync<{ id: string; lobby_state: string; status: string; match_slug: string | null }>(
      `SELECT id, lobby_state, status, match_slug FROM lobbies WHERE status IN ('waiting', 'picking', 'veto', 'ready') ORDER BY created_at DESC`
    );

    for (const row of rows) {
      const state = JSON.parse(row.lobby_state);
      if (state.players?.some((p: { steamId: string }) => p.steamId === steamId)) {
        const lobby = await lobbyService.getById(row.id);
        return res.json({ success: true, lobby });
      }
    }

    return res.json({ success: true, lobby: null });
  } catch (error) {
    log.error('Failed to get active lobby', error);
    return res.status(500).json({ success: false, error: 'Failed to get active lobby' });
  }
});

// ── Lobby CRUD ──

router.get('/', async (_req: Request, res: Response) => {
  try {
    const lobbies = await lobbyService.listOpen();
    return res.json({ success: true, lobbies });
  } catch (error) {
    log.error('Failed to list lobbies', error);
    return res.status(500).json({ success: false, error: 'Failed to list lobbies' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lobby = await lobbyService.getById(req.params.id);
    if (!lobby) return res.status(404).json({ success: false, error: 'Lobby not found' });
    return res.json({ success: true, lobby });
  } catch (error) {
    log.error('Failed to get lobby', error);
    return res.status(500).json({ success: false, error: 'Failed to get lobby' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { teamSize, format, mapPool, gameMode } = req.body;
    const lobby = await lobbyService.create(player.steamId, player.name, player.avatar, {
      teamSize,
      format,
      mapPool,
      gameMode,
    });
    return res.json({ success: true, lobby });
  } catch (error) {
    log.error('Failed to create lobby', error);
    return res.status(500).json({ success: false, error: 'Failed to create lobby' });
  }
});

router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const lobby = await lobbyService.join(req.params.id, player.steamId, player.name, player.avatar);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to join lobby';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const lobby = await lobbyService.leave(req.params.id, player.steamId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to leave lobby';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/kick', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { targetId } = req.body;
    const lobby = await lobbyService.kick(req.params.id, player.steamId, targetId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to kick player';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/set-captain', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { targetId, team } = req.body;
    const lobby = await lobbyService.setCaptain(req.params.id, player.steamId, targetId, team);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to set captain';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/start-draft', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const lobby = await lobbyService.startDraft(req.params.id, player.steamId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start draft';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/pick', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { targetId } = req.body;
    const lobby = await lobbyService.pickPlayer(req.params.id, player.steamId, targetId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to pick player';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/swap', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { team } = req.body;
    const lobby = await lobbyService.swapTeam(req.params.id, player.steamId, team);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to swap team';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/start-veto', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const lobby = await lobbyService.startVeto(req.params.id, player.steamId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to start veto';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/transfer-ownership', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { targetId } = req.body;
    const lobby = await lobbyService.transferOwnership(req.params.id, player.steamId, targetId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to transfer ownership';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/update-config', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { gameMode, mapPool, format, teamSize, lobbyName, team1Name, team2Name } = req.body;
    const lobby = await lobbyService.updateConfig(req.params.id, player.steamId, { gameMode, mapPool, format, teamSize, lobbyName, team1Name, team2Name });
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update config';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/join-team', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { team } = req.body;
    const lobby = await lobbyService.joinTeam(req.params.id, player.steamId, team);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to join team';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/create-match', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const baseUrl = await getWebhookBaseUrl(req);
    const { serverId } = req.body || {};
    const lobby = await lobbyService.createMatch(req.params.id, player.steamId, baseUrl, serverId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to create match';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/veto-action', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const { mapId, action } = req.body;
    if (!mapId || !action) return res.status(400).json({ success: false, error: 'mapId and action are required' });
    const lobby = await lobbyService.vetoAction(req.params.id, player.steamId, mapId, action);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to perform veto action';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/fill-bots', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const lobby = await lobbyService.fillWithBots(req.params.id, player.steamId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fill with bots';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/auto-assign', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const lobby = await lobbyService.autoAssignTeams(req.params.id, player.steamId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to auto-assign teams';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/shuffle-teams', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const lobby = await lobbyService.shuffleTeams(req.params.id, player.steamId);
    return res.json({ success: true, lobby });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to shuffle teams';
    return res.status(400).json({ success: false, error: msg });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const player = await requirePlayer(req, res);
    if (!player) return;
    const adminRow = await db.queryOneAsync<{ is_admin?: number }>('SELECT is_admin FROM players WHERE id = ?', [player.steamId]);
    const isAdmin = adminRow?.is_admin === 1;
    await lobbyService.cancel(req.params.id, player.steamId, isAdmin);
    return res.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to cancel lobby';
    return res.status(400).json({ success: false, error: msg });
  }
});

export default router;
