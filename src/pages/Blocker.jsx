import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import BlockIcon from '@mui/icons-material/Block';
import LockIcon from '@mui/icons-material/Lock';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../Toast';
import { useT } from '../i18n';

// name -> web address and avatar color
const APPS = [
  { name: 'Instagram', pkg: 'com.instagram.android', url: 'https://www.instagram.com/', color: '#e1306c' },
  { name: 'YouTube', pkg: 'com.google.android.youtube', url: 'https://www.youtube.com/', color: '#ef4444' },
  { name: 'Facebook', pkg: 'com.facebook.katana', url: 'https://www.facebook.com/', color: '#3b82f6' },
  { name: 'WhatsApp', pkg: 'com.whatsapp', url: 'https://web.whatsapp.com/', color: '#22c55e' },
  { name: 'Snapchat', pkg: 'com.snapchat.android', url: 'https://www.snapchat.com/', color: '#eab308' },
  { name: 'X', pkg: 'com.twitter.android', url: 'https://x.com/', color: '#64748b' },
];
const QUICK = [1, 5, 10, 15, 30, 60];
const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
// Opens the phone's usage page for that one app (Digital Wellbeing → app → App timer) via Android's
// APP_USAGE_SETTINGS screen. If the phone won't open it from the browser, Chrome comes back to this
// page with the steps popup instead of the Play Store.
const timerLink = (app, min) => {
  const pkg = APPS.find((a) => a.name === app)?.pkg || '';
  const back = encodeURIComponent(`${window.location.origin}/blocker?lockHelp=${encodeURIComponent(`${app}:${min}`)}`);
  return `intent:#Intent;action=android.settings.action.APP_USAGE_SETTINGS;S.android.intent.extra.PACKAGE_NAME=${pkg};S.browser_fallback_url=${back};end`;
};
const HERO_BG = 'linear-gradient(135deg, #f97316 0%, #ec4899 55%, #8b5cf6 100%)';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Today's limits per account on this device: { date, apps: { [name]: { limit, usedMs, runningSince } } }
function usePlans(email) {
  const key = `ht_blocker_${email || 'me'}`;
  const read = () => {
    try {
      const p = JSON.parse(localStorage.getItem(key));
      if (p?.date === localDate()) return p;
    } catch { /* ignore */ }
    return { date: localDate(), apps: {} }; // a new day unlocks everything
  };
  const [plans, setState] = useState(read);
  const save = (p) => {
    try {
      localStorage.setItem(key, JSON.stringify(p));
    } catch { /* private mode */ }
    setState(p);
  };
  return [plans, save, read];
}

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

async function notifyLocal(title, body) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg && Notification.permission === 'granted') reg.showNotification(title, { body, icon: '/icon-192.png', data: { url: '/blocker' } });
  } catch { /* push from the server covers it */ }
}

/* ---------- minutes popup ---------- */
function MinutesDialog({ app, onClose, onSave }) {
  const t = useT();
  const [min, setMin] = useState('5');
  useEffect(() => {
    if (app) setMin('5');
  }, [app]);
  const n = Number(min);
  const bad = !Number.isInteger(n) || n < 1 || n > 600;
  return (
    <Dialog open={Boolean(app)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{app && t('bl.ask', { app: app.name })}</DialogTitle>
      <DialogContent>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 2, mt: 0.5 }}>
          {QUICK.map((q) => (
            <Chip key={q} label={`${q} min`} onClick={() => setMin(String(q))} color={n === q ? 'primary' : 'default'} variant={n === q ? 'filled' : 'outlined'} />
          ))}
        </Stack>
        <TextField
          autoFocus
          fullWidth
          label={t('bl.minutes')}
          type="number"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          error={bad}
          slotProps={{ htmlInput: { min: 1, max: 600, inputMode: 'numeric' } }}
          onKeyDown={(e) => e.key === 'Enter' && !bad && onSave(n)}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('bl.fixed')}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('ch.cancel')}</Button>
        <Button variant="contained" startIcon={<LockIcon />} disabled={bad} onClick={() => onSave(n)}>{t('bl.set')}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- page ---------- */
