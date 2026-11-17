import { useEffect, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import ButtonBase from '@mui/material/ButtonBase';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import AlarmAddIcon from '@mui/icons-material/AlarmAdd';
import AlarmIcon from '@mui/icons-material/Alarm';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import SpaIcon from '@mui/icons-material/Spa';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../Toast';
import { useT } from '../i18n';
import { enablePush, pushSupported } from '../push';
import { BRAND_GRADIENT } from '../theme';
import { fmtWhen, fmtTime, dayLabel, remindersChanged, testReminder, REMINDERS_CHANGED } from '../reminders';
import { playTone, playBlob, speak, stopSpeaking, ttsSupported, saveAudio, deleteAudio } from '../reminderAudio';

const TONES = ['chime', 'bell', 'digital', 'soft', 'song', 'voice'];
const BUILTIN = ['chime', 'bell', 'digital', 'soft'];
const TONE_ICON = {
  chime: <NotificationsActiveIcon />,
  bell: <NotificationsIcon />,
  digital: <GraphicEqIcon />,
  soft: <SpaIcon />,
  song: <MusicNoteIcon />,
  voice: <MicIcon />,
};
const MAX_SONG_MB = 15;
const MAX_REC_SEC = 60;

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date -> form fields (12-hour clock) */
function toParts(d) {
  const h = d.getHours();
  return { date: isoDate(d), hour: h % 12 || 12, minute: d.getMinutes(), ampm: h < 12 ? 'AM' : 'PM' };
}
/** form fields -> Date */
function fromParts({ date, hour, minute, ampm }) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, (Number(hour) % 12) + (ampm === 'PM' ? 12 : 0), Number(minute), 0, 0);
}
const inMinutes = (n) => {
  const d = new Date(Date.now() + n * 60_000);
  d.setSeconds(0, 0);
  return d;
};
const tomorrowAt9 = () => {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(9, 0, 0, 0);
  return d;
};

/** Small round icon used for tones and list rows */
function IconBubble({ children, active, size = 40 }) {
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'grid', placeItems: 'center',
        color: active ? '#fff' : 'primary.main',
        bgcolor: 'action.hover',
        ...(active ? { background: BRAND_GRADIENT } : {}),
        '& svg': { fontSize: size * 0.5 },
      }}
    >
      {children}
    </Box>
  );
}

/* =====================================================================
   Page: list of reminders + "New" button
   ===================================================================== */

