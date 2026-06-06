import { useState, useEffect, lazy, Suspense } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { AudioProvider } from './context/AudioContext';
import { SearchView } from './views/SearchView';
import { AudioPlayerBar } from './components/AudioPlayerBar';

// Lazy-loaded: only parsed/fetched when the user first opens them, keeping the
// initial bundle small and first paint fast.
const FavoritesView  = lazy(() => import('./views/FavoritesView').then(m => ({ default: m.FavoritesView })));
const SettingsView   = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));
const RadioView      = lazy(() => import('./views/RadioView').then(m => ({ default: m.RadioView })));
const DownloadedView = lazy(() => import('./views/DownloadedView').then(m => ({ default: m.DownloadedView })));
const PlaylistsView  = lazy(() => import('./views/PlaylistsView').then(m => ({ default: m.PlaylistsView })));
const ArchiveView    = lazy(() => import('./views/ArchiveView').then(m => ({ default: m.ArchiveView })));
const JamendoView    = lazy(() => import('./views/JamendoView').then(m => ({ default: m.JamendoView })));
const StatsView      = lazy(() => import('./views/StatsView').then(m => ({ default: m.StatsView })));
import { QueueSidebar } from './components/QueueSidebar';
import { NowPlayingScreen } from './components/NowPlayingScreen';
import { useStats } from './hooks/useStats';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdateBanner } from './components/UpdateBanner';
import { useSettings } from './hooks/useSettings';
import { setAudioQuality } from './services/youtube';
import './App.css';

type View = 'search' | 'favorites' | 'radio' | 'settings' | 'downloaded' | 'playlists' | 'archive' | 'jamendo' | 'stats';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const numFromLS = (key: string, def: number) => {
  const n = Number(localStorage.getItem(key));
  return Number.isFinite(n) && n > 0 ? n : def;
};

