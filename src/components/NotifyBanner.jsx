import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useAuth } from '../AuthContext';
import { useToast } from '../Toast';
import { errMsg } from '../api';
import api from '../api';
import { enablePush, pushSupported } from '../push';

const DISMISS_KEY = 'ht_notify_banner_dismissed';

/** Asks to turn on browser notifications: they are the fallback when reminder emails can't be sent */
export default function NotifyBanner() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!user || user.pushEnabled || dismissed || !pushSupported() || Notification.permission === 'denied') return null;

  const enable = async () => {
    setBusy(true);
    try {
      setUser(await enablePush());
      await api.post('/notifications/test');
      toast('Notifications ON ho gaye 🔔');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <Alert
      severity="info"
      icon={<NotificationsActiveIcon />}
      onClose={dismiss}
      sx={{ mb: 2, alignItems: 'center' }}
      action={
        <Button color="inherit" size="small" variant="outlined" onClick={enable} disabled={busy} sx={{ mr: 1 }}>
          Enable
        </Button>
      }
    >
      Har ghante task reminder pane ke liye browser notifications ON karo (email na aaye tab bhi milega).
    </Alert>
  );
}
