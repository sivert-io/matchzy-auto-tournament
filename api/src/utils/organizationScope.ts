import { db } from '../config/database';
import { getCurrentOrganizationId } from '../services/organizationService';

/** Single-tournament installs always use id = 1. */
export const SCOPED_TOURNAMENT_ID = 1;

export function scopedTournamentWhere(alias = ''): string {
  const prefix = alias ? `${alias}.` : '';
  return `${prefix}id = ? AND ${prefix}organization_id = ?`;
}

export function scopedTournamentParams(tournamentId = SCOPED_TOURNAMENT_ID): [number, string] {
  return [tournamentId, getCurrentOrganizationId()];
}

/**
 * Assign legacy tournaments (NULL organization_id) to this instance's org.
 * Safe on isolated per-org databases; enables strict scoping on shared DB.
 */
export async function backfillTournamentOrganizationIds(): Promise<void> {
  const orgId = getCurrentOrganizationId();
  await db.execAsync('UPDATE tournament SET organization_id = ? WHERE organization_id IS NULL', [
    orgId,
  ]);
}
