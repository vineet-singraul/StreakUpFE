import { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import BlockIcon from '@mui/icons-material/Block';
import LockIcon from '@mui/icons-material/Lock';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useT } from '../i18n';

const APPS = { Instagram: 'https://www.instagram.com/', YouTube: 'https://www.youtube.com/', Facebook: 'https://www.facebook.com/', Snapchat: 'https://www.snapchat.com/', X: 'https://x.com/' };
const HERO_BG = 'linear-gradient(135deg, #f97316 0%, #ec4899 55%, #8b5cf6 100%)';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Today's plan per account on this device: { date, app, limit (min), usedMs, runningSince }
function usePlan(email) {
  const key = `ht_block_${email || 'me'}`;
  const read = () => {
    try {
      const p = JSON.parse(localStorage.getItem(key));
      return p?.date === localDate() ? p : null; // a new day unlocks everything
    } catch {
      return null;
    }
  };
  const [plan, setPlanState] = useState(read);
  const setPlan = (p) => {
    try {
      localStorage.setItem(key, JSON.stringify(p));
    } catch { /* private mode */ }
    setPlanState(p);
  };
  return [plan, setPlan, read];
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

async function notifyLocal(title, body) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && Notification.permission === 'granted') reg.showNotification(title, { body, icon: '/icon-192.png', data: { url: '/blocker' } });
  } catch { /* push from the server covers it */ }
}

export default function Blocker() {
  const t = useT();
  const { user } = useAuth();
  const [plan, setPlan, readPlan] = usePlan(user?.email);
  const [app, setApp] = useState('Instagram');
  const [minutes, setMinutes] = useState('5');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      if (plan && plan.date !== localDate()) setPlan(readPlan()); // midnight reset
    }, 1000);
    return () => clearInterval(id);
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const used = plan ? plan.usedMs + (plan.runningSince ? now - plan.runningSince : 0) : 0;
  const left = plan ? plan.limit * 60000 - used : 0;
  const locked = plan && left <= 0;
  const name = plan?.app || app;

  // time ran out while the page was open: stop the clock and alert once
  useEffect(() => {
    if (locked && plan.runningSince) {
      setPlan({ ...plan, usedMs: plan.limit * 60000, runningSince: null });
      notifyLocal(t('bl.upTitle', { app: plan.app }), t('bl.upBody', { app: plan.app }));
    }
  }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps

  const minNum = Number(minutes);
  const minError = !Number.isInteger(minNum) || minNum < 1 || minNum > 180;

  const start = () => {
    setPlan({ ...plan, runningSince: Date.now() });
    // the server pushes "time's up" even while the user is inside the other app
    api.post('/notifications/timer', { seconds: Math.ceil(left / 1000), title: t('bl.upTitle', { app: name }), body: t('bl.upBody', { app: name }) }).catch(() => {});
    if (APPS[name]) window.open(APPS[name], '_blank', 'noopener');
  };

  const pause = () => {
    setPlan({ ...plan, usedMs: used, runningSince: null });
    api.delete('/notifications/timer').catch(() => {});
  };

  return (
    <Stack spacing={{ xs: 2, md: 3 }} sx={{ maxWidth: 680, mx: 'auto' }}>
      <Card sx={{ background: HERO_BG, color: '#fff', border: 0 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <BlockIcon sx={{ fontSize: 40 }} />
          <Typography variant="h5" sx={{ mt: 1 }}>{t('bl.title')}</Typography>
          <Typography sx={{ opacity: 0.9 }}>{t('bl.sub')}</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          {!plan ? (
            <Stack spacing={2}>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {Object.keys(APPS).map((a) => (
                  <Chip key={a} label={a} onClick={() => setApp(a)} color={app === a ? 'primary' : 'default'} variant={app === a ? 'filled' : 'outlined'} />
                ))}
              </Stack>
              <TextField label={t('bl.app')} value={app} onChange={(e) => setApp(e.target.value)} fullWidth />
              <TextField
                label={t('bl.minutes')}
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                error={minError}
                slotProps={{ htmlInput: { min: 1, max: 180, inputMode: 'numeric' } }}
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<LockIcon />}
                disabled={minError || !app.trim()}
                onClick={() => setPlan({ date: localDate(), app: app.trim(), limit: minNum, usedMs: 0, runningSince: null })}
              >
                {t('bl.set')}
              </Button>
            </Stack>
          ) : locked ? (
            <Stack spacing={1} sx={{ alignItems: 'center', textAlign: 'center', py: 3 }}>
              <LockIcon color="error" sx={{ fontSize: 56 }} />
              <Typography variant="h6">{t('bl.locked', { app: name })}</Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography color="text.secondary">{t('bl.left', { app: name })}</Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmt(left)}</Typography>
              <LinearProgress variant="determinate" value={Math.min(100, (used / (plan.limit * 60000)) * 100)} sx={{ height: 8, borderRadius: 4 }} />
              {plan.runningSince ? (
                <Button variant="outlined" size="large" startIcon={<PauseIcon />} onClick={pause}>{t('bl.pause', { app: name })}</Button>
              ) : (
                <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={start}>{t('bl.open', { app: name })}</Button>
              )}
              <Typography variant="caption" color="text.secondary">{t('bl.fixed')}</Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Alert severity="info" icon={<LockIcon />}>
        <Typography sx={{ fontWeight: 700 }}>{t('bl.guideTitle')}</Typography>
        <Typography variant="body2">{t('bl.guide', { app: name })}</Typography>
      </Alert>
    </Stack>
  );
}
