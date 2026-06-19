import { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { GlassCard, GlassCardProps } from './GlassCard';

export interface StatTileProps extends Pick<GlassCardProps, 'to' | 'interactive'> {
  label: ReactNode;
  value: ReactNode;
  icon?: SvgIconComponent;
  /** Small secondary line under the value. */
  hint?: ReactNode;
  /** Accent colour for the icon (theme palette path or CSS colour). */
  iconColor?: string;
}

/**
 * Compact metric card: a labelled value with an optional icon and hint.
 * Built on {@link GlassCard} so it can also act as a link.
 */
export function StatTile({ label, value, icon: Icon, hint, iconColor = 'primary.main', to, interactive }: StatTileProps) {
  return (
    <GlassCard to={to} interactive={interactive} sx={{ p: 2.5, height: '100%' }}>
      <Stack direction="row" spacing={2} alignItems="center">
        {Icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: iconColor,
            }}
          >
            <Icon fontSize="small" />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
      </Stack>
    </GlassCard>
  );
}

export default StatTile;
