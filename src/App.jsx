import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';

// Each page is its own small chunk, loaded on first visit
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const DayView = lazy(() => import('./pages/DayView'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Challenge = lazy(() => import('./pages/Challenge'));

const FullScreenLoader = () => (
  <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
    <CircularProgress />
  </Box>
);

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

const page = (el) => <Suspense fallback={<LinearProgress />}>{el}</Suspense>;

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Suspense fallback={<FullScreenLoader />}><Login /></Suspense>}
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={page(<Dashboard />)} />
        <Route path="/day/:date" element={page(<DayView />)} />
        <Route path="/reports" element={page(<Reports />)} />
        <Route path="/challenge" element={page(<Challenge />)} />
        <Route path="/settings" element={page(<Settings />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
