import { createTheme } from '@mui/material/styles';

// Shared frosted-glass surface. Applied to first-level surfaces (Paper, AppBar,
// and everything Paper-based: Card, Menu, Popover, Dialog, Drawer). Kept as one
// recipe so the whole app reads as a single material and we don't scatter
// backdrop-filters (which are expensive) with inconsistent values.
const glassSurface = {
  backgroundColor: 'rgba(18, 18, 20, 0.55)',
  backdropFilter: 'blur(18px) saturate(140%)',
  WebkitBackdropFilter: 'blur(18px) saturate(140%)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 30px rgba(0, 0, 0, 0.35)',
} as const;

export const theme = createTheme({
 palette: {
    mode: 'dark',
    primary: {
      main: '#FFFFFF',
      light: '#FFFFFF',
      dark: '#D7D7D7',
      contrastText: '#000000',
    },
    secondary: {
      main: '#A3A3A3',
      light: '#D4D4D4',
      dark: '#737373',
      contrastText: '#000000',
    },
    error: {
      main: '#FF6B57', // Warm red-orange, distinct from primary
      light: '#FF9A89',
      dark: '#C24A3A',
      contrastText: '#2B0D06',
    },
    warning: {
      main: '#F2C94C',
      light: '#F7DC85',
      dark: '#BC9A2E',
      contrastText: '#2B1F00',
    },
    info: {
      main: '#5B9BD5',
      light: '#8FBCE3',
      dark: '#3D74A8',
      contrastText: '#001A2E',
    },
    success: {
      main: '#5FBF8F',
      light: '#8FD4AE',
      dark: '#3D9468',
      contrastText: '#00261A',
    },
    background: {
      // Transparent base so the fixed map wallpaper (AppBackground) shows through.
      default: 'transparent',
      paper: 'rgba(18, 18, 20, 0.55)',
      surface0: '#0B0B0C',
      surface1: '#111113',
      surface2: '#171719',
      surface3: '#0B0B0C',
      surface4: '#080809',
      surface5: '#000000',
      surface6: '#111113',
      surface7: '#171719',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B7B7BA',
      disabled: '#6D6D72',
    },
  },
  shape: {
    borderRadius: 12,
  },
typography: {
    fontFamily: [
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    button: {
      fontFamily: 'Inter, Montserrat, sans-serif',
      textTransform: 'none',
      fontWeight: 700,
    },
    h1: { fontFamily: 'Inter, Montserrat, sans-serif', fontWeight: 800, lineHeight: 1.1 },
    h2: { fontFamily: 'Inter, Montserrat, sans-serif', fontWeight: 800, lineHeight: 1.1 },
    h3: { fontFamily: 'Inter, Montserrat, sans-serif', fontWeight: 800, lineHeight: 1.1 },
    h4: { fontFamily: 'Inter, Montserrat, sans-serif', fontWeight: 750, lineHeight: 1.1 },
    h5: { fontFamily: 'Inter, Montserrat, sans-serif', fontWeight: 750, lineHeight: 1.1 },
    h6: { fontFamily: 'Inter, Montserrat, sans-serif', fontWeight: 700, lineHeight: 1.1 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Transparent body so the fixed wallpaper behind #root is visible; html
        // keeps a black fallback (see index.css) to avoid any flash.
        body: {
          backgroundColor: 'transparent',
          scrollbarColor: '#5F5F63 transparent',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            backgroundColor: 'rgba(150, 150, 155, 0.55)',
            minHeight: 24,
            border: '3px solid transparent',
            backgroundClip: 'padding-box',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(180, 180, 185, 0.8)',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableRipple: false,
        disableFocusRipple: true, // Disable focus ripple by default
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 700,
          '&:focus-visible': {
            backgroundColor: 'rgba(255, 255, 255, 0.10)',
          },
        },
        contained: {
          boxShadow: 'none',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          '&:hover': {
            boxShadow: 'none',
            backgroundColor: '#EDEDED',
          },
          '&:focus-visible': {
            backgroundColor: '#EDEDED',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.25)',
          '&:focus-visible': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
        text: {
          '&:focus-visible': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableFocusRipple: true, // Disable focus ripple for icon buttons too
      },
      styleOverrides: {
        root: {
          // Make focus state same as hover state
          '&:focus-visible': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 18,
          ...glassSurface,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 14,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...glassSurface,
        },
        // Keep flat/outlined Papers from doubling up borders+shadows.
        outlined: {
          boxShadow: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: 'Inter, Montserrat, sans-serif',
          fontWeight: 600,
          borderRadius: 999,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontFamily: 'Inter, Montserrat, sans-serif',
          fontWeight: 600,
          fontSize: '0.95rem',
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontFamily: 'Inter, Montserrat, sans-serif',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0,
          backgroundColor: 'transparent',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          ...glassSurface,
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        },
      },
    },
  },
});
