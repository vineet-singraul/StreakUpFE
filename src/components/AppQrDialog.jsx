import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import { useT } from '../i18n';

// The QR points at the live server's /install link, which redirects to the app's install page.
// Same QR works from localhost too. VITE_QR_URL can override it.
const LIVE_SERVER = 'https://streakupbe.onrender.com';
export const appUrl = () => import.meta.env.VITE_QR_URL || `${LIVE_SERVER}/install`;

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Draws a shareable card: app name, QR (with the app icon in the middle), and the link. */
async function drawCard(url) {
  const W = 720;
  const H = 900;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#4f46e5');
  g.addColorStop(1, '#7c3aed');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('StreakUp', W / 2, 100);
  ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.globalAlpha = 0.85;
  ctx.fillText('Habit Tracker · Scan to open', W / 2, 148);
  ctx.globalAlpha = 1;

  // white rounded panel for the QR
  const P = 520;
  const px = (W - P) / 2;
  const py = 190;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(px, py, P, P, 32);
  ctx.fill();

  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, { errorCorrectionLevel: 'H', margin: 0, width: P - 60, color: { dark: '#1e1b4b', light: '#ffffff' } });
  ctx.drawImage(qr, px + 30, py + 30);

  // app icon in the centre (H error correction keeps the code readable)
  const icon = await loadImage('/icon-192.png');
  if (icon) {
    const s = 96;
    const ix = W / 2 - s / 2;
    const iy = py + P / 2 - s / 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(ix - 8, iy - 8, s + 16, s + 16, 22);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(ix, iy, s, s, 18);
    ctx.clip();
    ctx.drawImage(icon, ix, iy, s, s);
    ctx.restore();
  }

  ctx.fillStyle = '#fff';
  ctx.font = '600 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, py + P + 70);
  ctx.font = '24px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText('Open → Settings → Install app', W / 2, py + P + 115);
  ctx.globalAlpha = 1;
  return c;
}

export default function AppQrDialog({ open, onClose }) {
  const t = useT();
  const [img, setImg] = useState(null);
  const url = appUrl();

  useEffect(() => {
    if (!open || img) return;
    drawCard(url).then((c) => setImg(c.toDataURL('image/png'))).catch(() => setImg(''));
  }, [open, img, url]);

  const download = () => {
    const a = document.createElement('a');
    a.href = img;
    a.download = 'StreakUp-QR.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const share = async () => {
    try {
      const blob = await (await fetch(img)).blob();
      const file = new File([blob], 'StreakUp-QR.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'StreakUp', text: url });
      else await navigator.share({ title: 'StreakUp', text: 'StreakUp - Habit Tracker', url });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, pt: 1.5 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>{t('qr.title')}</Typography>
        <IconButton onClick={onClose} size="small" aria-label="close"><CloseIcon /></IconButton>
      </Stack>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ borderRadius: 3, overflow: 'hidden', aspectRatio: '720 / 900', display: 'grid', placeItems: 'center', bgcolor: 'action.hover' }}>
          {img ? <Box component="img" src={img} alt="StreakUp QR code" sx={{ width: '100%', display: 'block' }} />
            : img === '' ? <Typography color="error">QR error</Typography> : <CircularProgress />}
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button fullWidth variant="contained" startIcon={<DownloadIcon />} onClick={download} disabled={!img}>{t('qr.download')}</Button>
          {canShare && <Button fullWidth variant="outlined" startIcon={<ShareIcon />} onClick={share} disabled={!img}>{t('qr.share')}</Button>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
