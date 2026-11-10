import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import MicIcon from '@mui/icons-material/Mic';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HearingIcon from '@mui/icons-material/Hearing';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import CampaignIcon from '@mui/icons-material/Campaign';
import PhonelinkRingIcon from '@mui/icons-material/PhonelinkRing';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { keyframes } from '@mui/system';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../Toast';
import { pushSupported } from '../push';
import { DEFAULT_SENSITIVITY, augment, buildProfile, mfcc, packTemplates, thresholdFor, unpackTemplates } from '../voice/matcher';
import {
  cancelRecording,
  deleteProfile,
  ensureAudio,
  loadProfile,
  micSupported,
  recordSample,
  saveProfile,
  startAlarm,
  startGuard,
  stopGuard,
  subscribe,
  updateSensitivity,
} from '../voice/guard';

const SAMPLES = 1; // one recording; matcher.augment() makes slower/faster copies
const pulse = keyframes`0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}70%{box-shadow:0 0 0 18px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}`;

function useGuard() {
  const [s, setS] = useState(null);
  useEffect(() => subscribe(setS), []);
  return s || { status: 'off', level: 0 };
}

const Meter = ({ level }) => (
  <LinearProgress variant="determinate" value={Math.round(level * 100)} color={level > 0.15 ? 'success' : 'inherit'} sx={{ height: 8, borderRadius: 4 }} />
);

// Turn a DTW score into an easy "match %" for people: 100% = sounds like your samples, 0% = something else
const pct = (profile, score) =>
  Math.round(Math.max(0, Math.min(1, (profile.impostor - score) / Math.max(1e-6, profile.impostor - profile.baseline))) * 100);

function StepTitle({ n, title, done }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
      <Box sx={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, bgcolor: done ? 'success.main' : 'primary.main', color: '#fff' }}>
        {done ? '✓' : n}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
    </Stack>
  );
}

