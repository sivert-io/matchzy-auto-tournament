import { db } from '../config/database';
import { log } from '../utils/logger';

const FALLBACK_ORG_ID = 'fragbase';
const FALLBACK_ORG_NAME = 'Fragbase';

/**
 * Organization id for this running instance (set via ORGANIZATION_ID in Docker/env).
 * Each per-org stack should use a unique slug; isolated Postgres is the primary boundary.
 */
export function getCurrentOrganizationId(): string {
  const raw = process.env.ORGANIZATION_ID?.trim();
  return raw && raw.length > 0 ? raw : FALLBACK_ORG_ID;
}

export function getCurrentOrganizationName(): string {
  const raw = process.env.ORGANIZATION_NAME?.trim();
  if (raw) return raw;
  const id = getCurrentOrganizationId();
  return id === FALLBACK_ORG_ID ? FALLBACK_ORG_NAME : id;
}

export async function ensureCurrentOrganization(): Promise<void> {
  const id = getCurrentOrganizationId();
  const name = getCurrentOrganizationName();
  const slug = process.env.ORGANIZATION_SLUG?.trim() || id;

  const existing = await db.queryOneAsync<{ id: string }>(
    'SELECT id FROM organizations WHERE id = ?',
    [id]
  );
  if (existing) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  await db.insertAsync('organizations', {
    id,
    name,
    slug,
    created_at: now,
    updated_at: now,
  });
  log.success('Seeded organization for this instance', { id, name, slug });
}

export async function getCurrentOrganization(): Promise<{
  id: string;
  name: string;
  slug: string;
} | null> {
  await ensureCurrentOrganization();
  const id = getCurrentOrganizationId();
  const row = await db.queryOneAsync<{ id: string; name: string; slug: string }>(
    'SELECT id, name, slug FROM organizations WHERE id = ?',
    [id]
  );
  return row ?? null;
}

/** @deprecated use getCurrentOrganization */
export async function getDefaultOrganization(): Promise<{
  id: string;
  name: string;
  slug: string;
} | null> {
  return getCurrentOrganization();
}

/** @deprecated use ensureCurrentOrganization */
export async function ensureDefaultOrganization(): Promise<void> {
  await ensureCurrentOrganization();
}
