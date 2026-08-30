import { useEffect, useState } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import type { Preferences } from '../../shared/types.ts';
import { api } from './lib/api.ts';
import Tonight from './pages/Tonight.tsx';
import Live from './pages/Live.tsx';
import Schedule from './pages/Schedule.tsx';
import Settings from './pages/Settings.tsx';
import TeamPage from './pages/TeamPage.tsx';
import GamePage from './pages/GamePage.tsx';
import { ErrorState, Skeleton } from './components/ui.tsx';

const TABS = [
  { href: '/', label: 'Tonight', icon: 'M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z' },
  { href: '/live', label: 'Live', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4v6l4 2' },
  { href: '/schedule', label: 'Schedule', icon: 'M4 5h16v16H4zM4 9h16M9 3v4M15 3v4' },
  { href: '/settings', label: 'Settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zM3 12h3m12 0h3M12 3v3m0 12v3' },
];

const TITLES: Record<string, string> = {
  '/': 'Tonight',
  '/live': 'Live',
  '/schedule': 'Schedule',
  '/settings': 'Settings',
};

export default function App() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    api
      .get<Preferences>('/preferences')
      .then(setPrefs)
      .catch((err: Error) => setError(err.message));
  }, []);

  // Route changes should land at the top, the way a native screen push does.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location]);

  const title =
    TITLES[location] ??
    (location.startsWith('/team') ? 'Team' : location.startsWith('/game') ? 'Game' : 'Courtside');

  return (
    <div className="shell">
      <header className="topbar">
        <h1>{title}</h1>
        <div className="sub">
          Courtside
          {prefs && <div style={{ opacity: 0.65 }}>{prefs.trackedTeamIds.length} teams tracked</div>}
        </div>
      </header>

      <main>
        {error ? (
          <ErrorState message={error} onRetry={() => window.location.reload()} />
        ) : !prefs ? (
          <Skeleton count={3} height={90} />
        ) : (
          <Switch>
            <Route path="/">{() => <Tonight prefs={prefs} />}</Route>
            <Route path="/live">{() => <Live prefs={prefs} />}</Route>
            <Route path="/schedule">{() => <Schedule prefs={prefs} />}</Route>
            <Route path="/settings">{() => <Settings prefs={prefs} onSave={setPrefs} />}</Route>
            <Route path="/team/:id">
              {(params) => <TeamPage id={decodeURIComponent(params.id!)} prefs={prefs} />}
            </Route>
            <Route path="/game/:id">
              {(params) => <GamePage id={decodeURIComponent(params.id!)} prefs={prefs} />}
            </Route>
            <Route>{() => <ErrorState message="No such page." />}</Route>
          </Switch>
        )}
      </main>

      <nav className="tabbar" aria-label="Primary">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={location === tab.href ? 'active' : ''}
            aria-current={location === tab.href ? 'page' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
