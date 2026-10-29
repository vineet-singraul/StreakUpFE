import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../Toast';
import { enablePush, pushSupported } from '../push';

function Row({ icon, title, subtitle, action }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', py: 1.5 }}>
      {icon}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
      </Box>
      {action}
    </Stack>
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const permission = pushSupported() ? Notification.permission : 'unsupported';

  const update = async (patch) => {
    const { data } = await api.patch('/auth/settings', patch);
    setUser(data.user);
  };

  const turnOnPush = async () => {
    setBusy(true);
    try {
      const u = await enablePush();
      setUser(u);
      await api.post('/notifications/test');
      toast('Browser notifications ON ho gaye 🔔');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remindNow = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/notifications/remind-now');
      toast(data.message, data.sent ? 'success' : 'info');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={{ xs: 2, md: 3 }} sx={{ maxWidth: 720 }}>
      <Typography variant="h5">Settings</Typography>

      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Avatar src={user?.avatar} sx={{ width: 56, height: 56 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap>{user?.name}</Typography>
              <Typography color="text.secondary" noWrap>{user?.email}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6">Reminders (every hour)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Subah 8 se raat 10 baje tak har ghante, agar aaj ke tasks pending hain.
          </Typography>

          <Row
            icon={<NotificationsActiveIcon color="primary" />}
            title="Browser notifications"
            subtitle={
              permission === 'unsupported' ? 'Ye browser support nahi karta'
                : permission === 'denied' ? 'Blocked hai. Browser site settings se Allow karo.'
                  : user?.pushEnabled ? 'Is device par ON hai' : 'Is device par abhi OFF hai'
            }
            action={
              user?.pushEnabled && permission === 'granted' ? (
                <Switch checked={user.pushReminders} onChange={(e) => update({ pushReminders: e.target.checked })} />
              ) : (
                <Button variant="contained" size="small" onClick={turnOnPush} disabled={busy || permission === 'unsupported'}>
                  Enable
                </Button>
              )
            }
          />
          <Divider />
          <Row
            icon={<EmailIcon color="primary" />}
            title="Gmail reminders"
            subtitle={`Reminder + 12 AM report ${user?.email} par`}
            action={<Switch checked={Boolean(user?.emailReminders)} onChange={(e) => update({ emailReminders: e.target.checked })} />}
          />
          <Divider sx={{ mb: 2 }} />
          <Button variant="outlined" startIcon={<SendIcon />} onClick={remindNow} disabled={busy} fullWidth>
            Abhi test reminder bhejo
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
