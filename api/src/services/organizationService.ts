import { db } from '../config/database';
import { log } from '../utils/logger';

const DEFAULT_ORG_ID = 'fragbase';
const DEFAULT_ORG_NAME = 'Fragbase';

export async function ensureDefaultOrganization(): Promise<void> {
  const existing = await db.queryOneAsync<{ id: string }>(
    'SELECT id FROM organizations WHERE id = ?',
    [DEFAULT_ORG_ID]
  );
  if (existing) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  await db.insertAsync('organizations', {
    id: DEFAULT_ORG_ID,
    name: DEFAULT_ORG_NAME,
    slug: 'fragbase',
    created_at: now,
    updated_at: now,
  });
  log.success('Seeded default organization', { id: DEFAULT_ORG_ID });
}

export async function getDefaultOrganization(): Promise<{
  id: string;
  name: string;
  slug: string;
} | null> {
  await ensureDefaultOrganization();
  const row = await db.queryOneAsync<{ id: string; name: string; slug: string }>(
    'SELECT id, name, slug FROM organizations WHERE id = ?',
    [DEFAULT_ORG_ID]
  );
  return row ?? null;
}
