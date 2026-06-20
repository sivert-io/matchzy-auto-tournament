import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/lazy-load failures so users see an error instead of a black screen.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Fragbase] UI error', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            px: 3,
            textAlign: 'center',
            color: 'common.white',
          }}
        >
          <Typography variant="h5" fontWeight={700}>
            Algo quebrou ao carregar o app
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
            {this.state.error.message}
          </Typography>
          <Button variant="contained" onClick={this.handleReload}>
            Recarregar
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
