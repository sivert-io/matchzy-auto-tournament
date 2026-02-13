import { Router, Request, Response } from 'express';

import { db } from '../config/database';
import { log } from '../utils/logger';

const router = Router();

type HeartbeatStatus = 'idle' | 'loading' | 'warmup' | 'live' | 'postgame' | 'error';

function requireServerToken(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.SERVER_TOKEN || '';
  if (!expected) {
    return { ok: false, status: 500, error: 'SERVER_TOKEN is not configured' };
  }

  const headerToken = (req.headers['x-matchzy-token'] as string | undefined) ?? '';
  const auth = (req.headers.authorization as string | undefined) ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.substring(7) : '';
  const provided = headerToken || bearer;

  if (!provided) return { ok: false, status: 401, error: 'Missing server token' };
  if (provided !== expected) return { ok: false, status: 403, error: 'Invalid server token' };
  return { ok: true };
}

function isValidStatus(s: unknown): s is HeartbeatStatus {
  return s === 'idle' || s === 'loading' || s === 'warmup' || s === 'live' || s === 'postgame' || s === 'error';
}

/**
 * POST /api/servers/:serverId/heartbeat
 *
 * Server-driven allocator heartbeat. This is the primary source of truth for:
 * - Whether the server is configured (first heartbeat received)
 * - Whether it is allocatable (ready_for_allocation)
 * - What phase it's in (status + match identifiers)
 */
router.post('/:serverId/heartbeat', async (req: Request, res: Response) => {
  const auth = requireServerToken(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, error: auth.error });
  }

  const serverId = String(req.params.serverId || '').trim();
  if (!serverId) {
    return res.status(400).json({ success: false, error: 'serverId is required' });
  }

  // Minimal payload; keep permissive to allow evolution.
  const body = (req.body ?? {}) as Record<string, unknown>;
  const statusRaw = body.status;
  const status: HeartbeatStatus = isValidStatus(statusRaw) ? statusRaw : 'error';
  const matchSlug = typeof body.match_slug === 'string' && body.match_slug.trim() ? body.match_slug.trim() : null;
  const matchid =
    typeof body.matchid === 'number' && Number.isFinite(body.matchid) ? Math.floor(body.matchid) : null;
  const ready =
    typeof body.ready_for_allocation === 'boolean'
      ? body.ready_for_allocation
      : typeof body.ready_for_allocation === 'number'
      ? body.ready_for_allocation !== 0
      : false;
  const pluginVersion = typeof body.plugin_version === 'string' ? body.plugin_version : null;

  const now = Math.floor(Date.now() / 1000);

  try {
    const existing = await db.queryOneAsync<{ id: string }>('SELECT id FROM servers WHERE id = ?', [
      serverId,
    ]);
    if (!existing) {
      // Do not auto-create servers; they must be provisioned from admin UI.
      return res.status(404).json({ success: false, error: `Server '${serverId}' not found` });
    }

    const cs2BuildId =
      typeof body.cs2_build_id === 'number' && Number.isFinite(body.cs2_build_id)
        ? Math.floor(body.cs2_build_id)
        : null;
    const cs2VersionString =
      typeof body.cs2_version_string === 'string' && body.cs2_version_string.trim()
        ? body.cs2_version_string.trim()
        : null;

    const updateData: Record<string, unknown> = {
      // Compatibility: keep the old heartbeat fields up to date too.
      last_seen: now,
      status: 'online',
      updated_at: now,

      heartbeat_status: status,
      heartbeat_match_slug: matchSlug,
      heartbeat_matchid: matchid,
      heartbeat_ready_for_allocation: ready ? 1 : 0,
      heartbeat_updated_at: now,
      heartbeat_plugin_version: pluginVersion,
    };

    // RU heartbeat can optionally include CS2 build/version info so the UI can
    // display it without needing an RCON `version` fetch.
    let touchedCs2Version = false;
    if (typeof cs2BuildId === 'number') {
      updateData.cs2_build_id = cs2BuildId;
      touchedCs2Version = true;
    }
    if (typeof cs2VersionString === 'string') {
      updateData.cs2_version_string = cs2VersionString;
      touchedCs2Version = true;
    }
    if (touchedCs2Version) {
      updateData.cs2_version_fetched_at = now;
    }

    await db.updateAsync('servers', updateData, 'id = ?', [serverId]);

    return res.json({
      success: true,
      serverId,
      receivedAt: now,
    });
  } catch (error) {
    log.error('[HEARTBEAT] Failed to persist heartbeat', error as Error, { serverId });
    return res.status(500).json({ success: false, error: 'Failed to persist heartbeat' });
  }
});

export default router;

