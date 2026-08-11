import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DashboardIcon,
  CustomersIcon,
  ProductsIcon,
  ChallansIcon,
  ProfileIcon,
} from './Icons';

const NAV = [
  { to: '/', icon: DashboardIcon, label: 'Dashboard' },
  { to: '/customers', icon: CustomersIcon, label: 'Customers' },
  { to: '/products', icon: ProductsIcon, label: 'Products' },
  { to: '/challans', icon: ChallansIcon, label: 'Challans' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ padding: '24px 20px 20px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0' }}>
          <img
            src="/icon.png"
            alt="OptiERP Logo"
            style={{
              width: '100%',
              maxWidth: '190px',
              maxHeight: '85px',
              objectFit: 'contain',
              display: 'block',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
            }}
          />
        </div>
        <div className="sidebar-logo-sub" style={{ marginTop: '4px', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
          Operations & ERP Portal
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {user?.role === 'Admin' && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 16 }}>Account</div>
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <ProfileIcon size={18} />
              <span>Profile</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.[0] ?? 'U'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name ?? 'User'}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
