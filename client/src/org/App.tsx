import { lazy, ReactNode, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RequireAccess } from '../components/auth/RequireAccess';
import { legacyOrganizerRedirects, portalPaths } from '../config/portals';
import { OrgPublicShell } from '../components/layout/public/OrgPublicShell';
import { useIsDevelopment } from '../hooks/useIsDevelopment';
import { AppProviders } from '../shared/AppProviders';
import { AppLoadingScreen } from '../shared/AppLoadingScreen';
import { useAuth } from '../contexts/AuthContext';
import OrgAuthPage from '../pages/public/OrgAuthPage';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const Teams = lazy(() => import('../pages/Teams'));
const Players = lazy(() => import('../pages/Players'));
const Servers = lazy(() => import('../pages/Servers'));
const Tournament = lazy(() => import('../pages/Tournament'));
const Bracket = lazy(() => import('../pages/Bracket'));
const Matches = lazy(() => import('../pages/Matches'));
const AdminTools = lazy(() => import('../pages/AdminTools'));
const Settings = lazy(() => import('../pages/Settings'));
const Development = lazy(() => import('../pages/Development'));
const Maps = lazy(() => import('../pages/Maps'));
const Templates = lazy(() => import('../pages/Templates'));
const ELOTemplates = lazy(() => import('../pages/ELOTemplates'));
const ConnectSteam = lazy(() => import('../pages/ConnectSteam'));
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

function OrgPublicEntry() {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <RouteFallback />;
  if (isAuthenticated) {
    return <Navigate to={portalPaths.organizer.home} replace />;
  }
  return <OrgAuthPage />;
}

function OrgRoutes() {
  const isDevelopment = useIsDevelopment();

  return (
    <Routes>
      <Route element={<OrgPublicShell />}>
        <Route path="/" element={<OrgPublicEntry />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="/connect-steam" element={<Access level="admin"><Lazy><ConnectSteam /></Lazy></Access>} />

      <Route
        path={portalPaths.organizer.home}
        element={
          <Lazy>
            <Access level="admin"><Layout portal="organizer" /></Access>
          </Lazy>
        }
      >
        <Route index element={<Lazy><Dashboard /></Lazy>} />
        <Route path="teams" element={<Lazy><Teams /></Lazy>} />
        <Route path="players" element={<Lazy><Players /></Lazy>} />
        <Route path="servers" element={<Lazy><Servers /></Lazy>} />
        <Route path="tournament" element={<Lazy><Tournament /></Lazy>} />
        <Route path="bracket" element={<Lazy><Bracket /></Lazy>} />
        <Route path="matches" element={<Lazy><Matches /></Lazy>} />
        <Route path="admin" element={<Lazy><AdminTools /></Lazy>} />
        <Route path="settings" element={<Lazy><Settings /></Lazy>} />
        <Route path="maps" element={<Lazy><Maps /></Lazy>} />
        <Route path="templates" element={<Lazy><Templates /></Lazy>} />
        <Route path="elo-templates" element={<Lazy><ELOTemplates /></Lazy>} />
        {isDevelopment && <Route path="dev" element={<Lazy><Development /></Lazy>} />}
        <Route path="*" element={<Lazy><NotFound /></Lazy>} />
      </Route>

      {Object.entries(legacyOrganizerRedirects).map(([from, to]) => (
        <Route key={from} path={from} element={<LegacyRedirect to={to} />} />
      ))}
      <Route path="*" element={<Lazy><NotFound /></Lazy>} />
    </Routes>
  );
}

export default function OrgApp() {
  return (
    <AppProviders>
      <OrgRoutes />
    </AppProviders>
  );
}