export default function Reminders() {
  const { user, setUser } = useAuth();
  const t = useT();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busyPush, setBusyPush] = useState(false);
  const [, tick] = useState(0);

  const load = () => api.get('/reminders').then(({ data }) => setList(data.reminders)).catch((err) => toast(errMsg(err), 'error'));

  useEffect(() => {
    load();
    window.addEventListener(REMINDERS_CHANGED, load);
    const id = setInterval(() => tick((n) => n + 1), 30_000); // move rung ones to "Done"
    return () => {
      window.removeEventListener(REMINDERS_CHANGED, load);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = async (r) => {
    setList((l) => l.filter((x) => x._id !== r._id));
    try {
      await api.delete(`/reminders/${r._id}`);
      deleteAudio(r._id);
      remindersChanged();
    } catch (err) {
      toast(errMsg(err), 'error');
      load();
    }
  };

  const turnOnPush = async () => {
    setBusyPush(true);
    try {
      setUser(await enablePush());
      toast(t('notify.on'));
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusyPush(false);
    }
  };

  const pushReady = user?.pushEnabled && pushSupported() && Notification.permission === 'granted';
  const now = Date.now();
  const upcoming = (list || []).filter((r) => new Date(r.at).getTime() > now);
  const past = (list || []).filter((r) => new Date(r.at).getTime() <= now).reverse();

  return (
    <Stack spacing={2} sx={{ maxWidth: 680 }}>
      {/* header */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5">{t('nav.reminders')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {list ? t('rem.count', { n: upcoming.length }) : ' '}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
          sx={{ background: BRAND_GRADIENT, px: 2.25, py: 1, borderRadius: 99, boxShadow: '0 6px 18px rgba(99,102,241,.35)' }}
        >
          {t('rem.new')}
        </Button>
      </Stack>

      {!pushReady && (
        <Alert
          severity="info"
          sx={{ borderRadius: 3 }}
          action={pushSupported() && Notification.permission !== 'denied'
            ? <Button color="inherit" size="small" onClick={turnOnPush} disabled={busyPush}>{t('rem.enable')}</Button>
            : undefined}
        >
          {t('rem.pushOff')}
        </Alert>
      )}

      {/* upcoming */}
      {!list ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={76} sx={{ borderRadius: 4 }} />
          <Skeleton variant="rounded" height={76} sx={{ borderRadius: 4 }} />
        </Stack>
      ) : !upcoming.length ? (
        <Card sx={{ textAlign: 'center', py: 5, px: 3 }}>
          <Box sx={{ width: 72, height: 72, mx: 'auto', mb: 2, borderRadius: '50%', display: 'grid', placeItems: 'center', background: BRAND_GRADIENT, color: '#fff' }}>
            <AlarmIcon sx={{ fontSize: 38 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{t('rem.empty')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>{t('rem.sub')}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>{t('rem.new')}</Button>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {upcoming.map((r) => <ReminderRow key={r._id} r={r} t={t} onDelete={remove} />)}
        </Stack>
      )}

      {/* done */}
      {past.length > 0 && (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ pt: 1, fontWeight: 700 }}>{t('rem.past')}</Typography>
          <Stack spacing={1}>
            {past.map((r) => <ReminderRow key={r._id} r={r} t={t} onDelete={remove} done />)}
          </Stack>
        </>
      )}

      <NewReminderDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </Stack>
  );
}

/** One reminder: big time on the left, title + day, test & delete on the right */
function ReminderRow({ r, t, onDelete, done }) {
  return (
    <Card sx={{ opacity: done ? 0.6 : 1 }}>
      <Stack direction="row" sx={{ alignItems: 'stretch' }}>
        <Box
          sx={{
            width: 92, flexShrink: 0, py: 1.5, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            borderRight: 1, borderColor: 'divider',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 17, lineHeight: 1.1 }}>{fmtTime(r.at).replace(/\s?[AP]M/, '')}</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'primary.main' }}>{fmtTime(r.at).match(/[AP]M/)?.[0]}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>{dayLabel(r.at, t)}</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: 'center', pl: 1.75, pr: 0.75, py: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, textDecoration: done ? 'line-through' : 'none' }} noWrap>{r.title}</Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25, color: 'text.secondary' }}>
              <Box sx={{ display: 'flex', '& svg': { fontSize: 15 } }}>{TONE_ICON[r.tone] || <AlarmIcon />}</Box>
              <Typography variant="caption">{t(`rem.tone.${r.tone}`)}</Typography>
              {r.speak && <RecordVoiceOverIcon sx={{ fontSize: 15 }} />}
            </Stack>
          </Box>
          <Tooltip title={t('rem.test')}>
            <IconButton size="small" onClick={() => testReminder(r)} sx={{ bgcolor: 'action.hover' }}><PlayArrowIcon fontSize="small" /></IconButton>
          </Tooltip>
          <IconButton size="small" onClick={() => onDelete(r)} aria-label="delete"><DeleteOutlineIcon fontSize="small" /></IconButton>
        </Stack>
      </Stack>
    </Card>
  );
}

function Section({ label, children }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75, lineHeight: 1.5 }}>{label}</Typography>
      {children}
    </Box>
  );
}

/* =====================================================================
   "+ New" form: full screen on phones, a dialog on desktop
   ===================================================================== */

