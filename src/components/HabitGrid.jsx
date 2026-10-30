import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api, { errMsg } from '../api';
import { useApi } from '../cache';
import { useToast } from '../Toast';
import { daysInMonth, pad } from '../utils';
import { useT } from '../i18n';

const isTemp = (id) => String(id).startsWith('tmp-');

export default function HabitGrid({ month }) {
  const toast = useToast();
  const t = useT();
  const { data, setData, reload } = useApi('/habits', { month });
  const [name, setName] = useState('');

  const setHabits = (fn) => setData((d) => ({ ...d, habits: fn(d.habits) }));

  // All actions update the screen first, then sync with the server (rollback on error)
  const fail = (err) => {
    toast(errMsg(err), 'error');
    reload();
  };

  const add = async (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    const tempId = `tmp-${Date.now()}`;
    setHabits((hs) => [...hs, { _id: tempId, name: clean, completedDates: [] }]);
    setName('');
    try {
      const { data: res } = await api.post('/habits', { name: clean });
      setHabits((hs) => hs.map((h) => (h._id === tempId ? res.habit : h)));
    } catch (err) {
      fail(err);
    }
  };

  const toggle = async (habit) => {
    const today = data.today;
    setHabits((hs) =>
      hs.map((h) => {
        if (h._id !== habit._id) return h;
        const has = h.completedDates.includes(today);
        return { ...h, completedDates: has ? h.completedDates.filter((d) => d !== today) : [...h.completedDates, today] };
      }),
    );
    try {
      await api.patch(`/habits/${habit._id}/toggle`);
    } catch (err) {
      fail(err);
    }
  };

  const remove = async (habit) => {
    if (!window.confirm(t('habits.confirmDelete', { name: habit.name }))) return;
    setHabits((hs) => hs.filter((h) => h._id !== habit._id));
    try {
      await api.delete(`/habits/${habit._id}`);
    } catch (err) {
      fail(err);
    }
  };

  const copyPrevious = async () => {
    const { data: res } = await api.post('/habits/copy-previous');
    toast(res.created ? t('habits.copied', { n: res.created }) : t('habits.nothingToCopy'), res.created ? 'success' : 'info');
    reload();
  };

  if (!data) return <Card><LinearProgress /></Card>;

  const n = daysInMonth(month);
  const dates = Array.from({ length: n }, (_, i) => `${month}-${pad(i + 1)}`);
  const elapsed = data.editable ? Number(data.today.slice(8)) : n;

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="h6">{t('habits.title')}</Typography>
          {data.editable && (
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={copyPrevious}>
              {t('habits.copy')}
            </Button>
          )}
        </Stack>

        {data.editable && (
          <Box component="form" onSubmit={add} sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('habits.placeholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" variant="contained" sx={{ minWidth: 0, px: 2 }}>
              <AddIcon />
            </Button>
          </Box>
        )}

        {data.habits.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            {data.editable ? t('habits.emptyEdit') : t('habits.emptyPast')}
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <Box component="th" sx={stickyHead}>{t('habits.header')}</Box>
                  {dates.map((d) => (
                    <Box
                      component="th"
                      key={d}
                      sx={{
                        ...headCell,
                        color: d === data.today ? 'primary.main' : 'text.secondary',
                        fontWeight: d === data.today ? 800 : 500,
                      }}
                    >
                      {Number(d.slice(8))}
                    </Box>
                  ))}
                  <Box component="th" sx={headCell}>%</Box>
                </tr>
              </thead>
              <tbody>
                {data.habits.map((h) => {
                  const doneSet = new Set(h.completedDates);
                  const pct = Math.round((h.completedDates.length / elapsed) * 100);
                  return (
                    <tr key={h._id}>
                      <Box component="td" sx={stickyCell}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600, maxWidth: { xs: 100, sm: 160 } }} title={h.name}>
                            {h.name}
                          </Typography>
                          {data.editable && (
                            <IconButton size="small" onClick={() => remove(h)} disabled={isTemp(h._id)}>
                              <DeleteOutlineIcon fontSize="inherit" />
                            </IconButton>
                          )}
                        </Stack>
                      </Box>
                      {dates.map((d) => {
                        const isToday = d === data.today && data.editable;
                        const done = doneSet.has(d);
                        return (
                          <Box
                            component="td"
                            key={d}
                            sx={{
                              ...bodyCell,
                              bgcolor: isToday ? 'action.selected' : 'transparent',
                              opacity: data.editable && d > data.today ? 0.35 : 1,
                            }}
                          >
                            {isToday ? (
                              <Tooltip title={t('habits.todayTick')}>
                                <Checkbox size="small" checked={done} onChange={() => toggle(h)} disabled={isTemp(h._id)} sx={{ p: 0.25 }} />
                              </Tooltip>
                            ) : done ? (
                              <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                            ) : (
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'divider', mx: 'auto' }} />
                            )}
                          </Box>
                        );
                      })}
                      <Box component="td" sx={{ ...bodyCell, fontWeight: 700, minWidth: 40 }}>{pct}%</Box>
                    </tr>
                  );
                })}
              </tbody>
            </Box>
          </Box>
        )}
        {data.editable && data.habits.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {t('habits.hint')}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

const headCell = {
  px: 0.5,
  py: 1,
  minWidth: 30,
  textAlign: 'center',
  borderBottom: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
};
const bodyCell = { px: 0.25, py: 0.5, textAlign: 'center', borderBottom: 1, borderColor: 'divider' };
const stickyHead = {
  ...headCell,
  textAlign: 'left',
  px: 1.5,
  position: 'sticky',
  left: 0,
  zIndex: 2,
  borderRight: 1,
  borderRightColor: 'divider',
};
const stickyCell = {
  ...bodyCell,
  textAlign: 'left',
  px: 1.5,
  position: 'sticky',
  left: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
  borderRight: 1,
  borderRightColor: 'divider',
};
