import { Box, CircularProgress } from '@mui/material';

/** Inline fallback while lazy public routes load (shell chrome stays mounted). */
export function PublicOutletFallback() {
  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={28} />
    </Box>
  );
}

export default PublicOutletFallback;
