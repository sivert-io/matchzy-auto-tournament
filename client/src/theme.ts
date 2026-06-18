import { createTheme } from '@mui/material/styles';

// CS2/Valve esports orange theme
export const theme = createTheme({
 palette: {
    mode: 'dark',
    primary: {
      main: '#FF7A1A', // CS2/Valve orange
      light: '#FFA361',
      dark: '#C85A0F',
      contrastText: '#241200',
    },
    secondary: {
      main: '#8C95A3', // Steel gray-blue, tactical HUD feel
      light: '#B0B7C2',
      dark: '#666E79',
      contrastText: '#1A1D21',
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
      default: '#16181C', // Cool near-black, tactical
      paper: '#1E2126',
      surface0: '#1E2126',
      surface1: '#262A30',
      surface2: '#2C3138',
      surface3: '#1E2126',
      surface4: '#191B1F',
      surface5: '#131518',
      surface6: '#262A30',
      surface7: '#2C3138',
    },
    text: {
      primary: '#ECEDEE',
      secondary: '#A8ADB4',
      disabled: '#6B7178',
    },
  },
  shape: {
    borderRadius: 8, // Default minimal roundness
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
      fontFamily: '"Rajdhani", sans-serif',
      textTransform: 'none',
      fontWeight: 600,
    },
    h1: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 700, lineHeight: 1.1 },
    h2: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 700, lineHeight: 1.1 },
    h3: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 600, lineHeight: 1.1 },
    h4: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 600, lineHeight: 1.1 },
    h5: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 500, lineHeight: 1.1 },
    h6: { fontFamily: '"Rajdhani", sans-serif', fontWeight: 500, lineHeight: 1.1 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#6b6b6b #2b2b2b',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: '#2b2b2b',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#6b6b6b',
            minHeight: 24,
            border: '3px solid #2b2b2b',
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#959595',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#959595',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#959595',
          },
          '&::-webkit-scrollbar-corner, & *::-webkit-scrollbar-corner': {
            backgroundColor: '#2b2b2b',
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
          borderRadius: 44, // Rounded but not fully pill-shaped
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 500,
          // Make focus state same as hover state
          '&:focus-visible': {
            backgroundColor: 'rgba(255, 122, 26, 0.08)', // Same as hover for contained buttons
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '&:focus-visible': {
            backgroundColor: '#C85A0F',
            boxShadow: 'none',
          },
        },
        outlined: {
          '&:focus-visible': {
            backgroundColor: 'rgba(255, 122, 26, 0.08)',
          },
        },
        text: {
          '&:focus-visible': {
            backgroundColor: 'rgba(255, 122, 26, 0.08)',
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
            backgroundColor: 'rgba(255, 122, 26, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
          fontSize: '0.95rem',
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});