function NewReminderDialog({ open, onClose }) {
  const { user } = useAuth();
  const t = useT();
  const toast = useToast();
  const phone = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(() => toParts(inMinutes(10)));
  const [tone, setTone] = useState('chime');
  const [speakOn, setSpeakOn] = useState(true);
  const [song, setSong] = useState(null); // File
  const [voice, setVoice] = useState(null); // Blob
  const [recording, setRecording] = useState(0); // seconds while recording, 0 = idle
  const [saving, setSaving] = useState(false);

  const stopPreview = useRef(() => {});
  const recorder = useRef(null);
  const recTimer = useRef(null);
  const fileInput = useRef(null);

  const stopAll = () => {
    stopPreview.current();
    stopPreview.current = () => {};
    stopSpeaking();
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };

  // Fresh form every time it opens
  useEffect(() => {
    if (!open) return;
    setTitle('');
    setWhen(toParts(inMinutes(10)));
    setTone('chime');
    setSpeakOn(true);
    setSong(null);
    setVoice(null);
  }, [open]);

  useEffect(() => () => { stopAll(); clearInterval(recTimer.current); }, []);

  const close = () => { stopAll(); onClose(); };

  const preview = async (fn) => {
    stopPreview.current();
    stopSpeaking();
    try {
      stopPreview.current = (await fn()) || (() => {});
    } catch {
      toast(t('rem.cantPlay'), 'error');
    }
  };

  const chooseTone = (name) => {
    setTone(name);
    if (BUILTIN.includes(name)) preview(() => playTone(name, { loop: false }));
    else stopPreview.current();
  };

  const onSongPicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) return toast(t('rem.notAudio'), 'error');
    if (file.size > MAX_SONG_MB * 1024 * 1024) return toast(t('rem.songTooBig', { mb: MAX_SONG_MB }), 'error');
    setSong(file);
    preview(() => playBlob(file, { loop: false }));
  };

  const startRec = async () => {
    stopPreview.current();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return toast(t('rem.micDenied'), 'error');
    }
    const chunks = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((tr) => tr.stop());
      clearInterval(recTimer.current);
      setRecording(0);
      if (chunks.length) setVoice(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
    recorder.current = rec;
    rec.start();
    setRecording(1);
    const started = Date.now();
    recTimer.current = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000) + 1;
      setRecording(s);
      if (s >= MAX_REC_SEC && rec.state === 'recording') rec.stop();
    }, 1000);
  };
  const stopRec = () => recorder.current?.state === 'recording' && recorder.current.stop();

  const at = fromParts(when);
  const inPast = at.getTime() < Date.now();

  const save = async () => {
    if (!title.trim()) return toast(t('rem.needTitle'), 'error');
    if (inPast) return toast(t('rem.pastTime'), 'error');
    if (tone === 'song' && !song) return toast(t('rem.needSong'), 'error');
    if (tone === 'voice' && !voice) return toast(t('rem.needVoice'), 'error');
    setSaving(true);
    try {
      const { data } = await api.post('/reminders', { title: title.trim(), at: at.toISOString(), tone, speak: speakOn });
      if (tone === 'song') await saveAudio(data.reminder._id, song);
      if (tone === 'voice') await saveAudio(data.reminder._id, voice);
      toast(t('rem.saved', { when: fmtWhen(data.reminder.at, t) }));
      remindersChanged();
      close();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      fullScreen={phone}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: phone ? 0 : 5, bgcolor: 'background.default', backgroundImage: 'none' } } }}
    >
      {/* top bar */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={close} aria-label="close"><CloseIcon /></IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: 18, flex: 1 }}>{t('rem.newTitle')}</Typography>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={3}>
          <TextField
            autoFocus
            label={t('rem.titleLabel')}
            placeholder={t('rem.titlePh')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            fullWidth
          />

          {/* when */}
          <Section label={t('rem.when')}>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
              {[['rem.in10', () => inMinutes(10)], ['rem.in30', () => inMinutes(30)], ['rem.in1h', () => inMinutes(60)], ['rem.tom9', tomorrowAt9]].map(([k, fn]) => (
                <Chip key={k} label={t(k)} variant="outlined" clickable onClick={() => setWhen(toParts(fn()))} />
              ))}
            </Stack>
            <Stack spacing={1.5}>
              <TextField
                type="date"
                label={t('rem.date')}
                value={when.date}
                onChange={(e) => e.target.value && setWhen((w) => ({ ...w, date: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: isoDate(new Date()) } }}
                fullWidth
              />
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  select
                  label={t('rem.hour')}
                  value={when.hour}
                  onChange={(e) => setWhen((w) => ({ ...w, hour: Number(e.target.value) }))}
                  slotProps={{ select: { native: true } }}
                  sx={{ flex: 1 }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                </TextField>
                <Typography sx={{ fontWeight: 800, fontSize: 20 }}>:</Typography>
                <TextField
                  select
                  label={t('rem.min')}
                  value={when.minute}
                  onChange={(e) => setWhen((w) => ({ ...w, minute: Number(e.target.value) }))}
                  slotProps={{ select: { native: true } }}
                  sx={{ flex: 1 }}
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{pad(m)}</option>)}
                </TextField>
                <ToggleButtonGroup
                  exclusive
                  color="primary"
                  value={when.ampm}
                  onChange={(_, v) => v && setWhen((w) => ({ ...w, ampm: v }))}
                  sx={{ height: 56 }}
                >
                  <ToggleButton value="AM" sx={{ px: 1.75, fontWeight: 800 }}>AM</ToggleButton>
                  <ToggleButton value="PM" sx={{ px: 1.75, fontWeight: 800 }}>PM</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>
            <Box
              sx={{
                mt: 1.5, px: 1.5, py: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1,
                bgcolor: inPast ? 'error.main' : 'action.hover', color: inPast ? '#fff' : 'text.primary',
              }}
            >
              <AlarmIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{inPast ? t('rem.pastTime') : fmtWhen(at, t)}</Typography>
            </Box>
          </Section>

          {/* sound */}
          <Section label={t('rem.sound')}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {TONES.map((name) => {
                const on = tone === name;
                return (
                  <ButtonBase
                    key={name}
                    onClick={() => chooseTone(name)}
                    sx={{
                      flexDirection: 'column', gap: 0.75, py: 1.5, borderRadius: 3,
                      border: 1.5, borderColor: on ? 'primary.main' : 'divider',
                      bgcolor: on ? 'action.selected' : 'background.paper',
                    }}
                  >
                    <IconBubble active={on} size={38}>{TONE_ICON[name]}</IconBubble>
                    <Typography sx={{ fontSize: 12.5, fontWeight: on ? 800 : 500 }}>{t(`rem.tone.${name}`)}</Typography>
                  </ButtonBase>
                );
              })}
            </Box>

            {tone === 'song' && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
                <input ref={fileInput} type="file" accept="audio/*" hidden onChange={onSongPicked} />
                <Button variant="outlined" startIcon={<MusicNoteIcon />} onClick={() => fileInput.current?.click()}>
                  {song ? t('rem.changeSong') : t('rem.pickSong')}
                </Button>
                {song && (
                  <>
                    <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{song.name}</Typography>
                    <IconButton onClick={() => preview(() => playBlob(song, { loop: false }))}><PlayArrowIcon /></IconButton>
                    <IconButton onClick={() => stopPreview.current()}><StopIcon /></IconButton>
                  </>
                )}
              </Stack>
            )}

            {tone === 'voice' && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
                {recording ? (
                  <Button variant="contained" color="error" startIcon={<StopIcon />} onClick={stopRec}>
                    {t('rem.stopRec')} · {recording}s
                  </Button>
                ) : (
                  <Button variant="outlined" startIcon={<MicIcon />} onClick={startRec}>
                    {voice ? t('rem.reRecord') : t('rem.record')}
                  </Button>
                )}
                {voice && !recording && (
                  <>
                    <Chip size="small" color="success" icon={<CheckCircleIcon />} label={t('rem.recorded')} />
                    <IconButton onClick={() => preview(() => playBlob(voice, { loop: false }))}><PlayArrowIcon /></IconButton>
                    <IconButton onClick={() => stopPreview.current()}><StopIcon /></IconButton>
                  </>
                )}
              </Stack>
            )}
            {['song', 'voice'].includes(tone) && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>{t('rem.deviceOnly')}</Typography>
            )}
          </Section>

          {/* read aloud */}
          {ttsSupported() && (
            <Card>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5 }}>
                <IconBubble size={38}><RecordVoiceOverIcon /></IconBubble>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{t('rem.speak')}</Typography>
                  <Typography variant="caption" color="text.secondary">{t('rem.speakNote')}</Typography>
                </Box>
                <Tooltip title={t('rem.listen')}>
                  <span>
                    <IconButton disabled={!title.trim()} onClick={() => preview(() => speak(`Reminder. ${title.trim()}`, user?.language).then(() => null))}>
                      <PlayArrowIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Switch checked={speakOn} onChange={(e) => setSpeakOn(e.target.checked)} />
              </Stack>
            </Card>
          )}
        </Stack>
      </Box>

      {/* save bar stays at the bottom */}
      <Divider />
      <Box sx={{ p: 2, pb: phone ? 'calc(16px + env(safe-area-inset-bottom))' : 2 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          startIcon={<AlarmAddIcon />}
          onClick={save}
          disabled={saving || Boolean(recording)}
          sx={{ py: 1.4, borderRadius: 99, background: BRAND_GRADIENT, fontSize: 16 }}
        >
          {t('rem.save')}
        </Button>
      </Box>
    </Dialog>
  );
}
