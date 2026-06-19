import { lazy, ReactNode, Suspense } from 'react';
import { Box, CircularProgress, ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PageHeaderProvider } from './contexts/PageHeaderContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import { RequireAccess } from './components/auth/RequireAccess';
import { legacyOrganizerRedirects, legacyPlayerRedirects, portalPaths } from './config/portals';
import { useIsDevelopment } from './hooks/useIsDevelopment';
import { theme } from './theme';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PlayerHome = lazy(() => import('./pages/PlayerHome'));
const Teams = lazy(() => import('./pages/Teams'));
const Players = lazy(() => import('./pages/Players'));
const Servers = lazy(() => import('./pages/Servers'));
const Tournament = lazy(() => import('./pages/Tournament'));
const Bracket = lazy(() => import('./pages/Bracket'));
const Matches = lazy(() => import('./pages/Matches'));
const AdminTools = lazy(() => import('./pages/AdminTools'));
const Settings = lazy(() => import('./pages/Settings'));
const Development = lazy(() => import('./pages/Development'));
const TeamMatch = lazy(() => import('./pages/TeamMatch'));
const FindPlayer = lazy(() => import('./pages/FindPlayer'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'));
const TournamentLeaderboard = lazy(() => import('./pages/TournamentLeaderboard'));
const ConnectSteam = lazy(() => import('./pages/ConnectSteam'));
const Maps = lazy(() => import('./pages/Maps'));
const Templates = lazy(() => import('./pages/Templates'));
const ELOTemplates = lazy(() => import('./pages/ELOTemplates'));
const Layout = lazy(() => import('./components/layout/Layout'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Lobbies = lazy(() => import('./pages/Lobbies'));
const LobbyRoom = lazy(() => import('./pages/LobbyRoom'));
const Inventory = lazy(() => import('./pages/Inventory'));

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

function HomeRedirect() {
  const { isAuthenticated, isLoading, playerSteamId } = useAuth();
  if (isLoading) return <Access level="public"><></></Access>;
  if (isAuthenticated) return <Navigate to={portalPaths.organizer.home} replace />;
  if (playerSteamId) return <Navigate to={portalPaths.player.home} replace />;
  return <Navigate to="/login" replace />;
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

function AppRoutes() {
  const { isAuthenticated, isLoading, playerSteamId } = useAuth();
  const isDevelopment = useIsDevelopment();

  if (isLoading) {
    return <Access level="public"><></></Access>;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={portalPaths.organizer.home} replace />
          ) : playerSteamId ? (
            <Navigate to={portalPaths.player.home} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route path="/connect-steam" element={<Access level="admin"><ConnectSteam /></Access>} />

      <Route path="/team/:teamId" element={<TeamMatch />} />
      <Route path="/tournament/:id/leaderboard" element={<TournamentLeaderboard />} />
      <Route path="/player" element={<FindPlayer />} />
      <Route path="/player/:steamId" element={<PlayerProfile />} />

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

      <Route
        path={portalPaths.organizer.home}
        element={<Access level="admin"><Layout portal="organizer" /></Access>}
      >
        <Route index element={<Dashboard />} />
        <Route path="teams" element={<Teams />} />
        <Route path="players" element={<Players />} />
        <Route path="servers" element={<Servers />} />
        <Route path="tournament" element={<Tournament />} />
        <Route path="bracket" element={<Bracket />} />
        <Route path="matches" element={<Matches />} />
        <Route path="admin" element={<AdminTools />} />
        <Route path="settings" element={<Settings />} />
        <Route path="maps" element={<Maps />} />
        <Route path="templates" element={<Templates />} />
        <Route path="elo-templates" element={<ELOTemplates />} />
        {isDevelopment && <Route path="dev" element={<Development />} />}
        <Route path="*" element={<NotFound />} />
      </Route>

      {Object.entries(legacyOrganizerRedirects).map(([from, to]) => (
        <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
      ))}
      {Object.entries(legacyPlayerRedirects).map(([from, to]) => (
        <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
      ))}
      <Route path="/lobby/:id" element={<LegacyLobbyRedirect />} />
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <SnackbarProvider>
            <PageHeaderProvider>
              <AppRoutes />
            </PageHeaderProvider>
          </SnackbarProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
