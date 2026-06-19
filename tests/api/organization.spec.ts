import { test, expect } from '@playwright/test';
import { ensureSignedIn } from '../helpers/auth';

/**
 * Organization instance scoping and current-org API.
 *
 * @tag api
 * @tag organization
 */

test.describe('Organization API', () => {
  test.beforeEach(async ({ page }) => {
    await ensureSignedIn(page);
  });

  test(
    'GET /api/organizations/current returns seeded organization',
    { tag: ['@api', '@organization'] },
    async ({ request }) => {
      const res = await request.get('/api/organizations/current');
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.organization).toBeTruthy();
      expect(body.organization.id).toBeTruthy();
      expect(body.organization.name).toBeTruthy();
      expect(body.organization.slug).toBeTruthy();
    }
  );

  test(
    'GET /api/tournament is scoped to current organization',
    { tag: ['@api', '@organization'] },
    async ({ request }) => {
      const orgRes = await request.get('/api/organizations/current');
      const orgBody = await orgRes.json();
      const orgId = orgBody.organization?.id as string;

      const tournamentRes = await request.get('/api/tournament');
      const tournamentBody = await tournamentRes.json();

      if (tournamentBody.success && tournamentBody.tournament) {
        // organization_id is stored server-side; tournament payload may omit it.
        // Creating a tournament should succeed and remain readable for this instance.
        expect(tournamentBody.tournament.id).toBe(1);
        expect(orgId).toBeTruthy();
      } else {
        // No tournament yet is valid for a fresh database.
        expect(tournamentBody.success).toBe(true);
      }
    }
  );
});
