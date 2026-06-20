import { lazy, ReactNode, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { RequireAccess } from '../components/auth/RequireAccess';
import { legacyPlayerRedirects, portalPaths } from '../config/portals';
import { PlayerPublicShell } from '../components/layout/public/PlayerPublicShell';
import { AppProviders } from '../shared/AppProviders';
import { AppLoadingScreen } from '../shared/AppLoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import PlayerEntryPage from '../pages/public/PlayerEntryPage';
import PlayerLoginPage from '../pages/public/PlayerLoginPage';
import CampsBrowsePage from '../pages/public/browse/CampsBrowsePage';
import TeamsBrowsePage from '../pages/public/browse/TeamsBrowsePage';
import PublicTeamPage from '../pages/public/browse/PublicTeamPage';
import PublicPlayerPage from '../pages/public/browse/PublicPlayerPage';
import PublicLeaderboardRedirect from '../pages/public/browse/PublicLeaderboardRedirect';
import FindPlayer from '../pages/FindPlayer';

const PlayerHome = lazy(() => import('../pages/PlayerHome'));
const Lobbies = lazy(() => import('../pages/Lobbies'));
const LobbyRoom = lazy(() => import('../pages/LobbyRoom'));
const Inventory = lazy(() => import('../pages/Inventory'));
const TeamMatch = lazy(() => import('../pages/TeamMatch'));
const TournamentLeaderboard = lazy(() => import('../pages/TournamentLeaderboard'));
const Layout = lazy(() => import('../components/layout/Layout'));
const NotFound = lazy(() => import('../pages/NotFound'));

function RouteFallback() {
  return <AppLoadingScreen />;
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function Access({ level, children }: { level: 'public' | 'identity' | 'admin'; children: ReactNode }) {
  return <RequireAccess access={level}>{children}</RequireAccess>;
}

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
}

function LegacyLobbyRedirect() {
  const { id } = useParams();
  const location = useLocation();
  const destination = id ? `${portalPaths.player.lobbies}/${id}` : portalPaths.player.lobbies;
  return <Navigate to={`${destination}${location.search}${location.hash}`} replace />;
}

function PlayerPublicEntry() {
  const { isLoading, isAuthenticated, playerSteamId } = useAuth();
  if (isLoading) return <RouteFallback />;
  if (isAuthenticated || playerSteamId) {
    return <Navigate to={portalPaths.player.home} replace />;
  }
  return <PlayerEntryPage />;
}

function PlayerRoutes() {
  return (
    <Routes>
      <Route element={<PlayerPublicShell />}>
        <Route path="/" element={<PlayerPublicEntry />} />
        <Route path="/login" element={<PlayerLoginPage />} />
        <Route path="/camps" element={<CampsBrowsePage />} />
        <Route path="/teams" element={<TeamsBrowsePage />} />
        <Route path="/teams/:teamId" element={<PublicTeamPage />} />
        <Route path="/leaderboard" element={<PublicLeaderboardRedirect />} />
        <Route path="/player" element={<FindPlayer />} />
        <Route path="/player/:steamId" element={<PublicPlayerPage />} />
        <Route path="/tournament/:id/leaderboard" element={<Lazy><TournamentLeaderboard /></Lazy>} />
        {/* Participant team console (registration, live match) — not in public nav */}
        <Route path="/team/:teamId" element={<Lazy><TeamMatch /></Lazy>} />
      </Route>

      <Route
        path={portalPaths.player.home}
        element={
          <Lazy>
            <Access level="identity"><Layout portal="player" /></Access>
          </Lazy>
        }
      >
        <Route index element={<Lazy><PlayerHome /></Lazy>} />
        <Route path="lobbies" element={<Lazy><Lobbies /></Lazy>} />
        <Route path="lobbies/:id" element={<Lazy><LobbyRoom /></Lazy>} />
        <Route path="skins" element={<Lazy><Inventory /></Lazy>} />
        <Route path="*" element={<Lazy><NotFound /></Lazy>} />
      </Route>

      {Object.entries(legacyPlayerRedirects).map(([from, to]) => (
        <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
      ))}
      <Route path="/lobby/:id" element={<LegacyLobbyRedirect />} />
      <Route path="*" element={<Lazy><NotFound /></Lazy>} />
    </Routes>
  );
}

export default function PlayerApp() {
  return (
    <AppProviders>
      <PlayerRoutes />
    </AppProviders>
  );
}
