/**
 * Helper functions to generate ReadyUp (RU) RCON commands
 *
 * Important:
 * - ReadyUp's command buffer hook expects raw tokens/URLs without surrounding quotes.
 * - Do NOT log returned commands verbatim if they include secrets (ru_match_token).
 */

export function getReadyUpServerInitCommands(options: {
  baseUrl: string;
  serverId: string;
  serverToken: string;
  adminsUrl?: string | null;
  adminsRefreshSeconds?: number | null;
}): string[] {
  const base = options.baseUrl.replace(/\/+$/, '');
  const hb = `${base}/api/servers/${options.serverId}/heartbeat`;

  const resolvedAdminsUrl = resolveMaybeRelativeUrl(base, options.adminsUrl);
  const refreshSeconds =
    typeof options.adminsRefreshSeconds === 'number' && Number.isFinite(options.adminsRefreshSeconds)
      ? Math.floor(options.adminsRefreshSeconds)
      : null;

  return [
    // Configure ReadyUp webhooks (ReadyUp will append /:slugOrMatchId itself).
    `ru_webhook_url ${base}/api/events`,
    // Configure allocator heartbeat endpoint (full URL).
    `ru_heartbeat_url ${hb}`,
    // Configure Bearer token for match config fetch + webhook auth header.
    `ru_match_token ${options.serverToken}`,
    // Configure MAT admins source (optional).
    ...(resolvedAdminsUrl ? [`ru_admins_url ${resolvedAdminsUrl}`] : ['ru_admins_url clear']),
    ...(refreshSeconds !== null ? [`ru_admins_refresh_seconds ${refreshSeconds}`] : []),
  ];
}

export function getReadyUpLoadMatchCommands(options: { baseUrl: string; matchSlug: string }): string[] {
  const base = options.baseUrl.replace(/\/+$/, '');
  const configUrl = `${base}/api/matches/${options.matchSlug}.json`;
  return [`ru match load ${configUrl}`];
}

export function redactReadyUpCommand(command: string): string {
  if (command.startsWith('ru_match_token ')) return 'ru_match_token REDACTED';
  return command;
}

function resolveMaybeRelativeUrl(baseUrlNoTrailingSlash: string, maybeUrl?: string | null): string | null {
  if (!maybeUrl) return null;
  const trimmed = maybeUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return `${baseUrlNoTrailingSlash}${trimmed}`;
  return trimmed;
}

