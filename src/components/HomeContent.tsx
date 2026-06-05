import React, { useEffect, useState, useContext } from 'react';
import {
  getHomeFeed,
  getExploreSections,
  getRelatedTracks,
  getAlbumTracks,
} from '../services/youtube';
import { AudioContext, type Track } from '../context/AudioContext';
import { useHistory } from '../hooks/useHistory';
import { useLikes } from '../hooks/useLikes';
import { Heart, Play, Disc3 } from 'lucide-react';

type SongCard = {
  id: string;
  name: string;
  artists: { name: string }[];
  thumbnails: { url: string }[];
  itemType?: 'song' | 'video' | 'album';
};

/* ── Recommendation cache (sessionStorage, 30-min TTL) ─────────────────────────
   Recommendations are expensive (multiple InnerTube round-trips). Caching them
   lets the Home page render instantly on revisit/restart, then refresh quietly
   in the background. */
const REC_TTL_MS = 30 * 60 * 1000;
function recRead<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`rec_${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > REC_TTL_MS) return null;
    return data as T;
  } catch { return null; }
}
function recWrite(key: string, data: unknown) {
  try { sessionStorage.setItem(`rec_${key}`, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/* ─────────────────────────── TrackCard ──────────────────────────────────── */
const TrackCard = React.memo(function TrackCard({
  song, onPlay, active, loading: cardLoading,
}: {
  song: SongCard; onPlay: () => void; active: boolean; loading?: boolean;
}) {
  const { toggle, isLiked } = useLikes();
  const liked = isLiked(song.id);
  const isAlbum = song.itemType === 'album';
  const track: Track = {
    id: song.id, title: song.name,
    artist: song.artists?.[0]?.name ?? '',
    thumbnail: song.thumbnails?.[0]?.url ?? '',
  };

  return (
    <div
      onClick={onPlay}
      className={`group relative cursor-pointer rounded-[8px] p-2 transition-colors ${
        active ? 'bg-[var(--gold-g)]' : 'hover:bg-white/[0.04]'
      }`}
    >
      <div className="relative mb-2">
        {song.thumbnails?.[0]?.url ? (
          <img
            src={song.thumbnails[0].url}
            alt={song.name}
            className={`w-full aspect-square object-cover border bg-[var(--s2)] ${
              isAlbum ? 'rounded-[3px]' : 'rounded-[6px]'
            } ${active ? 'border-[rgba(201,168,76,0.4)]' : 'border-[var(--bd)]'}`}
          />
        ) : (
          <div className={`w-full aspect-square border bg-[var(--s2)] flex items-center justify-center ${
            isAlbum ? 'rounded-[3px]' : 'rounded-[6px]'
          } ${active ? 'border-[rgba(201,168,76,0.4)]' : 'border-[var(--bd)]'}`}>
            {isAlbum && <Disc3 size={28} className="text-[var(--tt)] opacity-30" />}
          </div>
        )}

        {/* Album badge */}
        {isAlbum && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 flex items-center gap-1">
            <Disc3 size={8} className="text-[var(--gold)]" />
            <span className="text-[7px] text-[var(--gold)] font-bold tracking-[0.1em] uppercase" style={{ fontFamily: 'var(--fm)' }}>Album</span>
          </div>
        )}

        {/* Play / loading overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-[6px] bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {cardLoading ? (
            <div className="w-8 h-8 rounded-full bg-[var(--s3)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" className="animate-spin">
                <path d="M12 2a10 10 0 1 0 0 20"/>
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center shadow-lg">
              <Play size={12} fill="var(--obsidian)" stroke="var(--obsidian)" />
            </div>
          )}
        </div>

        {/* Like button */}
        {!isAlbum && (
          <button
            onClick={e => { e.stopPropagation(); toggle(track); }}
            title={liked ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >
            <Heart size={10} fill={liked ? '#c9a84c' : 'none'} stroke={liked ? '#c9a84c' : 'white'} />
          </button>
        )}
      </div>

      <p className={`text-[11px] font-medium truncate leading-tight ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>
        {song.name}
      </p>
      <p className="text-[10px] text-[var(--ts)] truncate mt-0.5 leading-tight" style={{ fontFamily: 'var(--fm)' }}>
        {song.artists?.[0]?.name}
      </p>
    </div>
  );
});

