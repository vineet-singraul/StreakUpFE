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
import useMediaQuery from '@mui/material/useMediaQuery';
import { keyframes, useTheme } from '@mui/material/styles';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import NearMeIcon from '@mui/icons-material/NearMe';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import StorageIcon from '@mui/icons-material/Storage';
import api, { errMsg } from '../api';
import { useT } from '../i18n';
import { BRAND_GRADIENT } from '../theme';
import { useAuth } from '../AuthContext';
import ButtonBase from '@mui/material/ButtonBase';

const STORE_KEY = 'ht_chat';

// ---- Floating button animations (kept subtle: one ring, gentle float, small wave) ----
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;
const ring = keyframes`
  0% { transform: scale(1); opacity: .5; }
  80%, 100% { transform: scale(1.6); opacity: 0; }
`;
// robot gives a small wave every ~5s
const wave = keyframes`
  0%, 84%, 100% { transform: rotate(0); }
  88% { transform: rotate(-12deg); }
  92% { transform: rotate(10deg); }
  96% { transform: rotate(-6deg); }
`;
const dotPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,.6); }
  50% { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
`;
const popIn = keyframes`
  0% { transform: scale(.3); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
`;
const bubbleIn = keyframes`
  0% { opacity: 0; transform: translate(8px, -50%) scale(.9); }
  100% { opacity: 1; transform: translate(0, -50%) scale(1); }
`;
// Users who prefer less motion get a calm, static button
const dot = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: .4; }
  40% { transform: translateY(-5px); opacity: 1; }
`;
const reduceMotion = { '@media (prefers-reduced-motion: reduce)': { animation: 'none' } };

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

/** Small gradient robot shown next to bot messages */
function BotAvatar() {
  return (
    <Box sx={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', background: BRAND_GRADIENT, boxShadow: '0 3px 10px rgba(124,58,237,.35)' }}>
      <SmartToyIcon sx={{ fontSize: 17 }} />
    </Box>
  );
}

/** "Typing…" bubble: three bouncing dots */
function TypingBubble() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: 1.5 }}>
      <BotAvatar />
      <Box sx={{ display: 'flex', gap: 0.6, px: 2, py: 1.5, borderRadius: '20px', borderBottomLeftRadius: 6, bgcolor: 'rgba(127,127,160,.10)', border: '1px solid', borderColor: 'divider' }}>
        {[0, 0.15, 0.3].map((d) => (
          <Box key={d} sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main', animation: `${dot} 1.2s ease-in-out ${d}s infinite`, ...reduceMotion }} />
        ))}
      </Box>
    </Box>
  );
}

