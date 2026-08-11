import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon } from './Icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div>
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="header-subtitle">{subtitle}</p>}
      </div>

      <div className="header-spacer" />

      {/* Sun / Moon Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle-btn"
        title={`Switch to ${theme === 'dark' ? 'Sun' : 'Moon'} Mode`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-glass)',
          color: 'var(--text-primary)',
          fontSize: '12.5px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'var(--transition-fast)'
        }}
      >
        {theme === 'dark' ? (
          <>
            <SunIcon size={14} color="var(--text-primary)" />
            <span>Sun</span>
          </>
        ) : (
          <>
            <MoonIcon size={14} color="var(--text-primary)" />
            <span>Moon</span>
          </>
        )}
      </button>
    </header>
  );
}
