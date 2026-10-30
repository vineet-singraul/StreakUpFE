import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import LockIcon from '@mui/icons-material/Lock';
import { useApi } from '../cache';
import { useAuth } from '../AuthContext';
import MonthCalendar from '../components/MonthCalendar';
import TodaySummary from '../components/TodaySummary';
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

  const years = useMemo(() => [...new Set((cal?.months || []).map((m) => m.year))], [cal]);
  const selected = params.get('m') || cal?.currentMonth;
  const selectedYear = Number(selected?.slice(0, 4));
  const selectedInfo = cal?.months.find((m) => m.key === selected);

  const selectMonth = (key) => setParams({ m: key }, { replace: true });

  const selectYear = (year) => {
    // Jump to the latest unlocked month of that year (or its first month if all locked)
    const ofYear = cal.months.filter((m) => m.year === year);
    const unlocked = ofYear.filter((m) => !m.locked);
    selectMonth((unlocked.at(-1) || ofYear[0]).key);
  };

  if (!cal) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={90} />
        <Skeleton variant="rounded" height={380} />
      </Stack>
    );
  }

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <Box>
        <Typography variant="h5">{t('dash.hello', { name: user?.name?.split(' ')[0] })}</Typography>
        <Typography color="text.secondary">{t('dash.sub')}</Typography>
      </Box>

      <TodaySummary />

      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Tabs value={years.includes(selectedYear) ? selectedYear : false} onChange={(_, y) => selectYear(y)} sx={{ mb: 1.5 }}>
            {years.map((y) => <Tab key={y} value={y} label={y} />)}
          </Tabs>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 0.5,
              flexWrap: { xs: 'nowrap', md: 'wrap' },
              scrollbarWidth: 'thin',
            }}
          >
            {cal.months
              .filter((m) => m.year === selectedYear)
              .map((m) => {
                const chip = (
                  <Chip
                    key={m.key}
                    label={m.label.split(' ')[0]}
                    icon={m.locked ? <LockIcon fontSize="small" /> : undefined}
                    color={m.key === selected ? 'primary' : 'default'}
                    variant={m.key === selected ? 'filled' : 'outlined'}
                    onClick={m.locked ? undefined : () => selectMonth(m.key)}
                    disabled={m.locked}
                    sx={{ flexShrink: 0, fontWeight: m.current ? 700 : 500 }}
                  />
                );
                return m.locked ? (
                  <Tooltip key={m.key} title={t('month.lockedTip')}>
                    <span>{chip}</span>
                  </Tooltip>
                ) : chip;
              })}
          </Box>
        </CardContent>
      </Card>

      {selectedInfo && !selectedInfo.locked ? (
        <Box sx={{ display: 'grid', gap: { xs: 2, md: 3 }, gridTemplateColumns: { xs: '1fr', lg: '420px 1fr' }, alignItems: 'start' }}>
          <MonthCalendar month={selected} today={cal.today} />
          <MonthLine month={selected} today={cal.today} />
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <LockIcon color="disabled" sx={{ fontSize: 48 }} />
            <Typography variant="h6">{t('month.locked')}</Typography>
            <Typography color="text.secondary">{t('month.lockedSub')}</Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
