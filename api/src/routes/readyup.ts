import { Router, Request, Response } from 'express';
import { getLatestReadyUpVersion } from '../services/readyupVersionService';

const router = Router();

/**
 * GET /api/readyup/latest-version
 * Get the latest ReadyUp version from GitHub (cached).
 */
router.get('/latest-version', async (_req: Request, res: Response) => {
  try {
    const versionInfo = await getLatestReadyUpVersion();

    if (!versionInfo) {
      return res.status(200).json({
        success: false,
        message: 'Could not fetch latest version (GitHub API may be unavailable)',
      });
    }

    return res.status(200).json({
      success: true,
      version: versionInfo.version,
      releaseUrl: versionInfo.releaseUrl,
    });
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ReadyUp version',
    });
  }
});

export default router;

