import { useEffect, useRef, useState } from 'react';
import Fab from '@mui/material/Fab';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import StorageIcon from '@mui/icons-material/Storage';
import api, { errMsg } from '../api';
import { useT } from '../i18n';

const STORE_KEY = 'ht_chat';

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY)) || [];
  } catch {
    return [];
  }
}
function save(msgs) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-40)));
  } catch {
    /* storage blocked: chat still works, just not remembered */
  }
}

/** Shows the MongoDB query Gemini generated for a bot answer */
function QueryView({ query }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ mt: 0.75 }}>
      <Chip
        size="small"
        icon={<StorageIcon />}
        label={open ? t('chat.hideQuery') : t('chat.showQuery')}
        onClick={() => setOpen((o) => !o)}
        variant="outlined"
        sx={{ height: 22, fontSize: 11 }}
      />
      <Collapse in={open}>
        <Box
          component="pre"
          sx={{
            mt: 0.75, p: 1, borderRadius: 1, bgcolor: 'action.hover', fontSize: 11,
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, m: 0,
          }}
        >
          {JSON.stringify(query, null, 2)}
        </Box>
      </Collapse>
    </Box>
  );
}

function Bubble({ msg }) {
  const mine = msg.role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1.25 }}>
      <Paper
        elevation={0}
        sx={{
          px: 1.5, py: 1, maxWidth: '85%', borderRadius: 2.5,
          borderBottomRightRadius: mine ? 4 : undefined,
          borderBottomLeftRadius: mine ? undefined : 4,
          bgcolor: mine ? 'primary.main' : msg.error ? 'error.light' : 'background.paper',
          color: mine ? 'primary.contrastText' : 'text.primary',
          border: mine ? 0 : 1, borderColor: 'divider',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</Typography>
        {msg.query && <QueryView query={msg.query} />}
      </Paper>
    </Box>
  );
}

export default function ChatBot() {
  const t = useT();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(load);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => save(msgs), [msgs]);
  useEffect(() => {
    if (open) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [msgs, open, busy]);

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    const history = msgs.slice(-6).map(({ role, text: m }) => ({ role, text: m }));
    setMsgs((m) => [...m, { role: 'user', text: message }]);
    setInput('');
    setBusy(true);
    try {
      const { data } = await api.post('/chat', { message, history });
      setMsgs((m) => [...m, { role: 'bot', text: data.answer, query: data.query || null }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: 'bot', text: errMsg(err), error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = [t('chat.s1'), t('chat.s2'), t('chat.s3'), t('chat.s4')];

  return (
    <>
      <Tooltip title={t('chat.title')} placement="left">
        <Fab
          color="primary"
          aria-label={t('chat.title')}
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', right: 16, bottom: { xs: 80, md: 24 }, zIndex: 1200 }}
        >
          <SmartToyIcon />
        </Fab>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen={mobile}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { height: mobile ? '100%' : '75vh', display: 'flex', flexDirection: 'column' } } }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          <SmartToyIcon color="primary" />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{t('chat.title')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('chat.sub')}</Typography>
          </Box>
          {msgs.length > 0 && (
            <Tooltip title={t('chat.clear')}>
              <IconButton size="small" onClick={() => setMsgs([])}><DeleteSweepIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="close"><CloseIcon /></IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: 'background.default' }}>
          {msgs.length === 0 && (
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <SmartToyIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.8 }} />
              <Typography sx={{ mt: 1, mb: 2 }} color="text.secondary">{t('chat.empty')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {suggestions.map((s) => (
                  <Chip key={s} label={s} onClick={() => send(s)} variant="outlined" color="primary" />
                ))}
              </Box>
            </Box>
          )}
          {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
          {busy && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <CircularProgress size={16} />
              <Typography variant="body2">{t('chat.thinking')}</Typography>
            </Box>
          )}
          <div ref={endRef} />
        </Box>

        {/* Input */}
        <Box
          component="form"
          onSubmit={(e) => { e.preventDefault(); send(); }}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderTop: 1, borderColor: 'divider' }}
        >
          <InputBase
            autoFocus
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            placeholder={t('chat.placeholder')}
            sx={{ px: 1.5, py: 0.75, borderRadius: 5, bgcolor: 'action.hover' }}
          />
          <IconButton type="submit" color="primary" disabled={!input.trim() || busy} aria-label="send">
            <SendIcon />
          </IconButton>
        </Box>
      </Dialog>
    </>
  );
}
