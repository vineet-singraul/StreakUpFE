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
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import TranslateIcon from '@mui/icons-material/Translate';
import InstallMobileIcon from '@mui/icons-material/InstallMobile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IosShareIcon from '@mui/icons-material/IosShare';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../Toast';
import { enablePush, pushSupported } from '../push';
import { useT, LANGS, translate } from '../i18n';
import { promptInstall, useInstallState } from '../install';
import AppQrDialog from '../components/AppQrDialog';

/** One compact settings line: icon, title, optional small note, control on the right */
function Row({ icon, title, note, action }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', py: 1.25, minHeight: 56 }}>
      {icon}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }}>{title}</Typography>
        {note && <Typography variant="caption" color="text.secondary">{note}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const installState = useInstallState();
  const [showSteps, setShowSteps] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const permission = pushSupported() ? Notification.permission : 'unsupported';

  const update = async (patch) => {
    const { data } = await api.patch('/auth/settings', patch);
    setUser(data.user);
  };

  const changeLanguage = async (_, code) => {
    if (!code || code === user?.language) return;
    try {
      await update({ language: code });
      toast(translate(code, 'set.saved'));
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const turnOnPush = async () => {
    setBusy(true);
    try {
      const u = await enablePush();
      setUser(u);
      await api.post('/notifications/test');
      toast(t('notify.on'));
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

  const install = async () => {
    if (installState !== 'ready') return setShowSteps(true);
    const outcome = await promptInstall();
    if (outcome === 'accepted') toast(t('inst.done'));
    else if (outcome === 'unavailable') setShowSteps(true);
  };

  const pushReady = user?.pushEnabled && permission === 'granted';
  // only explain push when something is wrong
  const pushNote = permission === 'unsupported' ? t('set.pushUnsupported') : permission === 'denied' ? t('set.pushDenied') : null;
  const steps = installState === 'ios' ? ['inst.ios1', 'inst.ios2', 'inst.ios3'] : ['inst.m1', 'inst.m2', 'inst.m3'];

  return (
    <Stack spacing={2} sx={{ maxWidth: 640 }}>
      <Typography variant="h5">{t('nav.settings')}</Typography>

      <Card>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', py: 1 }}>
            <Avatar src={user?.avatar} sx={{ width: 44, height: 44 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} noWrap>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{user?.email}</Typography>
            </Box>
          </Stack>
          <Divider />

          <Row
            icon={<InstallMobileIcon color="primary" />}
            title={t('inst.title')}
            action={installState === 'installed'
              ? <Chip size="small" color="success" icon={<CheckCircleIcon />} label={t('inst.installed')} />
              : <Button variant="contained" size="small" onClick={install}>{t('inst.short')}</Button>}
          />
          {installState !== 'installed' && showSteps && (
            <Alert severity="info" icon={installState === 'ios' ? <IosShareIcon /> : <MoreVertIcon />} sx={{ mb: 1 }}>
              <ol style={{ margin: 0, paddingLeft: 18 }}>{steps.map((k) => <li key={k}>{t(k)}</li>)}</ol>
            </Alert>
          )}
          <Divider />

          <Row
            icon={<QrCode2Icon color="primary" />}
            title={t('qr.title')}
            action={<Button variant="outlined" size="small" onClick={() => setQrOpen(true)}>{t('qr.open')}</Button>}
          />
          <Divider />

          <Row icon={<TranslateIcon color="primary" />} title={t('set.language')} />
          <ToggleButtonGroup exclusive fullWidth size="small" color="primary" value={user?.language || 'hinglish'} onChange={changeLanguage} sx={{ mb: 1.5 }}>
            {LANGS.map((l) => (
              <ToggleButton key={l.code} value={l.code} sx={{ fontWeight: 600 }}>{l.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Divider />

          <Row
            icon={<NotificationsActiveIcon color="primary" />}
            title={t('set.push')}
            note={pushNote}
            action={pushReady
              ? <Switch checked={user.pushReminders} onChange={(e) => update({ pushReminders: e.target.checked })} />
              : <Button variant="contained" size="small" onClick={turnOnPush} disabled={busy || permission === 'unsupported'}>{t('notify.enable')}</Button>}
          />
          <Divider />

          <Row
            icon={<EmailIcon color="primary" />}
            title={t('set.gmail')}
            action={<Switch checked={Boolean(user?.emailReminders)} onChange={(e) => update({ emailReminders: e.target.checked })} />}
          />
          <Divider />

          <Row
            icon={<SendIcon color="primary" />}
            title={t('set.testShort')}
            action={<Button size="small" onClick={remindNow} disabled={busy}>{t('set.send')}</Button>}
          />
        </CardContent>
      </Card>

      <AppQrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </Stack>
  );
}
