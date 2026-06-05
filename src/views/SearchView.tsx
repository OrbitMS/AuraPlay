import React, { useState, useContext } from 'react';
import { searchMusic } from '../services/youtube';
import { AudioContext, Track } from '../context/AudioContext';
import { useLikes } from '../hooks/useLikes';
import { HomeContent } from '../components/HomeContent';
import { Search, Download, CheckCircle, Loader, Heart, Minus, Plus } from 'lucide-react';

export const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const audioContext = useContext(AudioContext);
  const currentTrackId = audioContext?.currentTrack?.id;
  const downloadedIds = audioContext?.downloadedIds ?? new Set<string>();
  const downloadingIds = audioContext?.downloadingIds ?? new Set<string>();
  const { toggle: toggleLike, isLiked } = useLikes();

  const zoomIn  = () => setZoom((p) => Math.min(p + 0.1, 1.5));
  const zoomOut = () => setZoom((p) => Math.max(p - 0.1, 0.5));
  const zoomReset = () => setZoom(1);

  const executeSearch = async (searchStr: string) => {
    if (!searchStr.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
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

  const toTrack = (s: any): Track => ({
    id: s.id,
    title: s.name,
    artist: s.artists?.[0]?.name || 'Unknown Artist',
    thumbnail: s.thumbnails?.[0]?.url || '',
  });

  const playSong = (song: any) => {
    const tracks = results.map(toTrack);
    const track = tracks.find((t) => t.id === song.id);
    if (track) audioContext?.playTrack(track, tracks);
  };

  const handleDownload = (e: React.MouseEvent, song: any) => {
    e.stopPropagation();
    const track = toTrack(song);
    if (downloadedIds.has(track.id)) {
      audioContext?.removeDownload(track.id);
    } else {
      audioContext?.downloadTrack(track);
    }
  };

  return (
    <div className="px-[36px] pt-[32px] pb-[40px] w-full origin-top transition-transform duration-150" style={{ transform: `scale(${zoom})` }}>
      {/* Page heading + zoom control */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em] leading-[1.1]" style={{ fontFamily: 'var(--fd)' }}>Discover Music</h1>
          <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>Search · Stream · Explore</div>
        </div>

        {/* Sleek zoom control */}
        <div className="flex items-center gap-0.5 rounded-[8px] p-0.5" style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
          <button onClick={zoomOut} title="Zoom out" disabled={zoom <= 0.5}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-white/[0.06] disabled:opacity-30"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
            <Minus size={13} />
          </button>
          <button onClick={zoomReset} title="Reset zoom"
            className="px-1.5 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-white/[0.06] tabular-nums"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)', fontFamily: 'var(--fm)', fontSize: 10, minWidth: 38 }}>
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={zoomIn} title="Zoom in" disabled={zoom >= 1.5}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] transition-colors hover:bg-white/[0.06] disabled:opacity-30"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Search row */}
      <form onSubmit={handleSearch} className="flex gap-2.5 mt-6 mb-7">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tt)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artist, track, album…"
            className="w-full bg-[var(--s1)] border border-[var(--bs)] rounded-[7px] py-2.5 pr-3 pl-[34px] text-[12px] text-[var(--tp)] tracking-[0.01em] outline-none focus:border-[var(--bm)]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 bg-[var(--gold)] text-[var(--obsidian)] border-none rounded-[7px] text-[11px] font-bold tracking-[0.07em] uppercase cursor-pointer whitespace-nowrap hover:bg-[var(--gold-b)] disabled:opacity-60 transition-colors"
        >
          {isLoading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {/* Home feed (shown before first search) */}
      {!hasSearched && <HomeContent />}

      {/* Search results */}
      {hasSearched && (
      <>
      <div className="grid grid-cols-[30px_1fr_160px_32px_32px] gap-x-[14px] px-[10px] pb-[8px] border-b border-[var(--bd)] mb-[2px]">
        <div className="text-[8px] text-[var(--tt)] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--fm)' }}>#</div>
        <div className="text-[8px] text-[var(--tt)] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--fm)' }}>Track</div>
        <div className="text-[8px] text-[var(--tt)] tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--fm)' }}>Artist</div>
        <div></div>
        <div></div>
      </div>

      <div className="flex flex-col">
        {results.map((song, idx) => {
          const active = currentTrackId === song.id;
          const isDownloaded = downloadedIds.has(song.id);
          const isDownloading = downloadingIds.has(song.id);
          const liked = isLiked(song.id);
          const track = toTrack(song);
          return (
            <div
              key={song.id}
              onClick={() => playSong(song)}
              className={`cv-row grid grid-cols-[30px_1fr_160px_32px_32px] gap-x-[14px] items-center px-[10px] py-[7px] rounded-[5px] cursor-pointer border-l-2 transition-colors ${active ? 'bg-[var(--gold-g)] border-[var(--gold)]' : 'border-transparent hover:bg-white/[0.025]'}`}
            >
              <span className="text-[10px] text-[var(--tt)] text-center" style={{ fontFamily: 'var(--fm)' }}>
                {active ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" className="animate-spin-slow mx-auto">
                    <path d="M12 2a10 10 0 1 0 0 20"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  String(idx + 1).padStart(2, '0')
                )}
              </span>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <img src={song.thumbnails?.[0]?.url} className={`w-9 h-9 rounded-[4px] object-cover bg-[var(--s2)] flex-shrink-0 border ${active ? 'border-[rgba(201,168,76,0.3)]' : 'border-[var(--bd)]'}`} />
                <span className={`text-[12px] font-medium tracking-[0.01em] truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>{song.name}</span>
              </div>
              <span className="text-[10px] text-[var(--ts)] truncate tracking-[0.02em]" style={{ fontFamily: 'var(--fm)' }}>{song.artists?.[0]?.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                title={liked ? 'Remove from favorites' : 'Add to favorites'}
                className="flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors hover:bg-white/[0.06]"
              >
                <Heart
                  size={13}
                  fill={liked ? '#c9a84c' : 'none'}
                  stroke={liked ? '#c9a84c' : 'var(--tt)'}
                  className="transition-all"
                />
              </button>
              <button
                onClick={(e) => handleDownload(e, song)}
                title={isDownloaded ? 'Remove download' : isDownloading ? 'Downloading…' : 'Download for offline'}
                className="flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader size={13} className="text-[var(--gold)] animate-spin" />
                ) : isDownloaded ? (
                  <CheckCircle size={13} className="text-[var(--gold)]" />
                ) : (
                  <Download size={13} className="text-[var(--tt)] hover:text-[var(--ts)]" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
};