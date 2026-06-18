import { createTheme } from '@mui/material/styles';

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
      default: '#000000',
      paper: '#0B0B0C',
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
        body: {
          backgroundColor: '#000000',
          scrollbarColor: '#5F5F63 #0B0B0C',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            backgroundColor: '#0B0B0C',
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 999,
            backgroundColor: '#5F5F63',
            minHeight: 24,
            border: '3px solid #0B0B0C',
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
          border: '1px solid rgba(255, 255, 255, 0.10)',
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
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#000000',
          borderBottom: '1px solid rgba(255, 255, 255, 0.10)',
        },
      },
    },
  },
});
