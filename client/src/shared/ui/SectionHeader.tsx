import { ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export interface SectionHeaderProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned actions (buttons, etc.). */
  actions?: ReactNode;
  /** Title typography variant. Defaults to "h5". */
  titleVariant?: 'h3' | 'h4' | 'h5' | 'h6';
  sx?: SxProps<Theme>;
}

/**
 * Consistent section/page heading: optional eyebrow chip, a title, an optional
 * subtitle and right-aligned actions that wrap on small screens.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  titleVariant = 'h5',
  sx,
}: SectionHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'center' }}
      gap={2}
      sx={sx}
    >
      <Box sx={{ minWidth: 0 }}>
        {eyebrow && (
          <Chip
            label={eyebrow}
            size="small"
            sx={{ mb: 1.25, fontWeight: 700, letterSpacing: 0.5 }}
          />
        )}
        <Typography variant={titleVariant} fontWeight={800}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 680 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Stack>
  );
}

export default SectionHeader;
