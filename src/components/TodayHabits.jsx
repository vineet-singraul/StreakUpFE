import Card from '@mui/material/Card';
import ButtonBase from '@mui/material/ButtonBase';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import api, { errMsg } from '../api';
import { useApi } from '../cache';
import { useToast } from '../Toast';
import { BRAND_GRADIENT } from '../theme';

// Emoji + tile tint guessed from the habit name
const ICONS = [
  [/water|paani|pani|drink/i, '💧', '20,184,166'],
  [/read|book|padh|pages/i, '📖', '245,158,11'],
  [/meditat|dhyan|yoga|breath/i, '🧘', '168,85,247'],
  [/gym|workout|exercise|push|pull|weight|kasrat/i, '🏋️', '239,68,68'],
  [/run|jog|walk|steps|daud/i, '🏃', '34,197,94'],
  [/sleep|neend|bed/i, '😴', '99,102,241'],
  [/study|learn|course|class|padhai/i, '📚', '59,130,246'],
  [/code|coding|program|dsa|leetcode/i, '💻', '14,165,233'],
  [/pray|puja|namaz|prayer|gita/i, '🙏', '234,179,8'],
  [/diet|food|junk|sugar|fruit|eat|khana/i, '🥗', '132,204,22'],
  [/journal|write|diary|likh/i, '✍️', '236,72,153'],
  [/phone|social|screen|insta|youtube/i, '📵', '244,63,94'],
  [/wake|uth|morning|subah/i, '⏰', '249,115,22'],
];
const iconFor = (name) => ICONS.find(([re]) => re.test(name)) || [null, '✨', '139,92,246'];

/** Today's habits as big tappable rows with a gradient check circle */
export default function TodayHabits({ month }) {
  const toast = useToast();
  // same cache key as the habit grid, so both stay in sync
  const { data, setData } = useApi('/habits', { month });

  if (!data?.habits?.length || !data.editable) return null;
  const today = data.today;

  const toggle = async (habit) => {
    const flip = (hs) => hs.map((h) => {
      if (h._id !== habit._id) return h;
      const has = h.completedDates.includes(today);
      return { ...h, completedDates: has ? h.completedDates.filter((d) => d !== today) : [...h.completedDates, today] };
    });
    setData((d) => ({ ...d, habits: flip(d.habits) }));
    try {
      await api.patch(`/habits/${habit._id}/toggle`);
    } catch (err) {
      setData((d) => ({ ...d, habits: flip(d.habits) })); // undo
      toast(errMsg(err), 'error');
    }
  };

  return (
    <Stack spacing={1.25}>
      {data.habits.map((h) => {
        const done = h.completedDates.includes(today);
        const [, emoji, rgb] = iconFor(h.name);
        return (
          <Card key={h._id}>
            <ButtonBase
              onClick={() => toggle(h)}
              aria-pressed={done}
              sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.75, textAlign: 'left', justifyContent: 'flex-start' }}
            >
              <Box sx={{ width: 42, height: 42, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 20, bgcolor: `rgba(${rgb},.16)` }}>
                {emoji}
              </Box>
              <Typography sx={{ flexGrow: 1, fontWeight: 600, minWidth: 0, opacity: done ? 0.75 : 1 }} noWrap>{h.name}</Typography>
              <Box
                sx={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
                  border: done ? 0 : 2, borderColor: 'text.disabled',
                  background: done ? BRAND_GRADIENT : 'transparent',
                  boxShadow: done ? '0 0 12px rgba(99,102,241,.55)' : 'none',
                  transition: 'all .2s ease',
                }}
              >
                {done && <CheckIcon sx={{ fontSize: 16, color: '#fff' }} />}
              </Box>
            </ButtonBase>
          </Card>
        );
      })}
    </Stack>
  );
}
