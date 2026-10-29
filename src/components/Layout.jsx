import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TodayIcon from '@mui/icons-material/Today';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useAuth } from '../AuthContext';
import ReasonsDialog from './ReasonsDialog';
import NotifyBanner from './NotifyBanner';
import { prefetch } from '../cache';

// Warm the page chunks + data so tab switches feel instant
function warmUp() {
  import('../pages/DayView');
  import('../pages/Reports');
  import('../pages/Settings');
  prefetch('/tasks');
  prefetch('/reports');
}

const NAV = [
  { label: 'Calendar', path: '/', icon: <CalendarMonthIcon /> },
  { label: 'Today', path: '/day/today', icon: <TodayIcon /> },
  { label: 'AI Reports', path: '/reports', icon: <InsightsIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
];

function activeIndex(pathname) {
  if (pathname.startsWith('/day/')) return 1;
  if (pathname.startsWith('/reports')) return 2;
  if (pathname.startsWith('/settings')) return 3;
  return 0;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState(null);
  const active = activeIndex(pathname);

  useEffect(() => {
    const id = (window.requestIdleCallback || ((cb) => setTimeout(cb, 300)))(warmUp);
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: { xs: 10, md: 4 } }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <TaskAltIcon color="primary" />
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, cursor: 'pointer', flexGrow: { xs: 1, md: 0 }, mr: 3 }}
            onClick={() => navigate('/')}
          >
            Habit Tracker
          </Typography>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, flexGrow: 1 }}>
            {NAV.map((item, i) => (
              <Button
                key={item.path}
                startIcon={item.icon}
                color={active === i ? 'primary' : 'inherit'}
                variant={active === i ? 'contained' : 'text'}
                onClick={() => navigate(item.path)}
                sx={{ opacity: active === i ? 1 : 0.8 }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small">
            <Avatar src={user?.avatar} alt={user?.name} sx={{ width: 36, height: 36 }} />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            </Box>
            <MenuItem onClick={() => { setAnchor(null); navigate('/settings'); }}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Settings
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); logout(); navigate('/login'); }}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        <NotifyBanner />
        <Outlet />
      </Container>

      {/* Mobile bottom navigation */}
      <Paper
        elevation={8}
        sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }}
      >
        <BottomNavigation showLabels value={active} onChange={(_, i) => navigate(NAV[i].path)}>
          {NAV.map((item) => (
            <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} />
          ))}
        </BottomNavigation>
      </Paper>

      <ReasonsDialog />
    </Box>
  );
}
