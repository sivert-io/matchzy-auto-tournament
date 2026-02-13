/**
 * Server-level events emitted by plugins (not match-scoped).
 */

export interface ServerConfiguredEvent {
  event: 'server_configured';
  server_id: string;
  hostname: string;
  plugin_version: string;
  remote_log_url: string;
  timestamp: number;
  configured_by: 'Console' | 'Startup';
  [key: string]: unknown;
}

export interface Cs2UpdateRequiredEvent {
  event: 'cs2_update_required';
  matchid: -1;
  server_id: string;
  required_version: number;
  phase?: 'available' | 'shutdown';
  timestamp: number;
  [key: string]: unknown;
}

export interface ServerHealthEvent {
  event: 'server_health';
  server_id: string;
  plugin_version: string;
  timestamp: number;
  db_ok: boolean;
  db_type: 'sqlite' | 'mysql' | string;
  db_error?: string | null;
  reason?: 'startup' | 'periodic' | 'change' | string;
  [key: string]: unknown;
}

