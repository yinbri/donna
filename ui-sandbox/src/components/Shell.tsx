import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  try {
    const t = localStorage.getItem('donna.theme');
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function Shell() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('donna.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <div className="shell">
      <nav className="topbar">
        <Link to="/" className="brand">
          <span className="brand-dot" />
          Donna
        </Link>
        <div className="nav-links">
          <NavLink to="/apply">Candidate</NavLink>
          <NavLink to="/founder">Founder</NavLink>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title="Toggle theme"
          >
            {theme === 'light' ? '◐' : '◑'}
          </button>
        </div>
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
