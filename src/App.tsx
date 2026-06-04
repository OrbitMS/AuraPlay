import { AudioProvider } from './context/AudioContext';
import { SearchView } from './views/SearchView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import './App.css';

function App() {
  return (
    <AudioProvider>
      {/* Centered App Container */}
      <div className="flex items-center justify-center min-h-screen bg-black p-[20px]">
        <div className="w-[960px] h-[580px] bg-[var(--void)] border border-[rgba(255,255,255,0.06)] rounded-[12px] overflow-hidden flex flex-col shadow-[0_40px_80px_rgba(0,0,0,0.8)]">
          
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar */}
            <div className="w-[200px] flex-shrink-0 bg-[var(--obsidian)] border-r border-[var(--bd)] flex flex-col py-5">
              <div className="px-4 pb-6 flex items-center gap-2.5">
                <div className="w-[42px] h-[42px] rounded-[10px] bg-[var(--gold-d)] border border-[rgba(201,168,76,0.2)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" className="w-6 h-6">
                    <circle cx="9" cy="18" r="3"/>
                    <circle cx="18" cy="15" r="3"/>
                    <line x1="12" y1="18" x2="12" y2="5"/>
                    <polyline points="12 5 18 7 12 9"/>
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="font-serif text-[16px] text-[var(--tp)] leading-none">Metrolist</span>
                  <span className="font-mono text-[8px] text-[var(--tt)] tracking-[0.14em] uppercase mt-[2px]">Desktop</span>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 h-full overflow-y-auto bg-gradient-to-b from-[var(--s1)] to-[var(--void)]">
              <SearchView />
            </main>
          </div>
          
          <AudioPlayerBar />
        </div>
      </div>
    </AudioProvider>
  );
}

export default App;