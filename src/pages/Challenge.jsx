import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ButtonBase from '@mui/material/ButtonBase';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme, alpha } from '@mui/material/styles';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StarIcon from '@mui/icons-material/Star';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import api, { errMsg } from '../api';
import { useApi } from '../cache';
import { useToast } from '../Toast';
import { useT } from '../i18n';
import { prettyDate } from '../utils';

const SAMPLE = 'Wake up 5 AM\nWorkout 45 min\nNo junk food\nRead 10 pages\n3L water\nNo social media before 9 PM\nSleep by 10:30 PM';
const HERO_BG = 'linear-gradient(135deg, #f97316 0%, #ec4899 55%, #8b5cf6 100%)';

/* ---------- start form ---------- */
function StartForm({ onStarted }) {
  const t = useT();
  const toast = useToast();
  const [days, setDays] = useState('');
  const [title, setTitle] = useState('');
  const [rules, setRules] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const daysNum = Number(days);
  const daysError = !Number.isInteger(daysNum) || daysNum < 10 || daysNum > 90;
  const titleError = !title.trim();

  const start = async () => {
    setTouched(true);
    if (daysError || titleError) return;
    setBusy(true);
    try {
      const { data } = await api.post('/challenge', { days: daysNum, title: title.trim(), items: rules.split('\n') });
      onStarted(data.challenge);
      toast(t('ch.started'));
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 680, mx: 'auto', overflow: 'hidden' }}>
      <Box sx={{ background: HERO_BG, color: '#fff', p: { xs: 2.5, sm: 3 } }}>
        <EmojiEventsIcon sx={{ fontSize: 40 }} />
        <Typography variant="h5" sx={{ mt: 1 }}>{t('ch.newTitle')}</Typography>
        <Typography sx={{ opacity: 0.9 }}>{t('ch.newSub')}</Typography>
      </Box>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('ch.days')}
              type="number"
              required
              value={days}
              onChange={(e) => setDays(e.target.value)}
              error={touched && daysError}
              helperText={touched && daysError ? t('ch.daysError') : t('ch.daysHelp')}
              slotProps={{ htmlInput: { min: 10, max: 90, inputMode: 'numeric' } }}
              sx={{ width: { xs: '100%', sm: 180 }, flexShrink: 0 }}
            />
            <TextField
              label={t('ch.name')}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={touched && titleError}
              helperText={touched && titleError ? t('ch.titleError') : ' '}
              fullWidth
            />
          </Stack>
          <TextField label={t('ch.rules')} helperText={t('ch.rulesHelp')} value={rules} onChange={(e) => setRules(e.target.value)} multiline minRows={6} fullWidth />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="contained" size="large" startIcon={<EmojiEventsIcon />} onClick={start} disabled={busy} sx={{ flexGrow: 1 }}>
              {t('ch.start')}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ---------- 30-day grid (editable today column when onToggle is given) ---------- */
