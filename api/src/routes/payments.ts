import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  createMercadoPagoAuthorizationUrl,
  exchangeMercadoPagoCode,
  getMercadoPagoConnectionStatus,
} from '../services/mercadoPagoOAuthService';
import { log } from '../utils/logger';

const router = Router();

router.get('/mercadopago/status', requireAuth, async (_req: Request, res: Response) => {
  try {
    const status = await getMercadoPagoConnectionStatus();
    return res.json({ success: true, status });
  } catch (error) {
    log.warn('Failed to load Mercado Pago connection status', error as Error);
    return res.status(500).json({ success: false, error: 'Failed to load Mercado Pago status' });
  }
});

router.get('/mercadopago/connect', requireAuth, async (_req: Request, res: Response) => {
  try {
    const authorizationUrl = await createMercadoPagoAuthorizationUrl();
    return res.json({ success: true, authorizationUrl });
  } catch (error) {
    log.warn('Failed to create Mercado Pago OAuth URL', error as Error);
    return res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.get('/mercadopago/callback', async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code ?? '');
    const state = String(req.query.state ?? '');
    if (!code || !state) {
      return res.status(400).json({ success: false, error: 'Missing Mercado Pago OAuth code/state' });
    }

    await exchangeMercadoPagoCode(code, state);
    const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || '/app').replace(/\/+$/, '');
    return res.redirect(302, `${frontendBaseUrl}/settings?mp=connected`);
  } catch (error) {
    log.warn('Mercado Pago OAuth callback failed', error as Error);
    return res.status(400).json({ success: false, error: (error as Error).message });
  }
});

export default router;
