import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useApi } from '../cache';
import { useAuth } from '../AuthContext';
import MonthCalendar from '../components/MonthCalendar';
import TodaySummary from '../components/TodaySummary';
import TodayHabits from '../components/TodayHabits';

const greetingKey = () => {
  const h = new Date().getHours();
  return h < 5 ? 'dash.night' : h < 12 ? 'dash.morning' : h < 17 ? 'dash.afternoon' : h < 21 ? 'dash.evening' : 'dash.night';
};
const longDate = (date) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};
import { useT } from '../i18n';
import TrendLineChart from '../components/TrendLineChart';
import { daysInMonth, monthLabel, pad } from '../utils';

// Task completion % for each day of the month (shares the calendar's cached /tasks/month data)
function MonthLine({ month, today }) {
  const t = useT();
  const { data } = useApi('/tasks/month', { month });
  const n = daysInMonth(month);
  const points = useMemo(() => {
    const byDate = new Map((data?.days || []).map((d) => [d.date, d]));
    return Array.from({ length: n }, (_, k) => k + 1)
      .map((i) => ({ i, d: byDate.get(`${month}-${pad(i)}`) }))
      .filter(({ d }) => d?.total)
      .map(({ i, d }) => ({ i, pct: Math.round((d.done / d.total) * 100), tip: `${i} · ${d.done}/${d.total} · ${Math.round((d.done / d.total) * 100)}%` }));
  }, [data, month, n]);
  const avg = points.length ? Math.round(points.reduce((s, p) => s + p.pct, 0) / points.length) : null;
  const isCurrent = today.startsWith(month);
  return (
    <TrendLineChart
      title={t('chart.monthTitle', { month: monthLabel(month) })}
      subtitle={avg === null ? t('chart.sub') : t('ch.lineSub', { avg })}
      n={n}
      points={points}
      xLabel={(i) => i}
      highlight={isCurrent ? Number(today.slice(8)) : null}
      emptyText={t('chart.empty')}
    />
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const { data: cal } = useApi('/calendar');

  if (!cal) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={84} />
        <Skeleton variant="rounded" height={380} />
      </Stack>
    );
  }

  const selected = params.get('m') || cal.currentMonth;
  // Only months that are open can be browsed with the ‹ › arrows
  const open = cal.months.filter((m) => !m.locked);
  const idx = open.findIndex((m) => m.key === selected);
  const month = idx === -1 ? cal.currentMonth : selected;
  const i = idx === -1 ? open.findIndex((m) => m.key === cal.currentMonth) : idx;
  const go = (key) => setParams(key === cal.currentMonth ? {} : { m: key }, { replace: true });
  const prev = i > 0 ? () => go(open[i - 1].key) : undefined;
  const next = i >= 0 && i < open.length - 1 ? () => go(open[i + 1].key) : undefined;

  return (
    <Stack spacing={2}>
      <Box sx={{ pt: { xs: 1, md: 0 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{longDate(cal.today)}</Typography>
        <Typography variant="h4" sx={{ mt: 0.25 }}>
          {t(greetingKey())}, {user?.name?.split(' ')[0]} ✨
        </Typography>
      </Box>

      <TodaySummary />
      <TodayHabits month={cal.currentMonth} />

      <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' }, alignItems: 'start' }}>
        <MonthCalendar month={month} today={cal.today} onPrev={prev} onNext={next} />
        {/* daily progress chart: below the calendar on phones, beside it on wide screens */}
        <MonthLine month={month} today={cal.today} />
      </Box>
    </Stack>
  );
}
