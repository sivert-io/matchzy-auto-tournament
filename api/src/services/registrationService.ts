import { db } from '../config/database';
import { log } from '../utils/logger';
import { tournamentService } from './tournamentService';
import { teamService } from './teamService';
import { createCheckoutPreference, getMercadoPagoPayment } from './mercadoPagoPaymentService';
import { isTeamCaptain, validateChampionshipRoster } from '../utils/teamRoster';
import { getMercadoPagoConnectionStatus } from './mercadoPagoOAuthService';

export type RegistrationRow = {
  id: number;
  tournament_id: number;
  team_id: string | null;
  player_id: string | null;
  status: string;
  payment_status: string;
  mercadopago_preference_id: string | null;
  mercadopago_payment_id: string | null;
  amount_cents: number | null;
  currency: string | null;
  created_at: number;
  updated_at: number;
};

function getPlayerPortalBaseUrl(): string {
  const base = (process.env.PLAYER_PORTAL_URL || process.env.FRONTEND_BASE_URL || '/app').replace(
    /\/+$/,
    ''
  );
  return base;
}

function getApiBaseUrl(): string {
  return (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export async function getTeamRegistration(
  tournamentId: number,
  teamId: string
): Promise<RegistrationRow | null> {
  return await db.queryOneAsync<RegistrationRow>(
    'SELECT * FROM registrations WHERE tournament_id = ? AND team_id = ? ORDER BY id DESC LIMIT 1',
    [tournamentId, teamId]
  );
}

async function addTeamToTournament(teamId: string): Promise<void> {
  const tournament = await tournamentService.getTournament();
  if (!tournament) {
    throw new Error('No tournament exists');
  }

  if (tournament.teamIds.includes(teamId)) {
    return;
  }

  await tournamentService.updateTournament({
    teamIds: [...tournament.teamIds, teamId],
  });
}

export async function confirmRegistrationPayment(
  registrationId: number,
  paymentId: string
): Promise<void> {
  const row = await db.queryOneAsync<RegistrationRow>('SELECT * FROM registrations WHERE id = ?', [
    registrationId,
  ]);
  if (!row) {
    throw new Error('Registration not found');
  }

  if (row.status === 'confirmed' && row.payment_status === 'paid') {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  await db.updateAsync(
    'registrations',
    {
      status: 'confirmed',
      payment_status: 'paid',
      mercadopago_payment_id: paymentId,
      updated_at: now,
    },
    'id = ?',
    [registrationId]
  );

  if (row.team_id) {
    await addTeamToTournament(row.team_id);
    log.success(`Team ${row.team_id} confirmed for tournament via registration ${registrationId}`);
  }
}

/**
 * Team captain registers for a bracket tournament (not shuffle).
 * Free registrations confirm immediately; paid ones return Mercado Pago checkout (PIX + card).
 */
export async function registerTeamForTournament(
  teamId: string,
  captainSteamId: string
): Promise<{
  registrationId: number;
  status: string;
  paymentStatus: string;
  checkoutUrl?: string;
  alreadyRegistered?: boolean;
}> {
  const tournament = await tournamentService.getTournament();
  if (!tournament) {
    throw new Error('No tournament exists');
  }

  if (tournament.type === 'shuffle') {
    throw new Error('Shuffle tournaments use individual player registration, not team registration');
  }

  if (tournament.status !== 'setup') {
    throw new Error(
      `Tournament is in "${tournament.status}" status. Registration is only open during setup.`
    );
  }

  if (!tournament.settings.allowTeamSelfRegistration) {
    throw new Error('Team self-registration is disabled for this tournament');
  }

  const team = await teamService.getTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  const hasRoles = team.players.some((p) => p.role);
  if (hasRoles) {
    validateChampionshipRoster(team.players);
  } else if (team.players.length < 5) {
    throw new Error('Team needs at least 5 players for tournament registration');
  }

  if (!isTeamCaptain(team.players, captainSteamId)) {
    throw new Error('Only the team captain (first starter) can register the team');
  }

  const existing = await getTeamRegistration(tournament.id, teamId);
  if (existing && existing.status === 'confirmed') {
    return {
      registrationId: existing.id,
      status: existing.status,
      paymentStatus: existing.payment_status,
      alreadyRegistered: true,
    };
  }

  const feeCents = tournament.settings.registrationFeeCents ?? 0;
  const currency = tournament.settings.registrationCurrency ?? 'BRL';
  const now = Math.floor(Date.now() / 1000);

  if (feeCents <= 0) {
    const id = existing?.id;
    if (id) {
      await db.updateAsync(
        'registrations',
        { status: 'confirmed', payment_status: 'free', updated_at: now },
        'id = ?',
        [id]
      );
      await addTeamToTournament(teamId);
      return {
        registrationId: id,
        status: 'confirmed',
        paymentStatus: 'free',
      };
    }

    const inserted = await db.insertAsync('registrations', {
      tournament_id: tournament.id,
      team_id: teamId,
      player_id: captainSteamId,
      status: 'confirmed',
      payment_status: 'free',
      amount_cents: 0,
      currency,
      created_at: now,
      updated_at: now,
    });

    await addTeamToTournament(teamId);
    return {
      registrationId: Number(inserted.lastInsertRowid),
      status: 'confirmed',
      paymentStatus: 'free',
    };
  }

  const mpStatus = await getMercadoPagoConnectionStatus();
  if (!mpStatus.connected) {
    throw new Error('Mercado Pago must be connected to accept paid registrations');
  }

  let registrationId = existing?.id;
  if (!registrationId) {
    registrationId = (await db.insertAsync('registrations', {
      tournament_id: tournament.id,
      team_id: teamId,
      player_id: captainSteamId,
      status: 'pending',
      payment_status: 'unpaid',
      amount_cents: feeCents,
      currency,
      created_at: now,
      updated_at: now,
    })).lastInsertRowid as number;
  }

  const portalBase = getPlayerPortalBaseUrl();
  const apiBase = getApiBaseUrl();
  const externalReference = `registration:${registrationId}`;

  const preference = await createCheckoutPreference({
    title: `${tournament.name} — inscrição ${team.name}`,
    amountCents: feeCents,
    currency,
    externalReference,
    successUrl: `${portalBase}/team/${teamId}?registration=success`,
    failureUrl: `${portalBase}/team/${teamId}?registration=failure`,
    pendingUrl: `${portalBase}/team/${teamId}?registration=pending`,
    notificationUrl: `${apiBase}/api/payments/mercadopago/webhook`,
  });

  await db.updateAsync(
    'registrations',
    {
      mercadopago_preference_id: preference.preferenceId,
      updated_at: now,
    },
    'id = ?',
    [registrationId]
  );

  return {
    registrationId,
    status: 'pending',
    paymentStatus: 'unpaid',
    checkoutUrl: preference.checkoutUrl,
  };
}

export async function handleMercadoPagoWebhook(topic: string, resourceId: string): Promise<void> {
  if (topic !== 'payment' || !resourceId) {
    return;
  }

  const payment = await getMercadoPagoPayment(resourceId);
  if (payment.status !== 'approved') {
    log.info(`Mercado Pago payment ${resourceId} status=${payment.status} — not confirming yet`);
    return;
  }

  const externalRef = payment.external_reference ?? '';
  if (!externalRef.startsWith('registration:')) {
    log.warn('Mercado Pago payment without registration external_reference', { externalRef });
    return;
  }

  const registrationId = Number(externalRef.replace('registration:', ''));
  if (!Number.isFinite(registrationId)) {
    return;
  }

  await confirmRegistrationPayment(registrationId, String(payment.id));
}

export async function getRegistrationStatusForTeam(
  teamId: string,
  captainSteamId?: string
): Promise<{
  canRegister: boolean;
  registered: boolean;
  registration?: RegistrationRow;
  feeCents: number;
  currency: string;
  tournamentType?: string;
  tournamentStatus?: string;
  isCaptain?: boolean;
}> {
  const tournament = await tournamentService.getTournament();
  if (!tournament) {
    return { canRegister: false, registered: false, feeCents: 0, currency: 'BRL' };
  }

  const registration = await getTeamRegistration(tournament.id, teamId);
  const registered = registration?.status === 'confirmed';
  const team = await teamService.getTeamById(teamId);
  const isCaptain = captainSteamId && team ? isTeamCaptain(team.players, captainSteamId) : false;
  const feeCents = tournament.settings.registrationFeeCents ?? 0;
  const currency = tournament.settings.registrationCurrency ?? 'BRL';

  const canRegister =
    Boolean(captainSteamId) &&
    Boolean(isCaptain) &&
    tournament.type !== 'shuffle' &&
    tournament.status === 'setup' &&
    Boolean(tournament.settings.allowTeamSelfRegistration) &&
    !registered;

  return {
    canRegister,
    registered,
    registration: registration ?? undefined,
    feeCents,
    currency,
    tournamentType: tournament.type,
    tournamentStatus: tournament.status,
    isCaptain: Boolean(isCaptain),
  };
}
