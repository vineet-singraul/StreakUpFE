import { useId } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useApi } from '../cache';
import { useT } from '../i18n';

/** Gradient progress ring (violet → cyan) */
export function GradientRing({ value, size = 76, stroke = 8 }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Box component="svg" width={size} height={size} sx={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(Math.max(value, 0), 100) / 100)}
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
    </Box>
  );
}

/** Glass "today" card: ring + done/total + streak; tap to open today */
export default function TodaySummary() {
  const navigate = useNavigate();
  const t = useT();
  const { data } = useApi('/tasks');
  const { data: game } = useApi('/gamification/me');

  if (!data) return <Skeleton variant="rounded" height={112} sx={{ borderRadius: 5 }} />;
  const total = data.tasks.length;
  const done = data.tasks.filter((x) => x.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const streak = game?.streak?.current || 0;

  return (
    <Card>
      <CardActionArea onClick={() => navigate('/day/today')} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 2.5, p: 2.5 }}>
        <GradientRing value={pct} />
        <Box sx={{ minWidth: 0 }}>
          {total ? (
            <Typography sx={{ fontWeight: 800, fontSize: 30, lineHeight: 1.1 }}>
              {done} <Box component="span" sx={{ opacity: 0.5, fontWeight: 600 }}>/</Box> {total}
            </Typography>
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2 }}>{t('today.add')}</Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('dash.tasksToday')}{streak > 0 && <> · 🔥 {t('dash.streak', { n: streak })}</>}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
