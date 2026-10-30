import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LockClockIcon from '@mui/icons-material/LockClock';
import api, { errMsg } from '../api';
import { useApi } from '../cache';
import { useToast } from '../Toast';
import { prettyDate, pad } from '../utils';
import ReasonsDialog from '../components/ReasonsDialog';
import ReportCard from '../components/ReportCard';
import { useT } from '../i18n';

function shiftDate(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export default function DayView() {
  const { date: param } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();

  // '/tasks' (no params) is today's data, shared with the dashboard card via the cache
  const { data, error, setData, reload } = useApi('/tasks', param === 'today' ? undefined : { date: param });
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [reasonsOpen, setReasonsOpen] = useState(false);

  const report = data?.report || null;
  const setReport = (r) => setData((d) => ({ ...d, report: r }));
  const setTasks = (fn) => setData((d) => ({ ...d, tasks: fn(d.tasks) }));

  // All actions update the screen first, then sync with the server (rollback on error)
  const fail = (err) => {
    toast(errMsg(err), 'error');
    reload();
  };

  const addTask = async (e) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    const tempId = `tmp-${Date.now()}`;
    setTasks((ts) => [...ts, { _id: tempId, title: clean, done: false }]);
    setTitle('');
    try {
      const { data: res } = await api.post('/tasks', { title: clean });
      setTasks((ts) => ts.map((t) => (t._id === tempId ? { ...res.task, done: t.done } : t)));
    } catch (err) {
      fail(err);
    }
  };

  const toggle = async (task) => {
    setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, done: !t.done } : t)));
    if (!task.done) toast(t('day.doneToast'));
    try {
      await api.patch(`/tasks/${task._id}`, { done: !task.done });
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (task) => {
    setTasks((ts) => ts.filter((t) => t._id !== task._id));
    try {
      await api.delete(`/tasks/${task._id}`);
    } catch (err) {
      fail(err);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data: res } = await api.post('/reports/generate');
      setReport(res.report);
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setGenerating(false);
    }
  };

  if (error && !data) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <LockClockIcon color="disabled" sx={{ fontSize: 48 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>{errMsg(error)}</Typography>
          <Button variant="contained" onClick={() => navigate('/day/today')}>{t('day.goToday')}</Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={80} />
        <Skeleton variant="rounded" height={300} />
      </Stack>
    );
  }

  const total = data.tasks.length;
  const done = data.tasks.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const isToday = data.date === data.today;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, md: 3 },
        gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' },
        alignItems: 'start',
      }}
    >
      <Card>
        <CardContent>
          <Stack direction="row" sx={{ alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => navigate(`/day/${shiftDate(data.date, -1)}`)}>
              <ChevronLeftIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{prettyDate(data.date, true)}</Typography>
              {isToday ? <Chip size="small" color="primary" label={t('today.label')} sx={{ mt: 0.5 }} /> : (
                <Chip size="small" label={t('day.readOnly')} sx={{ mt: 0.5 }} />
              )}
            </Box>
            <IconButton disabled={isToday} onClick={() => navigate(`/day/${shiftDate(data.date, 1)}`)}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">{t('day.completed', { done, total })}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{pct}%</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={pct === 100 ? 'success' : 'primary'}
            sx={{ height: 10, borderRadius: 5, mb: 2 }}
          />

          {data.editable && (
            <Box component="form" onSubmit={addTask} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t('day.placeholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              <Button type="submit" variant="contained" startIcon={<AddIcon />} sx={{ flexShrink: 0 }}>
                {t('day.add')}
              </Button>
            </Box>
          )}

          {total === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>
              {data.editable ? t('day.emptyEdit') : t('day.emptyPast')}
            </Typography>
          ) : (
            <List disablePadding>
              {data.tasks.map((t) => (
                <ListItem
                  key={t._id}
                  disableGutters
                  divider
                  secondaryAction={
                    data.editable && (
                      <IconButton edge="end" onClick={() => remove(t)} disabled={String(t._id).startsWith('tmp-')}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    )
                  }
                >
                  <ListItemIcon sx={{ minWidth: 42 }}>
                    <Checkbox
                      edge="start"
                      checked={t.done}
                      disabled={!data.editable || String(t._id).startsWith('tmp-')}
                      onChange={() => toggle(t)}
                      color="success"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={t.title}
                    sx={{
                      pr: 4,
                      '& .MuiListItemText-primary': {
                        textDecoration: t.done ? 'line-through' : 'none',
                        color: t.done ? 'text.secondary' : 'text.primary',
                        wordBreak: 'break-word',
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {isToday && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>{t('day.aiTitle')}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('day.aiInfo')}
              </Typography>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={generate}
                disabled={generating || total === 0}
              >
                {generating ? t('day.generating') : t('day.generate')}
              </Button>
            </CardContent>
          </Card>
        )}

        {report ? (
          <ReportCard report={report} onAskReasons={() => setReasonsOpen(true)} />
        ) : (
          !isToday && total > 0 && <Alert severity="info">{t('day.noReport')}</Alert>
        )}
      </Stack>

      <ReasonsDialog
        report={report}
        open={reasonsOpen}
        onClose={() => setReasonsOpen(false)}
        onSaved={(r) => setReport(r)}
      />
    </Box>
  );
}
