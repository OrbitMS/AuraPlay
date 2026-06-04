import React, { useState, useContext, useEffect } from 'react';
import { searchMusic } from '../services/youtube';
import { AudioContext, Track } from '../context/AudioContext';
import { Search, Music } from 'lucide-react';

export const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const audioContext = useContext(AudioContext);
  const currentTrackId = audioContext?.currentTrack?.id;

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 1.5));
  };

  const executeSearch = async (searchStr: string) => {
    if (!searchStr.trim()) return;
    setIsLoading(true);
    try {
      const songs = await searchMusic(searchStr);
      setResults(songs);
    } catch (error) {
      console.error("Search failure:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div onWheel={handleWheel} className="p-[32px] w-full origin-top-left transition-transform duration-100" style={{ transform: `scale(${zoom})` }}>
      <form onSubmit={handleSearch} className="flex items-center gap-3 bg-[var(--s1)] border border-[var(--bd)] rounded-[6px] p-[6px_12px] max-w-[360px] mb-8">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="bg-transparent text-[12px] text-[var(--tp)] outline-none w-full" />
        <button type="submit"><Search size={14} className="text-[var(--tt)]" /></button>
      </form>

      {/* Grid Headers */}
      <div className="grid grid-cols-[30px_1fr_160px_40px] gap-[14px] px-[10px] pb-[8px] border-b border-[var(--bd)] mb-[2px]">
        <div className="font-mono text-[8px] text-[var(--tt)] tracking-[0.1em] uppercase">#</div>
        <div className="font-mono text-[8px] text-[var(--tt)] tracking-[0.1em] uppercase">Title</div>
        <div className="font-mono text-[8px] text-[var(--tt)] tracking-[0.1em] uppercase">Artist</div>
      </div>

      <div className="flex flex-col gap-1">
        {results.map((song, idx) => (
          <div key={song.id} className="grid grid-cols-[30px_1fr_160px_40px] gap-[14px] items-center px-2 py-2 rounded-[5px] cursor-pointer hover:bg-white/[0.02]">
            <span className="text-[10px] text-[var(--tt)] font-mono">{idx + 1}</span>
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={song.thumbnails?.[0]?.url} className="w-8 h-8 rounded-[4px]" />
              <span className="text-[12px] text-[var(--tp)] truncate">{song.name}</span>
            </div>
            <span className="text-[10px] text-[var(--ts)] truncate font-mono">{song.artists?.[0]?.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};