import { Card, CardProps } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export interface GlassCardProps extends CardProps {
  /** When set, the whole card becomes an internal router link. */
  to?: string;
  /** Adds a hover lift/affordance. Defaults to true when `to` is set. */
  interactive?: boolean;
}

/**
 * The base surface of the redesign. The theme already paints every Card as
 * frosted glass; GlassCard standardises padding, optional link behaviour and a
 * consistent hover affordance so screens don't re-invent these per card.
 */
export function GlassCard({ to, interactive, sx, children, ...rest }: GlassCardProps) {
  const isInteractive = interactive ?? Boolean(to);
  const linkProps = to ? ({ component: RouterLink, to } as const) : {};

  return (
    <Card
      {...linkProps}
      {...rest}
      sx={[
        {
          p: 3,
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'border-color .15s ease, transform .15s ease',
        },
        isInteractive && {
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.28)',
            transform: 'translateY(-2px)',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Card>
  );
}

export default GlassCard;
