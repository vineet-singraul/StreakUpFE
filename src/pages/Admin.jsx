import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import BlockIcon from '@mui/icons-material/Block';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ChecklistIcon from '@mui/icons-material/Checklist';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CloseIcon from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PlaceIcon from '@mui/icons-material/Place';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '../AuthContext';
import api, { errMsg } from '../api';
import { useAddress } from '../geocode';

const DAY = 24 * 60 * 60 * 1000;
const LANG = { en: 'English', hi: 'हिंदी', hinglish: 'Hinglish' };

const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

function timeAgo(d) {
  if (!d) return 'never';
  const mins = Math.round((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return `${Math.round(mins / 1440)} days ago`;
}

const mapsLink = (loc) => `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;

// ---------- Small building blocks ----------

function StatCard({ icon, label, value, color }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

/** One-line address (area, city, state) for a stored location. */
function ShortAddress({ location }) {
  const { address, loading, error } = useAddress(location);
  if (!location) return <Typography variant="body2" color="text.disabled">Location not shared</Typography>;
  if (loading) return <Skeleton width={180} />;
  if (error || !address) {
    return (
      <Typography variant="body2" color="text.secondary">
        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
      </Typography>
    );
  }
  return (
    <Typography variant="body2" color="text.secondary" noWrap title={address.full}>
      {[address.area, address.city, address.state].filter(Boolean).join(', ') || address.full}
    </Typography>
  );
}

function UserAvatar({ user, size = 40 }) {
  return (
    <Avatar src={user.avatar} alt={user.name} slotProps={{ img: { referrerPolicy: 'no-referrer' } }} sx={{ width: size, height: size }}>
      {user.name?.[0]?.toUpperCase()}
    </Avatar>
  );
}

// ---------- Section 1: Overview ----------

function Overview({ users, onOpenUser }) {
  const now = Date.now();
  const activeToday = users.filter((u) => u.lastLoginAt && now - new Date(u.lastLoginAt) < DAY).length;
  const newThisWeek = users.filter((u) => now - new Date(u.createdAt) < 7 * DAY).length;
  const withLocation = users.filter((u) => u.lastLocation).length;
  const blocked = users.filter((u) => u.blocked).length;
  const recentLogins = users.filter((u) => u.lastLoginAt).slice(0, 6);
  const recentSignups = [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  const userList = (list, when) => (
    <List dense disablePadding>
      {list.map((u) => (
        <ListItemButton key={u.id} onClick={() => onOpenUser(u)} sx={{ borderRadius: 2 }}>
          <ListItemAvatar><UserAvatar user={u} /></ListItemAvatar>
          <ListItemText primary={u.name} secondary={u.email} slotProps={{ secondary: { noWrap: true } }} />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
            {timeAgo(when(u))}
          </Typography>
        </ListItemButton>
      ))}
      {!list.length && <Typography color="text.secondary" sx={{ p: 2 }}>No users yet</Typography>}
    </List>
  );

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, 1fr)' } }}>
        <StatCard icon={<PeopleIcon />} label="Total users" value={users.length} color="primary" />
        <StatCard icon={<LoginIcon />} label="Active (24 hr)" value={activeToday} color="success" />
        <StatCard icon={<PersonAddIcon />} label="New this week" value={newThisWeek} color="secondary" />
        <StatCard icon={<MyLocationIcon />} label="Location shared" value={withLocation} color="warning" />
        <StatCard icon={<BlockIcon />} label="Blocked" value={blocked} color="error" />
      </Box>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Recent logins</Typography>
            {userList(recentLogins, (u) => u.lastLoginAt)}
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>New sign ups</Typography>
            {userList(recentSignups, (u) => u.createdAt)}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

// ---------- Section 2: Users ----------

function UserCard({ user, onOpen, onTasks, onToggleBlock }) {
  const stats = [
    ['Habits', user.habits],
    ['Tasks', user.tasks],
    ['Challenges', user.challenges],
  ];
  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column', borderColor: user.blocked ? 'error.main' : 'divider' }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
          <UserAvatar user={user} size={52} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>{user.name}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
          </Box>
          {user.blocked && <Chip size="small" color="error" icon={<BlockIcon />} label="Blocked" />}
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1.5 }} useFlexGap>
          <Chip size="small" label={LANG[user.language] || user.language} />
          <Chip size="small" color={user.emailReminders ? 'success' : 'default'} label={`Email ${user.emailReminders ? 'on' : 'off'}`} />
          <Chip size="small" color={user.pushDevices ? 'success' : 'default'} label={`Push: ${user.pushDevices} device${user.pushDevices === 1 ? '' : 's'}`} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2, py: 1, mb: 1.5 }}>
          {stats.map(([label, n]) => (
            <Box key={label}>
              <Typography sx={{ fontWeight: 700 }}>{n}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          ))}
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <PlaceIcon fontSize="small" color={user.lastLocation ? 'error' : 'disabled'} />
          <Box sx={{ minWidth: 0 }}><ShortAddress location={user.lastLocation} /></Box>
        </Stack>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          Joined {fmtDate(user.createdAt)} · Last login {timeAgo(user.lastLoginAt)}
        </Typography>
      </CardContent>
      <Divider />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', '& .MuiButton-root': { borderRadius: 0, py: 1 } }}>
        <Button size="small" startIcon={<ChecklistIcon />} onClick={() => onTasks(user)}>Tasks</Button>
        <Button size="small" startIcon={<PlaceIcon />} onClick={() => onOpen(user)} disabled={!user.lastLocation}>Location</Button>
        <Button
          size="small"
          color={user.blocked ? 'success' : 'error'}
          startIcon={user.blocked ? <LockOpenIcon /> : <BlockIcon />}
          onClick={() => onToggleBlock(user)}
        >
          {user.blocked ? 'Unblock' : 'Block'}
        </Button>
      </Box>
    </Card>
  );
}

function Users({ users, onOpenUser, onTasks, onToggleBlock }) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? users.filter((u) => u.name.toLowerCase().includes(s) || u.email.includes(s)) : users;
  }, [users, q]);

  return (
    <Stack spacing={2}>
      <TextField
        placeholder="Search by name or email"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        size="small"
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
        sx={{ maxWidth: 420 }}
      />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' } }}>
        {shown.map((u) => (
          <UserCard key={u.id} user={u} onOpen={onOpenUser} onTasks={onTasks} onToggleBlock={onToggleBlock} />
        ))}
      </Box>
      {!shown.length && <Typography color="text.secondary">No users found</Typography>}
    </Stack>
  );
}

// ---------- Section 3: Locations ----------

function LocationDetails({ user }) {
  const loc = user.lastLocation;
  const { address, loading, error } = useAddress(loc);
  const d = 0.01;
  const mapSrc =
    `https://www.openstreetmap.org/export/embed.html?layer=mapnik` +
    `&bbox=${loc.longitude - d},${loc.latitude - d},${loc.longitude + d},${loc.latitude + d}` +
    `&marker=${loc.latitude},${loc.longitude}`;

  const rows = [
    ['Area', address?.area],
    ['City', address?.city],
    ['State', address?.state],
    ['Pincode', address?.postcode],
    ['Country', address?.country],
    ['Latitude', loc.latitude.toFixed(6)],
    ['Longitude', loc.longitude.toFixed(6)],
    ['Accuracy', loc.accuracy != null ? `± ${Math.round(loc.accuracy)} m` : null],
    ['Captured', fmtDate(loc.capturedAt)],
  ];

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box component="iframe" key={mapSrc} title={`Map of ${user.name}`} src={mapSrc} sx={{ border: 0, width: '100%', height: { xs: 240, md: 320 }, display: 'block' }} />
      <CardContent>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <UserAvatar user={user} size={44} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 700 }} noWrap>{user.name}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>{user.email}</Typography>
          </Box>
          <Button size="small" variant="outlined" endIcon={<OpenInNewIcon />} href={mapsLink(loc)} target="_blank" rel="noopener noreferrer">
            Google Maps
          </Button>
        </Stack>

        <Typography variant="overline" color="text.secondary">Full address</Typography>
        {loading ? <Skeleton /> : (
          <Typography sx={{ mb: 2 }}>{error ? 'Address could not be loaded' : address?.full}</Typography>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          {rows.map(([label, value]) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                {loading && !value ? <Skeleton width={80} /> : value || '—'}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}

function Locations({ users, selectedId, onSelect }) {
  const located = users.filter((u) => u.lastLocation);
  const selected = located.find((u) => u.id === selectedId) || located[0];

  if (!located.length) {
    return <Alert severity="info">Abhi kisi user ne location share nahi ki hai.</Alert>;
  }
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, alignItems: 'start' }}>
      <Card variant="outlined" sx={{ borderRadius: 3, maxHeight: { md: 640 }, overflow: 'auto' }}>
        <List dense>
          {located.map((u) => (
            <ListItemButton key={u.id} selected={u.id === selected.id} onClick={() => onSelect(u.id)}>
              <ListItemAvatar><UserAvatar user={u} /></ListItemAvatar>
              <ListItemText
                primary={u.name}
                secondary={<ShortAddress location={u.lastLocation} />}
                slotProps={{ secondary: { component: 'div' } }}
              />
            </ListItemButton>
          ))}
        </List>
      </Card>
      <LocationDetails user={selected} />
    </Box>
  );
}

