import { db } from '../config/database';
import { Match, MatchConfig, CreateMatchInput, MatchResponse, MatchPlayer } from '../types/match.types';
import { log } from '../utils/logger';
import { settingsService } from './settingsService';
import { emitMatchUpdate } from './socketService';
import { matchzyConfigService } from './matchzyConfigService';
import { matchAllocationService } from './matchAllocationService';
import { serverAllocationTracker } from './serverAllocationTracker';
import type { DbTournamentRow } from '../types/database.types';

class MatchService {
  /**
   * Create a new match configuration
   */
  async createMatch(input: CreateMatchInput, baseUrl: string): Promise<MatchResponse> {
    // Check if slug already exists
    const existing = await db.getOneAsync<Match>('matches', 'slug = ?', [input.slug]);
    if (existing) {
      throw new Error(`Match with slug '${input.slug}' already exists`);
    }

    // Manual matches no longer support explicit server selection – the backend
    // is responsible for auto‑allocating an appropriate server. We intentionally
    // ignore any serverId passed in the payload to avoid double‑booking or
    // pinning matches to a single server.

    // Normalize config and apply global simulation + round-limit settings so
    // manual matches behave like tournament-generated matches.
    const config: MatchConfig = {
      ...input.config,
    };

    // Normalize manual-match roster shapes so stored configs match what the plugin expects:
    // - team.players as map { steamid64: name }
    // - spectators.players as map { steamid64: name }
    // - captain_steamid64 defaulted to first roster member when missing
    const normalizePlayers = (value: unknown): MatchPlayer => {
      if (!value) return {};

      // Case 1: already a map of steamId -> name
      if (typeof value === 'object' && !Array.isArray(value)) {
        const result: MatchPlayer = {};
        for (const [steamId, name] of Object.entries(value as Record<string, unknown>)) {
          if (typeof name === 'string') result[steamId] = name;
        }
        return result;
      }

      // Case 2: array of { steamid/name } objects (manual match modal / legacy)
      if (Array.isArray(value)) {
        const result: MatchPlayer = {};
        for (const entry of value as Array<unknown>) {
          if (!entry || typeof entry !== 'object') continue;
          const steamid =
            (entry as { steamid?: string; steamId?: string }).steamid ||
            (entry as { steamid?: string; steamId?: string }).steamId;
          const name = (entry as { name?: string }).name;
          if (steamid && name) result[steamid] = name;
        }
        return result;
      }

      return {};
    };

    const pickFirstSteamId = (players: MatchPlayer): string | null => {
      const keys = Object.keys(players);
      return keys.length > 0 ? keys[0] : null;
    };

    if (config.team1) {
      config.team1.players = normalizePlayers((config.team1 as { players?: unknown }).players);
      if (!config.team1.captain_steamid64) {
        config.team1.captain_steamid64 = pickFirstSteamId(config.team1.players);
      }
    }
    if (config.team2) {
      config.team2.players = normalizePlayers((config.team2 as { players?: unknown }).players);
      if (!config.team2.captain_steamid64) {
        config.team2.captain_steamid64 = pickFirstSteamId(config.team2.players);
      }
    }

    config.spectators = {
      players: normalizePlayers((config.spectators as { players?: unknown } | undefined)?.players),
    };

    try {
      // Apply global simulation mode (development only, mirrors matchConfigBuilder behavior)
      const simulationEnabled = await settingsService.isSimulationModeEnabled();
      if (simulationEnabled) {
        const timescale = await settingsService.getSimulationTimescale();
        config.simulation = true;
        config.simulation_timescale = timescale;
      } else {
        // Explicitly clear simulation flags for manual matches when simulation mode is off.
        config.simulation = false;
        config.simulation_timescale = undefined;
      }

      // Respect a manually provided mp_maxrounds from the match config when present.
      const hasManualMaxRounds =
        typeof config.cvars?.mp_maxrounds === 'number' &&
        Number.isFinite(config.cvars.mp_maxrounds) &&
        config.cvars.mp_maxrounds > 0;

      // Apply mp_maxrounds based on the primary tournament's maxRounds only when
      // the manual match config did not already specify a value. This keeps the
      // manual match modal's "Max rounds" field authoritative while still
      // providing a sensible default that mirrors tournament-generated matches.
      if (!hasManualMaxRounds) {
        const tournament = await db.queryOneAsync<DbTournamentRow>(
          'SELECT * FROM tournament WHERE id = ?',
          [1]
        );
        if (tournament) {
          const raw: unknown = tournament.max_rounds as unknown;
          const parsed =
            typeof raw === 'number'
              ? raw
              : typeof raw === 'string' && raw.trim() !== ''
              ? Number(raw)
              : undefined;

          const maxRounds =
            typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0 ? parsed : 24;

          config.cvars = {
            ...(config.cvars || {}),
            mp_maxrounds: maxRounds,
          };
        }
      }

      // Apply MatchZy Enhanced v1.3.0 cvars for manual matches.
      // Use the 'default' profile (safe, permissive settings) unless the config
      // already includes specific MatchZy Enhanced cvars (allowing customization).
      const hasMatchzyEnhancedCvars = config.cvars && (
        'matchzy_autoready_enabled' in config.cvars ||
        'matchzy_gg_enabled' in config.cvars ||
        'matchzy_ffw_enabled' in config.cvars
      );

      if (!hasMatchzyEnhancedCvars) {
        const matchzyEnhancedCvars = matchzyConfigService.getDefaultMatchzyEnhancedCvars();
        config.cvars = {
          ...(config.cvars || {}),
          ...matchzyEnhancedCvars,
        };
        log.debug('Applied default MatchZy Enhanced cvars to manual match', {
          matchSlug: input.slug,
        });
      }

      // Ensure overtime metadata is present for manual matches.
      // RU uses overtimeMode/overtimeSegments/maxRounds for winner logic and will
      // otherwise default to "no overtime", which can cause matches to end as draws
      // even when mp_overtime_enable=1 is set.
      const parseFiniteNumber = (v: unknown): number | null => {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string' && v.trim() !== '') {
          const n = Number(v);
          if (Number.isFinite(n)) return n;
        }
        return null;
      };

      if (
        typeof config.maxRounds !== 'number' ||
        !Number.isFinite(config.maxRounds) ||
        config.maxRounds <= 0
      ) {
        const mr = parseFiniteNumber(config.cvars?.mp_maxrounds);
        if (mr !== null && mr > 0) {
          config.maxRounds = Math.floor(mr);
        }
      }

      if (!config.overtimeMode) {
        const ot = config.cvars?.mp_overtime_enable as unknown;
        const enabled = ot === 1 || ot === '1' || ot === true;
        const disabled = ot === 0 || ot === '0' || ot === false;
        if (enabled || disabled) {
          config.overtimeMode = enabled ? 'enabled' : 'disabled';
        }
      }

      if (
        config.overtimeMode === 'enabled' &&
        (typeof config.overtimeSegments !== 'number' ||
          !Number.isFinite(config.overtimeSegments) ||
          config.overtimeSegments <= 0)
      ) {
        const otMax = parseFiniteNumber(config.cvars?.mp_overtime_maxrounds);
        if (otMax !== null && otMax > 0) {
          // CS2 uses total overtime rounds; the config uses rounds per OT half.
          config.overtimeSegments = Math.max(1, Math.floor(otMax / 2));
        }
      }
    } catch (simError) {
      log.warn(
        'Failed to apply simulation / round-limit settings to manual match config',
        simError as Error
      );
    }