// ---------------- Step 1: set your voice ----------------
function VoiceSetup({ userId, profile, onSaved }) {
  const toast = useToast();
  const guard = useGuard();
  const [phrase, setPhrase] = useState(profile?.phrase || '');
  const [samples, setSamples] = useState([]); // MFCC sequences
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(!profile);

  useEffect(() => () => cancelRecording(), []);

  const record = async () => {
    setError('');
    setRecording(true);
    try {
      await ensureAudio();
      const seg = await recordSample();
      const next = [...samples, mfcc(seg)];
      const templates = SAMPLES === 1 ? augment(next[0]) : next;
      setSamples(next);
      if (next.length === SAMPLES) {
        const stats = buildProfile(templates);
        if (stats.quality < 2) {
          setSamples([]);
          setError('Recording saaf nahi aayi. Shaant jagah pe thoda zor se dobara bolo.');
          return;
        }
        const p = { phrase: phrase.trim(), templates: packTemplates(templates), ...stats, sensitivity: profile?.sensitivity ?? DEFAULT_SENSITIVITY, createdAt: new Date().toISOString() };
        if (!saveProfile(userId, p)) throw new Error('Is browser me save nahi ho paya (storage band hai?)');
        setEditing(false);
        setSamples([]);
        onSaved(p);
        toast('Aapki awaaz set ho gayi! 🎉');
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setRecording(false);
    }
  };

  if (!editing && profile) {
    return (
      <Stack spacing={1.5}>
        <Alert severity="success" icon={<CheckCircleIcon />}>
          Aapki voice set hai. Phrase: <b>"{profile.phrase}"</b>
        </Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => setEditing(true)} disabled={guard.status !== 'off'}>Dobara record karo</Button>
          <Button
            color="error"
            disabled={guard.status !== 'off'}
            onClick={() => {
              if (!window.confirm('Saved voice delete karni hai?')) return;
              deleteProfile(userId);
              onSaved(null);
              setEditing(true);
            }}
          >
            Delete
          </Button>
        </Stack>
      </Stack>
    );
  }

  const ready = phrase.trim().length >= 3;
  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Ek phrase chuno aur sirf <b>1 baar</b> bolo, jaise <b>"Open Alexa"</b>, <b>"Oye Chhotu kahan hai"</b> ya{' '}
        <b>"Mera phone bolo"</b>. 3–5 shabd best hain. Roz-marra ki baat wale shabd (jaise "hello") mat rakho.
      </Typography>
      <TextField
        label="Aapka secret phrase"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value.slice(0, 60))}
        disabled={samples.length > 0 || recording}
        placeholder="Oye Chhotu kahan hai"
        helperText="Ye sirf aapko yaad dilane ke liye hai. Pehchaan aapki awaaz ki recording se hoti hai."
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        {Array.from({ length: SAMPLES }, (_, i) => (
          <Chip key={i} label={SAMPLES === 1 ? 'Recording' : `Sample ${i + 1}`} color={i < samples.length ? 'success' : 'default'} icon={i < samples.length ? <CheckCircleIcon /> : undefined} />
        ))}
      </Stack>
      {recording && (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>🎙️ Boliye: "{phrase}" — bol ke chup ho jaiye</Typography>
          <Meter level={guard.level} />
        </Box>
      )}
      {error && <Alert severity="warning">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" startIcon={<MicIcon />} onClick={record} disabled={!ready || recording}>
          {recording ? 'Sun raha hoon…' : SAMPLES === 1 ? 'Awaaz record karo (1 baar)' : `Sample ${samples.length + 1} record karo`}
        </Button>
        {samples.length > 0 && !recording && (
          <Button onClick={() => setSamples([])}>Reset</Button>
        )}
        {profile && !recording && (
          <Button onClick={() => { setSamples([]); setEditing(false); }}>Cancel</Button>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Tip: utni hi door se aur utni hi awaaz me bolo jitna aap phone dhundte waqt bologe (jaise 2–3 meter door se).
      </Typography>
    </Stack>
  );
}

// ---------------- Step 2: guard mode ----------------
function GuardMode({ userId, profile, onChange }) {
  const guard = useGuard();
  const [sens, setSens] = useState(profile?.sensitivity ?? DEFAULT_SENSITIVITY);
  const on = guard.status !== 'off';
  const p = profile && { ...profile, templates: null, sensitivity: sens };

  const toggle = async () => {
    if (on) return stopGuard();
    await ensureAudio();
    await startGuard({ ...profile, templates: unpackTemplates(profile.templates), sensitivity: sens });
  };

  const changeSens = (v) => {
    setSens(v);
    updateSensitivity(v);
    const next = { ...profile, sensitivity: v };
    saveProfile(userId, next);
    onChange(next);
  };

  if (!profile) return <Alert severity="info">Pehle Step 1 me apni awaaz set karo.</Alert>;

  const last = guard.last;
  const needed = p && pct(p, thresholdFor(p));
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Button
          size="large"
          variant="contained"
          color={on ? 'error' : 'success'}
          startIcon={on ? <StopCircleIcon /> : <HearingIcon />}
          onClick={toggle}
          sx={{ py: 1.5, px: 3, borderRadius: 8, fontWeight: 700, animation: guard.status === 'listening' ? `${pulse} 1.8s infinite` : 'none' }}
        >
          {on ? 'Guard band karo' : 'Guard ON karo'}
        </Button>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>
            {guard.status === 'listening' ? '👂 Sun raha hoon…' : guard.status === 'alarm' ? '🚨 Alarm baj raha hai' : 'Band hai'}
          </Typography>
          {guard.status === 'listening' && <Meter level={guard.level} />}
        </Box>
      </Stack>

      {guard.error && <Alert severity="error">{guard.error}</Alert>}
      {guard.status === 'listening' && (
        <Alert severity={guard.wakeLock ? 'success' : 'warning'}>
          {guard.wakeLock
            ? 'Screen ON rakhi gayi hai. App ko khula chhod do, phone lock mat karo. Brightness kam kar sakte ho.'
            : 'Screen apne aap band ho sakti hai. Phone ki screen-timeout lambi kar do, warna sunna band ho jayega.'}
        </Alert>
      )}

      {last && Number.isFinite(last.score) && (
        <Typography variant="body2" color={last.match ? 'success.main' : 'text.secondary'}>
          Aakhri awaaz: match {pct(p, last.score)}% (alarm ke liye {needed}%+ chahiye)
        </Typography>
      )}
      {last && !Number.isFinite(last.score) && (
        <Typography variant="body2" color="text.secondary">Aakhri awaaz: phrase ki lambai se match nahi hui</Typography>
      )}

      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Sensitivity: {sens}</Typography>
        <Slider value={sens} min={1} max={10} step={1} marks onChange={(_, v) => changeSens(v)} valueLabelDisplay="auto" />
        <Typography variant="caption" color="text.secondary">
          Kam = sirf bilkul same awaaz pe bajega (galti se kam bajega). Zyada = door se bhi pakad lega (par galti se bhi baj sakta hai).
        </Typography>
      </Box>

      <Button variant="outlined" startIcon={<CampaignIcon />} onClick={() => startAlarm('test')} sx={{ alignSelf: 'flex-start' }}>
        Alarm test karo
      </Button>
    </Stack>
  );
}

