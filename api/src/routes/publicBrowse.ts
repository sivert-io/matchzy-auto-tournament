import { Router, Request, Response } from 'express';
import { getCurrentOrganization } from '../services/organizationService';
import { tournamentService } from '../services/tournamentService';
import { teamService } from '../services/teamService';
import { log } from '../utils/logger';

const router = Router();

/**
 * Camp + active tournament snapshot for the public player hub (no auth).
 */
router.get('/camp', async (_req: Request, res: Response) => {
  try {
    const organization = await getCurrentOrganization();
    const tournament = await tournamentService.getTournament();
    return res.json({ success: true, organization, tournament });
  } catch (error) {
    log.error('Error fetching public camp overview', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * Team directory for public browse (id, name, tag).
 */
router.get('/teams', async (_req: Request, res: Response) => {
  try {
    const teams = await teamService.getAllTeams();
    return res.json({
      success: true,
      teams: teams.map((t) => ({ id: t.id, name: t.name, tag: t.tag })),
    });
  } catch (error) {
    log.error('Error fetching public team list', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
});

/**
 * Single team for public team page (roster fields only via teamService).
 */
router.get('/teams/:id', async (req: Request, res: Response) => {
  try {
    const team = await teamService.getTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    return res.json({ success: true, team });
  } catch (error) {
    log.error('Error fetching public team', { error, id: req.params.id });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
