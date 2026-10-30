import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha } from '@mui/material/styles';
import { useApi } from '../cache';
import { WEEKDAYS, daysInMonth, firstWeekday, monthLabel, pad } from '../utils';
import { useT } from '../i18n';

function dayColor(theme, info) {
  if (!info?.total) return 'transparent';
  const ratio = info.done / info.total;
  if (ratio === 1) return alpha(theme.palette.success.main, 0.25);
  if (ratio >= 0.5) return alpha(theme.palette.warning.main, 0.22);
  return alpha(theme.palette.error.main, 0.18);
}

export default function MonthCalendar({ month, today }) {
  const navigate = useNavigate();
  const t = useT();
  const { data } = useApi('/tasks/month', { month });
  const days = useMemo(() => Object.fromEntries((data?.days || []).map((d) => [d.date, d])), [data]);

  const cells = useMemo(() => {
    const out = Array(firstWeekday(month)).fill(null);
    for (let d = 1; d <= daysInMonth(month); d += 1) out.push(`${month}-${pad(d)}`);
    return out;
  }, [month]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>{monthLabel(month)}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 0.75 } }}>
          {WEEKDAYS.map((w) => (
            <Typography key={w} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600 }}>
              {w}
            </Typography>
          ))}
          {cells.map((date, i) => {
            if (!date) return <Box key={`e${i}`} />;
            const info = days[date];
            const future = date > today;
            const isToday = date === today;
            return (
              <ButtonBase
                key={date}
                disabled={future}
                onClick={() => navigate(`/day/${date}`)}
                sx={(theme) => ({
                  aspectRatio: '1 / 1',
                  borderRadius: 2,
                  flexDirection: 'column',
                  border: 1,
                  borderColor: isToday ? 'primary.main' : 'divider',
                  borderWidth: isToday ? 2 : 1,
                  bgcolor: dayColor(theme, info),
                  opacity: future ? 0.35 : 1,
                  transition: 'transform .1s',
                  '&:hover': { transform: future ? 'none' : 'scale(1.05)' },
                })}
              >
                <Typography sx={{ fontWeight: isToday ? 800 : 500, fontSize: { xs: 13, sm: 15 } }}>
                  {Number(date.slice(8))}
                </Typography>
                {info?.total ? (
                  <Typography sx={{ fontSize: { xs: 9, sm: 11 } }} color="text.secondary">
                    {info.done}/{info.total}
                  </Typography>
                ) : null}
              </ButtonBase>
            );
          })}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
          {[
            ['success.main', t('cal.allDone')],
            ['warning.main', '50%+'],
            ['error.main', '< 50%'],
          ].map(([c, l]) => (
            <Box key={l} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: c, opacity: 0.6 }} />
              <Typography variant="caption" color="text.secondary">{l}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
