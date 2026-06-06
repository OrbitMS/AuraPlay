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
import { safeImageUrl } from '../lib/safeUrl';
import { PageHeader } from '../components/PageHeader';

const GENRES: { id: string; label: string; tag: string | null }[] = [
  { id: 'top',        label: '⭐ Top',      tag: null },
  { id: 'pop',        label: 'Pop',         tag: 'pop' },
  { id: 'rock',       label: 'Rock',        tag: 'rock' },
  { id: 'indie',      label: 'Indie',       tag: 'indie' },
  { id: 'jazz',       label: 'Jazz',        tag: 'jazz' },
  { id: 'classical',  label: 'Classical',   tag: 'classical' },
  { id: 'electronic', label: 'Electronic',  tag: 'electronic' },
  { id: 'house',      label: 'House',       tag: 'house' },
  { id: 'techno',     label: 'Techno',      tag: 'techno' },
  { id: 'hiphop',     label: 'Hip-Hop',     tag: 'hiphop' },
  { id: 'rnb',        label: 'R&B / Soul',  tag: 'rnb' },
  { id: 'funk',       label: 'Funk',        tag: 'funk' },
  { id: 'reggae',     label: 'Reggae',      tag: 'reggae' },
  { id: 'metal',      label: 'Metal',       tag: 'metal' },
  { id: 'country',    label: 'Country',     tag: 'country' },
  { id: 'blues',      label: 'Blues',       tag: 'blues' },
  { id: 'latin',      label: 'Latin',       tag: 'latin' },
  { id: 'kpop',       label: 'K-Pop',       tag: 'kpop' },
  { id: 'ambient',    label: 'Ambient',     tag: 'ambient' },
  { id: 'lofi',       label: 'Lo-Fi',       tag: 'lofi' },
  { id: 'chillout',   label: 'Chillout',    tag: 'chillout' },
  { id: 'news',       label: 'News',        tag: 'news' },
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
      className={`lift group flex flex-col gap-2 p-3.5 rounded-[12px] cursor-pointer border ${
        active
          ? 'border-[var(--gold-d)] bg-[var(--gold-g)]'
          : 'border-[var(--bd)] bg-[var(--s1)] hover:bg-[var(--s2)] hover:border-[var(--bs)]'
      }`}
    >
      {/* Logo + name row */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-[6px] bg-[var(--s3)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--bd)]">
          {station.favicon && !imgError ? (
            <img
              src={safeImageUrl(station.favicon)}
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
    <div className="px-[40px] pt-[36px] pb-[48px] w-full">
      <PageHeader eyebrow="Discover" title="Radio" subtitle="Ad-free · high quality · live streams" />

      {/* Search — matches the Music search bar */}
      <form
        onSubmit={e => { e.preventDefault(); if (query.trim()) { if (searchTimeout.current) clearTimeout(searchTimeout.current); setLoading(true); searchStations(query).then(setStations).catch(() => {}).finally(() => setLoading(false)); } }}
        className="flex gap-3 mt-7 mb-6"
        style={{ maxWidth: 560 }}
      >
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tt)] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); if (!e.target.value) setGenre('top'); }}
            placeholder="Search stations…"
            className="w-full rounded-[12px] outline-none transition-all"
            style={{
              height: 52, paddingLeft: 46, paddingRight: 16, fontSize: 15,
              letterSpacing: '0.01em', color: 'var(--tp)', background: 'var(--s1)', border: '1px solid var(--bs)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold-d)'; e.currentTarget.style.background = 'var(--s2)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--bs)'; e.currentTarget.style.background = 'var(--s1)'; }}
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-[12px] cursor-pointer whitespace-nowrap hover:scale-[1.03] active:scale-95 transition-transform"
          style={{
            height: 52, padding: '0 26px', border: 'none',
            background: 'linear-gradient(135deg, var(--gold-b), var(--gold))', color: 'var(--obsidian)',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            boxShadow: '0 4px 18px var(--gold-d)',
          }}
        >
          <Search size={16} strokeWidth={2.5} />
          Search
        </button>
      </form>

      {/* Genre chips */}
      {!query.trim() && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-5">
          {GENRES.map(g => (
            <button
              key={g.id}
              onClick={() => setGenre(g.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                genre === g.id
                  ? 'bg-[var(--gold-g)] border-[var(--gold-d)] text-[var(--gold)]'
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