// ---------------- Step 3: ring from another device ----------------
function RemoteRing() {
  const toast = useToast();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const ring = async () => {
    setBusy(true);
    try {
      let except;
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        except = (await reg?.pushManager.getSubscription())?.endpoint;
      } catch {
        /* this device has no push */
      }
      const { data } = await api.post('/notifications/ring', { except });
      toast(data.message, data.sent ? 'success' : 'warning');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Laptop ya kisi dost ke phone se isi account me login karo aur ye button dabao. Aapke phone pe notification aayega
        aur agar wahan app khula hai to siren bhi bajega.
      </Typography>
      {!user?.pushEnabled && pushSupported() && (
        <Alert severity="info">Is device pe notifications ON nahi hain. Phone pe Settings me notifications ON karna zaroori hai.</Alert>
      )}
      <Button variant="contained" startIcon={<PhonelinkRingIcon />} onClick={ring} disabled={busy} sx={{ alignSelf: 'flex-start' }}>
        {busy ? 'Bhej raha hoon…' : 'Mera phone bajao'}
      </Button>
    </Stack>
  );
}

const TIPS = [
  ['📱', 'App khula rakho', 'Browser me mic tabhi sunta hai jab app khuli ho aur screen ON ho. Guard ON karte hi app screen ko band hone se rokti hai.'],
  ['🔊', 'Media volume full', 'Siren media volume pe bajta hai. Phone silent pe ho to bhi Android pe bajega, bas media volume upar rakho. iPhone me side ka silent switch band rakho.'],
  ['🔋', 'Charging pe lagao', 'Lagataar sunna battery khata hai. Travel me charging pe ya power bank ke saath best hai.'],
  ['📶', 'Internet nahi chahiye', 'Awaaz pehchanna pura phone pe hota hai. Recording kahin upload nahi hoti. Sirf "Mera phone bajao" button ke liye internet chahiye.'],
  ['🗣️', 'Aapki awaaz', 'Alarm aapki recording se thoda sa bhi milti-julti awaaz pe baj jata hai (sensitivity 8). Galti se zyada baje to slider kam karo, door se na pakde to badhao.'],
];

export default function FindPhone() {
  const { user } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState(() => loadProfile(userId));

  if (!micSupported()) {
    return <Alert severity="error">Is browser me mic support nahi hai. Chrome (Android) ya Safari (iPhone) me app kholo.</Alert>;
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 820 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>📱 Phone Dhundo</Typography>
        <Typography color="text.secondary">
          Phone kahin rakh ke bhool gaye? Apni set ki hui awaaz me phrase bolo aur phone zor se siren bajayega.
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <StepTitle n={1} title="Apni awaaz set karo" done={Boolean(profile)} />
          <VoiceSetup userId={userId} profile={profile} onSaved={setProfile} />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <StepTitle n={2} title="Guard mode (sunna shuru karo)" />
          <GuardMode key={profile?.createdAt || 'none'} userId={userId} profile={profile} onChange={setProfile} />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <StepTitle n={3} title="Doosre device se bajao" />
          <RemoteRing />
        </CardContent>
      </Card>

      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography sx={{ fontWeight: 700 }}>❓ Zaroori baatein</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1.5}>
            {TIPS.map(([icon, title, desc]) => (
              <Stack key={title} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 22, lineHeight: 1.2 }}>{icon}</Typography>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary">{desc}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
