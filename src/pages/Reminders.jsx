import { useEffect, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
import { fmtWhen, remindersChanged, testReminder, REMINDERS_CHANGED } from '../reminders';
import { playTone, playBlob, speak, stopSpeaking, ttsSupported, saveAudio, deleteAudio } from '../reminderAudio';

const TONE_META = {
  chime: { icon: <NotificationsActiveIcon /> },
  bell: { icon: <NotificationsIcon /> },
  digital: { icon: <GraphicEqIcon /> },
  soft: { icon: <SpaIcon /> },
  song: { icon: <MusicNoteIcon /> },
  voice: { icon: <MicIcon /> },
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
  const h24 = (Number(hour) % 12) + (ampm === 'PM' ? 12 : 0);
  return new Date(y, m - 1, d, h24, Number(minute), 0, 0);
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
        background: active ? BRAND_GRADIENT : 'transparent',
        bgcolor: active ? undefined : 'action.hover',
        '& svg': { fontSize: size * 0.5 },
      }}
    >
      {children}
    </Box>
  );
}

export default function Reminders() {
  const { user, setUser } = useAuth();
  const t = useT();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [when, setWhen] = useState(() => toParts(inMinutes(10)));
  const [tone, setTone] = useState('chime');
  const [speakOn, setSpeakOn] = useState(true);
  const [song, setSong] = useState(null); // File
  const [voice, setVoice] = useState(null); // Blob
  const [recording, setRecording] = useState(0); // seconds while recording, 0 = idle
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState(null);
  const [busyPush, setBusyPush] = useState(false);

  const stopPreview = useRef(() => {});
  const recorder = useRef(null);
  const recTimer = useRef(null);
  const fileInput = useRef(null);

  const load = () => api.get('/reminders').then(({ data }) => setList(data.reminders)).catch((err) => toast(errMsg(err), 'error'));

  useEffect(() => {
    load();
    window.addEventListener(REMINDERS_CHANGED, load);
    return () => {
      window.removeEventListener(REMINDERS_CHANGED, load);
      stopPreview.current();
      stopSpeaking();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      clearInterval(recTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- previews ---------- */

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
    if (TONE_META[name] && ['chime', 'bell', 'digital', 'soft'].includes(name)) preview(() => playTone(name, { loop: false }));
    else stopPreview.current();
  };

  /* ---------- song ---------- */

  const onSongPicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) return toast(t('rem.notAudio'), 'error');
    if (file.size > MAX_SONG_MB * 1024 * 1024) return toast(t('rem.songTooBig', { mb: MAX_SONG_MB }), 'error');
    setSong(file);
    preview(() => playBlob(file, { loop: false }));
  };

  /* ---------- voice recording ---------- */

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

  /* ---------- save / delete ---------- */

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
      stopPreview.current();
      setTitle('');
      setWhen(toParts(inMinutes(10)));
      setVoice(null);
      remindersChanged();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };

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
  const tonesRow = ['chime', 'bell', 'digital', 'soft', 'song', 'voice'];

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Box>
        <Typography variant="h5">{t('nav.reminders')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('rem.sub')}</Typography>
      </Box>

      {!pushReady && (
        <Alert
          severity="info"
          action={pushSupported() && Notification.permission !== 'denied'
            ? <Button color="inherit" size="small" onClick={turnOnPush} disabled={busyPush}>{t('rem.enable')}</Button>
            : undefined}
        >
          {t('rem.pushOff')}
        </Alert>
      )}

      {/* ---------- new reminder ---------- */}
      <Card>
        <CardContent>
          <Stack spacing={2.25}>
            <TextField
              label={t('rem.titleLabel')}
              placeholder={t('rem.titlePh')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />

            {/* when */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('rem.when')}</Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1.5 }}>
                {[['rem.in10', () => inMinutes(10)], ['rem.in30', () => inMinutes(30)], ['rem.in1h', () => inMinutes(60)], ['rem.tom9', tomorrowAt9]].map(([k, fn]) => (
                  <Chip key={k} label={t(k)} variant="outlined" clickable onClick={() => setWhen(toParts(fn()))} />
                ))}
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="date"
                  label={t('rem.date')}
                  value={when.date}
                  onChange={(e) => e.target.value && setWhen((w) => ({ ...w, date: e.target.value }))}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: isoDate(new Date()) } }}
                  sx={{ flex: 1 }}
                />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TextField
                    select
                    label={t('rem.hour')}
                    value={when.hour}
                    onChange={(e) => setWhen((w) => ({ ...w, hour: Number(e.target.value) }))}
                    slotProps={{ select: { native: true } }}
                    sx={{ width: 76 }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
                  </TextField>
                  <Typography sx={{ fontWeight: 700 }}>:</Typography>
                  <TextField
                    select
                    label={t('rem.min')}
                    value={when.minute}
                    onChange={(e) => setWhen((w) => ({ ...w, minute: Number(e.target.value) }))}
                    slotProps={{ select: { native: true } }}
                    sx={{ width: 76 }}
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{pad(m)}</option>)}
                  </TextField>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    color="primary"
                    value={when.ampm}
                    onChange={(_, v) => v && setWhen((w) => ({ ...w, ampm: v }))}
                    sx={{ height: 56 }}
                  >
                    <ToggleButton value="AM" sx={{ px: 1.5, fontWeight: 700 }}>AM</ToggleButton>
                    <ToggleButton value="PM" sx={{ px: 1.5, fontWeight: 700 }}>PM</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
              </Stack>
              <Typography variant="caption" color={inPast ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.75 }}>
                {inPast ? t('rem.pastTime') : `⏰ ${fmtWhen(at, t)}`}
              </Typography>
            </Box>

            {/* sound */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('rem.sound')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1 }}>
                {tonesRow.map((name) => {
                  const on = tone === name;
                  return (
                    <ButtonBase
                      key={name}
                      onClick={() => chooseTone(name)}
                      sx={{
                        flexDirection: 'column', gap: 0.75, py: 1.25, borderRadius: 3,
                        border: 1.5, borderColor: on ? 'primary.main' : 'divider',
                        bgcolor: on ? 'action.selected' : 'transparent',
                      }}
                    >
                      <IconBubble active={on} size={36}>{TONE_META[name].icon}</IconBubble>
                      <Typography sx={{ fontSize: 12, fontWeight: on ? 700 : 500 }}>{t(`rem.tone.${name}`)}</Typography>
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
            </Box>

            {/* read aloud */}
            {ttsSupported() && (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <RecordVoiceOverIcon color="primary" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{t('rem.speak')}</Typography>
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
            )}

            <Button variant="contained" size="large" startIcon={<AlarmAddIcon />} onClick={save} disabled={saving || Boolean(recording)}>
              {t('rem.save')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ---------- list ---------- */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {t('rem.upcoming')} {list && `(${upcoming.length})`}
      </Typography>
      {!list ? (
        <Skeleton variant="rounded" height={72} />
      ) : !upcoming.length ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>{t('rem.empty')}</Typography>
      ) : (
        <Stack spacing={1}>
          {upcoming.map((r) => <ReminderRow key={r._id} r={r} t={t} onDelete={remove} />)}
        </Stack>
      )}

      {past.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, pt: 1 }}>{t('rem.past')}</Typography>
          <Stack spacing={1} sx={{ opacity: 0.65 }}>
            {past.map((r) => <ReminderRow key={r._id} r={r} t={t} onDelete={remove} />)}
          </Stack>
        </>
      )}
    </Stack>
  );
}

function ReminderRow({ r, t, onDelete }) {
  return (
    <Card>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5 }}>
        <IconBubble>{TONE_META[r.tone]?.icon || <AlarmIcon />}</IconBubble>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600 }} noWrap>{r.title}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">{fmtWhen(r.at, t)}</Typography>
            {r.speak && <RecordVoiceOverIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
          </Stack>
        </Box>
        <Tooltip title={t('rem.test')}>
          <IconButton onClick={() => testReminder(r)}><PlayArrowIcon /></IconButton>
        </Tooltip>
        <IconButton onClick={() => onDelete(r)} aria-label="delete"><DeleteOutlineIcon /></IconButton>
      </Stack>
    </Card>
  );
}
