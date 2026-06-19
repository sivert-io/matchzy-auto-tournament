import { Router, Request, Response } from 'express';
import { getDefaultOrganization } from '../services/organizationService';

const router = Router();

router.get('/current', async (_req: Request, res: Response) => {
  try {
    const organization = await getDefaultOrganization();
    return res.json({ success: true, organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