function ChallengeGrid({ c, onToggle }) {
  const t = useT();
  const days = Array.from({ length: c.days }, (_, i) => i + 1);
  return (
    <Box sx={{ overflowX: 'auto', borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
        <thead>
          <tr>
            <Box component="th" sx={stickyCol(true)}>{t('ch.rule')}</Box>
            {days.map((d) => (
              <Box component="th" key={d} sx={{ ...headCell, color: d === c.today && c.active ? 'primary.main' : 'text.secondary', fontWeight: d === c.today && c.active ? 800 : 600 }}>
                {d}
              </Box>
            ))}
            <Box component="th" sx={headCell}>Σ</Box>
          </tr>
        </thead>
        <tbody>
          {c.items.map((item) => (
            <tr key={item._id}>
              <Box component="td" sx={stickyCol(false)}>
                <Typography variant="body2" noWrap title={item.name} sx={{ fontWeight: 600, maxWidth: { xs: 108, sm: 220 } }}>{item.name}</Typography>
              </Box>
              {days.map((d) => {
                const done = item.doneDays.includes(d);
                const editable = onToggle && d === c.today;
                const missed = !done && d < c.today;
                const future = d > c.today;
                return (
                  <Box component="td" key={d} sx={bodyCell}>
                    <ButtonBase
                      disabled={!editable}
                      onClick={() => onToggle?.(item)}
                      aria-label={`${item.name} D${d}`}
                      sx={(theme) => ({
                        width: 26,
                        height: 26,
                        borderRadius: 1.5,
                        border: editable ? 2 : 1,
                        borderColor: editable ? 'primary.main' : done ? 'success.main' : missed ? alpha(theme.palette.error.main, 0.35) : 'divider',
                        bgcolor: done ? 'success.main' : missed ? alpha(theme.palette.error.main, 0.12) : 'transparent',
                        color: done ? '#fff' : 'error.main',
                        opacity: future ? 0.4 : 1,
                      })}
                    >
                      {done ? <CheckIcon sx={{ fontSize: 16 }} /> : missed ? <CloseIcon sx={{ fontSize: 14 }} /> : null}
                    </ButtonBase>
                  </Box>
                );
              })}
              <Box component="td" sx={{ ...bodyCell, fontWeight: 700, fontSize: 13 }}>{item.doneDays.length}</Box>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

const headCell = { px: 0.25, py: 1, minWidth: 32, fontSize: 12, textAlign: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' };
const bodyCell = { px: 0.25, py: 0.5, textAlign: 'center', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' };
const stickyCol = (head) => ({ ...(head ? headCell : bodyCell), textAlign: 'left', px: 1.5, fontSize: 13, position: 'sticky', left: 0, zIndex: head ? 2 : 1, borderRight: 1, borderRightColor: 'divider' });

/* ---------- line chart: daily completion % across all 30 days ---------- */
function useWidth() {
  const [el, setEl] = useState(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}

export function ChallengeLineChart({ c }) {
  const t = useT();
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const H = 220;
  const M = { top: 14, right: 14, bottom: 26, left: 40 };
  const lastDay = Math.min(c.today, c.days);
  const n = c.items.length || 1;
  const pts = Array.from({ length: lastDay }, (_, i) => {
    const day = i + 1;
    const ticked = c.items.filter((it) => it.doneDays.includes(day)).length;
    return { day, ticked, pct: Math.round((ticked / n) * 100) };
  });
  const innerW = Math.max(width - M.left - M.right, 0);
  const innerH = H - M.top - M.bottom;
  const x = (day) => M.left + ((day - 1) / Math.max(c.days - 1, 1)) * innerW;
  const y = (p) => M.top + innerH - (p / 100) * innerH;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.pct)}`).join(' ');
  const area = pts.length ? `${line} L${x(pts.at(-1).day)},${y(0)} L${x(1)},${y(0)} Z` : '';
  const avg = pts.length ? Math.round(pts.reduce((s, p) => s + p.pct, 0) / pts.length) : 0;
  // smallest label step whose labels are >= 40px apart (works from 10 to 90 days)
  const gap = innerW / Math.max(c.days - 1, 1);
  const step = [1, 5, 10, 15, 30].find((s) => s * gap >= 40) || 30;
  const hp = hover ? pts[hover - 1] : null;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const day = Math.round(((e.clientX - rect.left - M.left) / innerW) * (c.days - 1)) + 1;
    setHover(day >= 1 && day <= lastDay ? day : null);
  };

  return (
    <Card sx={{ minWidth: 0 }}>
      <CardContent>
        <Typography variant="h6">{t('ch.lineTitle')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t('ch.lineSub', { avg })}</Typography>
        <Box
          ref={ref}
          sx={(theme) => ({ position: 'relative', width: '100%', height: H, overflow: 'hidden', '--line': '#4f46e5', ...theme.applyStyles('dark', { '--line': '#7477f5' }) })}
        >
          {width > 0 && (
            <svg width={width} height={H} style={{ position: 'absolute', inset: 0 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={onMove} role="img" aria-label={t('ch.lineTitle')}>
              {[0, 50, 100].map((v) => (
                <g key={v}>
                  <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--mui-palette-divider)" strokeWidth="1" />
                  <text x={M.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--mui-palette-text-secondary)">{v}%</text>
                </g>
              ))}
              {Array.from({ length: c.days }, (_, i) => i + 1).filter((d) => d === 1 || d % step === 0 || d === c.days).map((d) => (
                <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--mui-palette-text-secondary)" fontWeight={d === c.today && c.active ? 700 : 400}>
                  D{d}
                </text>
              ))}
              {area && <path d={area} fill="var(--line)" opacity="0.1" />}
              {line && <path d={line} fill="none" stroke="var(--line)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
              {hp && <line x1={x(hp.day)} x2={x(hp.day)} y1={M.top} y2={y(0)} stroke="var(--mui-palette-text-secondary)" strokeWidth="1" opacity="0.5" />}
              {pts.length > 0 && (
                <circle cx={x((hp || pts.at(-1)).day)} cy={y((hp || pts.at(-1)).pct)} r="5" fill="var(--line)" stroke="var(--mui-palette-background-paper)" strokeWidth="2" />
              )}
            </svg>
          )}
          {hp && (
            <Box sx={{ position: 'absolute', top: 0, left: Math.min(Math.max(x(hp.day) - 70, 0), Math.max(width - 140, 0)), width: 140, pointerEvents: 'none', bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, boxShadow: 3, px: 1.25, py: 0.75 }}>
              <Typography variant="caption" color="text.secondary">{t('ch.day')} {hp.day}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{hp.ticked}/{c.items.length} · {hp.pct}%</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/* ---------- stats ---------- */
function StatCard({ icon, label, value, color }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: '14px !important' }}>
        <Box sx={(theme) => ({ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: alpha(theme.palette[color].main, 0.15), color: `${color}.main`, flexShrink: 0 })}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{label}</Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{value}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function Stats({ c }) {
  const t = useT();
  const todayDone = c.items.filter((i) => i.doneDays.includes(c.today)).length;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
      <StatCard icon={<CalendarTodayIcon />} color="primary" label={t('ch.day')} value={`${Math.min(c.today, c.days)}/${c.days}`} />
      <StatCard icon={<StarIcon />} color="warning" label={t('ch.points')} value={c.points} />
      <StatCard icon={<WorkspacePremiumIcon />} color="secondary" label={t('ch.perfect')} value={c.perfectDays} />
      <StatCard icon={<TaskAltIcon />} color="success" label={t('ch.today')} value={c.finished || !c.active ? '🏁' : `${todayDone}/${c.items.length}`} />
    </Box>
  );
}

/* ---------- edit dialog ---------- */
function EditDialog({ c, open, onClose, onSaved }) {
  const t = useT();
  const toast = useToast();
  const fullScreen = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [title, setTitle] = useState(c.title);
  const [items, setItems] = useState(c.items.map((i) => ({ _id: i._id, name: i.name })));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(c.title);
      setItems(c.items.map((i) => ({ _id: i._id, name: i.name })));
    }
  }, [open, c]);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch('/challenge', { title, items });
      onSaved(data.challenge);
      toast(t('ch.saved'));
      onClose();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle>{t('ch.editTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label={t('ch.name')} value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          {items.map((it, idx) => (
            <Stack key={it._id || `new-${idx}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                label={`${t('ch.rule')} ${idx + 1}`}
                value={it.name}
                onChange={(e) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
              />
              <IconButton onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))} disabled={items.length <= 1}>
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setItems((arr) => [...arr, { name: '' }])} disabled={items.length >= 20} sx={{ alignSelf: 'flex-start' }}>
            {t('ch.addRule')}
          </Button>
          <Typography variant="caption" color="text.secondary">{t('ch.editHint')}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('ch.cancel')}</Button>
        <Button variant="contained" onClick={save} disabled={busy}>{t('ch.save')}</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------- history: a box per challenge (finished ones first) -> full-screen popup ---------- */
function ChallengeDetail({ id, onClose }) {
  const t = useT();
  const { data } = useApi(id ? `/challenge/${id}` : null);
  const sel = data?.challenge;
  return (
    <Dialog open={Boolean(id)} onClose={onClose} fullScreen>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, background: HERO_BG, color: '#fff' }}>
        <EmojiEventsIcon />
        <Box component="span" sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sel?.title || '…'}
        </Box>
        <IconButton edge="end" onClick={onClose} aria-label="Close" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,.15)' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: 'background.default' }}>
        {!sel ? (
          <Skeleton variant="rounded" height={300} sx={{ mt: 2 }} />
        ) : (
          <Stack spacing={{ xs: 2, md: 3 }} sx={{ pt: 2, maxWidth: 1400, mx: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              {prettyDate(sel.startDate)}{sel.endedAt ? ` → ${prettyDate(sel.endedAt)}` : ''}
            </Typography>
            <Stats c={sel} />
            <ChallengeLineChart c={sel} />
            <Card sx={{ minWidth: 0 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1.5 }}>{t('ch.grid', { n: sel.days })}</Typography>
                <ChallengeGrid c={sel} />
              </CardContent>
            </Card>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistorySection() {
  const t = useT();
  const { data } = useApi('/challenge/history');
  const [openId, setOpenId] = useState(null);
  // only challenges that ran all their days show up in History
  const list = (data?.challenges || []).filter((h) => h.finished);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <HistoryIcon color="primary" />
        <Typography variant="h6">{t('ch.historyTitle')}</Typography>
      </Stack>
      {!data ? (
        <Skeleton variant="rounded" height={120} />
      ) : list.length === 0 ? (
        <Card><CardContent><Typography color="text.secondary">{t('ch.historyEmpty')}</Typography></CardContent></Card>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' } }}>
          {list.map((h) => (
            <Card key={h._id} sx={{ overflow: 'hidden' }}>
              <ButtonBase onClick={() => setOpenId(h._id)} sx={{ display: 'block', width: '100%', textAlign: 'left' }}>
                <Box sx={{ height: 6, background: h.finished ? HERO_BG : 'var(--mui-palette-divider)' }} />
                <CardContent>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <EmojiEventsIcon color={h.finished ? 'warning' : 'disabled'} />
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4, display: 'block' }}>{t('ch.nDay', { n: h.days })}</Typography>
                      <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>{h.title}</Typography>
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {prettyDate(h.startDate)} · {t('ch.day')} {h.dayReached}/{h.days} · {h.rules} {t('ch.rulesCount')}
                  </Typography>
                  <LinearProgress variant="determinate" value={(h.dayReached / h.days) * 100} color={h.finished ? 'success' : 'inherit'} sx={{ height: 6, borderRadius: 3, mb: 1.5 }} />
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" icon={<StarIcon />} label={h.points} color="warning" variant="outlined" />
                    <Chip size="small" icon={<WorkspacePremiumIcon />} label={h.perfectDays} variant="outlined" />
                    <Chip size="small" label={h.finished ? t('ch.completed') : t('ch.ended')} color={h.finished ? 'success' : 'default'} />
                  </Stack>
                </CardContent>
              </ButtonBase>
            </Card>
          ))}
        </Box>
      )}
      <ChallengeDetail id={openId} onClose={() => setOpenId(null)} />
    </Box>
  );
}

/* ---------- page ---------- */
export default function Challenge() {
  const t = useT();
  const toast = useToast();
  const { data, setData } = useApi('/challenge');
  const [editOpen, setEditOpen] = useState(false);
  const c = data?.challenge;

  const setChallenge = (challenge) => setData((d) => ({ ...d, challenge }));

  const toggle = async (item) => {
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
  if (!c) {
    return (
      <>
        <StartForm onStarted={setChallenge} />
        <Box sx={{ mt: 3 }}><HistorySection /></Box>
      </>
    );
  }

  const shownDay = Math.min(c.today, c.days);
  const pct = Math.round((shownDay / c.days) * 100);
  const actions = [
    { icon: <EditIcon />, label: t('ch.edit'), onClick: () => setEditOpen(true), hide: c.finished },
    { icon: <HistoryIcon />, label: t('ch.history'), onClick: () => document.getElementById('challenge-history')?.scrollIntoView({ behavior: 'smooth' }) },
    { icon: <RestartAltIcon />, label: t('ch.new'), onClick: restart },
  ].filter((a) => !a.hide);

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      {/* hero */}
      <Card sx={{ background: HERO_BG, color: '#fff', border: 0 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontSize: { xs: 20, sm: 26 } }}>🏆 {c.title}</Typography>
              <Typography sx={{ opacity: 0.9, fontSize: { xs: 13, sm: 15 } }}>
                {c.finished ? t('ch.finished') : t('ch.rulesLine', { tick: data.rules.perTick, bonus: data.rules.perfectBonus })}
              </Typography>
            </Box>
            {/* icons on mobile, labelled buttons on laptop */}
            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
              {actions.map((a) => (
                <Tooltip key={a.label} title={a.label}>
                  <IconButton onClick={a.onClick} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,.15)' }} size="small">{a.icon}</IconButton>
                </Tooltip>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {actions.map((a) => (
                <Button key={a.label} startIcon={a.icon} onClick={a.onClick} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,.15)', '&:hover': { bgcolor: 'rgba(255,255,255,.25)' } }}>
                  {a.label}
                </Button>
              ))}
            </Stack>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 2.5, mb: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('ch.dayOf', { d: shownDay, n: c.days })}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{pct}%</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,.25)', '& .MuiLinearProgress-bar': { bgcolor: '#fff' } }} />
        </CardContent>
      </Card>

      <Stats c={c} />

      <ChallengeLineChart c={c} />

      <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' }, alignItems: 'start' }}>
        {/* today's checklist: big tap targets, the main thing on mobile */}
        {!c.finished && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>{t('ch.todayList', { d: c.today })}</Typography>
              <Stack spacing={1}>
                {c.items.map((item) => {
                  const done = item.doneDays.includes(c.today);
                  return (
                    <ButtonBase
                      key={item._id}
                      onClick={() => toggle(item)}
                      sx={(theme) => ({
                        justifyContent: 'flex-start',
                        gap: 1.5,
                        p: 1.25,
                        borderRadius: 2,
                        border: 1,
                        borderColor: done ? 'success.main' : 'divider',
                        bgcolor: done ? alpha(theme.palette.success.main, 0.12) : 'transparent',
                        textAlign: 'left',
                      })}
                    >
                      <Box sx={{ width: 24, height: 24, borderRadius: 1.5, border: 2, borderColor: done ? 'success.main' : 'text.disabled', bgcolor: done ? 'success.main' : 'transparent', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        {done && <CheckIcon sx={{ fontSize: 16 }} />}
                      </Box>
                      <Typography sx={{ fontWeight: 600, textDecoration: done ? 'line-through' : 'none', color: done ? 'text.secondary' : 'text.primary' }}>
                        {item.name}
                      </Typography>
                    </ButtonBase>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Card sx={{ minWidth: 0, gridColumn: c.finished ? '1 / -1' : 'auto' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>{t('ch.grid', { n: c.days })}</Typography>
            <ChallengeGrid c={c} onToggle={c.finished ? undefined : toggle} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{t('ch.hint')}</Typography>
          </CardContent>
        </Card>
      </Box>

      <EditDialog c={c} open={editOpen} onClose={() => setEditOpen(false)} onSaved={setChallenge} />
      <Box id="challenge-history"><HistorySection /></Box>
    </Stack>
  );
}
