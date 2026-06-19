import { Router, Request, Response } from 'express';
import { getVerifiedPlayerSteamId } from '../utils/signedPlayerCookie';
import {
  getRegistrationStatusForTeam,
  registerTeamForTournament,
} from '../services/registrationService';
import { log } from '../utils/logger';

const router = Router();

/**
 * Team registration status (player portal).
 */
router.get('/team/:teamId', async (req: Request, res: Response) => {
  try {
    const steamId = getVerifiedPlayerSteamId(req.headers.cookie);
    const status = await getRegistrationStatusForTeam(req.params.teamId, steamId ?? undefined);
    return res.json({ success: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * Register team for current tournament (captain only). Returns Mercado Pago checkout URL when fee > 0.
 */
router.post('/team/:teamId', async (req: Request, res: Response) => {
  try {
    const steamId = getVerifiedPlayerSteamId(req.headers.cookie);
    if (!steamId) {
      return res.status(401).json({
        success: false,
        error: 'Sign in with Steam to register your team',
      });
    }

    const result = await registerTeamForTournament(req.params.teamId, steamId);
    return res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.warn('Team registration failed', { error, teamId: req.params.teamId });
    return res.status(400).json({ success: false, error: message });
  }
});

export default router;