    // Always attach current admin Steam64 IDs to manual match configs so they
    // have in‑game admin rights just like tournament-generated matches.
    try {
      const adminRows = await db.queryAsync<{ id: string }>(
        'SELECT id FROM players WHERE is_admin = 1'
      );
      config.admins = Array.isArray(adminRows) ? adminRows.map((row) => row.id) : [];
    } catch (e) {
      log.warn('Failed to attach admins to manual match config', e as Error);
    }

    // Insert match
    //
    // NOTE: Manual matches are intentionally **not** part of the tournament
    // bracket flow. We still persist them in the same `matches` table so that
    // existing tooling (match list, server status, etc.) can see them, but we
    // mark them with `round = 0` and `match_number = 0` to distinguish them
    // from bracket matches (which always use round >= 1).
    // Derive team IDs from config so manual matches can participate in veto
    // flow and use the same team lookup logic as bracket matches.
    const team1Id = config.team1?.id ?? null;
    const team2Id = config.team2?.id ?? null;

    // Determine initial status based on whether veto is enabled
    // If veto is enabled (vetoDisabled === false), start as 'pending' to allow veto flow
    // Otherwise, start as 'ready' for immediate allocation
    const vetoEnabled = config.vetoDisabled === false;
    const initialStatus = vetoEnabled ? 'pending' : 'ready';

    await db.insertAsync('matches', {
      slug: input.slug,
      // Manual matches are **independent** of the primary tournament bracket.
      // We keep them in the same table for shared tooling, but do not associate
      // them with any tournament row.
      tournament_id: null,
      round: 0, // 0 = manual / non-bracket match
      match_number: 0,
      // Always start manual matches without a server; the allocator will attach
      // a concrete server_id once it has picked a free server.
      server_id: null,
      team1_id: team1Id,
      team2_id: team2Id,
      config: JSON.stringify(config),
      // If veto is enabled, start as 'pending' to allow teams to complete veto.
      // Otherwise, start as 'ready' for immediate server allocation.
      status: initialStatus,
    });

