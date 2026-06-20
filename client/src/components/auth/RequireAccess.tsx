import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AccessLevel, portalPaths } from '../../config/portals';
import { useAuth } from '../../contexts/AuthContext';
import { AppLoadingScreen } from '../../shared/AppLoadingScreen';

interface RequireAccessProps {
  access: AccessLevel;
  children: ReactNode;
}

export function RequireAccess({ access, children }: RequireAccessProps) {
  const { isAuthenticated, isLoading, playerSteamId, needsSteamLink } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (access === 'public') return <>{children}</>;

  if (access === 'admin') {
    if (!isAuthenticated) {
      if (playerSteamId) return <Navigate to={portalPaths.player.home} replace />;
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (needsSteamLink && location.pathname !== '/connect-steam') {
      return <Navigate to="/connect-steam" replace />;
    }
    return <>{children}</>;
  }

  if (!isAuthenticated && !playerSteamId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
