import { useEffect, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import InputBase from '@mui/material/InputBase';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import ButtonBase from '@mui/material/ButtonBase';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
          sx={{ background: BRAND_GRADIENT, color: '#fff', px: 2.25, py: 1, borderRadius: 99, boxShadow: '0 6px 18px rgba(99,102,241,.35)' }}
        >
          {t('rem.new')}
        </Button>
      </Stack>

      {!pushReady && (
        <Alert
          severity="info"
          sx={{ borderRadius: '14px' }}
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
          <Skeleton variant="rounded" height={76} sx={{ borderRadius: '20px' }} />
          <Skeleton variant="rounded" height={76} sx={{ borderRadius: '20px' }} />
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

/* =====================================================================
   "+ New" form: full screen on phones, a dialog on desktop
   ===================================================================== */

export function NewReminderDialog({ open, onClose }) {
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
  const dateRef = useRef(null);

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
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 1, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <IconButton onClick={close} aria-label="close"><CloseIcon /></IconButton>
        <Typography sx={{ fontWeight: 700, fontSize: 17, flex: 1 }}>{t('rem.newTitle')}</Typography>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2.5 }}>
        <Stack spacing={2.5}>
          {/* title */}
          <Panel>
            <InputBase
              autoFocus
              multiline
              maxRows={3}
              placeholder={t('rem.titlePh')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              inputProps={{ maxLength: 200, 'aria-label': t('rem.titleLabel') }}
              sx={{ width: '100%', px: 2, py: 1.75, fontSize: 17, fontWeight: 600 }}
            />
          </Panel>

          {/* schedule */}
          <Box>
            <PanelLabel>{t('rem.schedule')}</PanelLabel>
            <Panel>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', gap: 1, py: 2.5 }}>
                <BigSelect
                  value={when.hour}
                  onChange={(e) => setWhen((w) => ({ ...w, hour: Number(e.target.value) }))}
                  aria-label={t('rem.hour')}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{pad(h)}</option>)}
                </BigSelect>
                <Typography sx={{ fontSize: 40, fontWeight: 700, opacity: 0.5, mt: -0.75 }}>:</Typography>
                <BigSelect
                  value={when.minute}
                  onChange={(e) => setWhen((w) => ({ ...w, minute: Number(e.target.value) }))}
                  aria-label={t('rem.min')}
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{pad(m)}</option>)}
                </BigSelect>
                <Stack sx={{ ml: 1, borderRadius: '10px', overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                  {['AM', 'PM'].map((v) => {
                    const on = when.ampm === v;
                    return (
                      <ButtonBase
                        key={v}
                        onClick={() => setWhen((w) => ({ ...w, ampm: v }))}
                        sx={{
                          px: 2, height: 33, fontSize: 14, fontWeight: 700,
                          color: on ? '#fff' : 'text.secondary',
                          bgcolor: on ? 'primary.main' : 'transparent',
                          transition: 'background-color .15s',
                        }}
                      >
                        {v}
                      </ButtonBase>
                    );
                  })}
                </Stack>
              </Stack>
              <Divider />
              <ButtonBase
                onClick={() => { const el = dateRef.current; try { el.showPicker(); } catch { el.focus(); el.click(); } }}
                sx={{ width: '100%', justifyContent: 'flex-start', gap: 1.5, px: 2, py: 1.5, position: 'relative' }}
              >
                <RowIcon><CalendarMonthIcon /></RowIcon>
                <Typography sx={{ fontWeight: 600, flex: 1, textAlign: 'left' }}>{t('rem.date')}</Typography>
                <Typography color="text.secondary" sx={{ fontWeight: 500 }}>{dayLabel(at, t)}{dayLabel(at, t).includes(',') ? '' : `, ${at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</Typography>
                <ChevronRightIcon sx={{ color: 'text.secondary' }} />
                <input
                  ref={dateRef}
                  type="date"
                  value={when.date}
                  min={isoDate(new Date())}
                  onChange={(e) => e.target.value && setWhen((w) => ({ ...w, date: e.target.value }))}
                  tabIndex={-1}
                  aria-hidden
                  style={{ position: 'absolute', right: 16, bottom: 0, width: 1, height: 1, opacity: 0, border: 0, padding: 0 }}
                />
              </ButtonBase>
            </Panel>
          </Box>

          {/* sound */}
          <Box>
            <PanelLabel>{t('rem.sound')}</PanelLabel>
            <Panel>
              <Box sx={{ p: 1.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
                  {TONES.map((name) => {
                    const on = tone === name;
                    return (
                      <ButtonBase
                        key={name}
                        onClick={() => chooseTone(name)}
                        sx={{
                          justifyContent: 'flex-start', gap: 0.75, py: 0.75, pl: 0.75, pr: 1, borderRadius: '10px',
                          border: 1, borderColor: on ? 'primary.main' : 'divider',
                          bgcolor: on ? 'action.selected' : 'transparent',
                          minWidth: 0,
                        }}
                      >
                        <IconBubble active={on} size={24}>{TONE_ICON[name]}</IconBubble>
                        <Typography noWrap sx={{ fontSize: 12, fontWeight: on ? 700 : 500 }}>{t(`rem.tone.${name}`)}</Typography>
                      </ButtonBase>
                    );
                  })}
                </Box>

                {tone === 'song' && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
                    <input ref={fileInput} type="file" accept="audio/*" hidden onChange={onSongPicked} />
                    <Button size="small" variant="outlined" startIcon={<MusicNoteIcon />} onClick={() => fileInput.current?.click()}>
                      {song ? t('rem.changeSong') : t('rem.pickSong')}
                    </Button>
                    {song && (
                      <>
                        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{song.name}</Typography>
                        <IconButton size="small" onClick={() => preview(() => playBlob(song, { loop: false }))}><PlayArrowIcon /></IconButton>
                        <IconButton size="small" onClick={() => stopPreview.current()}><StopIcon /></IconButton>
                      </>
                    )}
                  </Stack>
                )}

                {tone === 'voice' && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
                    {recording ? (
                      <Button size="small" variant="contained" color="error" startIcon={<StopIcon />} onClick={stopRec}>
                        {t('rem.stopRec')} · {recording}s
                      </Button>
                    ) : (
                      <Button size="small" variant="outlined" startIcon={<MicIcon />} onClick={startRec}>
                        {voice ? t('rem.reRecord') : t('rem.record')}
                      </Button>
                    )}
                    {voice && !recording && (
                      <>
                        <Chip size="small" color="success" icon={<CheckCircleIcon />} label={t('rem.recorded')} />
                        <IconButton size="small" onClick={() => preview(() => playBlob(voice, { loop: false }))}><PlayArrowIcon /></IconButton>
                        <IconButton size="small" onClick={() => stopPreview.current()}><StopIcon /></IconButton>
                      </>
                    )}
                  </Stack>
                )}
                {['song', 'voice'].includes(tone) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('rem.deviceOnly')}</Typography>
                )}
              </Box>

              {ttsSupported() && (
                <>
                  <Divider />
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2, py: 1.25 }}>
                    <RowIcon><RecordVoiceOverIcon /></RowIcon>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>{t('rem.speak')}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>{t('rem.speakNote')}</Typography>
                    </Box>
                    <Tooltip title={t('rem.listen')}>
                      <span>
                        <IconButton size="small" disabled={!title.trim()} onClick={() => preview(() => speak(`Reminder. ${title.trim()}`, user?.language).then(() => null))}>
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Switch checked={speakOn} onChange={(e) => setSpeakOn(e.target.checked)} />
                  </Stack>
                </>
              )}
            </Panel>
          </Box>
        </Stack>
      </Box>

      {/* footer: summary + save */}
      <Box sx={{ px: 2, pt: 1.5, pb: phone ? 'calc(16px + env(safe-area-inset-bottom))' : 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography
          variant="body2"
          sx={{ textAlign: 'center', mb: 1.25, fontWeight: 500, color: inPast ? 'error.main' : 'text.secondary' }}
        >
          {inPast ? t('rem.pastTime') : t('rem.rings', { when: fmtWhen(at, t) })}
        </Typography>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={save}
          disabled={saving || Boolean(recording) || inPast}
          sx={{
            py: 1.4, borderRadius: '14px', fontSize: 16, fontWeight: 700, color: '#fff',
            background: BRAND_GRADIENT,
            '&.Mui-disabled': { background: 'none', bgcolor: 'action.disabledBackground' },
          }}
        >
          {t('rem.save')}
        </Button>
      </Box>
    </Dialog>
  );
}

/* ---------- small building blocks for the form ---------- */

/** Rounded grouped container (iOS-settings style) */
function Panel({ children }) {
  return (
    <Box sx={{ borderRadius: '16px', border: 1, borderColor: 'divider', bgcolor: 'background.paper', overflow: 'hidden' }}>
      {children}
    </Box>
  );
}

function PanelLabel({ children }) {
  return (
    <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.secondary', mb: 1, ml: 0.5 }}>
      {children}
    </Typography>
  );
}

/** Tinted square icon at the start of a row */
function RowIcon({ children }) {
  return (
    <Box sx={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'action.hover', '& svg': { fontSize: 19 } }}>
      {children}
    </Box>
  );
}

/** Big hour / minute digits; a native select so phones show their own wheel picker */
function BigSelect({ children, ...props }) {
  return (
    <Box
      component="select"
      {...props}
      sx={{
        appearance: 'none', WebkitAppearance: 'none', border: 0, outline: 0, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 46, fontWeight: 800, lineHeight: 1, letterSpacing: -1,
        color: 'text.primary', bgcolor: 'action.hover', borderRadius: '12px',
        width: 84, py: 1, textAlign: 'center', textAlignLast: 'center',
        '&:hover, &:focus-visible': { bgcolor: 'action.selected' },
        '& option': { fontSize: 16, color: 'text.primary', bgcolor: 'background.paper' },
      }}
    >
      {children}
    </Box>
  );
}
