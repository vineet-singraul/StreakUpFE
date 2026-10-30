import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import api, { errMsg } from '../api';
import { useApi } from '../cache';
import { useToast } from '../Toast';
import { useT } from '../i18n';

const SAMPLE = 'Wake up 5 AM\nWorkout 45 min\nNo junk food\nRead 10 pages\n3L water\nNo social media before 9 PM\nSleep by 10:30 PM';

function StartForm({ onStarted }) {
  const t = useT();
  const toast = useToast();
  const [title, setTitle] = useState('30 Day Hard Challenge');
  const [rules, setRules] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/challenge', { title, items: rules.split('\n') });
      onStarted(data.challenge);
      toast(t('ch.started'));
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 640 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <EmojiEventsIcon color="warning" />
            <Typography variant="h6">{t('ch.newTitle')}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">{t('ch.newSub')}</Typography>
          <TextField label={t('ch.name')} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField label={t('ch.rules')} helperText={t('ch.rulesHelp')} value={rules} onChange={(e) => setRules(e.target.value)} multiline minRows={6} fullWidth />
          <Button variant="contained" size="large" startIcon={<EmojiEventsIcon />} onClick={start} disabled={busy}>
            {t('ch.start')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function Challenge() {
  const t = useT();
  const toast = useToast();
  const { data, setData } = useApi('/challenge');
  const c = data?.challenge;

  const setChallenge = (challenge) => setData((d) => ({ ...d, challenge }));

  const toggle = async (item) => {
    // optimistic tick
    setChallenge({
      ...c,
      items: c.items.map((i) => (i._id !== item._id ? i : {
        ...i,
        doneDays: i.doneDays.includes(c.today) ? i.doneDays.filter((d) => d !== c.today) : [...i.doneDays, c.today],
      })),
    });
    try {
      const { data: res } = await api.patch(`/challenge/items/${item._id}/toggle`);
      setChallenge(res.challenge);
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const restart = async () => {
    if (!window.confirm(t('ch.confirmEnd'))) return;
    await api.delete('/challenge');
    setChallenge(null);
  };

  if (!data) return <Skeleton variant="rounded" height={320} />;
  if (!c) return <StartForm onStarted={setChallenge} />;

  const days = Array.from({ length: c.days }, (_, i) => i + 1);
  const shownDay = Math.min(c.today, c.days);
  const todayDone = c.items.filter((i) => i.doneDays.includes(c.today)).length;

  const stats = [
    [t('ch.day'), `${shownDay}/${c.days}`],
    [t('ch.points'), c.points],
    [t('ch.perfect'), c.perfectDays],
    [t('ch.today'), c.finished ? '🏁' : `${todayDone}/${c.items.length}`],
  ];

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5">🏆 {c.title}</Typography>
          <Typography color="text.secondary">
            {c.finished ? t('ch.finished') : t('ch.rulesLine', { tick: data.rules.perTick, bonus: data.rules.perfectBonus })}
          </Typography>
        </Box>
        <Button size="small" color="inherit" startIcon={<RestartAltIcon />} onClick={restart} sx={{ flexShrink: 0 }}>
          {t('ch.new')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="h5">{value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <LinearProgress variant="determinate" value={(shownDay / c.days) * 100} sx={{ height: 8, borderRadius: 4 }} />

      <Card sx={{ minWidth: 0 }}>
        <CardContent>
          <Box sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <Box component="th" sx={sticky(true)}>{t('ch.rule')}</Box>
                  {days.map((d) => (
                    <Box component="th" key={d} sx={{ ...cell, fontWeight: d === c.today ? 800 : 500, color: d === c.today ? 'primary.main' : 'text.secondary' }}>
                      {t('ch.dayShort')}{d}
                    </Box>
                  ))}
                  <Box component="th" sx={cell}>✓</Box>
                </tr>
              </thead>
              <tbody>
                {c.items.map((item) => (
                  <tr key={item._id}>
                    <Box component="td" sx={sticky(false)}>
                      <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: { xs: 110, sm: 200 } }} noWrap title={item.name}>{item.name}</Typography>
                    </Box>
                    {days.map((d) => {
                      const done = item.doneDays.includes(d);
                      const isToday = d === c.today;
                      return (
                        <Box component="td" key={d} sx={{ ...cell, bgcolor: isToday ? 'action.selected' : 'transparent', opacity: d > c.today ? 0.35 : 1 }}>
                          {isToday ? (
                            <Checkbox size="small" checked={done} onChange={() => toggle(item)} sx={{ p: 0.25 }} color="success" />
                          ) : done ? (
                            <CheckIcon color="success" sx={{ fontSize: 18 }} />
                          ) : d < c.today ? (
                            <CloseIcon color="error" sx={{ fontSize: 16 }} />
                          ) : null}
                        </Box>
                      );
                    })}
                    <Box component="td" sx={{ ...cell, fontWeight: 700 }}>{item.doneDays.length}</Box>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('ch.hint')}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}

const cell = { px: 0.5, py: 0.5, minWidth: 34, textAlign: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' };
const sticky = (head) => ({ ...cell, textAlign: 'left', px: 1.5, position: 'sticky', left: 0, zIndex: head ? 2 : 1, borderRight: 1, borderRightColor: 'divider' });
