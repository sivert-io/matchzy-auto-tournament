import { Box } from '@mui/material';
import { useBackground } from '../../contexts/BackgroundContext';

/**
 * Fixed, full-viewport map wallpaper rendered behind the whole app. The image
 * gets a light blur so the frosted-glass surfaces read on top of it, plus a
 * dark scrim for text contrast (important on bright maps like Dust II).
 */
export function AppBackground() {
  const { current } = useBackground();

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        backgroundColor: '#000',
        overflow: 'hidden',
        displayPrint: 'none',
      }}
    >
      {/* Map image layer (keyed so each map cross-fades in) */}
      <Box
        key={current.id}
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${current.full})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(5px)',
          transform: 'scale(1.06)', // hide blurred edges
          animation: 'fragbaseBgFade 600ms ease',
          '@keyframes fragbaseBgFade': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      />
      {/* Scrim for contrast */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.62) 50%, rgba(0,0,0,0.72) 100%)',
        }}
      />
    </Box>
  );
}

export default AppBackground;