    const match = await db.getOneAsync<Match>('matches', 'slug = ?', [input.slug]);
    if (!match) {
      throw new Error('Failed to create match');
    }

    // Persist matchid into the stored config now that we have the DB id.
    // This keeps the stored JSON self-contained (useful for debugging/export) and
    // aligns with the plugin's requirement for a non-zero matchid.
    try {
      config.matchid = match.id;
      await db.updateAsync('matches', { config: JSON.stringify(config) }, 'id = ?', [match.id]);
    } catch (e) {
      log.warn('Failed to persist matchid into manual match config JSON', e as Error);
    }

    const response = this.toResponse(match, baseUrl);

    // Emit a websocket update so UIs (Matches page, player views, etc.) can
    // immediately reflect newly created manual matches without requiring a
    // full page refresh.
    try {
      emitMatchUpdate({
        id: response.id,
        slug: response.slug,
        status: response.status,
        serverId: response.serverId,
        config: response.config,
      });
    } catch (socketError) {
      log.warn('Failed to emit match update after manual match creation', socketError as Error);
    }

    log.matchCreated(input.slug, input.serverId ?? '<auto>');
    return response;
  }

  /**
   * Get match by slug
   */
  async getMatchBySlug(slug: string, baseUrl: string): Promise<MatchResponse | null> {
    const match = await db.getOneAsync<Match>('matches', 'slug = ?', [slug]);
    return match ? this.toResponse(match, baseUrl) : null;
  }

  /**
   * Get match by ID
   */
  async getMatchById(id: number, baseUrl: string): Promise<MatchResponse | null> {
    const match = await db.getOneAsync<Match>('matches', 'id = ?', [id]);
    return match ? this.toResponse(match, baseUrl) : null;
  }

  /**
   * Get all matches
   */
  async getAllMatches(baseUrl: string, serverId?: string): Promise<MatchResponse[]> {
    let matches: Match[];
    if (serverId) {
      matches = await db.getAllAsync<Match>('matches', 'server_id = ?', [serverId]);
    } else {
      matches = await db.getAllAsync<Match>('matches');
    }
    return matches.map((m) => this.toResponse(m, baseUrl));
  }

  /**
   * Update match status
   */
  async updateMatchStatus(slug: string, status: 'pending' | 'loaded' | 'live' | 'completed'): Promise<void> {
    const match = await db.getOneAsync<Match>('matches', 'slug = ?', [slug]);
    if (!match) {
      throw new Error(`Match '${slug}' not found`);
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'loaded') {
      updateData.loaded_at = Math.floor(Date.now() / 1000);
    }

    await db.updateAsync('matches', updateData, 'slug = ?', [slug]);
    log.matchStatusUpdate(slug, status);
  }

  /**
   * Delete match
   */
  async deleteMatch(slug: string): Promise<void> {
    const match = await db.getOneAsync<Match>('matches', 'slug = ?', [slug]);
    if (!match) {
      throw new Error(`Match '${slug}' not found`);
    }

    const serverId = match.server_id;
    await db.deleteAsync('matches', 'slug = ?', [slug]);
    log.success(`Match deleted: ${slug}`);

    // If the deleted match had a server assigned, mark that server as idle
    // and trigger immediate allocation for any waiting matches.
    if (serverId) {
      serverAllocationTracker.markIdle(serverId);
      log.info(`Server ${serverId} freed by match deletion, triggering immediate allocation`);
      setImmediate(() => {
        void matchAllocationService.tryImmediateAllocation();
      });
    }
  }

  /**
   * Get match config (raw JSON for MatchZy)
   */
  async getMatchConfig(slug: string): Promise<MatchConfig | null> {
    const match = await db.getOneAsync<Match>('matches', 'slug = ?', [slug]);
    if (!match) {
      return null;
    }
    return JSON.parse(match.config) as MatchConfig;
  }

  /**
   * Convert database match to response format
   */
  private toResponse(match: Match, baseUrl: string): MatchResponse {
    const config = JSON.parse(match.config) as MatchConfig;
    return {
      id: match.id,
      slug: match.slug,
      serverId: match.server_id,
      config,
      createdAt: match.created_at,
      loadedAt: match.loaded_at,
      status: match.status,
      configUrl: `${baseUrl}/api/matches/${match.slug}.json`,
    };
  }
}

export const matchService = new MatchService();
