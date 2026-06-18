import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getAcAiPlayerScore, ingestAcAiSignal, listAcAiScores } from '../services/acAiService';
import { log } from '../utils/logger';

const router = Router();

router.get('/scores', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit ?? 50);
    const scores = await listAcAiScores(Number.isFinite(limit) ? limit : 50);
    return res.json({ success: true, scores });
  } catch (error) {
    log.warn('Failed to list AC/AI scores', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to list AC/AI scores' });
  }
});

router.get('/scores/:playerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const score = await getAcAiPlayerScore(req.params.playerId);
    if (!score) {
      return res.status(404).json({ success: false, error: 'AC/AI score not found' });
    }
    return res.json({ success: true, score });
  } catch (error) {
    log.warn('Failed to load AC/AI score', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to load AC/AI score' });
  }
});

router.post('/signals', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await ingestAcAiSignal({
      playerId: String(req.body.playerId ?? req.body.player_id ?? ''),
      matchSlug: req.body.matchSlug ?? req.body.match_slug,
      signalType: String(req.body.signalType ?? req.body.signal_type ?? ''),
      payload: typeof req.body.payload === 'object' && req.body.payload !== null ? req.body.payload : {},
      score: typeof req.body.score === 'number' ? req.body.score : undefined,
    });

    return res.status(201).json({ success: true, result });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes('required') ? 400 : 500;
    log.warn('Failed to ingest AC/AI signal', error as Error);
    return res.status(status).json({ success: false, error: message });
  }
});

export default router;
