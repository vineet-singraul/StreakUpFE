import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import { promptInstall, useInstallState } from '../install';
import { useT } from '../i18n';

/**
 * Landing page for the QR code: one big "Install" button.
 * Browsers never install an app without a tap, so this is the shortest possible path.
 */
export default function Install() {
  const t = useT();
  const navigate = useNavigate();
  const state = useInstallState();
  const [steps, setSteps] = useState(false);
  const [done, setDone] = useState(false);

  // Opened from the installed app itself -> just go in
  useEffect(() => {
    if (state === 'installed' && !done) navigate('/', { replace: true });
  }, [state, done, navigate]);

  const install = async () => {
    if (state !== 'ready') return setSteps(true);
    const outcome = await promptInstall();
    if (outcome === 'accepted') setDone(true);
    else if (outcome === 'unavailable') setSteps(true);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        px: 3, py: 4, textAlign: 'center', color: '#fff',
        background: 'linear-gradient(160deg, #4f46e5 0%, #7c3aed 100%)',
      }}
    >
      <Box component="img" src="/icon-192.png" alt="StreakUp" sx={{ width: 104, height: 104, borderRadius: 5, boxShadow: '0 12px 32px rgba(0,0,0,.3)', mb: 2.5 }} />
      <Typography variant="h4" sx={{ fontWeight: 800 }}>StreakUp</Typography>
      <Typography sx={{ opacity: 0.85, mb: 4 }}>Habit Tracker</Typography>

      {done ? (
        <>
          <CheckCircleIcon sx={{ fontSize: 56, mb: 1 }} />
          <Typography sx={{ fontWeight: 600, mb: 3 }}>{t('inst.done')}</Typography>
          <Button variant="contained" size="large" onClick={() => navigate('/')} sx={{ bgcolor: '#fff', color: '#4f46e5', fontWeight: 700, '&:hover': { bgcolor: '#eef' } }}>
            {t('inst.open')}
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="contained"
            size="large"
            startIcon={<InstallMobileIcon />}
            onClick={install}
            sx={{ bgcolor: '#fff', color: '#4f46e5', fontWeight: 800, fontSize: 18, px: 5, py: 1.5, borderRadius: 3, '&:hover': { bgcolor: '#eef' } }}
          >
            {t('inst.title')}
          </Button>

          {steps && (
            <Alert severity="info" sx={{ mt: 3, maxWidth: 380, textAlign: 'left' }}>
              <b>{state === 'ios' ? t('inst.iosTitle') : t('inst.manualTitle')}</b>
              <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {(state === 'ios' ? ['inst.ios1', 'inst.ios2', 'inst.ios3'] : ['inst.m1', 'inst.m2', 'inst.m3']).map((k) => <li key={k}>{t(k)}</li>)}
              </ol>
            </Alert>
          )}

          <Button onClick={() => navigate('/')} sx={{ mt: 3, color: '#fff', opacity: 0.85 }}>{t('inst.skip')}</Button>
        </>
      )}
    </Box>
  );
}
