import { test, expect } from '@playwright/test';

/**
 * Public browse endpoints — no authentication required.
 *
 * @tag api
 * @tag public-browse
 */

test.describe('Public browse API', () => {
  test(
    'GET /api/public/camp returns organization snapshot',
    { tag: ['@api', '@public-browse'] },
    async ({ request }) => {
      const res = await request.get('/api/public/camp');
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.organization).toBeTruthy();
      expect(body.organization.id).toBeTruthy();
      expect(body.organization.name).toBeTruthy();
      // tournament may be null on fresh DB
      if (body.tournament) {
        expect(body.tournament.id).toBeTruthy();
        expect(body.tournament.name).toBeTruthy();
      }
    }
  );

  test(
    'GET /api/public/teams returns team directory',
    { tag: ['@api', '@public-browse'] },
    async ({ request }) => {
      const res = await request.get('/api/public/teams');
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.teams)).toBe(true);
      for (const team of body.teams) {
        expect(team.id).toBeTruthy();
        expect(team.name).toBeTruthy();
      }
    }
  );

  test(
    'GET /api/public/teams/:id returns 404 for unknown team',
    { tag: ['@api', '@public-browse'] },
    async ({ request }) => {
      const res = await request.get('/api/public/teams/__no_such_team__');
      expect(res.status()).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
    }
  );

  test(
    'GET /api/public/teams/:id returns team when it exists',
    { tag: ['@api', '@public-browse'] },
    async ({ request }) => {
      const listRes = await request.get('/api/public/teams');
      const listBody = await listRes.json();
      if (!listBody.success || listBody.teams.length === 0) {
        test.skip();
        return;
      }

      const teamId = listBody.teams[0].id as string;
      const res = await request.get(`/api/public/teams/${teamId}`);
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.team.id).toBe(teamId);
      expect(body.team.name).toBeTruthy();
    }
  );
});
