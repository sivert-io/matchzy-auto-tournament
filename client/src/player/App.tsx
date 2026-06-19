import { lazy, ReactNode, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { RequireAccess } from '../components/auth/RequireAccess';
import { legacyPlayerRedirects, portalPaths } from '../config/portals';
import { AppProviders } from '../shared/AppProviders';

const Login = lazy(() => import('../pages/Login'));
const PlayerHome = lazy(() => import('../pages/PlayerHome'));
const Lobbies = lazy(() => import('../pages/Lobbies'));
const LobbyRoom = lazy(() => import('../pages/LobbyRoom'));
const Inventory = lazy(() => import('../pages/Inventory'));
const FindPlayer = lazy(() => import('../pages/FindPlayer'));
const PlayerProfile = lazy(() => import('../pages/PlayerProfile'));
const TeamMatch = lazy(() => import('../pages/TeamMatch'));
const TournamentLeaderboard = lazy(() => import('../pages/TournamentLeaderboard'));
const Layout = lazy(() => import('../components/layout/Layout'));
const NotFound = lazy(() => import('../pages/NotFound'));

function RouteFallback() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress aria-label="Carregando página" />
    </Box>
  );
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

function PlayerRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to={portalPaths.player.home} replace />} />
        <Route path="/login" element={<Login />} />

        {/* Public viewing pages */}
        <Route path="/player" element={<FindPlayer />} />
        <Route path="/player/:steamId" element={<PlayerProfile />} />
        <Route path="/team/:teamId" element={<TeamMatch />} />
        <Route path="/tournament/:id/leaderboard" element={<TournamentLeaderboard />} />

        <Route
          path={portalPaths.player.home}
          element={<Access level="identity"><Layout portal="player" /></Access>}
        >
          <Route index element={<PlayerHome />} />
          <Route path="lobbies" element={<Lobbies />} />
          <Route path="lobbies/:id" element={<LobbyRoom />} />
          <Route path="skins" element={<Inventory />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {Object.entries(legacyPlayerRedirects).map(([from, to]) => (
          <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
        ))}
        <Route path="/lobby/:id" element={<LegacyLobbyRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function PlayerApp() {
  return (
    <AppProviders>
      <PlayerRoutes />
    </AppProviders>
  );
}
