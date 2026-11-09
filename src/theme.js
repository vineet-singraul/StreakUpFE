import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#4f46e5' },
        secondary: { main: '#06b6d4' },
        success: { main: '#16a34a' },
        background: { default: '#f5f6fb', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#818cf8' },
        secondary: { main: '#22d3ee' },
        success: { main: '#22c55e' },
        background: { default: '#0f1120', paper: '#171a2e' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, Arial, sans-serif',
    // Headings shrink on phones so they never feel oversized or cause overflow
    h4: { fontWeight: 700, fontSize: '1.6rem', '@media (min-width:600px)': { fontSize: '2.125rem' } },
    h5: { fontWeight: 700, fontSize: '1.3rem', '@media (min-width:600px)': { fontSize: '1.5rem' } },
    h6: { fontWeight: 600, fontSize: '1.1rem', '@media (min-width:600px)': { fontSize: '1.25rem' } },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    // Safety net: nothing causes a horizontal scrollbar on mobile
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': { maxWidth: '100%' },
        body: { overflowX: 'hidden' },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});

export default theme;
