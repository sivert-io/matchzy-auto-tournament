import { Router, Request, Response } from 'express';
import { db } from '../config/database';
import { log } from '../utils/logger';

const router = Router();

/**
 * GET /api/public/admins.json
 *
 * Public, minimal admin list for ReadyUp.
 * Returns only SteamID64 values (no player directory leakage).
 *
 * Shape A (preferred by ReadyUp): { "admins": ["7656...", ...] }
 */
router.get('/admins.json', async (_req: Request, res: Response) => {
  try {
    const rows = await db.queryAsync<{ id: string }>(
      'SELECT id FROM players WHERE is_admin = 1 ORDER BY id ASC',
      []
    );

    const admins = rows
      .map((r) => String(r.id))
      .filter((id) => id && /^7656\d{13}$/.test(id));

    // Cache briefly to reduce RU polling load; refresh interval is configured on the RU side.
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=30');

    return res.status(200).json({
      admins,
      count: admins.length,
      generatedAt: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    log.error('Failed to render public admins.json', { error });
    return res.status(500).json({
      success: false,
      error: 'Failed to generate admins.json',
    });
  }
});

export default router;