// ---------- Dialogs ----------

const prettyDay = (ymd) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** All tasks of one user, grouped by day, each deletable. */
function TasksDialog({ user, onClose, onDeleted, confirm }) {
  const fullScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/users/${user.id}/tasks`)
      .then((res) => setTasks(res.data.tasks))
      .catch((err) => setError(errMsg(err)));
  }, [user.id]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const t of tasks || []) map.set(t.date, [...(map.get(t.date) || []), t]);
    return [...map];
  }, [tasks]);
  const doneCount = tasks?.filter((t) => t.done).length || 0;

  const remove = (task) =>
    confirm({
      title: 'Task delete karein?',
      text: `"${task.title}" (${prettyDay(task.date)}) hamesha ke liye delete ho jayega.`,
      action: 'Delete',
      onConfirm: async () => {
        setDeleting(task.id);
        try {
          await api.delete(`/admin/tasks/${task.id}`);
          setTasks((list) => list.filter((t) => t.id !== task.id));
          onDeleted(user.id);
        } catch (err) {
          setError(errMsg(err));
        } finally {
          setDeleting(null);
        }
      },
    });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 7 }}>
        <UserAvatar user={user} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>{user.name} ke tasks</Typography>
          <Typography variant="body2" color="text.secondary">
            {tasks ? `${tasks.length} tasks · ${doneCount} done` : 'Loading…'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 12, top: 14 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        {!tasks && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>
        )}
        {tasks && !tasks.length && (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>Is user ka koi task nahi hai</Typography>
        )}
        {groups.map(([date, list]) => (
          <Box key={date}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', px: 2, py: 0.5, bgcolor: 'action.hover', position: 'sticky', top: 0, zIndex: 1 }}
            >
              {prettyDay(date)} · {list.filter((t) => t.done).length}/{list.length} done
            </Typography>
            <List dense disablePadding>
              {list.map((t) => (
                <Box key={t.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 0.75, gap: 1.5 }}>
                  {t.done ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon color="disabled" fontSize="small" />}
                  <Typography
                    variant="body2"
                    sx={{ flexGrow: 1, minWidth: 0, wordBreak: 'break-word', color: t.done ? 'text.secondary' : 'text.primary', textDecoration: t.done ? 'line-through' : 'none' }}
                  >
                    {t.title}
                  </Typography>
                  <Tooltip title="Delete task">
                    <span>
                      <IconButton size="small" color="error" onClick={() => remove(t)} disabled={deleting === t.id}>
                        {deleting === t.id ? <CircularProgress size={18} /> : <DeleteOutlineIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}
            </List>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({ request, onClose }) {
  const [busy, setBusy] = useState(false);
  if (!request) return null;
  const run = async () => {
    setBusy(true);
    await request.onConfirm();
    setBusy(false);
    onClose();
  };
  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{request.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{request.text}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" color={request.color || 'error'} onClick={run} disabled={busy}>
          {busy ? <CircularProgress size={20} color="inherit" /> : request.action}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Page ----------

const SECTIONS = [
  { label: 'Overview', icon: <DashboardIcon /> },
  { label: 'Users', icon: <PeopleIcon /> },
  { label: 'Locations', icon: <PlaceIcon /> },
  { label: 'Location Tracker', icon: <MyLocationIcon /> },
];

// Leaflet is only downloaded when the admin opens this tab
const LocationTracker = lazy(() => import('../components/LocationTracker'));

export default function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(() => {
    setRefreshing(true);
    setError('');
    api
      .get('/admin/users')
      .then((res) => setUsers(res.data.users))
      .catch((err) => setError(errMsg(err)))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(load, [load]);

  const [tasksUser, setTasksUser] = useState(null);
  const [confirmReq, setConfirmReq] = useState(null);

  const openLocation = (u) => {
    setSelectedId(u.id);
    setTab(2);
  };

  const patchUser = (id, changes) => setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...changes } : u)));

  const toggleBlock = (u) =>
    setConfirmReq({
      title: u.blocked ? `${u.name} ko unblock karein?` : `${u.name} ko block karein?`,
      text: u.blocked
        ? 'User phir se login karke app use kar payega.'
        : 'User turant logout ho jayega, dobara login nahi kar payega aur use reminders/reports bhi nahi jayenge. Data delete nahi hoga.',
      action: u.blocked ? 'Unblock' : 'Block',
      color: u.blocked ? 'success' : 'error',
      onConfirm: async () => {
        try {
          const { data } = await api.patch(`/admin/users/${u.id}/block`, { blocked: !u.blocked });
          patchUser(u.id, data);
        } catch (err) {
          setError(errMsg(err));
        }
      },
    });

  const onTaskDeleted = (id) => setUsers((list) => list.map((u) => (u.id === id ? { ...u, tasks: Math.max(0, u.tasks - 1) } : u)));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <AdminPanelSettingsIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>Admin Panel</Typography>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={load} disabled={refreshing}><RefreshIcon /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title={user?.email || ''}>
            <Avatar src={user?.avatar} alt={user?.name} slotProps={{ img: { referrerPolicy: 'no-referrer' } }} sx={{ width: 34, height: 34 }} />
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton onClick={() => { logout(); navigate('/login'); }}><LogoutIcon /></IconButton>
          </Tooltip>
        </Toolbar>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ maxWidth: 820, mx: 'auto', width: '100%' }}>
          {SECTIONS.map((s) => <Tab key={s.label} icon={s.icon} iconPosition="start" label={s.label} sx={{ minHeight: 52 }} />)}
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>}
        {!users ? (
          !error && (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={88} />)}
            </Box>
          )
        ) : (
          <>
            {tab === 0 && <Overview users={users} onOpenUser={(u) => (u.lastLocation ? openLocation(u) : setTab(1))} />}
            {tab === 1 && <Users users={users} onOpenUser={openLocation} onTasks={setTasksUser} onToggleBlock={toggleBlock} />}
            {tab === 2 && <Locations users={users} selectedId={selectedId} onSelect={setSelectedId} />}
            {tab === 3 && (
              <Suspense fallback={<Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}>
                <LocationTracker />
              </Suspense>
            )}
          </>
        )}
      </Container>

      {tasksUser && (
        <TasksDialog user={tasksUser} onClose={() => setTasksUser(null)} onDeleted={onTaskDeleted} confirm={setConfirmReq} />
      )}
      <ConfirmDialog request={confirmReq} onClose={() => setConfirmReq(null)} />
    </Box>
  );
}
