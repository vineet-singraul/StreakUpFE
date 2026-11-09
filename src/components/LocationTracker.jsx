import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import api, { errMsg } from '../api';

const POLL_MS = 30_000;
const IP_COLOR = '#ed6c02';
const fmt = (d) => (d ? new Date(d).toLocaleString() : '—');
const num = (n) => (n == null ? '—' : Number(n).toFixed(4));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function Stat({ label, value }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{value ?? <Skeleton width={40} />}</Typography>
      </CardContent>
    </Card>
  );
}

/** Leaflet + OpenStreetMap. IP locations are approximate (city level), shown as orange dashed circles. */
function LocationMap({ users, onSelect }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const fitted = useRef(false);

  useEffect(() => {
    map.current = L.map(el.current, { worldCopyJump: true }).setView([22, 79], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);

  useEffect(() => {
    const group = layer.current;
    group.clearLayers();
    const bounds = [];
    for (const u of users) {
      if (u.latitude == null) continue;
      const popup =
        `<b>${esc(u.name)}</b><br/>${esc(u.email)}<br/>IP ${esc(u.ip)} — approximate<br/>` +
        `${esc([u.city, u.state, u.country].filter(Boolean).join(', '))}<br/>Active: ${esc(fmt(u.lastActive))}`;
      L.circleMarker([u.latitude, u.longitude], { radius: 9, color: IP_COLOR, dashArray: '4 3', fillOpacity: 0.25, weight: 2 })
        .bindPopup(popup).on('click', () => onSelect(u.userId)).addTo(group);
      bounds.push([u.latitude, u.longitude]);
    }
    if (bounds.length && !fitted.current) {
      map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
      fitted.current = true;
    }
  }, [users, onSelect]);

  return <Box ref={el} sx={{ height: { xs: 320, md: 440 }, borderRadius: 2, overflow: 'hidden', zIndex: 0 }} />;
}

function DetailsDialog({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!userId) return;
    setData(null);
    setError('');
    api.get(`/admin/location-tracker/${userId}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [userId]);

  const u = data?.user;
  return (
    <Dialog open={Boolean(userId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{u ? `${u.name} — ${u.email}` : 'Location details'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!data && !error && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}
        {u && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
              {[
                ['IP', u.ip], ['Country', [u.flag, u.country, u.countryCode && `(${u.countryCode})`].filter(Boolean).join(' ')],
                ['State / Region', u.state], ['City', u.city], ['Postal / ZIP', u.postal], ['Continent', u.continent],
                ['Latitude', num(u.latitude)], ['Longitude', num(u.longitude)],
                ['ISP', u.isp], ['Organisation', u.org], ['ASN', u.asn],
                ['Timezone', u.timezone], ['UTC offset', u.utcOffset], ['Last active', fmt(u.lastActive)],
              ].map(([k, v]) => (
                <Box key={k}><Typography variant="caption" color="text.secondary">{k}</Typography><Typography variant="body2">{v || '—'}</Typography></Box>
              ))}
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>IP history (latest 50)</Typography>
            {data.history.length === 0 ? (
              <Typography color="text.secondary">No history yet.</Typography>
            ) : (
              <TableContainer sx={{ maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead><TableRow><TableCell>Time</TableCell><TableCell>IP</TableCell><TableCell>Lat</TableCell><TableCell>Lng</TableCell><TableCell>Place</TableCell><TableCell>ISP</TableCell></TableRow></TableHead>
                  <TableBody>
                    {data.history.map((h) => (
                      <TableRow key={h._id}>
                        <TableCell>{fmt(h.createdAt)}</TableCell>
                        <TableCell>{h.ip || '—'}</TableCell>
                        <TableCell>{num(h.latitude)}</TableCell>
                        <TableCell>{num(h.longitude)}</TableCell>
                        <TableCell>{[h.city, h.region, h.country].filter(Boolean).join(', ') || '—'}</TableCell>
                        <TableCell>{h.isp || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

export default function LocationTracker() {
  const [stats, setStats] = useState(null);
  const [mapUsers, setMapUsers] = useState([]);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState({ search: '', country: '', state: '', city: '', sort: 'latest', page: 0, limit: 10 });
  const [search, setSearch] = useState('');

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQ((p) => (p.search === search ? p : { ...p, search, page: 0 })), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...q, page: q.page + 1 };
      const [s, m, l] = await Promise.all([
        api.get('/admin/location-tracker/stats'),
        api.get('/admin/location-tracker/map'),
        api.get('/admin/location-tracker/users', { params }),
      ]);
      setStats(s.data);
      setMapUsers(m.data.users);
      setList(l.data);
      setError('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  // Initial load + polling while the tab is visible
  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const setFilter = (key) => (e) => setQ((p) => ({ ...p, [key]: e.target.value, page: 0 }));
  const opts = list?.filters || { countries: [], states: [], cities: [] };
  const select = (key, label, values) => (
    <TextField select size="small" label={label} value={q[key]} onChange={setFilter(key)} sx={{ minWidth: 130 }}>
      <MenuItem value="">All</MenuItem>
      {values.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
    </TextField>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>Location Tracker</Typography>
        <Button startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={load} disabled={loading}>Refresh</Button>
      </Stack>
      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' } }}>
        <Stat label="Tracked users" value={stats?.totalTracked} />
        <Stat label="IP locations" value={stats?.ipLocations} />
        <Stat label="Last updated" value={stats && <Typography variant="body2" sx={{ fontWeight: 600, pt: 0.5 }}>{fmt(stats.lastUpdated)}</Typography>} />
      </Box>

      <Card variant="outlined">
        <CardContent>
          <LocationMap users={mapUsers} onSelect={setSelected} />
          <Typography variant="caption" color="text.secondary">
            IP locations are approximate (city level). Map refreshes every 30 s.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" label="Search name / email / IP / city" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220, flexGrow: 1 }} />
            {select('country', 'Country', opts.countries)}
            {select('state', 'State', opts.states)}
            {select('city', 'City', opts.cities)}
            <TextField select size="small" label="Sort" value={q.sort} onChange={setFilter('sort')} sx={{ minWidth: 120 }}>
              <MenuItem value="latest">Latest active</MenuItem><MenuItem value="oldest">Oldest active</MenuItem>
            </TextField>
          </Stack>

          {!list ? (
            <Skeleton variant="rounded" height={240} />
          ) : list.users.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>Koi tracked user nahi mila.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['User', 'IP', 'Country', 'State / Region', 'City', 'Postal', 'Lat', 'Lng', 'ISP', 'Timezone', 'Last active'].map((h) => (
                      <TableCell key={h} sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.users.map((u) => (
                    <TableRow key={u.userId} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(u.userId)}>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Avatar src={u.avatar} sx={{ width: 28, height: 28 }} slotProps={{ img: { referrerPolicy: 'no-referrer' } }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap>{u.name}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{u.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{u.ip || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{[u.flag, u.country].filter(Boolean).join(' ') || '—'}</TableCell>
                      <TableCell>{u.state || '—'}</TableCell>
                      <TableCell>{u.city || '—'}</TableCell>
                      <TableCell>{u.postal || '—'}</TableCell>
                      <TableCell>{num(u.latitude)}</TableCell>
                      <TableCell>{num(u.longitude)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{u.isp || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{u.timezone || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(u.lastActive)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {list && (
            <TablePagination
              component="div"
              count={list.total}
              page={q.page}
              rowsPerPage={q.limit}
              rowsPerPageOptions={[10, 25, 50]}
              onPageChange={(_, page) => setQ((p) => ({ ...p, page }))}
              onRowsPerPageChange={(e) => setQ((p) => ({ ...p, limit: Number(e.target.value), page: 0 }))}
            />
          )}
        </CardContent>
      </Card>

      <DetailsDialog userId={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
