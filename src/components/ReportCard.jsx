import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { prettyDate } from '../utils';
import { useT } from '../i18n';

export default function ReportCard({ report, onAskReasons, showDate = false }) {
  const t = useT();
  const pct = report.total ? Math.round((report.completedCount / report.total) * 100) : 0;
  const needsReasons = report.final && report.pending.length > 0 && !report.reasonsSubmitted;

  return (
    <Card>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
          <Typography variant="h6">{showDate ? prettyDate(report.date) : t('rep.report')}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              label={`${report.completedCount}/${report.total} · ${pct}%`}
              color={pct === 100 ? 'success' : pct >= 50 ? 'warning' : 'error'}
            />
            <Chip size="small" variant="outlined" label={report.final ? t('rep.final') : t('rep.live')} />
          </Stack>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" color="success.main" sx={{ mb: 0.5 }}>{t('rep.completed')}</Typography>
            {report.completed.length ? report.completed.map((t) => (
              <Stack key={t} direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', mb: 0.5 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 18, mt: '2px' }} />
                <Typography variant="body2">{t}</Typography>
              </Stack>
            )) : <Typography variant="body2" color="text.secondary">{t('rep.none')}</Typography>}
          </Box>
          <Box>
            <Typography variant="subtitle2" color="error.main" sx={{ mb: 0.5 }}>{t('rep.pending')}</Typography>
            {report.pending.length ? report.pending.map((p) => (
              <Box key={p.task || p.title} sx={{ mb: 0.75 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                  <CancelIcon color="error" sx={{ fontSize: 18, mt: '2px' }} />
                  <Typography variant="body2">{p.title}</Typography>
                </Stack>
                {p.reason && (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 3.25, display: 'block' }}>
                    {t('rep.reason')}: {p.reason}
                  </Typography>
                )}
              </Box>
            )) : <Typography variant="body2" color="text.secondary">{t('rep.none')} 🎉</Typography>}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>🤖 Gemini AI</Typography>
        <Box sx={{ whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 1.5, borderRadius: 2, fontSize: 14 }}>
          {report.aiSummary}
        </Box>

        {report.aiFeedback && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>{t('rep.advice')}</Typography>
            <Box sx={{ whiteSpace: 'pre-wrap', bgcolor: 'action.hover', p: 1.5, borderRadius: 2, fontSize: 14 }}>
              {report.aiFeedback}
            </Box>
          </>
        )}

        {needsReasons && onAskReasons && (
          <Button fullWidth variant="outlined" color="warning" startIcon={<QuestionAnswerIcon />} onClick={onAskReasons} sx={{ mt: 2 }}>
            {t('rep.ask')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
