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
import ButtonBase from '@mui/material/ButtonBase';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TodayIcon from '@mui/icons-material/Today';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LogoutIcon from '@mui/icons-material/Logout';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import AlarmIcon from '@mui/icons-material/Alarm';
import ReminderRinger from './ReminderRinger';
import useMediaQuery from '@mui/material/useMediaQuery';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { BRAND_GRADIENT } from '../theme';
import { useAuth } from '../AuthContext';
import ReasonsDialog from './ReasonsDialog';
import NotifyBanner from './NotifyBanner';
import ChatBot from './ChatBot';
import api from '../api';
import { prefetch } from '../cache';
import { useT } from '../i18n';

// Warm the page chunks + data so tab switches feel instant
function warmUp() {
  import('../pages/DayView');
  import('../pages/Reports');
  import('../pages/Settings');
  prefetch('/tasks');
  prefetch('/reports');
}

const NAV = [
  { label: 'nav.calendar', path: '/', icon: <CalendarMonthOutlinedIcon />, activeIcon: <CalendarMonthIcon /> },
  { label: 'nav.today', path: '/day/today', icon: <EventAvailableOutlinedIcon />, activeIcon: <EventAvailableIcon /> },
  { label: 'nav.reports', short: 'nav.reportsShort', path: '/reports', icon: <ShowChartIcon />, activeIcon: <InsightsIcon /> },
  { label: 'nav.challenge', path: '/challenge', icon: <EmojiEventsOutlinedIcon />, activeIcon: <EmojiEventsIcon /> },
  {
    label: 'nav.menu', path: '#menu', icon: <MenuIcon />, activeIcon: <MenuOpenIcon />,
    // Opens a small menu instead of navigating
    children: [
      { label: 'nav.reminders', path: '/reminders', icon: <AlarmIcon fontSize="small" /> },
      { label: 'nav.rewards', path: '/rewards', icon: <WorkspacePremiumIcon fontSize="small" /> },
      { label: 'nav.settings', path: '/settings', icon: <SettingsIcon fontSize="small" /> },
    ],
  },
];

// Derive the active tab from the URL by matching NAV paths, so adding/reordering
// tabs can't desync the highlight or the bottom-nav navigation again.
function activeIndex(pathname) {
  if (pathname.startsWith('/day/')) return NAV.findIndex((n) => n.path.startsWith('/day/'));
  if (pathname === '/') return 0;
  return NAV.findIndex((n) => (n.children
    ? n.children.some((c) => pathname.startsWith(c.path))
    : n.path !== '/' && pathname.startsWith(n.path)));
}

export default function Layout() {
  const { user, logout } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'));
  const active = activeIndex(pathname);
  const menuItem = NAV.find((n) => n.children);
  const go = (item, e) => (item.children ? setMoreAnchor(e.currentTarget) : navigate(item.path));

  // Heartbeat so the admin panel can show who is online right now
  useEffect(() => {
    const ping = () => document.visibilityState === 'visible' && api.post('/auth/ping').catch(() => {});
    ping();
    const id = setInterval(ping, 2 * 60 * 1000);
    document.addEventListener('visibilitychange', ping);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', ping);
    };
  }, []);

  useEffect(() => {
    const id = (window.requestIdleCallback || ((cb) => setTimeout(cb, 300)))(warmUp);
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', pb: { xs: 12, md: 4 } }}>
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
                onClick={(e) => go(item, e)}
                sx={{ opacity: active === i ? 1 : 0.8 }}
              >
                {t(item.label)}
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
              {t('nav.settings')}
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); logout(); navigate('/login'); }}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              {t('logout')}
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        <NotifyBanner />
        <Outlet />
      </Container>

      {/* Mobile bottom navigation: the tapped tab rises into a gradient circle (moves to whichever tab is open) */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100,
          alignItems: 'flex-end',
          px: 0.25, pt: 1,
          pb: 'calc(8px + env(safe-area-inset-bottom))',
          bgcolor: 'rgba(255,255,255,.85)',
          '@media (prefers-color-scheme: dark)': { bgcolor: 'rgba(16,18,36,.88)' },
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: 1, borderColor: 'divider',
          borderRadius: '22px 22px 0 0',
        }}
      >
        {NAV.map((item, i) => {
          const on = active === i;
          return (
            <ButtonBase
              key={item.path}
              onClick={(e) => go(item, e)}
              aria-label={t(item.label)}
              aria-current={on ? 'page' : undefined}
              sx={{
                flex: 1, minWidth: 0, flexDirection: 'column', gap: 0.5, borderRadius: 3,
                color: on ? 'text.primary' : 'text.secondary',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* icon holder: small & plain normally, big raised gradient circle when this tab is open */}
              <Box
                sx={{
                  width: on ? 56 : 32, height: on ? 56 : 32,
                  mt: on ? '-30px' : 0,
                  borderRadius: '50%', display: 'grid', placeItems: 'center',
                  color: on ? '#fff' : 'inherit',
                  background: on ? BRAND_GRADIENT : 'transparent',
                  border: on ? '5px solid' : '0px solid',
                  borderColor: 'background.default',
                  boxShadow: on ? '0 8px 22px rgba(124,58,237,.45)' : 'none',
                  transition: 'width .3s cubic-bezier(.34,1.56,.64,1), height .3s cubic-bezier(.34,1.56,.64,1), margin .3s cubic-bezier(.34,1.56,.64,1), background .3s ease, box-shadow .3s ease',
                  '& svg': { fontSize: on ? 26 : 23, transition: 'font-size .3s ease' },
                }}
              >
                {on ? item.activeIcon : item.icon}
              </Box>
              <Typography noWrap sx={{ fontSize: 10, fontWeight: on ? 700 : 500, maxWidth: '100%', lineHeight: 1.2, letterSpacing: '-0.1px' }}>
                {t(item.short || item.label)}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {/* "Menu" tab dropdown: Rewards + Settings */}
      {/* Opens upward above the bottom-nav tab on mobile, below the button on desktop */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
        anchorOrigin={{ vertical: isDesktop ? 'bottom' : 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: isDesktop ? 'top' : 'bottom', horizontal: 'right' }}
        marginThreshold={12}
        slotProps={{
          paper: {
            elevation: 8,
            sx: {
              mt: isDesktop ? 1 : -1,
              width: 180,
              maxWidth: 'calc(100vw - 24px)',
              p: 0.5,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
            },
          },
          list: { sx: { py: 0 } },
        }}
      >
        {menuItem.children.map((c, idx) => {
          const on = pathname.startsWith(c.path);
          return (
            <MenuItem
              key={c.path}
              onClick={() => { setMoreAnchor(null); navigate(c.path); }}
              sx={{
                gap: 1.25, py: 1, px: 1.25, borderRadius: 2, minHeight: 0,
                mt: idx ? 0.25 : 0,
                color: on ? 'primary.main' : 'text.primary',
                bgcolor: on ? 'action.selected' : 'transparent',
              }}
            >
              <Box
                sx={{
                  width: 30, height: 30, borderRadius: 2, flexShrink: 0,
                  display: 'grid', placeItems: 'center',
                  color: 'primary.main',
                  bgcolor: 'action.hover',
                  '& svg': { fontSize: 18 },
                }}
              >
                {c.icon}
              </Box>
              <Typography sx={{ fontWeight: on ? 700 : 500, fontSize: 14 }}>{t(c.label)}</Typography>
            </MenuItem>
          );
        })}
      </Menu>

      <ReminderRinger />
      <ReasonsDialog />
      <ChatBot />
    </Box>
  );
}
