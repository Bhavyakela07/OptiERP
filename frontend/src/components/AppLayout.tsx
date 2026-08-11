import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
