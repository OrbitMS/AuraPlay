import { useState, useEffect, lazy, Suspense } from 'react';
import { AudioProvider } from './context/AudioContext';
import { SearchView } from './views/SearchView';
import { AudioPlayerBar } from './components/AudioPlayerBar';

// Lazy-loaded: only parsed/fetched when the user first opens them, keeping the
// initial bundle small and first paint fast.
const FavoritesView = lazy(() => import('./views/FavoritesView').then(m => ({ default: m.FavoritesView })));
const SettingsView  = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const RadioView     = lazy(() => import('./views/RadioView').then(m => ({ default: m.RadioView })));
import { QueueSidebar } from './components/QueueSidebar';
import { NowPlayingScreen } from './components/NowPlayingScreen';
import { useSettings } from './hooks/useSettings';
import { setAudioQuality } from './services/youtube';
import './App.css';

type View = 'search' | 'favorites' | 'radio' | 'settings';

function App() {
  const [view, setView] = useState<View>('search');
  const [showQueue, setShowQueue] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { settings, update: updateSettings } = useSettings();

  useEffect(() => { setAudioQuality(settings.audioQuality); }, [settings.audioQuality]);

  return (
    <AudioProvider>
      <div className="h-screen w-screen bg-[var(--void)] overflow-hidden flex flex-col">

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="hidden sm:flex w-[230px] flex-shrink-0 flex-col"
            style={{
              background: 'linear-gradient(180deg, #0c0c10 0%, #0a0a0c 100%)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {/* Logo */}
            <div className="px-5 pt-6 pb-7 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2) 0%, rgba(201,168,76,0.08) 100%)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.6" strokeLinecap="round" className="w-[17px] h-[17px]">
                  <circle cx="9" cy="18" r="3"/>
                  <circle cx="18" cy="15" r="3"/>
                  <line x1="12" y1="18" x2="12" y2="5"/>
                  <polyline points="12 5 21 2 21 8 12 8"/>
                </svg>
              </div>
              <div className="flex flex-col leading-none gap-1">
                <span className="text-[18px] text-[var(--tp)] tracking-[-0.02em]" style={{ fontFamily: 'var(--fd)' }}>Metrolist</span>
                <span className="text-[9px] text-[var(--tt)] tracking-[0.18em] uppercase" style={{ fontFamily: 'var(--fm)' }}>Studio</span>
              </div>
            </div>

            {/* Discover */}
            <div className="px-3 mb-2">
              <SectionLabel>Discover</SectionLabel>
              <NavItem active={view === 'search'} onClick={() => setView('search')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[15px] h-[15px] flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                label="Search Music" />
              <NavItem active={view === 'radio'} onClick={() => setView('radio')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[15px] h-[15px] flex-shrink-0"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>}
                label="Radio" />
            </div>

            <div className="h-px mx-4 my-2" style={{ background: 'rgba(255,255,255,0.05)' }} />

            {/* Library */}
            <div className="px-3 mb-2">
              <SectionLabel>Library</SectionLabel>
              <NavItem active={view === 'favorites'} onClick={() => setView('favorites')}
                icon={<svg viewBox="0 0 24 24" fill={view === 'favorites' ? '#c9a84c' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[15px] h-[15px] flex-shrink-0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>}
                label="Favorites" />
            </div>

            {/* Bottom */}
            <div className="mt-auto px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <NavItem active={view === 'settings'} onClick={() => setView('settings')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[15px] h-[15px] flex-shrink-0"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>}
                label="Settings" />
            </div>
          </aside>

          {/* ── Main Content ─────────────────────────────────────────────────── */}
          <main className="flex-1 h-full overflow-y-auto relative"
            style={{ background: 'linear-gradient(180deg, #131318 0%, #0f0f12 100%)' }}>
            {view === 'search' && <SearchView />}
            <Suspense fallback={<ViewLoader />}>
              {view === 'favorites' && <FavoritesView />}
              {view === 'radio'     && <RadioView />}
              {view === 'settings'  && (
                <SettingsView
                  quality={settings.audioQuality}
                  onQualityChange={q => updateSettings({ audioQuality: q })}
                />
              )}
            </Suspense>
          </main>

          {/* Queue Sidebar overlay */}
          {showQueue && <QueueSidebar onClose={() => setShowQueue(false)} />}
        </div>

        <AudioPlayerBar
          onQueueToggle={() => setShowQueue(v => !v)}
          queueOpen={showQueue}
          onExpand={() => setShowNowPlaying(true)}
        />

        {/* Full-screen Now Playing */}
        {showNowPlaying && <NowPlayingScreen onClose={() => setShowNowPlaying(false)} />}
      </div>
    </AudioProvider>
  );
}

/* ── Reusable sidebar primitives ──────────────────────────────────────────── */

function ViewLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" className="animate-spin">
        <path d="M12 2a10 10 0 1 0 0 20" />
      </svg>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 pt-1 text-[10px] font-bold tracking-[0.16em] uppercase"
      style={{ color: 'rgba(138,135,148,0.7)', fontFamily: 'var(--fm)' }}>
      {children}
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-[9px] rounded-[7px] cursor-pointer transition-all duration-150 border-l-[3px]"
      style={{
        fontSize: '13px',
        letterSpacing: '0.005em',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--gold)' : 'var(--ts)',
        borderLeftColor: active ? 'var(--gold)' : 'transparent',
        background: active
          ? 'linear-gradient(90deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)'
          : 'transparent',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--tp)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ts)'; }}
    >
      {icon}
      {label}
    </div>
  );
}

export default App;
