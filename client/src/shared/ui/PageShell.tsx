import { Box, BoxProps } from '@mui/material';

export interface PageShellProps extends BoxProps {
  /** Max content width in px. Defaults to 1100. */
  maxWidth?: number;
}

/**
 * Centered page container with consistent max width and bottom padding, so
 * every screen shares the same horizontal rhythm under the portal chrome.
 */
export function PageShell({ maxWidth = 1100, sx, children, ...rest }: PageShellProps) {
  return (
    <Box
      {...rest}
      sx={[
        { width: '100%', maxWidth, mx: 'auto', pb: 5 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

export default PageShell;
