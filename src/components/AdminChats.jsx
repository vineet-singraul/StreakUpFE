import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ForumIcon from '@mui/icons-material/Forum';
import api, { errMsg } from '../api';

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function ChatCard({ chat, onDelete }) {
  const [showQuery, setShowQuery] = useState(false);
  const u = chat.user;
  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.25 }}>
          <Avatar src={u?.avatar} alt={u?.name} slotProps={{ img: { referrerPolicy: 'no-referrer' } }} sx={{ width: 32, height: 32 }}>
            {u?.name?.[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{u?.name || 'Deleted user'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">{u?.email}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{fmt(chat.createdAt)}</Typography>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => onDelete(chat)}><DeleteOutlineIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Stack>

        {/* User question */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: 1.5, py: 0.75, borderRadius: 2, borderBottomRightRadius: 4, maxWidth: '85%' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{chat.question}</Typography>
          </Box>
        </Box>

        {/* Bot answer */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <SmartToyIcon fontSize="small" color="primary" sx={{ mt: 0.75 }} />
          <Box sx={{ bgcolor: 'action.hover', px: 1.5, py: 0.75, borderRadius: 2, borderBottomLeftRadius: 4, maxWidth: '85%' }}>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{chat.answer}</Typography>
          </Box>
        </Stack>

        {chat.query && (
          <Box sx={{ mt: 1, pl: 3.5 }}>
            <Chip
              size="small"
              variant="outlined"
              icon={<StorageIcon />}
              label={`${showQuery ? 'Hide' : 'Show'} DB query · ${chat.query.collection}${chat.resultCount != null ? ` · ${chat.resultCount} rows` : ''}`}
              onClick={() => setShowQuery((s) => !s)}
              sx={{ height: 22, fontSize: 11 }}
            />
            <Collapse in={showQuery}>
              <Box component="pre" sx={{ mt: 0.75, p: 1, borderRadius: 1, bgcolor: 'action.hover', fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 240, m: 0 }}>
                {JSON.stringify(chat.query, null, 2)}
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/** Admin tab: every chatbot message sent by users, with a user filter and text search */
export default function AdminChats({ users, confirm }) {
  const [userId, setUserId] = useState('');
  const [q, setQ] = useState('');
  const [chats, setChats] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  const fetchPage = useCallback(
    (before) => api.get('/admin/chats', { params: { user: userId || undefined, before } }).then((r) => r.data),
    [userId],
  );

  const load = useCallback(() => {
    setChats(null);
    setError('');
    fetchPage()
      .then((d) => { setChats(d.chats); setHasMore(d.hasMore); })
      .catch((err) => setError(errMsg(err)));
    api.get('/admin/chats/counts').then((r) => setCounts(r.data.counts)).catch(() => {});
  }, [fetchPage]);

  useEffect(load, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const d = await fetchPage(chats[chats.length - 1].createdAt);
      setChats((c) => [...c, ...d.chats]);
      setHasMore(d.hasMore);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = (chat) =>
    confirm({
      title: 'Ye chat delete karein?',
      text: `"${chat.question.slice(0, 80)}" — ye message hamesha ke liye delete ho jayega.`,
      action: 'Delete',
      color: 'error',
      onConfirm: async () => {
        try {
          await api.delete(`/admin/chats/${chat.id}`);
          setChats((c) => c.filter((x) => x.id !== chat.id));
        } catch (err) {
          setError(errMsg(err));
        }
      },
    });

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!chats || !s) return chats;
    return chats.filter((c) =>
      [c.question, c.answer, c.user?.name, c.user?.email].some((v) => v?.toLowerCase().includes(s)));
  }, [chats, q]);

  const totalChats = Object.values(counts).reduce((a, b) => a + b, 0);
  const activeUsers = Object.keys(counts).length;

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <ForumIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>User Chats</Typography>
        <Chip size="small" label={`${totalChats} messages`} />
        <Chip size="small" label={`${activeUsers} users`} />
        <Tooltip title="Refresh"><IconButton onClick={load}><RefreshIcon /></IconButton></Tooltip>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="User"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All users</MenuItem>
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.name} {counts[u.id] ? `(${counts[u.id]})` : ''}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          fullWidth
          placeholder="Search question, answer, name, email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!shown ? (
        !error && <Stack spacing={1.5}>{[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={140} />)}</Stack>
      ) : shown.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <ForumIcon sx={{ fontSize: 48, opacity: 0.5 }} />
          <Typography>Abhi tak koi chat nahi hai</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {shown.map((c) => <ChatCard key={c.id} chat={c} onDelete={remove} />)}
          {hasMore && !q && (
            <Button onClick={loadMore} disabled={loadingMore} variant="outlined">
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}
