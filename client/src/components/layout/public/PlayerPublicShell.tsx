import { Suspense } from 'react';
import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicTopBar } from '../PublicTopBar';
import { PublicOutletFallback } from './PublicOutletFallback';

/** Player portal — public routes only (browse + sign-in). Glass nav, lazy outlet. */
export function PlayerPublicShell() {
  const onLogin = useLocation().pathname === '/login';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <PublicTopBar portal="player" showPublicNav showLoginCta={!onLogin} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<PublicOutletFallback />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}

export default PlayerPublicShell;
