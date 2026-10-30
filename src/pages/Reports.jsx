import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useApi } from '../cache';
import ReportCard from '../components/ReportCard';
import ReasonsDialog from '../components/ReasonsDialog';
import CompletionChart from '../components/CompletionChart';
import { useT } from '../i18n';

export default function Reports() {
  const t = useT();
  const { data, setData } = useApi('/reports');
  const { data: daily } = useApi('/tasks/stats', { days: 30 });
  const [active, setActive] = useState(null);

  const onSaved = (updated) => {
    setData((d) => ({ ...d, reports: d.reports.map((r) => (r._id === updated._id ? updated : r)) }));
    setActive(updated);
  };

  if (!data) return <Stack spacing={2}>{[1, 2].map((i) => <Skeleton key={i} variant="rounded" height={220} />)}</Stack>;

  const finals = data.reports.filter((r) => r.final);
  const totalTasks = finals.reduce((s, r) => s + r.total, 0);
  const doneTasks = finals.reduce((s, r) => s + r.completedCount, 0);
  const perfectDays = finals.filter((r) => r.total && r.completedCount === r.total).length;

  const stats = [
    [t('reports.days'), finals.length],
    [t('reports.tasksDone'), `${doneTasks}/${totalTasks}`],
    [t('reports.completion'), totalTasks ? `${Math.round((doneTasks / totalTasks) * 100)}%` : '-'],
    [t('reports.perfect'), perfectDays],
  ];

  return (
    <Stack spacing={{ xs: 2, md: 3 }}>
      <Box>
        <Typography variant="h5">{t('nav.reports')}</Typography>
        <Typography color="text.secondary">{t('reports.sub')}</Typography>
      </Box>

      {!data.aiEnabled && (
        <Alert severity="warning">{t('reports.noAi')}</Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="h5">{value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <CompletionChart title={t('chart.last30')} days={daily?.days} today={daily?.today} loading />

      {data.reports.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6">{t('reports.emptyTitle')}</Typography>
            <Typography color="text.secondary">{t('reports.emptySub')}</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
          {data.reports.map((r) => (
            <ReportCard key={r._id} report={r} showDate onAskReasons={() => setActive(r)} />
          ))}
        </Box>
      )}

      <ReasonsDialog report={active} open={Boolean(active)} onClose={() => setActive(null)} onSaved={onSaved} />
    </Stack>
  );
}
