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

// 5×5 dot disc, the small version of Donna's orb.
const MARK = Array.from({ length: 25 }, (_, k) => {
  const d = Math.hypot((k % 5) - 2, Math.floor(k / 5) - 2) / 2;
  return { d, size: d > 1.05 ? 0 : Math.max(0.35, 1 - d * 0.6) * 5, opacity: d > 1.05 ? 0 : Math.max(0.3, 1 - d * 0.6) };
});

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      {MARK.map((m, k) => (
        <i key={k} className={m.d < 0.6 ? 'hot' : ''} style={{ width: m.size, height: m.size, opacity: m.opacity }} />
      ))}
    </span>
  );
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
          <BrandMark />
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
            {theme === 'light' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            )}
          </button>
        </div>
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