function App() {
  const [view, setView] = useState<View>('search');
  const [showQueue, setShowQueue] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { settings, update: updateSettings } = useSettings();

  // Resizable panels (persisted)
  const [sidebarWidth, setSidebarWidth] = useState(() => clamp(numFromLS('auraplay_sidebar_w', 268), 210, 460));
  const [playerHeight, setPlayerHeight] = useState(() => clamp(numFromLS('auraplay_player_h', 110), 96, 240));
  const [appVersion, setAppVersion] = useState('');
  const { summary: statsSummary } = useStats();

  useEffect(() => { getVersion().then(setAppVersion).catch(() => {}); }, []);

  useEffect(() => { setAudioQuality(settings.audioQuality); }, [settings.audioQuality]);

  const startSidebarResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX, startW = sidebarWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => setSidebarWidth(clamp(startW + (ev.clientX - startX), 210, 460));
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setSidebarWidth(w => { localStorage.setItem('auraplay_sidebar_w', String(w)); return w; });
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  const startPlayerResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY, startH = playerHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const move = (ev: PointerEvent) => setPlayerHeight(clamp(startH - (ev.clientY - startY), 96, 240));
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setPlayerHeight(h => { localStorage.setItem('auraplay_player_h', String(h)); return h; });
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };

  return (
    <AudioProvider>
      {/* Translucent shell — desktop/acrylic shows through for depth */}
      <div className="h-screen w-screen overflow-hidden flex flex-col"
        style={{ background: 'transparent' }}>

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── Sidebar ─────────────────────────────────────────────────────── */}
          <aside className="hidden sm:flex flex-shrink-0 flex-col relative"
            style={{
              width: sidebarWidth,
              background: 'linear-gradient(180deg, rgba(12,12,16,0.55) 0%, rgba(9,9,12,0.6) 100%)',
              borderRight: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {/* Resize handle (right edge) */}
            <div
              onPointerDown={startSidebarResize}
              title="Drag to resize"
              className="absolute top-0 right-0 h-full z-30 group"
              style={{ width: 8, transform: 'translateX(4px)', cursor: 'col-resize' }}
            >
              <div className="absolute right-[3px] top-0 h-full w-[2px] transition-colors group-hover:bg-[rgba(201,168,76,0.5)]" />
            </div>

            {/* Logo — AuraPlay mark (play triangle + aura rings) */}
            <div className="px-6 pt-9 pb-10 flex items-center gap-3.5">
              <div className="w-[52px] h-[52px] rounded-[15px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'radial-gradient(circle at 50% 38%, rgba(201,168,76,0.28) 0%, rgba(201,168,76,0.06) 70%)', border: '1px solid rgba(201,168,76,0.30)', boxShadow: '0 6px 22px rgba(201,168,76,0.16)' }}>
                <svg viewBox="0 0 24 24" className="w-[30px] h-[30px]">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="#c9a84c" strokeOpacity="0.28" strokeWidth="1.1"/>
                  <circle cx="12" cy="12" r="6.6" fill="none" stroke="#c9a84c" strokeOpacity="0.18" strokeWidth="1.1"/>
                  <path d="M10 8.2 L16.2 12 L10 15.8 Z" fill="#e8c76a" stroke="#e8c76a" strokeWidth="1.4" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex flex-col leading-none gap-1.5">
                <span className="text-[25px] font-extrabold tracking-[-0.03em]"
                  style={{
                    fontFamily: 'var(--fu)',
                    background: 'linear-gradient(120deg, #ffffff 0%, #f0e6c8 45%, #c9a84c 100%)',
                    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                  }}>AuraPlay</span>
                <span className="text-[9px] tracking-[0.30em] uppercase" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>Music · Radio</span>
              </div>
            </div>

            {/* Discover */}
            <div className="px-4 mb-7">
              <SectionLabel>Discover</SectionLabel>
              <NavItem active={view === 'search'} onClick={() => setView('search')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                label="Search Music" />
              <NavItem active={view === 'radio'} onClick={() => setView('radio')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>}
                label="Radio" />
              <NavItem active={view === 'archive'} onClick={() => setView('archive')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><path d="M4 7v13h16V7"/><rect x="2" y="3" width="20" height="4"/><line x1="10" y1="12" x2="14" y2="12"/></svg>}
                label="Archive" />
              <NavItem active={view === 'jamendo'} onClick={() => setView('jamendo')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>}
                label="Jamendo" />
            </div>

            <div className="h-px mx-5 my-5" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* Library */}
            <div className="px-4 mb-7">
              <SectionLabel>Library</SectionLabel>
              <NavItem active={view === 'favorites'} onClick={() => setView('favorites')}
                icon={<svg viewBox="0 0 24 24" fill={view === 'favorites' ? '#c9a84c' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>}
                label="Favorites" />
              <NavItem active={view === 'playlists'} onClick={() => setView('playlists')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="14" y2="18"/><circle cx="18" cy="17" r="3"/></svg>}
                label="Playlists" />
              <NavItem active={view === 'downloaded'} onClick={() => setView('downloaded')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
                label="Downloaded" />
              <NavItem active={view === 'stats'} onClick={() => setView('stats')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/></svg>}
                label="Stats" />
            </div>

            {/* Bottom */}
            <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="px-4">
                <NavItem active={view === 'settings'} onClick={() => setView('settings')}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[19px] h-[19px] flex-shrink-0"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>}
                  label="Settings" />
              </div>

              {/* Stats teaser */}
              {statsSummary.total > 0 && (
                <div onClick={() => setView('stats')}
                  className="lift mx-4 mt-3 p-3.5 rounded-[12px] cursor-pointer flex items-center justify-between"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: 'var(--gold)' }}>
                      {statsSummary.total.toLocaleString()} plays
                    </p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                      {statsSummary.topArtist ? `Top · ${statsSummary.topArtist}` : 'View your stats'}
                    </p>
                  </div>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                    <line x1="6" y1="20" x2="6" y2="13"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/>
                  </svg>
                </div>
              )}

              {/* Support card */}
              <div className="mx-4 mt-3 p-4 rounded-[14px]"
                style={{ background: 'linear-gradient(140deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.04) 100%)', border: '1px solid rgba(201,168,76,0.22)' }}>
                <p className="text-[12px] font-semibold" style={{ color: 'var(--tp)' }}>Enjoying AuraPlay?</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>Support independent development</p>
                <button onClick={() => openUrl('https://ko-fi.com/orbitms').catch(() => {})}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-[8px] text-[11px] font-bold uppercase tracking-[0.06em] hover:scale-[1.02] active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg, var(--gold-b), var(--gold))', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 2.5 5 6 5c2 0 3.2 1.1 4 2 .8-.9 2-2 4-2 3.5 0 5.5 3.5 3.5 7.5C19 16.65 12 21 12 21z"/></svg>
                  Support on Ko-fi
                </button>
              </div>

              {/* Version */}
              <div className="px-5 py-3 text-[10px]" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>
                AuraPlay{appVersion ? ` v${appVersion}` : ''}
              </div>
            </div>
          </aside>

          {/* ── Main Content ─────────────────────────────────────────────────── */}
          <main className="flex-1 h-full overflow-y-auto relative"
            style={{ background: 'linear-gradient(180deg, rgba(18,18,24,0.40) 0%, rgba(14,14,18,0.50) 100%)' }}>
            <ErrorBoundary label={view} resetKey={view}>
              {view === 'search' && <SearchView />}
              <Suspense fallback={<ViewLoader />}>
                {view === 'favorites'  && <FavoritesView />}
                {view === 'playlists'  && <PlaylistsView />}
                {view === 'downloaded' && <DownloadedView />}
                {view === 'radio'      && <RadioView />}
                {view === 'archive'    && <ArchiveView />}
                {view === 'jamendo'    && <JamendoView />}
                {view === 'stats'      && <StatsView />}
                {view === 'settings'  && (
                  <SettingsView
                    quality={settings.audioQuality}
                    onQualityChange={q => updateSettings({ audioQuality: q })}
                  />
                )}
              </Suspense>
            </ErrorBoundary>
          </main>

          {/* Queue Sidebar overlay */}
          {showQueue && <QueueSidebar onClose={() => setShowQueue(false)} />}
        </div>

        <AudioPlayerBar
          onQueueToggle={() => setShowQueue(v => !v)}
          queueOpen={showQueue}
          onExpand={() => setShowNowPlaying(true)}
          height={playerHeight}
          onResizeStart={startPlayerResize}
        />

        {/* Full-screen Now Playing */}
        {showNowPlaying && <NowPlayingScreen onClose={() => setShowNowPlaying(false)} />}

        {/* Self-update notification */}
        <UpdateBanner />
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
    <div className="px-3.5 pb-3 pt-1 text-[11px] font-bold tracking-[0.18em] uppercase"
      style={{ color: 'rgba(138,135,148,0.75)', fontFamily: 'var(--fm)' }}>
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
      className="flex items-center gap-4 px-3.5 py-[14px] mb-2 rounded-[11px] cursor-pointer transition-all duration-150 border-l-[3px]"
      style={{
        fontSize: '15px',
        letterSpacing: '0.005em',
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--gold)' : 'var(--ts)',
        borderLeftColor: active ? 'var(--gold)' : 'transparent',
        background: active
          ? 'linear-gradient(90deg, rgba(201,168,76,0.14) 0%, rgba(201,168,76,0.04) 100%)'
          : 'transparent',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'var(--tp)'; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ts)'; } }}
    >
      <span className="flex items-center justify-center w-[22px] flex-shrink-0">{icon}</span>
      {label}
    </div>
  );
}

export default App;
