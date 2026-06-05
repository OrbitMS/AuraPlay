import React, { useState, useContext } from 'react';
import { searchMusic } from '../services/youtube';
import { AudioContext, Track } from '../context/AudioContext';
import { useLikes } from '../hooks/useLikes';
import { useHistory } from '../hooks/useHistory';
import { HomeContent } from '../components/HomeContent';
import { AddToPlaylistButton } from '../components/AddToPlaylistButton';
import { safeImageUrl } from '../lib/safeUrl';
import { rankSearchResults } from '../lib/rankResults';
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
  const { toggle: toggleLike, isLiked, likedIds } = useLikes();
  const { history } = useHistory();

  const zoomIn  = () => setZoom((p) => Math.min(p + 0.1, 1.5));
  const zoomOut = () => setZoom((p) => Math.max(p - 0.1, 0.5));
  const zoomReset = () => setZoom(1);

  const executeSearch = async (searchStr: string) => {
    if (!searchStr.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const songs = await searchMusic(searchStr);
      const ranked = rankSearchResults(songs, searchStr, likedIds, history.map(t => t.id));
      setResults(ranked);
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
    <div className="relative w-full">
      {/* Sleek zoom control — fixed, never scaled so it can't drift off-screen */}
      <div className="fixed z-30 flex items-center gap-0.5 rounded-[9px] p-1 shadow-lg"
        style={{ top: 18, right: 26, background: 'rgba(19,19,24,0.92)', border: '1px solid var(--bs)', backdropFilter: 'blur(8px)' }}>
        <button onClick={zoomOut} title="Zoom out" disabled={zoom <= 0.5}
          className="w-8 h-8 flex items-center justify-center rounded-[7px] transition-colors hover:bg-white/[0.08] disabled:opacity-30"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
          <Minus size={15} />
        </button>
        <button onClick={zoomReset} title="Reset zoom"
          className="h-8 flex items-center justify-center rounded-[7px] transition-colors hover:bg-white/[0.08] tabular-nums"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)', fontFamily: 'var(--fm)', fontSize: 11, minWidth: 44 }}>
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={zoomIn} title="Zoom in" disabled={zoom >= 1.5}
          className="w-8 h-8 flex items-center justify-center rounded-[7px] transition-colors hover:bg-white/[0.08] disabled:opacity-30"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
          <Plus size={15} />
        </button>
      </div>

      {/* Scaled content (width compensates so it always fits the column) */}
      <div className="px-[36px] pt-[32px] pb-[40px] transition-transform duration-150"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: `${100 / zoom}%` }}>
        {/* Page heading */}
        <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em] leading-[1.1]" style={{ fontFamily: 'var(--fd)' }}>Discover Music</h1>
        <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>Search · Stream · Explore</div>

      {/* Search row — large & prominent, constrained width */}
      <form onSubmit={handleSearch} className="flex gap-3 mt-7 mb-8" style={{ maxWidth: 560 }}>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tt)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, tracks, albums…"
            className="w-full rounded-[12px] outline-none transition-all"
            style={{
              height: 52,
              paddingLeft: 46,
              paddingRight: 16,
              fontSize: 15,
              letterSpacing: '0.01em',
              color: 'var(--tp)',
              background: 'var(--s1)',
              border: '1px solid var(--bs)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)'; e.currentTarget.style.background = 'var(--s2)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--bs)'; e.currentTarget.style.background = 'var(--s1)'; }}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-[12px] cursor-pointer whitespace-nowrap hover:scale-[1.03] active:scale-95 transition-transform disabled:opacity-60"
          style={{
            height: 52,
            padding: '0 26px',
            border: 'none',
            background: 'linear-gradient(135deg, var(--gold-b), var(--gold))',
            color: 'var(--obsidian)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 18px rgba(201,168,76,0.3)',
          }}
        >
          {isLoading
            ? <Loader size={16} className="animate-spin" />
            : <Search size={16} strokeWidth={2.5} />}
          {isLoading ? 'Searching' : 'Search'}
        </button>
      </form>

      {/* Home feed (shown before first search) */}
      {!hasSearched && <HomeContent />}

      {/* Search results */}
      {hasSearched && (
      <>
      <div className="grid grid-cols-[30px_1fr_160px_32px_32px_32px] gap-x-[14px] px-[10px] pb-[8px] border-b border-[var(--bd)] mb-[2px]">
        <div className="text-[10px] text-[var(--ts)] tracking-[0.12em] uppercase font-semibold" style={{ fontFamily: 'var(--fm)' }}>#</div>
        <div className="text-[10px] text-[var(--ts)] tracking-[0.12em] uppercase font-semibold" style={{ fontFamily: 'var(--fm)' }}>Track</div>
        <div className="text-[10px] text-[var(--ts)] tracking-[0.12em] uppercase font-semibold" style={{ fontFamily: 'var(--fm)' }}>Artist</div>
        <div></div>
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
              className={`cv-row grid grid-cols-[30px_1fr_160px_32px_32px_32px] gap-x-[14px] items-center px-[10px] py-[7px] rounded-[5px] cursor-pointer border-l-2 transition-colors ${active ? 'bg-[var(--gold-g)] border-[var(--gold)]' : 'border-transparent hover:bg-white/[0.025]'}`}
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
                <img src={safeImageUrl(song.thumbnails?.[0]?.url)} className={`w-9 h-9 rounded-[4px] object-cover bg-[var(--s2)] flex-shrink-0 border ${active ? 'border-[rgba(201,168,76,0.3)]' : 'border-[var(--bd)]'}`} />
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
              <AddToPlaylistButton track={track} />
            </div>
          );
        })}
      </div>
      </>
      )}
      </div>
    </div>
  );
};