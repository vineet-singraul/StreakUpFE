import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import BoltIcon from '@mui/icons-material/Bolt';
import { useApi } from '../cache';
import { errMsg } from '../api';
import { useT } from '../i18n';

function StatTile({ icon, value, label, color }) {
  return (
    <Card variant="outlined" sx={{ textAlign: 'center' }}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
        <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
      </CardContent>
    </Card>
  );
}

export default function Rewards() {
  const t = useT();
  const { data, error, reload } = useApi('/gamification/me');

  if (error) {
    return <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>{errMsg(error)}</Alert>;
  }
  if (!data) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 820 }}>
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={90} />
        <Skeleton variant="rounded" height={220} />
      </Stack>
    );
  }

  const pct = data.xpForNext ? Math.min(100, Math.round((data.xpInLevel / data.xpForNext) * 100)) : 0;

  return (
    <Stack spacing={{ xs: 2, md: 3 }} sx={{ maxWidth: 820 }}>
      <Typography variant="h5">{t('nav.rewards')}</Typography>

      {/* Level + XP progress */}
      <Card sx={{ background: 'linear-gradient(135deg, #7c4dff 0%, #448aff 100%)', color: '#fff' }}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 24 }}>
              {data.level}
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Level {data.level}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>{data.xp} XP total</Typography>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{ mt: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.25)', '& .MuiLinearProgress-bar': { bgcolor: '#fff' } }}
              />
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {data.xpForNext - data.xpInLevel} XP to Level {data.level + 1}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Key stats */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' } }}>
        <StatTile icon={<LocalFireDepartmentIcon fontSize="large" />} color="#ff5722" value={`${data.streak.current}🔥`} label="Current streak" />
        <StatTile icon={<MilitaryTechIcon fontSize="large" />} color="#ffc107" value={data.streak.longest} label="Best streak" />
        <StatTile icon={<BoltIcon fontSize="large" />} color="#7c4dff" value={data.totals.completions} label="Total done" />
        <StatTile icon={<MilitaryTechIcon fontSize="large" />} color="#2e7d32" value={`${data.earnedCount}/${data.badges.length}`} label="Badges" />
      </Box>

      {/* Badges */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Badges</Typography>
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' } }}>
            {data.badges.map((b) => (
              <Box
                key={b.id}
                sx={{
                  textAlign: 'center', p: 1.5, borderRadius: 2, border: 1,
                  borderColor: b.earned ? 'primary.main' : 'divider',
                  bgcolor: b.earned ? 'action.hover' : 'transparent',
                  opacity: b.earned ? 1 : 0.45, filter: b.earned ? 'none' : 'grayscale(1)',
                }}
              >
                <Typography sx={{ fontSize: 34, lineHeight: 1 }}>{b.icon}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>{b.name}</Typography>
                <Typography variant="caption" color="text.secondary">{b.desc}</Typography>
                {b.earned && <Chip size="small" color="primary" label="Earned" sx={{ mt: 0.5, height: 18 }} />}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Typography variant="caption" color="text.secondary">
        Har habit complete karne par 10 XP, aur streak wale din ka bonus milta hai. Streak tabhi tootega jab aap poora din koi habit complete na karo.
      </Typography>
    </Stack>
  );
}
