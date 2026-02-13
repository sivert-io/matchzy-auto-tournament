/**
 * Match Loading Service - handles loading matches on game servers
 * Centralized logic for configuring and loading matches via RCON
 */

import { db } from '../config/database';
import { rconService } from './rconService';
import { emitMatchUpdate, emitBracketUpdate } from './socketService';
import { log } from '../utils/logger';
import type { DbMatchRow } from '../types/database.types';
import { matchLiveStatsService } from './matchLiveStatsService';
import { serverInitializationService } from './serverInitializationService';
import { getReadyUpLoadMatchCommands, redactReadyUpCommand } from '../utils/readyupRconCommands';

export interface MatchLoadOptions {
  skipWebhook?: boolean; // Deprecated: Webhooks are now persistent, this param is ignored
  baseUrl: string;
}

export interface MatchLoadResult {
  success: boolean;
  error?: string;
  webhookConfigured?: boolean;
  demoUploadConfigured?: boolean;
  rconResponses?: Array<{ success: boolean; command: string; error?: string }>;
}

/**
 * Load a match on a server via RCON
 * Handles all configuration: webhook, demo upload, auth, and match loading
 */
export async function loadMatchOnServer(
  matchSlug: string,
  serverId: string,
  options: MatchLoadOptions
): Promise<MatchLoadResult> {
  const { baseUrl } = options;
  const results: Array<{ success: boolean; command: string; error?: string }> = [];
  const demoUploadConfigured = false;

  try {
    log.info(`[MATCH LOADING] Loading match ${matchSlug} on server ${serverId}`);

    // Get match config
    const match = await db.queryOneAsync<DbMatchRow>('SELECT * FROM matches WHERE slug = ?', [
      matchSlug,
    ]);
    if (!match) {
      log.error(`Match ${matchSlug} not found in database`);
      return { success: false, error: 'Match not found' };
    }

    const configUrl = `${baseUrl.replace(/\/+$/, '')}/api/matches/${matchSlug}.json`;
    log.debug(`Match config URL: ${configUrl}`);

    // Helper to add small delay between RCON commands to avoid overwhelming the server
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // STEP 1: Initialize server with persistent configuration (if not already done)
    // ReadyUp: configure base webhook URL, heartbeat URL, and bearer token.
    const initResult = await serverInitializationService.initializeServer(serverId, baseUrl);
    if (!initResult.success && !initResult.alreadyInitialized) {
      log.error(`Cannot load match ${matchSlug}: server initialization failed`, {
        error: initResult.error,
      });
      return {
        success: false,
        error: `Server initialization failed: ${initResult.error}`,
        rconResponses: results,
      };
    }

    if (initResult.alreadyInitialized) {
      log.debug(`[MATCH LOADING] Server ${serverId} already initialized, skipping persistent config`);
    } else {
      log.success(`[MATCH LOADING] Server ${serverId} initialized with persistent configuration`);
    }

    // Delay before sending the load command to ensure previous commands are processed
    await delay(500);

    // Load match on server
    log.success(`✅ Server ${serverId} ready. Loading match ${matchSlug} via ReadyUp`);
    log.info(`Sending load command to ${serverId}: ru match load ${configUrl}`);

    const ruCmds = getReadyUpLoadMatchCommands({ baseUrl, matchSlug });
    let loadOk = true;
    for (const cmd of ruCmds) {
      const r = await rconService.sendCommand(serverId, cmd);
      results.push({
        success: r.success,
        command: redactReadyUpCommand(cmd),
        error: r.error,
      });
      if (!r.success) loadOk = false;
      await delay(150);
    }

    if (!loadOk) {
      return {
        success: false,
        error: 'ReadyUp failed to load the match (see rconResponses)',
        webhookConfigured: false,
        demoUploadConfigured: false,
        rconResponses: results,
      };
    }

    log.success(`[MATCH LOADING] Match ${matchSlug} loaded successfully on ${serverId}`);
    matchLiveStatsService.reset(match.slug);

    // Update match status to 'loaded'
    await db.updateAsync(
      'matches',
      { status: 'loaded', loaded_at: Math.floor(Date.now() / 1000) },
      'slug = ?',
      [matchSlug]
    );
    log.matchLoaded(matchSlug, serverId, true);

    const updatedMatch = await db.queryOneAsync<DbMatchRow>(
      'SELECT * FROM matches WHERE slug = ?',
      [matchSlug]
    );
    if (updatedMatch) {
      emitMatchUpdate(updatedMatch);
      emitBracketUpdate({ action: 'match_loaded', matchSlug });
    }

    return {
      success: true,
      webhookConfigured: true,
      demoUploadConfigured,
      rconResponses: results,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      rconResponses: results,
    };
  }
}
