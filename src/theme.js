import { createTheme } from '@mui/material/styles';

// Brand gradient used by rings, the centre nav button and check circles
export const BRAND_GRADIENT = 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 45%, #22d3ee 100%)';

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#6366f1' },
        secondary: { main: '#06b6d4' },
        success: { main: '#16a34a' },
        background: { default: '#f3f4fb', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#8b8ff8' },
        secondary: { main: '#22d3ee' },
        success: { main: '#22c55e' },
        background: { default: '#0a0c18', paper: '#141730' },
        divider: 'rgba(255,255,255,0.08)',
      },
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", Inter, "Segoe UI", Roboto, Arial, sans-serif',
    // Headings shrink on phones so they never feel oversized or cause overflow
    h4: { fontWeight: 800, fontSize: '1.7rem', '@media (min-width:600px)': { fontSize: '2.125rem' } },
    h5: { fontWeight: 800, fontSize: '1.35rem', '@media (min-width:600px)': { fontSize: '1.5rem' } },
    h6: { fontWeight: 700, fontSize: '1.1rem', '@media (min-width:600px)': { fontSize: '1.25rem' } },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Safety net: nothing causes a horizontal scrollbar on mobile
        'html, body, #root': { maxWidth: '100%' },
        body: {
          overflowX: 'hidden',
          backgroundAttachment: 'fixed',
          // soft colour glows behind the whole app (teal top-right, violet bottom-left)
          backgroundImage:
            'radial-gradient(60vmax 50vmax at 100% 0%, rgba(34,211,238,.10), transparent 60%),' +
            'radial-gradient(60vmax 50vmax at 0% 100%, rgba(139,92,246,.12), transparent 60%)',
          '@media (prefers-color-scheme: dark)': {
            backgroundImage:
              'radial-gradient(70vmax 55vmax at 100% 0%, rgba(20,184,166,.22), transparent 60%),' +
              'radial-gradient(70vmax 60vmax at 0% 100%, rgba(124,58,237,.28), transparent 60%)',
          },
        },
      },
    },
    // Frosted-glass cards everywhere
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: 'rgba(255,255,255,.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          '@media (prefers-color-scheme: dark)': {
            backgroundColor: 'rgba(255,255,255,.04)',
            borderColor: 'rgba(255,255,255,.09)',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    // Top bar blends into the background
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(243,244,251,.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          backgroundImage: 'none',
          '@media (prefers-color-scheme: dark)': { backgroundColor: 'rgba(10,12,24,.7)' },
        },
      },
    },
  },
});

export default theme;
