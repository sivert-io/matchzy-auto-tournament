import { Alert, Box } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Shown when the API did not respond during auth bootstrap (common if API/DB is down).
 */
export function ApiOfflineBanner() {
  const { apiReachable, isLoading } = useAuth();

  if (isLoading || apiReachable) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.snackbar,
        px: 2,
        pt: 1,
      }}
    >
      <Alert severity="warning" variant="filled" sx={{ borderRadius: 2 }}>
        API offline — rode <code>yarn db</code> e <code>yarn api:dev</code> (ou{' '}
        <code>yarn dev:org</code> / <code>yarn dev:player</code> no Windows).
      </Alert>
    </Box>
  );
}

export default ApiOfflineBanner;
