import { lazy, ReactNode, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RequireAccess } from '../components/auth/RequireAccess';
import { legacyOrganizerRedirects, portalPaths } from '../config/portals';
import { useIsDevelopment } from '../hooks/useIsDevelopment';
import { AppProviders } from '../shared/AppProviders';

const Login = lazy(() => import('../pages/Login'));
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

function OrgRoutes() {
  const isDevelopment = useIsDevelopment();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to={portalPaths.organizer.home} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/connect-steam" element={<Access level="admin"><ConnectSteam /></Access>} />

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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function OrgApp() {
  return (
    <AppProviders>
      <OrgRoutes />
    </AppProviders>
  );
}
