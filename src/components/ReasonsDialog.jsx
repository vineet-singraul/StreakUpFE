import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import api, { errMsg } from '../api';
import { useToast } from '../Toast';
import { prettyDate } from '../utils';

/**
 * Asks "why couldn't you complete these?" for a finished day's pending tasks.
 * With no `report` prop it pops up by itself for the latest unanswered final report.
 */
export default function ReasonsDialog({ report: givenReport, open: givenOpen, onClose, onSaved }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const toast = useToast();
  const controlled = givenReport !== undefined;

  const [autoReport, setAutoReport] = useState(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [reasons, setReasons] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const report = controlled ? givenReport : autoReport;
  const open = controlled ? givenOpen : autoOpen;

  useEffect(() => {
    if (controlled) return;
    api
      .get('/reports/awaiting-reasons')
      .then((res) => {
        if (res.data.report) {
          setAutoReport(res.data.report);
          setAutoOpen(true);
        }
      })
      .catch(() => {});
  }, [controlled]);

  useEffect(() => {
    setFeedback('');
    setReasons(Object.fromEntries((report?.pending || []).map((p) => [p.task, p.reason || ''])));
  }, [report]);

  const close = () => {
    if (controlled) onClose?.();
    else setAutoOpen(false);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/reports/${report._id}/reasons`, { reasons });
      setFeedback(data.report.aiFeedback);
      onSaved?.(data.report);
      toast('Reasons save ho gaye');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!report) return null;

  return (
    <Dialog open={open} onClose={close} fullScreen={fullScreen} fullWidth maxWidth="sm">
      <DialogTitle>Ye tasks kyon nahi ho paaye? 🤔</DialogTitle>
      <DialogContent dividers>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {prettyDate(report.date)}: aapne {report.completedCount}/{report.total} tasks complete kiye.
          Honest reason likho, AI aapko kal ke liye better plan dega.
        </Typography>

        {feedback ? (
          <Alert icon={<AutoAwesomeIcon />} severity="info" sx={{ whiteSpace: 'pre-wrap' }}>
            {feedback}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {report.pending.map((p) => (
              <TextField
                key={p.task}
                label={p.title}
                placeholder="Kyon nahi ho paaya?"
                multiline
                minRows={2}
                value={reasons[p.task] || ''}
                onChange={(e) => setReasons((r) => ({ ...r, [p.task]: e.target.value }))}
                fullWidth
              />
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {feedback ? (
          <Button variant="contained" onClick={close}>Done</Button>
        ) : (
          <>
            <Button onClick={close}>Baad me</Button>
            <Button variant="contained" onClick={submit} disabled={saving} startIcon={<AutoAwesomeIcon />}>
              {saving ? 'AI soch raha hai...' : 'Submit & get AI advice'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
