import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useApi } from '../cache';
import { prettyDate } from '../utils';

export default function TodaySummary() {
  const navigate = useNavigate();
  const { data } = useApi('/tasks');

  if (!data) return <Skeleton variant="rounded" height={104} />;
  const total = data.tasks.length;
  const done = data.tasks.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Card
      sx={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #06b6d4 100%)',
        color: '#fff',
        border: 0,
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress variant="determinate" value={100} size={72} thickness={5} sx={{ color: 'rgba(255,255,255,.25)' }} />
          <CircularProgress variant="determinate" value={pct} size={72} thickness={5} sx={{ color: '#fff', position: 'absolute', left: 0 }} />
          <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <Typography sx={{ fontWeight: 700 }}>{pct}%</Typography>
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 160 }}>
          <Typography sx={{ opacity: 0.85 }}>Today · {prettyDate(data.today, true)}</Typography>
          <Typography variant="h5">
            {total ? `${done}/${total} tasks done` : 'Aaj ke tasks abhi add nahi kiye'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="inherit"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/day/today')}
          sx={{ color: 'primary.main', bgcolor: '#fff', width: { xs: '100%', sm: 'auto' } }}
        >
          {total ? 'Open today' : 'Add tasks'}
        </Button>
      </CardContent>
    </Card>
  );
}
