import { Suspense } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { PublicTopBar } from '../PublicTopBar';
import { PublicOutletFallback } from './PublicOutletFallback';

/** Organizer portal — auth entry only. No public browse. */
export function OrgPublicShell() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
      <PublicTopBar portal="organizer" showLoginCta={false} showPublicNav={false} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<PublicOutletFallback />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}

export default OrgPublicShell;
