import { log } from '../utils/logger';
import fetch from 'node-fetch';

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
}

let cachedVersion: string | null = null;
let cachedReleaseUrl: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch the latest ReadyUp release from GitHub.
 * Uses caching to avoid rate limits (60 req/hour for unauthenticated).
 */
export async function getLatestReadyUpVersion(options?: {
  forceRefresh?: boolean;
}): Promise<{ version: string; releaseUrl: string } | null> {
  const now = Date.now();
  const cacheValid = cachedVersion && now - lastFetchTime < CACHE_TTL_MS;

  if (cacheValid && !options?.forceRefresh) {
    return {
      version: cachedVersion!,
      releaseUrl: cachedReleaseUrl!,
    };
  }

  try {
    log.debug('[READYUP-VERSION] Fetching latest ReadyUp version from GitHub...');
    const response = await fetch('https://api.github.com/repos/sivert-io/ready-up/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'MatchZy-Auto-Tournament',
      },
    });

    if (!response.ok) {
      log.warn('[READYUP-VERSION] Failed to fetch ReadyUp version from GitHub', {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const release = (await response.json()) as GitHubRelease;
    const version = release.tag_name.replace(/^v/, ''); // Strip leading 'v'

    cachedVersion = version;
    cachedReleaseUrl = release.html_url;
    lastFetchTime = now;

    log.info('[READYUP-VERSION] Fetched latest ReadyUp version', {
      version,
      published: release.published_at,
    });

    return {
      version,
      releaseUrl: cachedReleaseUrl,
    };
  } catch (error) {
    log.warn('[READYUP-VERSION] Exception fetching ReadyUp version from GitHub', { error });
    return null;
  }
}

/**
 * Initialize: fetch on startup (fire-and-forget).
 */
export function initReadyUpVersionService() {
  void getLatestReadyUpVersion({ forceRefresh: true });
}