function Bubble({ msg }) {
  const mine = msg.role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 1, mb: 1.5 }}>
      {!mine && <BotAvatar />}
      <Paper
        elevation={0}
        sx={{
          px: 1.75, py: 1.1, maxWidth: '85%', borderRadius: '20px',
          borderBottomRightRadius: mine ? 6 : undefined,
          borderBottomLeftRadius: mine ? undefined : 6,
          // mine: lavender gradient with glow · bot: soft glass bubble
          background: mine ? 'linear-gradient(135deg, #9a9dfa, #7c80f5)' : undefined,
          bgcolor: mine ? undefined : msg.error ? 'rgba(239,68,68,.15)' : 'rgba(127,127,160,.10)',
          boxShadow: mine ? '0 6px 18px rgba(139,143,248,.35)' : 'none',
          color: mine ? '#fff' : 'text.primary',
          border: mine ? 0 : '1px solid', borderColor: 'divider',
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
  const { user } = useAuth();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState(load);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  // The "Ask me" bubble stops once the user has opened the chat (remembered per browser)
  const [hinted, setHinted] = useState(() => {
    try {
      return localStorage.getItem('ht_chat_hinted') === '1';
    } catch {
      return false;
    }
  });
  // Bubble appears 2s after load, stays 6s, then hides for this visit
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (hinted) return undefined;
    const a = setTimeout(() => setShowHint(true), 2000);
    const b = setTimeout(() => setShowHint(false), 8000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [hinted]);
  useEffect(() => {
    if (open) setShowHint(false);
    if (!open || hinted) return;
    setHinted(true);
    try {
      localStorage.setItem('ht_chat_hinted', '1');
    } catch {
      /* ignore */
    }
  }, [open, hinted]);

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

  const suggestions = [
    ['📋', '59,130,246', t('chat.s1')],
    ['✅', '34,197,94', t('chat.s2')],
    ['🔥', '249,115,22', t('chat.s3')],
    ['📈', '168,85,247', t('chat.s4')],
  ];
  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <>
      {/* Outer box: position + show/hide when the chat opens. Inner box: gentle float. */}
      <Box
        sx={{
          position: 'fixed', right: 20, bottom: { xs: 84, md: 28 }, zIndex: 1200,
          transition: 'transform .3s ease, opacity .2s ease',
          transform: open ? 'scale(.5)' : 'scale(1)',
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            animation: `${popIn} .45s ease-out backwards, ${float} 3.5s ease-in-out .45s infinite`,
            ...reduceMotion,
          }}
        >
          {/* "Ask me" bubble: shown once to the left of the button, takes no layout space */}
          {showHint && (
            <Paper
              elevation={3}
              onClick={() => setOpen(true)}
              sx={{
                display: { xs: 'none', sm: 'block' },
                position: 'absolute', right: 'calc(100% + 12px)', top: '50%',
                px: 1.5, py: 0.75, borderRadius: 2, cursor: 'pointer',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                transform: 'translate(0, -50%)',
                animation: `${bubbleIn} .35s ease-out both`,
              }}
            >
              {t('chat.hint')} 👋
            </Paper>
          )}

          {/* one soft expanding ring */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid', borderColor: 'primary.main',
              animation: `${ring} 2.6s ease-out infinite`,
              ...reduceMotion,
            }}
          />

          <Tooltip title={t('chat.title')} placement="left">
            <Fab
              color="primary"
              aria-label={t('chat.title')}
              onClick={() => setOpen(true)}
              sx={{
                width: 60, height: 60,
                background: (th) => `linear-gradient(135deg, ${th.palette.primary.light}, ${th.palette.primary.dark})`,
                boxShadow: (th) => `0 6px 20px ${th.palette.primary.main}66`,
                transition: 'transform .2s ease, box-shadow .2s ease',
                '&:hover': {
                  transform: 'translateY(-2px) scale(1.06)',
                  boxShadow: (th) => `0 10px 28px ${th.palette.primary.main}88`,
                },
                '&:active': { transform: 'scale(.96)' },
              }}
            >
              <SmartToyIcon
                sx={{ fontSize: 30, color: '#fff', transformOrigin: '50% 80%', animation: `${wave} 5s ease-in-out 1s infinite`, ...reduceMotion }}
              />
              {/* green "online" dot */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: '50%',
                  bgcolor: '#22c55e', border: '2px solid #fff',
                  animation: `${dotPulse} 2s ease-in-out infinite`,
                  ...reduceMotion,
                }}
              />
            </Fab>
          </Tooltip>
        </Box>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullScreen={mobile}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              height: mobile ? '100%' : '75vh', display: 'flex', flexDirection: 'column',
              borderRadius: mobile ? 0 : '24px', backgroundImage: 'none',
              // same navy + teal/violet glow look as the app
              // CSS variable (not a fixed hex) so the background follows light/dark exactly like the text does
              background: `radial-gradient(80% 50% at 100% 0%, rgba(20,184,166,.14), transparent 60%),
                radial-gradient(80% 60% at 0% 100%, rgba(124,58,237,.18), transparent 60%), var(--mui-palette-background-default)`,
              border: mobile ? 0 : '1px solid', borderColor: 'divider',
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: BRAND_GRADIENT, boxShadow: '0 4px 14px rgba(124,58,237,.4)' }}>
              <SmartToyIcon sx={{ fontSize: 23 }} />
            </Box>
            <Box sx={{ position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: '50%', bgcolor: '#22c55e', border: '2px solid', borderColor: 'background.default' }} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{t('chat.title')}</Typography>
            <Typography variant="caption" sx={{ color: '#22c55e', fontWeight: 600 }}>● {t('chat.online')}</Typography>
          </Box>
          {msgs.length > 0 && (
            <Tooltip title={t('chat.clear')}>
              <IconButton size="small" onClick={() => setMsgs([])}><DeleteSweepIcon fontSize="small" /></IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="close"><CloseIcon /></IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column' }}>
          {msgs.length === 0 && (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 2 }}>
              {/* avatar with soft pulsing halo */}
              <Box sx={{ position: 'relative', width: 88, height: 88, mb: 2.5 }}>
                {[0, 1.3].map((d) => (
                  <Box key={d} aria-hidden sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(139,143,248,.55)', animation: `${ring} 2.6s ease-out ${d}s infinite`, ...reduceMotion }} />
                ))}
                <Box sx={{ position: 'relative', width: 88, height: 88, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: BRAND_GRADIENT, boxShadow: '0 12px 36px rgba(124,58,237,.5)' }}>
                  <SmartToyIcon sx={{ fontSize: 46 }} />
                </Box>
              </Box>

              <Typography
                sx={{
                  fontWeight: 800, fontSize: 26, lineHeight: 1.2,
                  background: 'linear-gradient(90deg, #c4b5fd, #8b8ff8 45%, #67e8f9)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                }}
              >
                {firstName ? t('chat.hi', { name: firstName }) : t('chat.hiThere')}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75, mb: 3, px: 1, width: '100%', maxWidth: 320, fontSize: 14.5, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{t('chat.empty')}</Typography>

              {/* suggestion cards: one swipeable row, no scrollbar */}
              <Box
                sx={{
                  alignSelf: 'stretch', display: 'flex', gap: 1, overflowX: 'auto',
                  mx: -2, px: 2, pb: 1, pt: 0.5,
                  scrollSnapType: 'x proximity',
                  scrollPaddingInline: '16px', // snapping keeps the 16px side gap
                  scrollbarWidth: 'none', msOverflowStyle: 'none',
                  '&::-webkit-scrollbar': { display: 'none' },
                  '& > *': { flexShrink: 0, scrollSnapAlign: 'start' },
                }}
              >
                {suggestions.map(([emoji, rgb, text]) => (
                  <ButtonBase
                    key={text}
                    onClick={() => send(text)}
                    sx={{
                      py: 0.75, pl: 0.75, pr: 1.5, borderRadius: 99, textAlign: 'left', whiteSpace: 'nowrap',
                      flexDirection: 'row', alignItems: 'center', gap: 1,
                      bgcolor: 'rgba(127,127,160,.08)', border: '1px solid', borderColor: 'divider',
                      transition: 'transform .2s ease, border-color .2s ease, background-color .2s ease',
                      '&:hover': { transform: 'translateY(-3px)', borderColor: 'primary.main', bgcolor: 'rgba(139,143,248,.12)' },
                    }}
                  >
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 14, bgcolor: `rgba(${rgb},.18)` }}>{emoji}</Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{text}</Typography>
                  </ButtonBase>
                ))}
              </Box>

            </Box>
          )}
          {msgs.map((m, i) => <Bubble key={i} msg={m} />)}
          {busy && <TypingBubble />}
          <div ref={endRef} />
        </Box>

        {/* Input */}
        <Box
          component="form"
          onSubmit={(e) => { e.preventDefault(); send(); }}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.5, pt: 1.25, pb: 'calc(12px + env(safe-area-inset-bottom))' }}
        >
          {/* pill input with a soft border that lights up on focus */}
          <InputBase
            autoFocus
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            placeholder={t('chat.placeholder')}
            sx={{
              height: 50, px: 2.5, borderRadius: 99,
              bgcolor: 'rgba(127,127,160,.10)',
              border: '1px solid', borderColor: 'divider',
              transition: 'border-color .2s, box-shadow .2s',
              '&.Mui-focused': { borderColor: 'primary.main', boxShadow: '0 0 0 3px rgba(139,143,248,.15)' },
              '& input::placeholder': { color: 'text.secondary', opacity: 0.9 },
            }}
          />
          {/* round lavender send button with a glow */}
          <IconButton
            type="submit"
            disabled={!input.trim() || busy}
            aria-label="send"
            sx={{
              width: 50, height: 50, flexShrink: 0, color: '#fff',
              bgcolor: '#8b8ff8',
              boxShadow: '0 6px 20px rgba(139,143,248,.55)',
              transition: 'transform .15s, box-shadow .2s, opacity .2s',
              '&:hover': { bgcolor: '#7c80f5', transform: 'scale(1.05)' },
              '&:active': { transform: 'scale(.94)' },
              '&.Mui-disabled': { bgcolor: '#8b8ff8', color: '#fff', opacity: 0.55, boxShadow: 'none' },
            }}
          >
            <NearMeIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>
      </Dialog>
    </>
  );
}
