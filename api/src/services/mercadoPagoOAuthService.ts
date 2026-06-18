import crypto from 'crypto';
import fetch from 'node-fetch';
import { db } from '../config/database';

type MercadoPagoTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number;
  public_key?: string;
  live_mode?: boolean;
};

const MP_AUTH_BASE_URL = 'https://auth.mercadopago.com.br/authorization';
const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';
const STATE_SETTING = 'mercadopago_oauth_state';
const TOKEN_SETTING = 'mercadopago_oauth_tokens';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getRedirectUri(): string {
  return (
    process.env.MERCADOPAGO_REDIRECT_URI?.trim() ||
    `${requireEnv('API_BASE_URL').replace(/\/+$/, '')}/api/payments/mercadopago/callback`
  );
}

export async function createMercadoPagoAuthorizationUrl(): Promise<string> {
  const clientId = requireEnv('MERCADOPAGO_CLIENT_ID');
  const redirectUri = getRedirectUri();
  const state = crypto.randomBytes(24).toString('hex');

  await db.setAppSettingAsync(STATE_SETTING, state);

  const url = new URL(MP_AUTH_BASE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('platform_id', 'mp');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  return url.toString();
}

export async function exchangeMercadoPagoCode(code: string, state: string): Promise<MercadoPagoTokenResponse> {
  const expectedState = await db.getAppSettingAsync(STATE_SETTING);
  if (!expectedState || expectedState !== state) {
    throw new Error('Invalid Mercado Pago OAuth state');
  }

  const clientId = requireEnv('MERCADOPAGO_CLIENT_ID');
  const clientSecret = requireEnv('MERCADOPAGO_CLIENT_SECRET');
  const redirectUri = getRedirectUri();

  const response = await fetch(MP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago token exchange failed: ${response.status} ${body}`);
  }

  const token = (await response.json()) as MercadoPagoTokenResponse;
  await db.setAppSettingAsync(
    TOKEN_SETTING,
    JSON.stringify({
      ...token,
      connected_at: Math.floor(Date.now() / 1000),
    })
  );
  await db.setAppSettingAsync(STATE_SETTING, null);

  return token;
}

export async function getMercadoPagoConnectionStatus(): Promise<{
  connected: boolean;
  userId?: number;
  liveMode?: boolean;
  scope?: string;
  connectedAt?: number;
}> {
  const raw = await db.getAppSettingAsync(TOKEN_SETTING);
  if (!raw) return { connected: false };

  const parsed = JSON.parse(raw) as MercadoPagoTokenResponse & { connected_at?: number };
  return {
    connected: !!parsed.access_token,
    userId: parsed.user_id,
    liveMode: parsed.live_mode,
    scope: parsed.scope,
    connectedAt: parsed.connected_at,
  };
}
