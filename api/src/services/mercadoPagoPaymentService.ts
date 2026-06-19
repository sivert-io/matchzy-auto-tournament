import fetch from 'node-fetch';
import { db } from '../config/database';
import { getMercadoPagoConnectionStatus } from './mercadoPagoOAuthService';

const TOKEN_SETTING = 'mercadopago_oauth_tokens';
const MP_PREFERENCES_URL = 'https://api.mercadopago.com/checkout/preferences';
const MP_PAYMENT_URL = 'https://api.mercadopago.com/v1/payments';

type MercadoPagoTokenResponse = {
  access_token?: string;
};

export type CheckoutPreferenceInput = {
  title: string;
  amountCents: number;
  currency: string;
  externalReference: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
  notificationUrl: string;
};

export type CheckoutPreferenceResult = {
  preferenceId: string;
  checkoutUrl: string;
};

async function getAccessToken(): Promise<string> {
  const status = await getMercadoPagoConnectionStatus();
  if (!status.connected) {
    throw new Error('Mercado Pago is not connected. Connect it in Settings → Integrations.');
  }

  const raw = await db.getAppSettingAsync(TOKEN_SETTING);
  if (!raw) {
    throw new Error('Mercado Pago tokens not found');
  }

  const parsed = JSON.parse(raw) as MercadoPagoTokenResponse;
  if (!parsed.access_token) {
    throw new Error('Mercado Pago access token is missing');
  }

  return parsed.access_token;
}

/**
 * Creates a Checkout Pro preference (PIX + credit card in Brazil).
 */
export async function createCheckoutPreference(
  input: CheckoutPreferenceInput
): Promise<CheckoutPreferenceResult> {
  const accessToken = await getAccessToken();
  const unitPrice = input.amountCents / 100;

  const response = await fetch(MP_PREFERENCES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          unit_price: unitPrice,
          currency_id: input.currency.toUpperCase(),
        },
      ],
      external_reference: input.externalReference,
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: 'approved',
      payment_methods: {
        installments: 1,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago preference failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    id?: string;
    init_point?: string;
  };
  if (!data.id || !data.init_point) {
    throw new Error('Mercado Pago preference response missing id or init_point');
  }

  return {
    preferenceId: data.id,
    checkoutUrl: data.init_point,
  };
}

export async function getMercadoPagoPayment(paymentId: string): Promise<{
  id: number;
  status: string;
  external_reference?: string;
}> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${MP_PAYMENT_URL}/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mercado Pago payment fetch failed: ${response.status} ${body}`);
  }

  return (await response.json()) as {
    id: number;
    status: string;
    external_reference?: string;
  };
}
