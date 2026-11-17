import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
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
import { fmtWhen, REMINDERS_CHANGED, REMINDER_TEST, remindersChanged } from '../reminders';

const RUNG_KEY = 'ht_rung';
const MAX_RING_MS = 2 * 60 * 1000;
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

  const stopSound = () => { stopRef.current(); stopRef.current = () => {}; };

  const startSound = useCallback(async (r) => {
    stopSound();
    try {
      const stop = await ringReminder(r, user?.language);
      stopRef.current = stop;
      setNeedsTap(false);
      const auto = setTimeout(stop, MAX_RING_MS);
      stopRef.current = () => { clearTimeout(auto); stop(); };
    } catch {
      setNeedsTap(true); // browser blocked autoplay: show a "play" button
    }
  }, [user?.language]);

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

  return (
    <Dialog open={Boolean(ringing)} onClose={close} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: 5, overflow: 'hidden' } } }}>
      {ringing && (
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ background: BRAND_GRADIENT, color: '#fff', pt: 4, pb: 3, px: 3 }}>
            <Box
              sx={{
                width: 84, height: 84, mx: 'auto', mb: 2, borderRadius: '50%',
                display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,.18)',
                animation: needsTap ? 'none' : 'ringShake 1s ease-in-out infinite',
                '@keyframes ringShake': {
                  '0%,100%': { transform: 'rotate(0)' },
                  '10%,30%,50%': { transform: 'rotate(-14deg)' },
                  '20%,40%,60%': { transform: 'rotate(14deg)' },
                  '70%': { transform: 'rotate(0)' },
                },
              }}
            >
              <AlarmIcon sx={{ fontSize: 48 }} />
            </Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, wordBreak: 'break-word' }}>{ringing.title}</Typography>
            <Typography sx={{ opacity: 0.85, mt: 0.5 }}>{fmtWhen(ringing.at, t)}</Typography>
          </Box>
          <Stack spacing={1.25} sx={{ p: 2.5 }}>
            {needsTap && (
              <Button variant="outlined" size="large" startIcon={<VolumeUpIcon />} onClick={() => startSound(ringing)}>
                {t('rem.playSound')}
              </Button>
            )}
            <Button variant="contained" size="large" onClick={close} sx={{ py: 1.25, fontWeight: 700 }}>
              {t('rem.stop')}
            </Button>
            <Button size="large" startIcon={<SnoozeIcon />} onClick={snooze}>
              {t('rem.snooze')}
            </Button>
          </Stack>
        </Box>
      )}
    </Dialog>
  );
}
