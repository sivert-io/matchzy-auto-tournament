import { PortalId, portalPaths } from './portals';

export const playerPublicNav = [
  { key: 'home', to: '/', icon: 'home' as const },
  { key: 'camps', to: portalPaths.player.camps, icon: 'camps' as const },
  { key: 'teams', to: portalPaths.player.teams, icon: 'teams' as const },
  { key: 'players', to: portalPaths.player.players, icon: 'search' as const },
  { key: 'leaderboard', to: portalPaths.player.leaderboard, icon: 'leaderboard' as const },
] as const;

export function getPortalHome(portal: PortalId): string {
  return portal === 'organizer' ? portalPaths.organizer.home : '/';
}

export function isPublicNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  if (to === '/leaderboard') {
    return pathname === '/leaderboard' || /^\/tournament\/\d+\/leaderboard/.test(pathname);
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}
