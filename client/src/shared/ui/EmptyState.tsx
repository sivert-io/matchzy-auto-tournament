import { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import { GlassCard } from './GlassCard';

export interface EmptyStateProps {
  icon?: SvgIconComponent;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Render without the glass surface (e.g. inside an existing card). */
  bare?: boolean;
}

/**
 * Centered placeholder for empty/zero/error-free-but-nothing-here states.
 */
export function EmptyState({ icon: Icon, title, description, action, bare }: EmptyStateProps) {
  const content = (
    <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center', py: bare ? 2 : 4, px: 2 }}>
      {Icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'text.secondary',
          }}
        >
          <Icon />
        </Box>
      )}
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ pt: 1 }}>{action}</Box>}
    </Stack>
  );

  if (bare) return content;
  return <GlassCard>{content}</GlassCard>;
}

export default EmptyState;
