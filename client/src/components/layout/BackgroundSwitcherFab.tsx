import { useState, type MouseEvent } from 'react';
import { Box, Fab, Popover, Tooltip, Typography } from '@mui/material';
import WallpaperIcon from '@mui/icons-material/Wallpaper';
import CheckIcon from '@mui/icons-material/Check';
import { useBackground } from '../../contexts/BackgroundContext';

/**
 * Floating button (bottom-right) that opens a grid of CS2 map backgrounds.
 * Selecting one updates the app wallpaper and persists via BackgroundContext.
 */
export function BackgroundSwitcherFab() {
  const { maps, mapId, setMapId } = useBackground();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handlePick = (id: string) => {
    setMapId(id);
    handleClose();
  };

  return (
    <>
      <Tooltip title="Mudar fundo" placement="left">
        <Fab
          size="medium"
          aria-label="Mudar fundo do app"
          onClick={handleOpen}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: (theme) => theme.zIndex.tooltip + 1,
            color: 'common.white',
            backgroundColor: 'rgba(18,18,20,0.55)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            '&:hover': { backgroundColor: 'rgba(36,36,40,0.65)' },
            displayPrint: 'none',
          }}
        >
          <WallpaperIcon />
        </Fab>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: -1, p: 2, width: 360, maxWidth: '90vw' } } }}
      >
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Fundo do app
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
          }}
        >
          {maps.map((map) => {
            const selected = map.id === mapId;
            return (
              <Box
                key={map.id}
                role="button"
                tabIndex={0}
                onClick={() => handlePick(map.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePick(map.id);
                  }
                }}
                sx={{
                  position: 'relative',
                  aspectRatio: '16 / 10',
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px solid',
                  borderColor: selected ? 'primary.main' : 'transparent',
                  outline: 'none',
                  '&:focus-visible': { borderColor: 'primary.main' },
                  '&:hover .bg-thumb-img': { transform: 'scale(1.08)' },
                }}
              >
                <Box
                  component="img"
                  className="bg-thumb-img"
                  src={map.thumb}
                  alt={map.label}
                  loading="lazy"
                  decoding="async"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 200ms ease',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'flex-end',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.7) 100%)',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ p: 0.75, fontWeight: 700, color: 'common.white', lineHeight: 1 }}
                  >
                    {map.label}
                  </Typography>
                </Box>
                {selected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    <CheckIcon sx={{ fontSize: 16 }} />
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Popover>
    </>
  );
}

export default BackgroundSwitcherFab;
