import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import StopIcon from '@mui/icons-material/Stop';
import Typography from '@mui/material/Typography';
import AlarmIcon from '@mui/icons-material/Alarm';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SnoozeIcon from '@mui/icons-material/Snooze';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../Toast';
import { useT } from '../i18n';
import { BRAND_GRADIENT } from '../theme';
import { ringReminder } from '../reminderAudio';
import { fmtWhen, fmtTime, dayLabel, REMINDERS_CHANGED, REMINDER_TEST, remindersChanged } from '../reminders';

const RUNG_KEY = 'ht_rung';
const MAX_RING_MS = 5 * 60 * 1000; // alarm keeps ringing for 5 minutes unless stopped
const DAY = 86_400_000;

function rungSet() {
  try { return new Set(JSON.parse(localStorage.getItem(RUNG_KEY) || '[]')); } catch { return new Set(); }
}
function markRung(id) {
  try {
    const ids = [...rungSet(), id].slice(-60);
    localStorage.setItem(RUNG_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}
// A snoozed reminder keeps its id, so the "already rang" mark includes its time
const ringKey = (r) => `${r._id}@${r.at}`;

/**
 * Lives in the Layout: while the app is open it rings reminders right on time
 * (sound + read-aloud), and also when the user opens the app from a reminder notification.
 */
export default function ReminderRinger() {
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [ringing, setRinging] = useState(null);
  const [needsTap, setNeedsTap] = useState(false);
  const stopRef = useRef(() => {});
  const timers = useRef([]);

  const [endsAt, setEndsAt] = useState(0); // when the 5-minute ring stops by itself
  const [, setNow] = useState(0);

  const stopSound = () => { stopRef.current(); stopRef.current = () => {}; setEndsAt(0); };

  const startSound = useCallback(async (r) => {
    stopSound();
    try {
      const stop = await ringReminder(r, user?.language);
      setNeedsTap(false);
      // keep the screen awake and buzz the phone while it rings
      let lock = null;
      navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
      const buzz = setInterval(() => navigator.vibrate?.([600, 300, 600]), 2500);
      const auto = setTimeout(() => stopRef.current(), MAX_RING_MS);
      setEndsAt(Date.now() + MAX_RING_MS);
      stopRef.current = () => {
        clearTimeout(auto);
        clearInterval(buzz);
        navigator.vibrate?.(0);
        lock?.release().catch(() => {});
        stop();
        setEndsAt(0);
      };
    } catch {
      setNeedsTap(true); // browser blocked autoplay: show a "play" button
    }
  }, [user?.language]);

  // 1-second tick for the clock and the countdown on the alarm screen
  useEffect(() => {
    if (!ringing) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ringing]);

  const ring = useCallback((r) => {
    const key = ringKey(r);
    if (rungSet().has(key)) return;
    markRung(key);
    navigator.vibrate?.([500, 200, 500, 200, 500]);
    setRinging(r);
    startSound(r);
  }, [startSound]);

  const load = useCallback(async () => {
    let list;
    try {
      ({ data: { reminders: list } } = await api.get('/reminders'));
    } catch {
      return;
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const now = Date.now();
    for (const r of list) {
      const due = new Date(r.at).getTime();
      if (due > now && due - now < DAY) timers.current.push(setTimeout(() => ring(r), due - now));
      else if (due <= now && now - due < 2 * 60 * 1000) ring(r); // just became due while the tab slept
    }
    return list;
  }, [ring]);

  // Schedule on start, after any change, and whenever the app comes back to the screen
  useEffect(() => {
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    window.addEventListener(REMINDERS_CHANGED, load);
    document.addEventListener('visibilitychange', onVisible);
    const hourly = setInterval(load, 60 * 60 * 1000);
    return () => {
      timers.current.forEach(clearTimeout);
      window.removeEventListener(REMINDERS_CHANGED, load);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(hourly);
    };
  }, [load]);

  // "Test" button on the Reminders page: show the real alarm screen right now
  useEffect(() => {
    const onTest = (e) => { setRinging(e.detail); startSound(e.detail); };
    window.addEventListener(REMINDER_TEST, onTest);
    return () => window.removeEventListener(REMINDER_TEST, onTest);
  }, [startSound]);

  // Opened from a reminder notification: /reminders?ring=<id>
  useEffect(() => {
    const id = new URLSearchParams(search).get('ring');
    if (!id) return;
    navigate(pathname, { replace: true });
    api.get('/reminders').then(({ data }) => {
      const r = data.reminders.find((x) => x._id === id);
      if (!r || rungSet().has(ringKey(r))) return;
      markRung(ringKey(r));
      setRinging(r);
      startSound(r);
    }).catch(() => {});
  }, [search, pathname, navigate, startSound]);

  useEffect(() => () => stopSound(), []);

  const close = () => { stopSound(); setRinging(null); setNeedsTap(false); };

  const snooze = async () => {
    const r = ringing;
    close();
    try {
      await api.patch(`/reminders/${r._id}`, { at: new Date(Date.now() + 5 * 60 * 1000).toISOString() });
      toast(t('rem.snoozed'));
      remindersChanged();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const left = endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0;
  const clock = fmtTime(new Date());

  // Full-screen alarm, like a phone's clock app: big time, title, a large round Stop button
  return (
    <Dialog
      open={Boolean(ringing)}
      onClose={() => {}} // only the Stop / Snooze buttons close it
      fullScreen
      slotProps={{ paper: { sx: { background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 45%, #0e7490 100%)', color: '#fff' } } }}
    >
      {ringing && (
        <Stack
          sx={{
            minHeight: '100%', alignItems: 'center', justifyContent: 'space-between', textAlign: 'center',
            px: 3, pt: 'calc(48px + env(safe-area-inset-top))', pb: 'calc(40px + env(safe-area-inset-bottom))',
          }}
        >
          {/* top: clock + label */}
          <Box>
            <Typography sx={{ fontSize: 13, letterSpacing: 3, fontWeight: 700, opacity: 0.75, textTransform: 'uppercase' }}>
              ⏰ {t('rem.ringing')}
            </Typography>
            <Typography sx={{ fontSize: { xs: 64, sm: 80 }, fontWeight: 800, lineHeight: 1.05, mt: 1, letterSpacing: -2 }}>
              {clock.replace(/\s?[AP]M/, '')}
              <Box component="span" sx={{ fontSize: 22, fontWeight: 700, ml: 1, letterSpacing: 0 }}>{clock.match(/[AP]M/)?.[0]}</Box>
            </Typography>
            <Typography sx={{ opacity: 0.75, mt: 0.5 }}>{dayLabel(new Date(), t)}</Typography>
          </Box>

          {/* middle: pulsing alarm + title */}
          <Box sx={{ width: '100%', maxWidth: 440 }}>
            <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto', mb: 3 }}>
              {[0, 1].map((i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.25)',
                    animation: endsAt ? `ringPulse 2s ease-out ${i}s infinite` : 'none',
                    '@keyframes ringPulse': { '0%': { transform: 'scale(1)', opacity: 0.7 }, '100%': { transform: 'scale(2.1)', opacity: 0 } },
                  }}
                />
              ))}
              <Box
                sx={{
                  position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
                  display: 'grid', placeItems: 'center', background: BRAND_GRADIENT,
                  boxShadow: '0 12px 40px rgba(34,211,238,.35)',
                  animation: endsAt ? 'ringShake 1.2s ease-in-out infinite' : 'none',
                  '@keyframes ringShake': {
                    '0%,100%': { transform: 'rotate(0)' },
                    '8%,24%,40%': { transform: 'rotate(-14deg)' },
                    '16%,32%,48%': { transform: 'rotate(14deg)' },
                    '56%': { transform: 'rotate(0)' },
                  },
                }}
              >
                <AlarmIcon sx={{ fontSize: 60 }} />
              </Box>
            </Box>
            <Typography sx={{ fontSize: { xs: 26, sm: 30 }, fontWeight: 800, lineHeight: 1.25, wordBreak: 'break-word' }}>
              {ringing.title}
            </Typography>
            <Typography sx={{ opacity: 0.75, mt: 1 }}>{fmtWhen(ringing.at, t)}</Typography>
            {endsAt > 0 && (
              <Typography sx={{ opacity: 0.6, mt: 1, fontSize: 13 }}>
                {t('rem.ringLeft', { m: Math.floor(left / 60), s: String(left % 60).padStart(2, '0') })}
              </Typography>
            )}
            {needsTap && (
              <Button
                variant="outlined"
                size="large"
                startIcon={<VolumeUpIcon />}
                onClick={() => startSound(ringing)}
                sx={{ mt: 2.5, color: '#fff', borderColor: 'rgba(255,255,255,.5)', borderRadius: 99, px: 3 }}
              >
                {t('rem.playSound')}
              </Button>
            )}
          </Box>

          {/* bottom: big Stop + Snooze */}
          <Stack spacing={2.5} sx={{ alignItems: 'center' }}>
            <ButtonBase
              onClick={close}
              aria-label={t('rem.stop')}
              sx={{
                width: 112, height: 112, borderRadius: '50%', flexDirection: 'column', gap: 0.5,
                bgcolor: '#ef4444', color: '#fff', boxShadow: '0 10px 34px rgba(239,68,68,.55)',
                border: '4px solid rgba(255,255,255,.25)',
                transition: 'transform .15s',
                '&:active': { transform: 'scale(.94)' },
              }}
            >
              <StopIcon sx={{ fontSize: 44 }} />
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{t('rem.stop')}</Typography>
            </ButtonBase>
            <Button
              startIcon={<SnoozeIcon />}
              onClick={snooze}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,.12)', borderRadius: 99, px: 3, py: 1.1, '&:hover': { bgcolor: 'rgba(255,255,255,.2)' } }}
            >
              {t('rem.snooze')}
            </Button>
          </Stack>
        </Stack>
      )}
    </Dialog>
  );
}
