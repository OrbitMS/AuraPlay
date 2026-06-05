import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  type RadioStation,
  fetchTopStations,
  fetchStationsByTag,
  searchStations,
  reportClick,
} from '../services/radio';
import { AudioContext } from '../context/AudioContext';
import { Search, Radio, Loader } from 'lucide-react';

const GENRES: { id: string; label: string; tag: string | null }[] = [
  { id: 'top',       label: '⭐ Top',       tag: null },
  { id: 'pop',       label: 'Pop',         tag: 'pop' },
  { id: 'rock',      label: 'Rock',        tag: 'rock' },
  { id: 'jazz',      label: 'Jazz',        tag: 'jazz' },
  { id: 'classical', label: 'Classical',   tag: 'classical' },
  { id: 'electronic',label: 'Electronic',  tag: 'electronic' },
  { id: 'hiphop',    label: 'Hip-Hop',     tag: 'hiphop' },
  { id: 'rnb',       label: 'R&B / Soul',  tag: 'rnb' },
  { id: 'ambient',   label: 'Ambient',     tag: 'ambient' },
  { id: 'news',      label: 'News',        tag: 'news' },
  { id: 'lofi',      label: 'Lo-Fi',       tag: 'lofi' },
];

function codecBadge(codec: string): string {
  return codec?.toUpperCase().replace('MPEG', 'MP3').slice(0, 4) || '?';
}

function StationCard({
  station,
  active,
  loading,
  onPlay,
}: {
  station: RadioStation;
  active: boolean;
  loading: boolean;
  onPlay: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onPlay}
      className={`group flex flex-col gap-2 p-3 rounded-[8px] cursor-pointer border transition-all ${
        active
          ? 'border-[rgba(201,168,76,0.4)] bg-[var(--gold-g)]'
          : 'border-[var(--bd)] bg-[var(--s1)] hover:bg-[var(--s2)] hover:border-[var(--bs)]'
      }`}
    >
      {/* Logo + name row */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-[6px] bg-[var(--s3)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--bd)]">
          {station.favicon && !imgError ? (
            <img
              src={station.favicon}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Radio size={16} className="text-[var(--tt)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] font-semibold truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>
            {station.name}
          </p>
          <p className="text-[10px] text-[var(--ts)] truncate leading-tight mt-0.5" style={{ fontFamily: 'var(--fm)' }}>
            {[station.countrycode, ...station.tags.split(',').slice(0, 2).map(t => t.trim())].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Live / loading indicator */}
        {active && (
          <div className="flex-shrink-0 flex items-center gap-1">
            {loading ? (
              <Loader size={12} className="text-[var(--gold)] animate-spin" />
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] font-bold tracking-[0.1em] text-red-400 uppercase" style={{ fontFamily: 'var(--fm)' }}>Live</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bitrate + codec badges */}
      <div className="flex items-center gap-1.5">
        {station.bitrate > 0 && (
          <span className={`text-[8px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded ${
            active ? 'bg-[var(--gold-d)] text-[var(--gold)]' : 'bg-[var(--s3)] text-[var(--tt)]'
          }`} style={{ fontFamily: 'var(--fm)' }}>
            {station.bitrate}kbps
          </span>
        )}
        <span className={`text-[8px] font-bold tracking-[0.08em] px-1.5 py-0.5 rounded ${
          active ? 'bg-[var(--gold-d)] text-[var(--gold)]' : 'bg-[var(--s3)] text-[var(--tt)]'
        }`} style={{ fontFamily: 'var(--fm)' }}>
          {codecBadge(station.codec)}
        </span>
      </div>
    </div>
  );
}

export const RadioView: React.FC = () => {
  const audioContext = useContext(AudioContext);
  const [genre, setGenre] = useState('top');
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStationId, setLoadingStationId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeStationId = audioContext?.radioStation?.stationuuid;

  // Load stations when genre changes
  useEffect(() => {
    if (query.trim()) return; // don't override search results
    let cancelled = false;
    setLoading(true);
    const g = GENRES.find(g => g.id === genre);
    const req = g?.tag ? fetchStationsByTag(g.tag) : fetchTopStations();
    req
      .then(s => { if (!cancelled) setStations(s); })
      .catch(err => console.warn('Radio fetch failed:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [genre]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setLoading(true);
    searchTimeout.current = setTimeout(() => {
      let cancelled = false;
      searchStations(query)
        .then(s => { if (!cancelled) setStations(s); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, 400);
  }, [query]);

  const handlePlay = (station: RadioStation) => {
    setLoadingStationId(station.stationuuid);
    reportClick(station.stationuuid);
    audioContext?.playStation(station);
    // Clear loading state once audio starts (or after timeout)
    setTimeout(() => setLoadingStationId(null), 3000);
  };

  return (
    <div className="px-[36px] pt-[32px] pb-[40px] w-full">
      {/* Header */}
      <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em] leading-[1.1]" style={{ fontFamily: 'var(--fd)' }}>
        Radio
      </h1>
      <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>
        Ad-free · High Quality · Live Streams
      </div>

      {/* Search */}
      <div className="relative mt-5 mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tt)]" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (!e.target.value) setGenre('top'); }}
          placeholder="Search stations…"
          className="w-full max-w-[360px] bg-[var(--s1)] border border-[var(--bs)] rounded-[7px] py-2.5 pr-3 pl-[34px] text-[12px] text-[var(--tp)] tracking-[0.01em] outline-none focus:border-[var(--bm)]"
        />
      </div>

      {/* Genre chips */}
      {!query.trim() && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-5">
          {GENRES.map(g => (
            <button
              key={g.id}
              onClick={() => setGenre(g.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                genre === g.id
                  ? 'bg-[var(--gold-g)] border-[rgba(201,168,76,0.4)] text-[var(--gold)]'
                  : 'bg-[var(--s1)] border-[var(--bd)] text-[var(--ts)] hover:border-[var(--bs)] hover:text-[var(--tp)]'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Station grid */}
      {loading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 rounded-[8px] border border-[var(--bd)] bg-[var(--s1)]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[6px] bg-[var(--s3)] animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-[var(--s3)] animate-pulse" />
                  <div className="h-2 w-1/2 rounded bg-[var(--s3)] animate-pulse" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <div className="h-4 w-12 rounded bg-[var(--s3)] animate-pulse" />
                <div className="h-4 w-8 rounded bg-[var(--s3)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
          <Radio size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">No stations found</p>
          <p className="text-[11px] text-[var(--tt)] opacity-60" style={{ fontFamily: 'var(--fm)' }}>Try a different genre or search term</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {stations.map(station => (
            <StationCard
              key={station.stationuuid}
              station={station}
              active={station.stationuuid === activeStationId}
              loading={loadingStationId === station.stationuuid}
              onPlay={() => handlePlay(station)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
