import { Router, Request, Response } from 'express';
import { serverService } from '../services/serverService';
import { requireAuth } from '../middleware/auth';
import { log } from '../utils/logger';
import { serverAllocationTracker } from '../services/serverAllocationTracker';
import { db } from '../config/database';
import { cs2UpdateService } from '../services/cs2UpdateService';

const router = Router();

// Protect all routes
router.use(requireAuth);

/**
 * @openapi
 * /api/servers/{id}/status:
 *   get:
 *     tags:
 *       - Servers
 *     summary: Test server RCON connection
 *     description: Attempts to connect to the server via RCON and returns online/offline status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Server ID
 *     responses:
 *       200:
 *         description: Server status retrieved
 *       404:
 *         description: Server not found
 */
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const server = await serverService.getServerById(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: `Server '${id}' not found`,
      });
    }

    // Keep a local view of the CS2 update-required signal so this endpoint can
    // immediately reflect clears/updates during manual refresh without requiring
    // a second GET /api/servers roundtrip from the UI.
    let effectiveCs2RequiredVersion: number | null = server.cs2RequiredVersion ?? null;
    let effectiveCs2UpdatePhase: string | null = server.cs2UpdatePhase ?? null;
    let effectiveCs2UpdateCheckedAt: number | null = server.cs2UpdateCheckedAt ?? null;

    // Fake server for screenshots/testing - always return online
    // Servers with IP 0.0.0.0 are treated as always online (fake servers)
    if (server.host === '0.0.0.0') {
      return res.json({
        success: true,
        status: 'online',
        serverId: id,
        isAvailable: true,
        currentMatch: null,
        // Heartbeat-derived fields (kept for UI parity with real servers)
        heartbeatStatus: server.heartbeatStatus ?? null,
        heartbeatUpdatedAt: server.heartbeatUpdatedAt ?? null,
        heartbeatPluginVersion: server.heartbeatPluginVersion ?? null,
        heartbeatReadyForAllocation: true,
        heartbeatRecent: true,
        cs2RequiredVersion: effectiveCs2RequiredVersion,
        cs2UpdatePhase: effectiveCs2UpdatePhase,
        cs2UpdateCheckedAt: effectiveCs2UpdateCheckedAt,
      });
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const heartbeatUpdatedAt = server.heartbeatUpdatedAt ?? null;
    const heartbeatSeen = heartbeatUpdatedAt !== null;
    // Heartbeat freshness window:
    // MatchZy Enhanced sends heartbeats every ~15s steady-state, with short backoff on failures.
    // Keep this comfortably above 15s so servers don't flap offline due to a single miss.
    const HEARTBEAT_FRESH_SECONDS = 45;
    const heartbeatRecent =
      heartbeatUpdatedAt !== null ? nowSec - heartbeatUpdatedAt <= HEARTBEAT_FRESH_SECONDS : false;

    // Heartbeat-only model: online/offline is derived strictly from RU heartbeat freshness.
    const online = heartbeatRecent;

    // Heartbeat is the source of truth for allocatability and match state.
    const heartbeatStatus = server.heartbeatStatus ?? null;
    const heartbeatMatchSlug = server.heartbeatMatchSlug ?? null;
    const queuedMatchSlug = null;
    const isAvailable = online && server.heartbeatReadyForAllocation === true;

    // Internal allocator state (UI-only).
    const allocationState = serverAllocationTracker.getState(id);
    const allocationLabel = allocationState?.state ?? 'unknown';

    // Best-effort: last known CS2 version/build from DB (populated by RU heartbeat).
    let cs2BuildId: number | null = server.cs2BuildId ?? null;
    let cs2VersionString: string | null = server.cs2VersionString ?? null;
    let cs2VersionFetchedAt: number | null = server.cs2VersionFetchedAt ?? null;
    const cs2UpdateCheckedAt: number | null = server.cs2UpdateCheckedAt ?? null;
    const wasMarkedOutOfDate = typeof server.cs2RequiredVersion === 'number';

    if (!online) {
      log.warn(`Server ${id} is offline (no recent RU heartbeat)`);
      return res.json({
        success: true,
        status: 'offline',
        serverId: id,
        isAvailable: false,
        currentMatch: heartbeatMatchSlug,
        queuedMatch: queuedMatchSlug,
        // Compatibility: reflect “heartbeat seen”
        serverCanReachApi: heartbeatSeen,
        pluginStatus: heartbeatStatus,
        // Heartbeat-derived fields
        heartbeatStatus,
        heartbeatUpdatedAt,
        heartbeatPluginVersion: server.heartbeatPluginVersion ?? null,
        heartbeatReadyForAllocation: isAvailable,
        allocationState: allocationLabel,
        allocationMatchSlug: allocationState?.matchSlug ?? null,
        heartbeatRecent,
        cs2BuildId,
        cs2VersionString,
        cs2VersionFetchedAt,
        cs2RequiredVersion: effectiveCs2RequiredVersion,
        cs2UpdatePhase: effectiveCs2UpdatePhase,
        cs2UpdateCheckedAt: effectiveCs2UpdateCheckedAt,
      });
    }

    // Best-effort: check CS2 build against Steam UpToDateCheck (BuildID-based).
    // Persist cs2_required_version so allocator/UI can block out-of-date servers
    // without waiting for the plugin to emit cs2_update_required.
    try {
      const now = Math.floor(Date.now() / 1000);
      const STALE_AFTER_SECONDS = 10 * 60; // Steam checks should be infrequent
      const isStale =
        wasMarkedOutOfDate || !cs2UpdateCheckedAt || now - cs2UpdateCheckedAt >= STALE_AFTER_SECONDS;

      if (isStale && typeof cs2BuildId === 'number' && Number.isFinite(cs2BuildId)) {
        const result = await cs2UpdateService.upToDateCheck(cs2BuildId);

        if (result.upToDate) {
          await db.updateAsync(
            'servers',
            {
              cs2_required_version: null,
              cs2_update_phase: null,
              cs2_update_required_at: null,
              cs2_update_checked_at: now,
              updated_at: now,
            },
            'id = ?',
            [id]
          );
          effectiveCs2RequiredVersion = null;
          effectiveCs2UpdatePhase = null;
          effectiveCs2UpdateCheckedAt = now;
        } else {
          const existingPhase = server.cs2UpdatePhase ?? null;
          const requiredVersion =
            result.requiredVersion ?? server.cs2RequiredVersion ?? null;
          const phase =
            existingPhase === 'shutdown' ? 'shutdown' : 'available';
          await db.updateAsync(
            'servers',
            {
              cs2_required_version: requiredVersion,
              cs2_update_phase: phase,
              cs2_update_required_at: now,
              cs2_update_checked_at: now,
              updated_at: now,
            },
            'id = ?',
            [id]
          );
          effectiveCs2RequiredVersion = requiredVersion;
          effectiveCs2UpdatePhase = phase;
          effectiveCs2UpdateCheckedAt = now;
        }
      }
    } catch (error) {
      // Non-fatal: if Steam check fails, keep last known cs2_required_version state.
      log.debug(`Failed to check CS2 UpToDateCheck for server ${id}`, { error });
    }

    return res.json({
      success: true,
      status: 'online',
      serverId: id,
      isAvailable,
      currentMatch: heartbeatMatchSlug,
      queuedMatch: queuedMatchSlug,
      // Compatibility: this reflects "heartbeat seen"
      serverCanReachApi: heartbeatSeen,
      // Heartbeat-driven state
      pluginStatus: heartbeatStatus,
      // Heartbeat-derived fields (used directly by UI chips)
      heartbeatStatus,
      heartbeatUpdatedAt,
      heartbeatPluginVersion: server.heartbeatPluginVersion ?? null,
      heartbeatReadyForAllocation: isAvailable,
      allocationState: allocationLabel,
      allocationMatchSlug: allocationState?.matchSlug ?? null,
      heartbeatRecent,
      cs2BuildId,
      cs2VersionString,
      cs2VersionFetchedAt,
      cs2RequiredVersion: effectiveCs2RequiredVersion,
      cs2UpdatePhase: effectiveCs2UpdatePhase,
      cs2UpdateCheckedAt: effectiveCs2UpdateCheckedAt,
    });
  } catch (error) {
    log.error('Error checking server status', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check server status',
    });
  }
});

export default router;
