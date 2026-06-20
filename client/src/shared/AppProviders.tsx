import { ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { PageHeaderProvider } from '../contexts/PageHeaderContext';
import { SnackbarProvider } from '../contexts/SnackbarContext';
import { BackgroundProvider } from '../contexts/BackgroundContext';
import { AppBackground } from '../components/layout/AppBackground';
import { BackgroundSwitcherFab } from '../components/layout/BackgroundSwitcherFab';
import { ApiOfflineBanner } from '../components/layout/ApiOfflineBanner';
import { AppErrorBoundary } from './AppErrorBoundary';
import { theme } from '../theme';

/**
 * Shared provider/chrome shell for both the Player and Org apps. Each app
 * mounts its own route tree as children; everything around it (theme, auth,
 * snackbars, page header, the map wallpaper + background switcher) is common.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <SnackbarProvider>
              <PageHeaderProvider>
                <BackgroundProvider>
                  <AppBackground />
                  <ApiOfflineBanner />
                  {children}
                  <BackgroundSwitcherFab />
                </BackgroundProvider>
              </PageHeaderProvider>
            </SnackbarProvider>
          </AuthProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

export default AppProviders;
