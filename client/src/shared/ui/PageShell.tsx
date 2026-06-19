import { Box, BoxProps } from '@mui/material';
import { pageWidth, pageShellBaseSx } from './layoutTokens';

export interface PageShellProps extends BoxProps {
  /** Max content width in px. Defaults to {@link pageWidth.default}. */
  maxWidth?: number;
}

/**
 * Centered page container with consistent max width and bottom padding, so
 * every screen shares the same horizontal rhythm under the portal chrome.
 */
export function PageShell({ maxWidth = pageWidth.default, sx, children, ...rest }: PageShellProps) {
  return (
    <Box
      {...rest}
      sx={[
        pageShellBaseSx,
        { maxWidth, mx: 'auto', pb: 5 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

export default PageShell;
