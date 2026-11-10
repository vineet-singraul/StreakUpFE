import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/system';
import { stopAlarm, subscribe } from '../voice/guard';

const flash = keyframes`0%,100%{background:#dc2626}50%{background:#facc15}`;
const shake = keyframes`0%,100%{transform:rotate(0)}25%{transform:rotate(-12deg)}75%{transform:rotate(12deg)}`;

const REASON = {
  voice: 'Aapki awaaz pehchaan li!',
  remote: 'Doosre device se bajaya gaya',
  test: 'Test alarm',
};

/** Full-screen flashing overlay while the find-phone siren rings. Lives in Layout so it shows on every tab. */
export default function FindPhoneAlarm() {
  const [s, setS] = useState(null);
  useEffect(() => subscribe(setS), []);
  if (s?.status !== 'alarm') return null;

  return (
    <Box
      role="alertdialog"
      aria-label="Phone alarm"
      onClick={() => stopAlarm()}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'grid',
        placeItems: 'center',
        textAlign: 'center',
        color: '#111',
        p: 3,
        animation: `${flash} 0.6s infinite`,
        cursor: 'pointer',
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 96, lineHeight: 1, animation: `${shake} 0.4s infinite` }}>📱</Typography>
        <Typography variant="h3" sx={{ fontWeight: 900, mt: 2 }}>Main yahan hoon!</Typography>
        <Typography sx={{ fontWeight: 600, mt: 1 }}>{REASON[s.alarmReason] || ''}</Typography>
        <Button
          variant="contained"
          size="large"
          onClick={(e) => {
            e.stopPropagation();
            stopAlarm();
          }}
          sx={{ mt: 4, px: 6, py: 2, fontSize: 22, fontWeight: 800, borderRadius: 8, bgcolor: '#111', '&:hover': { bgcolor: '#333' } }}
        >
          STOP
        </Button>
        <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>Kahin bhi tap karke band karo</Typography>
      </Box>
    </Box>
  );
}
