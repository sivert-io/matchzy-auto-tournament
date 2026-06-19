import { ReactNode } from 'react';
import { Box } from '@mui/material';
import { Navigate, useLocation } from 'react-router-dom';
import { AccessLevel, portalPaths } from '../../config/portals';
import { useAuth } from '../../contexts/AuthContext';

interface RequireAccessProps {
  access: AccessLevel;
  children: ReactNode;
}

export function RequireAccess({ access, children }: RequireAccessProps) {
  const { isAuthenticated, isLoading, playerSteamId, needsSteamLink } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Box
          component="img"
          src="/fragbase-logo.png"
          alt="Fragbase"
          sx={{
            width: 80,
            height: 80,
            animation: 'portalPulse 2s ease-in-out infinite',
            '@keyframes portalPulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.45 },
            },
          }}
        />
      </Box>
    );
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
