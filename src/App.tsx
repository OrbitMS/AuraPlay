import { useState } from 'react';
import { AudioProvider } from './context/AudioContext';
import { SearchView } from './views/SearchView';
import { FavoritesView } from './views/FavoritesView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import './App.css';

type View = 'search' | 'favorites';

function App() {
  const [view, setView] = useState<View>('search');

  return (
    <AudioProvider>
      <div className="h-screen w-screen bg-[var(--void)] overflow-hidden flex flex-col">

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="hidden sm:flex w-[200px] flex-shrink-0 bg-[var(--obsidian)] border-r border-[var(--bd)] flex-col py-5">
            {/* Logo */}
            <div className="px-4 pb-6 flex items-center gap-2.5">
              <div className="w-[30px] h-[30px] rounded-[7px] bg-[var(--gold-d)] border border-[rgba(201,168,76,0.2)] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
                  <circle cx="9" cy="18" r="3"/>
                  <circle cx="18" cy="15" r="3"/>
                  <line x1="12" y1="18" x2="12" y2="5"/>
                  <polyline points="12 5 21 2 21 8 12 8"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[16px] text-[var(--tp)] leading-none" style={{ fontFamily: 'var(--fd)' }}>Metrolist</span>
                <span className="text-[8px] text-[var(--tt)] tracking-[0.14em] uppercase mt-[2px]" style={{ fontFamily: 'var(--fm)' }}>Studio</span>
              </div>
            </div>

            {/* Discover */}
            <div className="px-2 mb-1">
              <div className="px-2 pb-1.5 text-[8px] font-bold tracking-[0.14em] uppercase text-[var(--tt)]">Discover</div>
              <NavItem
                active={view === 'search'}
                onClick={() => setView('search')}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[13px] h-[13px] flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                label="Search Music"
              />
              <NavItem
                active={false}
                onClick={() => {}}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[13px] h-[13px] flex-shrink-0"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>}
                label="Equalizer"
              />
            </div>

            <div className="h-px bg-[var(--bd)] mx-2 my-3.5"></div>

            {/* Library */}
            <div className="px-2 mb-1">
              <div className="px-2 pb-1.5 text-[8px] font-bold tracking-[0.14em] uppercase text-[var(--tt)]">Library</div>
              <NavItem
                active={view === 'favorites'}
                onClick={() => setView('favorites')}
                icon={<svg viewBox="0 0 24 24" fill={view === 'favorites' ? '#c9a84c' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[13px] h-[13px] flex-shrink-0"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>}
                label="Favorites"
              />
            </div>

            {/* Bottom */}
            <div className="mt-auto px-2 pt-3 border-t border-[var(--bd)]">
              <NavItem
                active={false}
                onClick={() => {}}
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-[13px] h-[13px] flex-shrink-0"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>}
                label="Settings"
              />
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 h-full overflow-y-auto bg-gradient-to-b from-[var(--s1)] to-[var(--void)]">
            {view === 'search' ? <SearchView /> : <FavoritesView />}
          </main>
        </div>

        <AudioPlayerBar />
      </div>
    </AudioProvider>
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
      className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-[5px] cursor-pointer text-[11px] tracking-[0.01em] border-l-2 transition-colors ${
        active
          ? 'border-[var(--gold)] bg-[rgba(201,168,76,0.08)] text-[var(--gold)]'
          : 'border-transparent text-[var(--tt)] hover:bg-white/[0.03] hover:text-[var(--ts)]'
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

export default App;
