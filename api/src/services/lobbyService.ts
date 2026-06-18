import { db } from '../config/database';
import type { LobbyRow, LobbyState, LobbyResponse, LobbyStatus, LobbyFormat } from '../types/lobby.types';
import { emitLobbyUpdate, emitLobbyCreated, emitLobbyDeleted } from './socketService';
import { matchService } from './matchService';
import { matchAllocationService } from './matchAllocationService';
import { loadMatchOnServer } from './matchLoadingService';
import { serverAllocationTracker } from './serverAllocationTracker';
import { serverService } from './serverService';
import { settingsService } from './settingsService';
import { matchzyConfigService } from './matchzyConfigService';
import { emitMatchUpdate, emitBracketUpdate } from './socketService';
import { log } from '../utils/logger';
import type { CreateMatchInput, MatchConfig, MatchPlayer } from '../types/match.types';

function generateId(): string {
  return `lobby-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

async function rowToResponse(row: LobbyRow): Promise<LobbyResponse> {
  const resp: LobbyResponse = {
    id: row.id,
    status: row.status,
    createdBy: row.created_by,
    teamSize: row.team_size,
    mapPool: JSON.parse(row.map_pool),
    format: row.format,
    gameMode: row.game_mode,
    matchSlug: row.match_slug,
    state: JSON.parse(row.lobby_state),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.match_slug) {
    try {
      const match = await db.queryOneAsync<{ server_id: string | null; status: string }>(
        'SELECT server_id, status FROM matches WHERE slug = ?', [row.match_slug]
      );
      if (match?.server_id) {
        const server = await serverService.getServerById(match.server_id);
        if (server) {
          resp.server = { id: server.id, name: server.name, host: server.host, port: server.port };
        }
        resp.matchStatus = match.status;
      }
    } catch { /* ignore */ }
  }

  return resp;
}

const VETO_TIMEOUT_MS = 30_000;

class LobbyService {
  private vetoTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private startVetoTimer(lobbyId: string): void {
    this.clearVetoTimer(lobbyId);
    const timer = setTimeout(async () => {
      try {
        const lobby = await this.getById(lobbyId);
        if (!lobby || lobby.status !== 'veto' || !lobby.state.veto || lobby.state.veto.completed) return;
        const veto = lobby.state.veto;
        if (veto.availableMaps.length === 0) return;

        const captainId = lobby.state.captains[veto.currentTurn];
        if (!captainId) return;

        const randomMap = veto.availableMaps[Math.floor(Math.random() * veto.availableMaps.length)];
        log.info(`[VETO TIMER] Auto-${veto.currentAction} ${randomMap} for lobby ${lobbyId} (timeout)`);
        await this.vetoAction(lobbyId, captainId, randomMap, veto.currentAction);
      } catch (err) {
        log.warn(`[VETO TIMER] Auto-action failed for lobby ${lobbyId}`, err as Error);
      }
    }, VETO_TIMEOUT_MS);
    this.vetoTimers.set(lobbyId, timer);
  }

  private clearVetoTimer(lobbyId: string): void {
    const existing = this.vetoTimers.get(lobbyId);
    if (existing) {
      clearTimeout(existing);
      this.vetoTimers.delete(lobbyId);
    }
  }

  private async checkNotInOtherLobby(steamId: string, excludeLobbyId?: string): Promise<void> {
    const rows = await db.queryAsync<LobbyRow>(
      `SELECT id, lobby_state FROM lobbies WHERE status IN ('waiting', 'picking', 'veto', 'ready')`
    );
    for (const row of rows) {
      if (excludeLobbyId && row.id === excludeLobbyId) continue;
      const state: LobbyState = JSON.parse(row.lobby_state);
      if (state.players.some((p) => p.steamId === steamId)) {
        throw new Error(`You are already in another lobby: ${state.lobbyName || row.id}`);
      }
    }
  }

  async listOpen(): Promise<LobbyResponse[]> {
    const rows = await db.queryAsync<LobbyRow>(
      `SELECT * FROM lobbies WHERE status NOT IN ('cancelled') ORDER BY created_at DESC`
    );
    return Promise.all(rows.map(rowToResponse));
  }

  async getById(id: string): Promise<LobbyResponse | null> {
    const row = await db.queryOneAsync<LobbyRow>('SELECT * FROM lobbies WHERE id = ?', [id]);
    return row ? rowToResponse(row) : null;
  }

  async create(
    createdBy: string,
    creatorName: string,
    creatorAvatar: string | undefined,
    opts: { teamSize?: number; format?: LobbyFormat; mapPool?: string[]; gameMode?: string }
  ): Promise<LobbyResponse> {
    const id = generateId();
    const now = Math.floor(Date.now() / 1000);
    const state: LobbyState = {
      players: [
        {
          steamId: createdBy,
          name: creatorName,
          avatar: creatorAvatar,
          team: 'team1',
          isCaptain: true,
          joinedAt: now,
        },
      ],
      lobbyName: `${creatorName}'s Lobby`,
      captains: { team1: createdBy },
      pickOrder: [],
    };

    await db.insertAsync('lobbies', {
      id,
      status: 'waiting',
      created_by: createdBy,
      team_size: opts.teamSize || 5,
      map_pool: JSON.stringify(opts.mapPool || []),
      format: opts.format || 'bo1',
      game_mode: opts.gameMode || 'competitive',
      match_slug: null,
      lobby_state: JSON.stringify(state),
      created_at: now,
      updated_at: now,
    });

    const lobby = (await this.getById(id))!;
    emitLobbyCreated(lobby);
    return lobby;
  }

  async join(
    id: string,
    steamId: string,
    name: string,
    avatar?: string
  ): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.status !== 'waiting') throw new Error('Lobby is not accepting players');

    const state = lobby.state;
    if (state.players.find((p) => p.steamId === steamId)) {
      throw new Error('Already in this lobby');
    }

    await this.checkNotInOtherLobby(steamId, id);

    const maxPlayers = lobby.teamSize * 2;
    if (state.players.length >= maxPlayers) {
      throw new Error('Lobby is full');
    }

    state.players.push({
      steamId,
      name,
      avatar,
      team: 'unassigned',
      isCaptain: false,
      joinedAt: Math.floor(Date.now() / 1000),
    });

    return this.saveState(id, state);
  }

  async leave(id: string, steamId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.status === 'veto' || lobby.status === 'ready') {
      throw new Error('Cannot leave during veto or after match is ready');
    }

    const state = lobby.state;
    state.players = state.players.filter((p) => p.steamId !== steamId);

    if (state.captains.team1 === steamId) state.captains.team1 = undefined;
    if (state.captains.team2 === steamId) state.captains.team2 = undefined;

    if (steamId === lobby.createdBy && state.players.length === 0) {
      await this.updateStatus(id, 'cancelled');
      const cancelled = (await this.getById(id))!;
      emitLobbyDeleted(id);
      return cancelled;
    }

    return this.saveState(id, state);
  }

  async kick(id: string, requesterId: string, targetId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can kick players');
    if (targetId === requesterId) throw new Error('Cannot kick yourself');
    if (lobby.status !== 'waiting' && lobby.status !== 'picking') {
      throw new Error('Cannot kick players in this phase');
    }

    const state = lobby.state;
    state.players = state.players.filter((p) => p.steamId !== targetId);
    if (state.captains.team1 === targetId) state.captains.team1 = undefined;
    if (state.captains.team2 === targetId) state.captains.team2 = undefined;

    return this.saveState(id, state);
  }

  async setCaptain(
    id: string,
    requesterId: string,
    targetId: string,
    team: 'team1' | 'team2'
  ): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can set captains');
    if (lobby.status !== 'waiting') throw new Error('Captains can only be set in waiting phase');

    const state = lobby.state;
    const player = state.players.find((p) => p.steamId === targetId);
    if (!player) throw new Error('Player not in lobby');

    const otherTeam = team === 'team1' ? 'team2' : 'team1';
    if (state.captains[otherTeam] === targetId) {
      throw new Error('Player is already captain of the other team');
    }

    const prevCaptainId = state.captains[team];
    if (prevCaptainId) {
      const prev = state.players.find((p) => p.steamId === prevCaptainId);
      if (prev) prev.isCaptain = false;
    }

    state.captains[team] = targetId;
    player.isCaptain = true;
    player.team = team;

    return this.saveState(id, state);
  }

  async startDraft(id: string, requesterId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can start the draft');
    if (lobby.status !== 'waiting') throw new Error('Draft can only start from waiting phase');
    if (!lobby.state.captains.team1 || !lobby.state.captains.team2) {
      throw new Error('Both captains must be set before starting the draft');
    }

    const state = lobby.state;
    state.pickTurn = 'team1';
    state.pickOrder = [];

    await this.updateStatus(id, 'picking');
    return this.saveState(id, state);
  }

  async pickPlayer(
    id: string,
    captainId: string,
    targetId: string
  ): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.status !== 'picking') throw new Error('Not in picking phase');

    const state = lobby.state;
    const captainTeam =
      state.captains.team1 === captainId ? 'team1' :
      state.captains.team2 === captainId ? 'team2' : null;

    if (!captainTeam) throw new Error('You are not a captain');
    if (state.pickTurn !== captainTeam) throw new Error('Not your turn to pick');

    const target = state.players.find((p) => p.steamId === targetId);
    if (!target) throw new Error('Player not in lobby');
    if (target.team !== 'unassigned') throw new Error('Player already on a team');

    target.team = captainTeam;
    state.pickOrder.push(targetId);

    // Snake draft: A-B-B-A-A-B-B-A...
    const pickCount = state.pickOrder.length;
    const maxPicks = (lobby.teamSize - 1) * 2;

    if (pickCount >= maxPicks) {
      // All players picked — assign any remaining unassigned to balance
      const unassigned = state.players.filter((p) => p.team === 'unassigned');
      for (const p of unassigned) {
        const t1Count = state.players.filter((pl) => pl.team === 'team1').length;
        const t2Count = state.players.filter((pl) => pl.team === 'team2').length;
        p.team = t1Count <= t2Count ? 'team1' : 'team2';
      }
      state.pickTurn = undefined;
    } else {
      // Snake: positions 0=A, 1=B, 2=B, 3=A, 4=A, 5=B, 6=B, 7=A
      const nextInCycle = pickCount % 4;
      state.pickTurn = nextInCycle === 0 || nextInCycle === 3 ? 'team1' : 'team2';
    }

    return this.saveState(id, state);
  }

  async swapTeam(id: string, steamId: string, toTeam: 'team1' | 'team2'): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.status !== 'waiting') throw new Error('Team swaps only allowed in waiting phase');

    const state = lobby.state;
    const player = state.players.find((p) => p.steamId === steamId);
    if (!player) throw new Error('Player not in lobby');
    if (player.isCaptain) throw new Error('Captains cannot swap teams');

    const teamCount = state.players.filter((p) => p.team === toTeam).length;
    if (teamCount >= lobby.teamSize) throw new Error('Team is full');

    player.team = toTeam;
    return this.saveState(id, state);
  }

  async startVeto(id: string, requesterId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can start veto');
    if (lobby.status !== 'waiting' && lobby.status !== 'picking') {
      throw new Error('Cannot start veto from this phase');
    }

    const state = lobby.state;
    const unassigned = state.players.filter((p) => p.team === 'unassigned');
    if (unassigned.length > 0) throw new Error('All players must be assigned to a team');

    const t1Count = state.players.filter((p) => p.team === 'team1').length;
    const t2Count = state.players.filter((p) => p.team === 'team2').length;
    if (t1Count === 0 || t2Count === 0) throw new Error('Both teams must have players');

    if (lobby.mapPool.length === 0) throw new Error('No maps in the map pool');

    // Auto-assign captains if not set
    if (!state.captains.team1) {
      const t1First = state.players.find((p) => p.team === 'team1');
      if (t1First) { state.captains.team1 = t1First.steamId; t1First.isCaptain = true; }
    }
    if (!state.captains.team2) {
      const t2First = state.players.find((p) => p.team === 'team2');
      if (t2First) { state.captains.team2 = t2First.steamId; t2First.isCaptain = true; }
    }

    state.veto = {
      availableMaps: [...lobby.mapPool],
      bannedMaps: [],
      pickedMaps: [],
      actions: [],
      currentTurn: 'team1',
      currentAction: 'ban',
      completed: false,
      turnDeadline: Date.now() + VETO_TIMEOUT_MS,
    };

    // If only 1 map, auto-pick it
    if (lobby.mapPool.length === 1) {
      state.veto.pickedMaps = [...lobby.mapPool];
      state.veto.availableMaps = [];
      state.veto.completed = true;
      await this.updateStatus(id, 'ready');
      return this.saveState(id, state);
    }

    await this.updateStatus(id, 'veto');
    const saved = await this.saveState(id, state);

    // If first turn captain is a bot, auto-play
    const firstCaptainId = state.captains[state.veto!.currentTurn];
    if (firstCaptainId && firstCaptainId.startsWith('BOT_') && state.veto!.availableMaps.length > 0) {
      const randomMap = state.veto!.availableMaps[Math.floor(Math.random() * state.veto!.availableMaps.length)];
      return this.vetoAction(id, firstCaptainId, randomMap, state.veto!.currentAction);
    }

    this.startVetoTimer(id);
    return saved;
  }

  async vetoAction(
    id: string,
    steamId: string,
    mapId: string,
    action: 'ban' | 'pick'
  ): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.status !== 'veto') throw new Error('Not in veto phase');

    const state = lobby.state;
    const veto = state.veto;
    if (!veto || veto.completed) throw new Error('Veto is not active');

    // Verify the player is a captain of the current turn's team
    const captainTeam =
      state.captains.team1 === steamId ? 'team1' :
      state.captains.team2 === steamId ? 'team2' : null;

    if (!captainTeam) throw new Error('Only captains can perform veto actions');
    if (captainTeam !== veto.currentTurn) throw new Error('Not your turn');
    if (action !== veto.currentAction) throw new Error(`Expected ${veto.currentAction}, got ${action}`);

    if (!veto.availableMaps.includes(mapId)) throw new Error('Map not available');

    veto.availableMaps = veto.availableMaps.filter((m) => m !== mapId);
    veto.actions.push({ team: captainTeam, action, map: mapId });

    if (action === 'ban') {
      veto.bannedMaps.push(mapId);
    } else {
      veto.pickedMaps.push(mapId);
    }

    // Determine next step based on format
    const format = lobby.format;
    const totalActions = veto.actions.length;

    if (format === 'bo1') {
      // BO1 veto order: ban-ban-ban-ban-ban-ban, last map is picked
      // Team1 ban, Team2 ban, Team1 ban, Team2 ban, Team1 ban, Team2 ban, remaining = pick
      if (veto.availableMaps.length === 1) {
        veto.pickedMaps.push(veto.availableMaps[0]);
        veto.availableMaps = [];
        veto.completed = true;
        await this.updateStatus(id, 'ready');
      } else {
        veto.currentTurn = veto.currentTurn === 'team1' ? 'team2' : 'team1';
        veto.currentAction = 'ban';
      }
    } else {
      // BO3 veto: ban-ban-pick-pick-ban-ban, last map is decider
      // Step 1: T1 ban, Step 2: T2 ban, Step 3: T1 pick, Step 4: T2 pick, Step 5: T1 ban, Step 6: T2 ban, Step 7: last = decider
      if (veto.availableMaps.length === 1) {
        veto.pickedMaps.push(veto.availableMaps[0]);
        veto.availableMaps = [];
        veto.completed = true;
        await this.updateStatus(id, 'ready');
      } else {
        veto.currentTurn = veto.currentTurn === 'team1' ? 'team2' : 'team1';
        // Steps 1-2: ban, Steps 3-4: pick, Steps 5-6: ban
        if (totalActions < 2) {
          veto.currentAction = 'ban';
        } else if (totalActions < 4) {
          veto.currentAction = 'pick';
        } else {
          veto.currentAction = 'ban';
        }
      }
    }

    if (veto.completed) {
      this.clearVetoTimer(id);
      veto.turnDeadline = undefined;
    } else {
      veto.turnDeadline = Date.now() + VETO_TIMEOUT_MS;
    }

    const saved = await this.saveState(id, state);

    // If the next turn belongs to a bot captain, auto-play immediately
    if (!veto.completed && veto.availableMaps.length > 0) {
      const nextCaptainId = state.captains[veto.currentTurn];
      if (nextCaptainId && nextCaptainId.startsWith('BOT_')) {
        const randomMap = veto.availableMaps[Math.floor(Math.random() * veto.availableMaps.length)];
        return this.vetoAction(id, nextCaptainId, randomMap, veto.currentAction);
      }
    }

    if (!veto.completed) {
      this.startVetoTimer(id);
    }

    return saved;
  }

  async fillWithBots(id: string, requesterId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can fill with bots');
    if (lobby.status !== 'waiting') throw new Error('Can only fill bots in waiting phase');

    const state = lobby.state;
    const maxPlayers = lobby.teamSize * 2;
    const now = Math.floor(Date.now() / 1000);
    let botIndex = state.players.filter((p) => p.steamId.startsWith('BOT_')).length + 1;

    while (state.players.length < maxPlayers) {
      state.players.push({
        steamId: `BOT_${botIndex}`,
        name: `Bot ${botIndex}`,
        team: 'unassigned',
        isCaptain: false,
        joinedAt: now,
      });
      botIndex++;
    }

    return this.saveState(id, state);
  }

  async autoAssignTeams(id: string, requesterId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can auto-assign');

    const state = lobby.state;
    const unassigned = state.players.filter((p) => p.team === 'unassigned');

    for (let i = 0; i < unassigned.length; i++) {
      unassigned[i].team = i % 2 === 0 ? 'team1' : 'team2';
    }

    if (!state.captains.team1) {
      const t1 = state.players.find((p) => p.team === 'team1');
      if (t1) { state.captains.team1 = t1.steamId; t1.isCaptain = true; }
    }
    if (!state.captains.team2) {
      const t2 = state.players.find((p) => p.team === 'team2');
      if (t2) { state.captains.team2 = t2.steamId; t2.isCaptain = true; }
    }

    return this.saveState(id, state);
  }

  async shuffleTeams(id: string, requesterId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can shuffle teams');
    if (lobby.status !== 'waiting') throw new Error('Can only shuffle in waiting phase');

    const state = lobby.state;

    // Reset all captain flags
    for (const p of state.players) {
      p.isCaptain = false;
    }
    state.captains = {};

    // Shuffle all non-spectator-only players into teams randomly
    const allPlayers = [...state.players];
    for (let i = allPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPlayers[i], allPlayers[j]] = [allPlayers[j], allPlayers[i]];
    }

    // Assign alternating: player 0 → team1, player 1 → team2, player 2 → team1, etc.
    let t1Count = 0;
    let t2Count = 0;
    for (let i = 0; i < allPlayers.length; i++) {
      if (t1Count >= lobby.teamSize && t2Count >= lobby.teamSize) {
        allPlayers[i].team = 'unassigned';
      } else if (i % 2 === 0 && t1Count < lobby.teamSize) {
        allPlayers[i].team = 'team1';
        t1Count++;
      } else if (t2Count < lobby.teamSize) {
        allPlayers[i].team = 'team2';
        t2Count++;
      } else {
        allPlayers[i].team = 'team1';
        t1Count++;
      }
    }

    state.players = allPlayers;

    // Set first player on each team as captain
    const t1 = state.players.find((p) => p.team === 'team1');
    if (t1) { state.captains.team1 = t1.steamId; t1.isCaptain = true; }
    const t2 = state.players.find((p) => p.team === 'team2');
    if (t2) { state.captains.team2 = t2.steamId; t2.isCaptain = true; }

    return this.saveState(id, state);
  }

  async transferOwnership(id: string, requesterId: string, newOwnerId: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can transfer ownership');
    const state = lobby.state;
    if (!state.players.find((p) => p.steamId === newOwnerId)) throw new Error('Player not in lobby');
    await db.updateAsync('lobbies', { created_by: newOwnerId, updated_at: Math.floor(Date.now() / 1000) }, 'id = ?', [id]);
    return (await this.getById(id))!;
  }

  async updateConfig(
    id: string,
    requesterId: string,
    config: { gameMode?: string; mapPool?: string[]; format?: LobbyFormat; teamSize?: number; lobbyName?: string; team1Name?: string; team2Name?: string }
  ): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can update config');
    if (lobby.status !== 'waiting') throw new Error('Can only change config in waiting phase');

    const updates: Record<string, unknown> = { updated_at: Math.floor(Date.now() / 1000) };
    if (config.gameMode !== undefined) updates.game_mode = config.gameMode;
    if (config.mapPool !== undefined) updates.map_pool = JSON.stringify(config.mapPool);
    if (config.format !== undefined) updates.format = config.format;
    if (config.teamSize !== undefined && config.teamSize >= 1 && config.teamSize <= 10) {
      updates.team_size = config.teamSize;
    }

    // Update names in lobby_state
    if (config.lobbyName !== undefined || config.team1Name !== undefined || config.team2Name !== undefined) {
      const state = lobby.state;
      if (config.lobbyName !== undefined) state.lobbyName = config.lobbyName;
      if (config.team1Name !== undefined) state.team1Name = config.team1Name;
      if (config.team2Name !== undefined) state.team2Name = config.team2Name;
      updates.lobby_state = JSON.stringify(state);
    }

    await db.updateAsync('lobbies', updates, 'id = ?', [id]);
    const updated = (await this.getById(id))!;
    emitLobbyUpdate(updated);
    return updated;
  }

  async joinTeam(id: string, steamId: string, team: 'team1' | 'team2' | 'unassigned'): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.status !== 'waiting') throw new Error('Can only join teams in waiting phase');

    const state = lobby.state;

    // If player is not in the lobby yet, add them
    let player = state.players.find((p) => p.steamId === steamId);
    if (!player) {
      await this.checkNotInOtherLobby(steamId, id);
      player = {
        steamId,
        name: steamId,
        team: 'unassigned',
        isCaptain: false,
        joinedAt: Math.floor(Date.now() / 1000),
      };
      state.players.push(player);
    }

    if (team === 'unassigned') {
      if (player.isCaptain) throw new Error('Captains cannot move to spectators');
      player.team = 'unassigned';
      return this.saveState(id, state);
    }

    if (player.isCaptain && player.team !== team) throw new Error('Captains cannot switch teams');
    const teamCount = state.players.filter((p) => p.team === team).length;
    if (player.team !== team && teamCount >= lobby.teamSize) throw new Error('Team is full');

    player.team = team;
    return this.saveState(id, state);
  }

  async createMatch(id: string, requesterId: string, baseUrl: string, forceServerId?: string): Promise<LobbyResponse> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.createdBy !== requesterId) throw new Error('Only the lobby creator can start the match');
    if (lobby.status !== 'ready' && lobby.status !== 'waiting') {
      throw new Error('Lobby must be in ready or waiting state');
    }
    if (lobby.matchSlug) throw new Error('Match already created for this lobby');

    const state = lobby.state;
    const t1 = state.players.filter((p) => p.team === 'team1');
    const t2 = state.players.filter((p) => p.team === 'team2');
    if (t1.length === 0 || t2.length === 0) throw new Error('Both teams must have players');

    const maps = state.veto?.completed ? state.veto.pickedMaps : lobby.mapPool;
    if (maps.length === 0) throw new Error('No maps selected');

    const slug = `lobby-${id.replace('lobby-', '')}`;
    const team1PlayerMap: MatchPlayer = {};
    const team2PlayerMap: MatchPlayer = {};
    const spectatorMap: MatchPlayer = {};
    t1.forEach((p) => { team1PlayerMap[p.steamId] = p.name; });
    t2.forEach((p) => { team2PlayerMap[p.steamId] = p.name; });
    const spectators = state.players.filter((p) => p.team === 'unassigned' && !p.steamId.startsWith('BOT_'));
    spectators.forEach((p) => { spectatorMap[p.steamId] = p.name; });

    const numMaps = maps.length;

    // Knife round for every map (like tournament matches)
    const mapSides: Array<'knife'> = Array.from({ length: numMaps }, () => 'knife');

    // Get MatchZy Enhanced cvars (autoready, pause limits, etc.)
    const matchzyEnhancedCvars = await matchzyConfigService.generateMatchzyEnhancedCvars('single_elimination');

    // Get min_players_to_ready setting
    const minPlayersToReadyRaw = await settingsService.getMatchzyMinimumReadyRequired();
    const minPlayersToReady = Math.max(0, Math.min(lobby.teamSize, minPlayersToReadyRaw));

    const config: MatchConfig = {
      matchid: Date.now(),
      num_maps: numMaps,
      maplist: maps,
      skip_veto: true,
      players_per_team: lobby.teamSize,
      min_players_to_ready: minPlayersToReady,
      min_spectators_to_ready: 0,
      wingman: false,
      map_sides: mapSides,
      team1: { name: state.team1Name || (state.captains.team1 ? `team_${(t1.find(p => p.steamId === state.captains.team1)?.name || '1').replace(/\s+/g, '')}` : 'Team 1'), players: team1PlayerMap },
      team2: { name: state.team2Name || (state.captains.team2 ? `team_${(t2.find(p => p.steamId === state.captains.team2)?.name || '2').replace(/\s+/g, '')}` : 'Team 2'), players: team2PlayerMap },
      spectators: { players: spectatorMap },
      cvars: {
        mp_maxrounds: 24,
        ...matchzyEnhancedCvars,
      },
    };

    const input: CreateMatchInput = { slug, config };
    await matchService.createMatch(input, baseUrl);

    await db.updateAsync('lobbies', {
      match_slug: slug,
      updated_at: Math.floor(Date.now() / 1000),
    }, 'id = ?', [id]);

    if (forceServerId) {
      // Force-assign specific server, bypassing all availability checks
      const server = await serverService.getServerById(forceServerId);
      if (!server) throw new Error(`Server '${forceServerId}' not found`);
      serverAllocationTracker.markAllocated(forceServerId, slug);
      await db.updateAsync('matches', { server_id: forceServerId }, 'slug = ?', [slug]);
      const loadResult = await loadMatchOnServer(slug, forceServerId, { baseUrl });
      if (loadResult.success) {
        emitMatchUpdate({ slug, serverId: forceServerId } as never);
        emitBracketUpdate({ action: 'server_assigned', matchSlug: slug, serverId: forceServerId });
      } else {
        await db.updateAsync('matches', { server_id: null }, 'slug = ?', [slug]);
        serverAllocationTracker.markIdle(forceServerId);
        log.warn(`Lobby ${id}: force-allocation to ${forceServerId} failed: ${loadResult.error}`);
      }
    } else {
      // Auto-allocate server
      try {
        const allocation = await matchAllocationService.allocateSingleMatch(slug, baseUrl);
        if (!allocation.success) {
          log.warn(`Lobby ${id}: auto-allocation failed: ${allocation.error}`);
        }
      } catch (err) {
        log.warn(`Lobby ${id}: auto-allocation threw`, err as Error);
      }
    }

    const updated = (await this.getById(id))!;
    emitLobbyUpdate(updated);
    return updated;
  }

  async cancel(id: string, requesterId: string, isAdmin = false): Promise<void> {
    const lobby = await this.getById(id);
    if (!lobby) throw new Error('Lobby not found');
    if (!isAdmin && lobby.createdBy !== requesterId) throw new Error('Only the lobby creator or an admin can cancel');

    await this.updateStatus(id, 'cancelled');
    emitLobbyDeleted(id);
  }

  private async updateStatus(id: string, status: LobbyStatus): Promise<void> {
    await db.updateAsync(
      'lobbies',
      { status, updated_at: Math.floor(Date.now() / 1000) },
      'id = ?',
      [id]
    );
  }

  private async saveState(id: string, state: LobbyState): Promise<LobbyResponse> {
    await db.updateAsync(
      'lobbies',
      {
        lobby_state: JSON.stringify(state),
        updated_at: Math.floor(Date.now() / 1000),
      },
      'id = ?',
      [id]
    );
    const lobby = (await this.getById(id))!;
    emitLobbyUpdate(lobby);
    return lobby;
  }
}

export const lobbyService = new LobbyService();
