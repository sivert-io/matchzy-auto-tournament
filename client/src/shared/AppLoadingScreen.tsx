import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Full-screen loading state — visible on the black map wallpaper.
 */
export function AppLoadingScreen({ label = 'Carregando…' }: { label?: string }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        color: 'common.white',
      }}
    >
      <Box
        component="img"
        src="/fragbase-logo.png"
        alt="Fragbase"
        sx={{
          width: 72,
          height: 72,
          animation: 'fragbasePulse 2s ease-in-out infinite',
          '@keyframes fragbasePulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.4 },
          },
        }}
      />
      <CircularProgress size={28} sx={{ color: 'common.white' }} />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export default AppLoadingScreen;