/* ─────────────────────────── Section ────────────────────────────────────── */
function Section({
  title, songs, onPlay, currentId, loading, loadingAlbumId,
}: {
  title: string;
  songs: SongCard[];
  onPlay: (song: SongCard, all: SongCard[]) => void;
  currentId?: string;
  loading?: boolean;
  loadingAlbumId?: string | null;
}) {
  if (!loading && songs.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-[14px] font-semibold text-[var(--tp)] mb-3 tracking-[-0.01em]">{title}</h2>
      {loading ? (
        /* Skeleton — same responsive grid */
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="w-full aspect-square rounded-[6px] bg-[var(--s2)] animate-pulse mb-2" />
              <div className="h-2.5 w-3/4 rounded bg-[var(--s3)] animate-pulse mb-1.5" />
              <div className="h-2 w-1/2 rounded bg-[var(--s3)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}
        >
          {songs.map(song => (
            <TrackCard
              key={song.id}
              song={song}
              active={currentId === song.id}
              loading={loadingAlbumId === song.id}
              onPlay={() => onPlay(song, songs)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── HomeContent ────────────────────────────────── */
type FeedSection = { title: string; tracks: SongCard[] };

export const HomeContent: React.FC = () => {
  const audioContext = useContext(AudioContext);
  const currentTrackId = audioContext?.currentTrack?.id;
  const { history } = useHistory();

  // Hydrate instantly from the session cache, then refresh in the background
  const cachedTrending = recRead<FeedSection[]>('trending');
  const cachedExplore  = recRead<FeedSection[]>('explore');
  const cachedForYou   = recRead<SongCard[]>('forYou');

  const [trending,   setTrending]   = useState<FeedSection[]>(cachedTrending ?? []);
  const [explore,    setExplore]    = useState<FeedSection[]>(cachedExplore ?? []);
  const [forYou,     setForYou]     = useState<SongCard[]>(cachedForYou ?? []);
  const [loadingMap, setLoadingMap] = useState({
    trending: !cachedTrending,
    explore:  !cachedExplore,
    forYou:   !cachedForYou,
  });
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);

  const setDone = (key: keyof typeof loadingMap) =>
    setLoadingMap(prev => ({ ...prev, [key]: false }));

  useEffect(() => {
    let cancelled = false;

    /* ── Trending: home feed ── */
    const SEED_ID = '4NRXx6U8ABQ'; // Blinding Lights — reliable seed
    getHomeFeed()
      .then(sections => {
        if (cancelled) return;
        if (sections.length > 0) {
          setTrending(sections);
          recWrite('trending', sections);
        } else {
          // Fallback: use automix from seed
          return getRelatedTracks(SEED_ID).then(tracks => {
            if (cancelled || tracks.length === 0) return;
            const s = [{
              title: 'Trending Now',
              tracks: tracks.slice(0, 12).map(t => ({
                id: t.id, name: t.title,
                artists: [{ name: t.artist }],
                thumbnails: [{ url: t.thumbnail }],
              })),
            }];
            setTrending(s);
            recWrite('trending', s);
          });
        }
      })
      .catch(() => {}) // Suppress — explore fallback covers this
      .finally(() => { if (!cancelled) setDone('trending'); });

    /* ── Explore: New Releases + Charts ── */
    getExploreSections()
      .then(sections => { if (!cancelled && sections.length > 0) { setExplore(sections); recWrite('explore', sections); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDone('explore'); });

    /* ── For You: related to most-recently-played history track ── */
    const recentId = history.find(t => !!t.id)?.id;
    const seedId = recentId ?? SEED_ID;
    getRelatedTracks(seedId)
      .then(tracks => {
        if (cancelled || tracks.length === 0) return;
        const cards = tracks.slice(0, 12).map(t => ({
          id: t.id, name: t.title,
          artists: [{ name: t.artist }],
          thumbnails: [{ url: t.thumbnail }],
        }));
        setForYou(cards);
        recWrite('forYou', cards);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDone('forYou'); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toTrack = (s: SongCard): Track => ({
    id: s.id, title: s.name,
    artist: s.artists?.[0]?.name ?? '',
    thumbnail: s.thumbnails?.[0]?.url ?? '',
  });

  const play = async (song: SongCard, all: SongCard[]) => {
    if (song.itemType === 'album') {
      setLoadingAlbumId(song.id);
      try {
        const tracks = await getAlbumTracks(song.id);
        if (tracks.length === 0) return;
        const mapped = tracks.map(t => ({
          id: t.id, title: t.title, artist: t.artist,
          thumbnail: t.thumbnail || song.thumbnails?.[0]?.url || '',
        }));
        audioContext?.playTrack(mapped[0], mapped);
      } catch (err) {
        console.error('Failed to load album tracks:', err);
      } finally {
        setLoadingAlbumId(null);
      }
      return;
    }
    const playable = all.filter(s => s.itemType !== 'album');
    audioContext?.playTrack(toTrack(song), playable.map(toTrack));
  };

  const historyCards: SongCard[] = history.map(t => ({
    id: t.id, name: t.title,
    artists: [{ name: t.artist }],
    thumbnails: [{ url: t.thumbnail }],
  }));

  return (
    <div>
      {/* Recently Played */}
      {historyCards.length > 0 && (
        <Section title="Recently Played" songs={historyCards} onPlay={play} currentId={currentTrackId} loadingAlbumId={loadingAlbumId} />
      )}

      {/* For You — history-seeded suggestions */}
      <Section
        title={history.length > 0 ? 'Based on Your History' : 'Recommended For You'}
        songs={forYou}
        onPlay={play}
        currentId={currentTrackId}
        loading={loadingMap.forYou && forYou.length === 0}
        loadingAlbumId={loadingAlbumId}
      />

      {/* Trending / home feed */}
      {loadingMap.trending && trending.length === 0 ? (
        <Section title="Trending Now" songs={[]} onPlay={() => {}} loading />
      ) : (
        trending.map(sec => (
          <Section
            key={sec.title}
            title={sec.title || 'Trending Now'}
            songs={sec.tracks}
            onPlay={play}
            currentId={currentTrackId}
            loadingAlbumId={loadingAlbumId}
          />
        ))
      )}

      {/* New Releases / Charts from Explore */}
      {loadingMap.explore && explore.length === 0 ? (
        <Section title="New Releases" songs={[]} onPlay={() => {}} loading />
      ) : (
        explore.map(sec => (
          <Section
            key={sec.title}
            title={sec.title || 'New Releases'}
            songs={sec.tracks}
            onPlay={play}
            currentId={currentTrackId}
            loadingAlbumId={loadingAlbumId}
          />
        ))
      )}
    </div>
  );
};
