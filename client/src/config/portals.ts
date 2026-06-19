export type PortalId = 'player' | 'organizer';

export type AccessLevel = 'public' | 'identity' | 'admin';

export const portalPaths = {
  player: {
    home: '/play',
    lobbies: '/play/lobbies',
    inventory: '/play/skins',
    players: '/player',
  },
  organizer: {
    home: '/organizer',
    tournament: '/organizer/tournament',
    bracket: '/organizer/bracket',
    matches: '/organizer/matches',
    teams: '/organizer/teams',
    players: '/organizer/players',
    servers: '/organizer/servers',
    maps: '/organizer/maps',
    templates: '/organizer/templates',
    eloTemplates: '/organizer/elo-templates',
    admin: '/organizer/admin',
    settings: '/organizer/settings',
    development: '/organizer/dev',
  },
} as const;

export const legacyOrganizerRedirects = {
  '/tournament': portalPaths.organizer.tournament,
  '/bracket': portalPaths.organizer.bracket,
  '/matches': portalPaths.organizer.matches,
  '/teams': portalPaths.organizer.teams,
  '/players': portalPaths.organizer.players,
  '/servers': portalPaths.organizer.servers,
  '/maps': portalPaths.organizer.maps,
  '/templates': portalPaths.organizer.templates,
  '/elo-templates': portalPaths.organizer.eloTemplates,
  '/admin': portalPaths.organizer.admin,
  '/settings': portalPaths.organizer.settings,
  '/dev': portalPaths.organizer.development,
} as const;

export const legacyPlayerRedirects = {
  '/lobby': portalPaths.player.lobbies,
  '/inventory': portalPaths.player.inventory,
} as const;

export function getPortalFromPath(pathname: string): PortalId | null {
  if (pathname === portalPaths.player.home || pathname.startsWith(`${portalPaths.player.home}/`)) {
    return 'player';
  }
  if (
    pathname === portalPaths.organizer.home ||
    pathname.startsWith(`${portalPaths.organizer.home}/`)
  ) {
    return 'organizer';
  }
  return null;
}
