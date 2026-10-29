import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';

const FEATURES = [
  { icon: <CalendarMonthIcon />, text: 'Monthly calendar with daily tasks & habit ticks' },
  { icon: <AutoAwesomeIcon />, text: 'Gemini AI report every night at 12 AM' },
  { icon: <NotificationsActiveIcon />, text: 'Reminders every hour (browser + Gmail)' },
];

export default function Login() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const clientMissing = !import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID.startsWith('PASTE_');

  const onSuccess = async ({ credential }) => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle(credential, mode);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.response?.data?.needSignup) setMode('signup');
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
        bgcolor: 'background.default',
      }}
    >
      {/* Hero (laptop only) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          p: 8,
          color: '#fff',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #06b6d4 100%)',
        }}
      >
        <TaskAltIcon sx={{ fontSize: 56, mb: 2 }} />
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>Build habits that stick.</Typography>
        <Typography sx={{ opacity: 0.9, mb: 4, fontSize: 18 }}>
          Roz ke tasks likho, tick karo, aur AI se honest report pao.
        </Typography>
        <Stack spacing={2}>
          {FEATURES.map((f) => (
            <Stack key={f.text} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              {f.icon}
              <Typography>{f.text}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={1} sx={{ alignItems: 'center', mb: 2, display: { md: 'none' } }}>
              <TaskAltIcon color="primary" sx={{ fontSize: 48 }} />
            </Stack>
            <Typography variant="h5" sx={{ textAlign: 'center' }}>Habit Tracker</Typography>
            <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
              {mode === 'signin' ? 'Welcome back! Sign in to continue.' : 'Create your account in one click.'}
            </Typography>

            <Tabs value={mode} onChange={(_, v) => { setMode(v); setError(''); }} variant="fullWidth" sx={{ mb: 3 }}>
              <Tab value="signin" label="Sign In" />
              <Tab value="signup" label="Sign Up" />
            </Tabs>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {clientMissing && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Frontend/.env me VITE_GOOGLE_CLIENT_ID set karo.
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}>
              {busy ? (
                <CircularProgress size={32} />
              ) : (
                <GoogleLogin
                  key={mode}
                  onSuccess={onSuccess}
                  onError={() => setError('Google login cancel / fail ho gaya')}
                  text={mode === 'signin' ? 'signin_with' : 'signup_with'}
                  shape="pill"
                  size="large"
                />
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
              {mode === 'signin' ? 'Naya account? ' : 'Pehle se account hai? '}
              <Box
                component="span"
                sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </Box>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