export default function Blocker() {
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const [plans, setPlans, readPlans] = usePlans(user?.email);
  const [asking, setAsking] = useState(null);
  const [lockHelp, setLockHelp] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('lockHelp'); // back from a failed App timer open
    const [app, min] = (q || '').split(':');
    return app ? { app, min: Number(min) || 1 } : null;
  });
  const [now, setNow] = useState(Date.now());

  const usedOf = (p) => p.usedMs + (p.runningSince ? now - p.runningSince : 0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // midnight reset + stop any app whose time ran out while the page was open
  useEffect(() => {
    if (plans.date !== localDate()) {
      setPlans(readPlans());
      return;
    }
    const over = Object.entries(plans.apps).filter(([, p]) => p.runningSince && usedOf(p) >= p.limit * 60000);
    if (!over.length) return;
    const apps = { ...plans.apps };
    for (const [name, p] of over) {
      apps[name] = { ...p, usedMs: p.limit * 60000, runningSince: null };
      notifyLocal(t('bl.upTitle', { app: name }), t('bl.upBody', { app: name }));
    }
    setPlans({ ...plans, apps });
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (name, p) => setPlans({ ...plans, apps: { ...plans.apps, [name]: p } });

  const onSwitch = (app) => {
    if (plans.apps[app.name]) return toast(t('bl.cantOff'), 'info');
    setAsking(app);
  };

  const saveLimit = (min) => {
    const app = asking;
    update(app.name, { limit: min, usedMs: 0, runningSince: null });
    setAsking(null);
    // the website can't close apps, so on Android walk the user to the phone's own App timer
    if (isAndroid) setLockHelp({ app: app.name, min });
  };

  const start = (app, p) => {
    const left = p.limit * 60000 - usedOf(p);
    update(app.name, { ...p, runningSince: Date.now() });
    // the server pushes "time's up" even while the user is inside the other app
    api.post('/notifications/timer', { key: app.name, seconds: Math.ceil(left / 1000), title: t('bl.upTitle', { app: app.name }), body: t('bl.upBody', { app: app.name }) }).catch(() => {});
    window.open(app.url, '_blank', 'noopener');
  };

  const pause = (app, p) => {
    update(app.name, { ...p, usedMs: usedOf(p), runningSince: null });
    api.delete('/notifications/timer', { params: { key: app.name } }).catch(() => {});
  };

  return (
    <Stack spacing={{ xs: 2, md: 3 }} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Card sx={{ background: HERO_BG, color: '#fff', border: 0 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
          <BlockIcon sx={{ fontSize: 40 }} />
          <Typography variant="h5" sx={{ mt: 1 }}>{t('bl.title')}</Typography>
          <Typography sx={{ opacity: 0.9 }}>{t('bl.sub')}</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 1, sm: 1.5 } }}>
          <Typography variant="h6">{t('bl.listTitle')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('bl.listSub')}</Typography>
        </CardContent>
        {APPS.map((app, i) => {
          const p = plans.apps[app.name];
          const left = p ? p.limit * 60000 - usedOf(p) : 0;
          const locked = p && left <= 0;
          return (
            <Box key={app.name}>
              {i > 0 && <Divider />}
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: { xs: 2, sm: 3 }, py: 1.5 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: app.color, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                  {app.name[0]}
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{app.name}</Typography>
                  {!p ? (
                    <Typography variant="caption" color="text.secondary">{t('bl.off')}</Typography>
                  ) : locked ? (
                    <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>🔒 {t('bl.lockedShort')}</Typography>
                  ) : (
                    <Typography variant="caption" color={p.runningSince ? 'primary.main' : 'text.secondary'} sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {t('bl.timeLeft', { time: fmt(left) })} · {p.limit} min
                    </Typography>
                  )}
                  {p && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (usedOf(p) / (p.limit * 60000)) * 100)}
                      color={locked ? 'error' : 'primary'}
                      sx={{ height: 3, borderRadius: 2, mt: 0.5, maxWidth: 220 }}
                    />
                  )}
                </Box>
                {p && !locked && (
                  <Tooltip title={p.runningSince ? t('bl.stop') : t('bl.start')}>
                    <IconButton color="primary" onClick={() => (p.runningSince ? pause(app, p) : start(app, p))} aria-label={p.runningSince ? t('bl.stop') : t('bl.start')}>
                      {p.runningSince ? <PauseIcon /> : <PlayArrowIcon />}
                    </IconButton>
                  </Tooltip>
                )}
                <Switch checked={Boolean(p)} onChange={() => onSwitch(app)} color={locked ? 'error' : 'primary'} slotProps={{ input: { 'aria-label': app.name } }} />
              </Stack>
            </Box>
          );
        })}
      </Card>

      <Alert severity="info" icon={<LockIcon />}>
        <Typography sx={{ fontWeight: 700 }}>{t('bl.guideTitle')}</Typography>
        <Typography variant="body2">{t('bl.guide', { app: 'Instagram' })}</Typography>
        {isAndroid && (
          <Button variant="contained" size="small" startIcon={<LockIcon />} href={timerLink('Instagram', 5)} sx={{ mt: 1.5 }}>
            {t('bl.openTimer')}
          </Button>
        )}
      </Alert>

      <MinutesDialog app={asking} onClose={() => setAsking(null)} onSave={saveLimit} />

      {/* after a switch is turned on: one tap to the phone's App timer + the exact steps */}
      <Dialog open={Boolean(lockHelp)} onClose={() => setLockHelp(null)} fullWidth maxWidth="xs">
        <DialogTitle>🔒 {lockHelp && t('bl.lockTitle', { app: lockHelp.app })}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{t('bl.lockWhy')}</Typography>
          <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 } }}>
            <li>{t('bl.lockStep1')}</li>
            <li>{lockHelp && t('bl.lockStep2', { app: lockHelp.app, min: lockHelp.min })}</li>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLockHelp(null)}>{t('bl.later')}</Button>
          <Button variant="contained" startIcon={<LockIcon />} href={lockHelp ? timerLink(lockHelp.app, lockHelp.min) : undefined}>
            {t('bl.openTimer')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
