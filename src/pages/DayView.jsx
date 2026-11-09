import { useEffect, useRef, useState } from 'react';
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
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LockClockIcon from '@mui/icons-material/LockClock';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
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

// seconds -> "m:ss" or "h:mm:ss"
function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export default function DayView() {
  const { date: param } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const t = useT();

  // '/tasks' (no params) is today's data, shared with the dashboard card via the cache
  const { data, error, setData, reload } = useApi('/tasks', param === 'today' ? undefined : { date: param });
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(''); // target minutes for a new task
  const [generating, setGenerating] = useState(false);
  const [reasonsOpen, setReasonsOpen] = useState(false);

  // Focus timer: at most one task runs at a time. `active` = { id, startedAt }
  const [active, setActive] = useState(null);
  const [, tick] = useState(0); // re-render every second while a timer runs
  const activeRef = useRef(null);
  activeRef.current = active;
  const timeUpNotified = useRef(new Set()); // task ids already warned "time up"

  useEffect(() => {
    if (!active) return undefined;
    const i = setInterval(() => {
      tick((n) => n + 1);
      // One-time "time up" nudge when the countdown hits the target
      const task = data?.tasks.find((x) => x._id === active.id);
      if (task?.estimateMinutes) {
        const elapsed = (task.timeSpent || 0) + Math.floor((Date.now() - active.startedAt) / 1000);
        if (elapsed >= task.estimateMinutes * 60 && !timeUpNotified.current.has(active.id)) {
          timeUpNotified.current.add(active.id);
          toast(t('day.timeUp'), 'info');
        }
      }
    }, 1000);
    return () => clearInterval(i);
  }, [active, data, toast, t]);

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
    const estNum = Number(estimate);
    const estimateMinutes = Number.isFinite(estNum) && estNum >= 1 ? Math.min(Math.round(estNum), 1440) : undefined;
    const tempId = `tmp-${Date.now()}`;
    setTasks((ts) => [...ts, { _id: tempId, title: clean, done: false, estimateMinutes }]);
    setTitle('');
    setEstimate('');
    try {
      const { data: res } = await api.post('/tasks', { title: clean, estimateMinutes });
      setTasks((ts) => ts.map((t) => (t._id === tempId ? { ...res.task, done: t.done } : t)));
    } catch (err) {
      fail(err);
    }
  };

  // Save the running timer's elapsed seconds to the task, then clear it
  const stopTimer = async () => {
    const cur = activeRef.current;
    if (!cur) return;
    setActive(null);
    const secs = Math.floor((Date.now() - cur.startedAt) / 1000);
    if (secs < 1) return;
    setTasks((ts) => ts.map((t) => (t._id === cur.id ? { ...t, timeSpent: (t.timeSpent || 0) + secs } : t)));
    try {
      await api.patch(`/tasks/${cur.id}`, { addSeconds: secs });
    } catch (err) {
      fail(err);
    }
  };

  const startTimer = async (task) => {
    await stopTimer(); // only one timer at a time
    setActive({ id: task._id, startedAt: Date.now() });
  };

  // Flush an unsaved running timer when leaving the page
  useEffect(
    () => () => {
      const cur = activeRef.current;
      if (!cur) return;
      const secs = Math.floor((Date.now() - cur.startedAt) / 1000);
      if (secs >= 1) api.patch(`/tasks/${cur.id}`, { addSeconds: secs }).catch(() => {});
    },
    [],
  );

  // Live total shown for a task (saved seconds + the currently running stretch)
  const liveTime = (task) =>
    (task.timeSpent || 0) + (active?.id === task._id ? Math.floor((Date.now() - active.startedAt) / 1000) : 0);

  const toggle = async (task) => {
    if (active?.id === task._id) await stopTimer();
    setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, done: !t.done } : t)));
    if (!task.done) toast(t('day.doneToast'));
    try {
      await api.patch(`/tasks/${task._id}`, { done: !task.done });
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (task) => {
    if (active?.id === task._id) setActive(null);
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
            <Box component="form" onSubmit={addTask} sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder={t('day.placeholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                sx={{ flex: { xs: '1 1 100%', sm: '1 1 160px' } }}
              />
              <TextField
                size="small"
                type="number"
                placeholder={t('day.estPlaceholder')}
                title={t('day.estTitle')}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                inputProps={{ min: 1, max: 1440, 'aria-label': t('day.estTitle') }}
                sx={{ width: 96 }}
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
            <Box>
              {data.tasks.map((task) => {
                const running = active?.id === task._id;
                const elapsed = liveTime(task);
                const isTmp = String(task._id).startsWith('tmp-');
                const canTime = data.editable && !task.done && !isTmp;
                // Countdown toward the user's target, or a plain stopwatch when no target was set
                let timeChip = null;
                if (canTime && (elapsed > 0 || running)) {
                  if (task.estimateMinutes) {
                    const remaining = task.estimateMinutes * 60 - elapsed;
                    const over = remaining < 0;
                    timeChip = (
                      <Chip
                        size="small"
                        color={over ? 'error' : running ? 'primary' : 'default'}
                        variant={running ? 'filled' : 'outlined'}
                        label={over ? t('day.over', { time: fmtTime(-remaining) }) : t('day.left', { time: fmtTime(remaining) })}
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      />
                    );
                  } else {
                    timeChip = (
                      <Chip
                        size="small"
                        color={running ? 'primary' : 'default'}
                        variant={running ? 'filled' : 'outlined'}
                        label={fmtTime(elapsed)}
                        sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 56 }}
                      />
                    );
                  }
                }
                const spentChip = (!data.editable || task.done) && task.timeSpent > 0 && (
                  <Chip size="small" variant="outlined" label={t('day.spent', { time: fmtTime(task.timeSpent) })} sx={{ fontVariantNumeric: 'tabular-nums', height: 22 }} />
                );
                return (
                  <Box
                    key={task._id}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 1, borderBottom: 1, borderColor: 'divider' }}
                  >
                    {/* Status: checkbox, or a cross for a missed past task */}
                    <Box sx={{ flexShrink: 0, width: 40, display: 'grid', placeItems: 'center' }}>
                      {!data.editable && !task.done ? (
                        <CloseIcon color="error" />
                      ) : (
                        <Checkbox
                          sx={{ p: 0.5 }}
                          checked={task.done}
                          disabled={!data.editable || isTmp}
                          onChange={() => toggle(task)}
                          color="success"
                        />
                      )}
                    </Box>

                    {/* Title + target/time meta (this column shrinks, never the controls) */}
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          wordBreak: 'break-word',
                          textDecoration: task.done ? 'line-through' : 'none',
                          color: task.done ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {task.title}
                      </Typography>
                      {(task.estimateMinutes || timeChip || spentChip) && (
                        <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
                          {task.estimateMinutes && (
                            <Typography variant="caption" color="text.secondary">{t('day.target', { n: task.estimateMinutes })}</Typography>
                          )}
                          {timeChip}
                          {spentChip}
                        </Stack>
                      )}
                    </Box>

                    {/* Controls: fixed, never overflow */}
                    <Box sx={{ flexShrink: 0, display: 'flex' }}>
                      {canTime && (
                        <IconButton
                          size="small"
                          color={running ? 'primary' : 'default'}
                          onClick={() => (running ? stopTimer() : startTimer(task))}
                          aria-label={running ? 'Pause timer' : 'Start timer'}
                        >
                          {running ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                      )}
                      {data.editable && (
                        <IconButton size="small" onClick={() => remove(task)} disabled={isTmp}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
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
