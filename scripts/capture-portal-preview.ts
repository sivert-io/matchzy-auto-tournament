#!/usr/bin/env tsx
/**
 * Capture Player + Org portal screenshots for docs/preview.
 * Requires API (3000) and both Vite dev servers (5173 player, 5174 org).
 *
 *   yarn preview:portals
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ORG_URL = (process.env.ORG_PREVIEW_URL || 'http://localhost:5174').replace(/\/$/, '');
const PLAYER_URL = (process.env.PLAYER_PREVIEW_URL || 'http://localhost:5173').replace(/\/$/, '');
const OUT_DIR = path.join(process.cwd(), 'docs', 'assets', 'preview', 'portals');
const WIDTH = 1440;
const HEIGHT = 900;

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function shot(page: import('playwright').Page, fileName: string, url: string, waitMs = 800) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(waitMs);
  const filePath = path.join(OUT_DIR, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`saved ${filePath}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
  });
  const page = await context.newPage();

  // Org — public
  await shot(page, 'org-landing.png', `${ORG_URL}/`);
  await shot(page, 'org-login.png', `${ORG_URL}/login`);

  // Admin session for org app pages
  const loginRes = await page.request.post(`${ORG_URL}/api/test/login-admin`, {
    data: { steamId: process.env.TEST_STEAM_ID || '76561198000000001' },
  });
  if (!loginRes.ok()) {
    console.warn('admin login failed — org dashboard may redirect to login');
  }

  await shot(page, 'org-dashboard.png', `${ORG_URL}/organizer`, 1500);
  await shot(page, 'org-tournament.png', `${ORG_URL}/organizer/tournament`, 1200);
  await shot(page, 'org-settings.png', `${ORG_URL}/organizer/settings`, 1200);

  // Player — public
  await shot(page, 'player-landing.png', `${PLAYER_URL}/`);
  await shot(page, 'player-login.png', `${PLAYER_URL}/login`);
  await shot(page, 'player-home.png', `${PLAYER_URL}/play`, 1200);

  await browser.close();
  console.log(`\nPortal previews in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
