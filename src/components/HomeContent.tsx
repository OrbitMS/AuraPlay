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
import { Heart, Play, Disc3, Download, CheckCircle, Loader } from 'lucide-react';
import { safeImageUrl } from '../lib/safeUrl';

const EMPTY_SET = new Set<string>();

type SongCard = {
  id: string;
  name: string;
  artists: { name: string }[];
  thumbnails: { url: string }[];
  itemType?: 'song' | 'video' | 'album';
};

/* ── Recommendation cache (localStorage, 30-min TTL) ───────────────────────────
   Recommendations are expensive (multiple InnerTube round-trips). Caching them
   in localStorage lets the Home page render instantly even after a full quit
   and cold start — stale-but-instant content shows first, then refreshes quietly
   in the background. */
const REC_TTL_MS = 30 * 60 * 1000;
function recRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`rec_${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > REC_TTL_MS) return null;
    return data as T;
  } catch { return null; }
}
function recWrite(key: string, data: unknown) {
  try { localStorage.setItem(`rec_${key}`, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/* ─────────────────────────── TrackCard ──────────────────────────────────── */
const TrackCard = React.memo(function TrackCard({
  song, onPlay, active, loading: cardLoading,
}: {
  song: SongCard; onPlay: () => void; active: boolean; loading?: boolean;
}) {
  const { toggle, isLiked } = useLikes();
  const ctx = useContext(AudioContext);
  const liked = isLiked(song.id);
  const isAlbum = song.itemType === 'album';
  const track: Track = {
    id: song.id, title: song.name,
    artist: song.artists?.[0]?.name ?? '',
    thumbnail: song.thumbnails?.[0]?.url ?? '',
  };
  const isDl   = (ctx?.downloadedIds ?? EMPTY_SET).has(song.id);
  const isDling = (ctx?.downloadingIds ?? EMPTY_SET).has(song.id);
  const onDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDl) ctx?.removeDownload(song.id); else ctx?.downloadTrack(track);
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
            src={safeImageUrl(song.thumbnails[0].url)}
            alt={song.name}
            className={`w-full aspect-square object-cover border bg-[var(--s2)] ${
              isAlbum ? 'rounded-[8px]' : 'rounded-[11px]'
            } ${active ? 'border-[var(--gold-d)]' : 'border-[var(--bd)]'}`}
          />
        ) : (
          <div className={`w-full aspect-square border bg-[var(--s2)] flex items-center justify-center ${
            isAlbum ? 'rounded-[8px]' : 'rounded-[11px]'
          } ${active ? 'border-[var(--gold-d)]' : 'border-[var(--bd)]'}`}>
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
        <div className="absolute inset-0 flex items-center justify-center rounded-[11px] bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
          {cardLoading ? (
            <div className="w-11 h-11 rounded-full bg-[var(--s3)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" className="animate-spin">
                <path d="M12 2a10 10 0 1 0 0 20"/>
              </svg>
            </div>
          ) : (
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'var(--irid)' }}>
              <Play size={16} fill="#0b0d12" stroke="#0b0d12" style={{ marginLeft: 2 }} />
            </div>
          )}
        </div>

        {/* Hover actions: favorite + download */}
        {!isAlbum && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); toggle(track); }}
              title={liked ? 'Remove from favorites' : 'Add to favorites'}
              className="w-7 h-7 rounded-full bg-black/65 flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Heart size={13} fill={liked ? 'var(--gold)' : 'none'} stroke={liked ? 'var(--gold)' : 'white'} />
            </button>
            <button
              onClick={onDownload}
              disabled={isDling}
              title={isDl ? 'Downloaded' : 'Download'}
              className="w-7 h-7 rounded-full bg-black/65 flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-60"
            >
              {isDling ? <Loader size={13} className="animate-spin text-[var(--gold)]" />
                : isDl ? <CheckCircle size={13} className="text-[var(--gold)]" />
                : <Download size={13} stroke="white" />}
            </button>
          </div>
        )}
      </div>

      <p className={`text-[12.5px] font-semibold truncate leading-tight ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>
        {song.name}
      </p>
      <p className="text-[11px] text-[var(--ts)] truncate mt-1 leading-tight" style={{ fontFamily: 'var(--fm)' }}>
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
    <div className="mb-9">
      <h2 className="text-[15px] font-bold text-[var(--tp)] mb-3.5 tracking-[-0.012em] px-0.5">{title}</h2>
      {loading ? (
        /* Skeleton — horizontal row */
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-shrink-0" style={{ width: CARD_W }}>
              <div className="w-full aspect-square rounded-[10px] bg-[var(--s2)] animate-pulse mb-2.5" />
              <div className="h-2.5 w-3/4 rounded bg-[var(--s3)] animate-pulse mb-1.5" />
              <div className="h-2 w-1/2 rounded bg-[var(--s3)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-1 -mx-1 px-1">
          {songs.map(song => (
            <div key={song.id} className="flex-shrink-0 snap-start" style={{ width: CARD_W }}>
              <TrackCard
                song={song}
                active={currentId === song.id}
                loading={loadingAlbumId === song.id}
                onPlay={() => onPlay(song, songs)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CARD_W = 162;

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

  const featured: SongCard | undefined =
    forYou[0] ?? trending[0]?.tracks?.[0] ?? explore[0]?.tracks?.[0];
  const featuredArt = featured?.thumbnails?.[0]?.url;

  return (
    <div>
      {/* Featured hero */}
      {featured && (
        <div className="relative mb-9 rounded-[20px] overflow-hidden">
          {/* blurred artwork backdrop */}
          {featuredArt && (
            <div className="absolute inset-0">
              <img src={safeImageUrl(featuredArt)} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(40px) saturate(1.4)', transform: 'scale(1.2)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(14,15,19,0.92) 0%, rgba(14,15,19,0.72) 45%, rgba(14,15,19,0.35) 100%)' }} />
            </div>
          )}
          <div className="relative flex items-center gap-6 p-6" style={{ minHeight: 196 }}>
            <div className="flex-shrink-0 grid place-items-center" style={{ width: 150, height: 150 }}>
              <div className="absolute pointer-events-none blob" style={{ width: 150, height: 150, background: 'var(--irid)', filter: 'blur(34px)', opacity: 0.4 }} />
              <div className="blob sheen relative w-full h-full" style={{ overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                {featuredArt
                  ? <img src={safeImageUrl(featuredArt)} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full" style={{ background: 'var(--s2)' }} />}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--gold)', fontFamily: 'var(--fm)' }}>Featured for you</div>
              <h2 className="font-extrabold leading-[1.05] truncate" style={{ fontSize: 30, letterSpacing: '-0.025em', color: 'var(--tp)', fontFamily: 'var(--fd)' }}>{featured.name}</h2>
              <p className="text-[13px] mt-1.5 truncate" style={{ color: 'var(--ts)' }}>{featured.artists?.[0]?.name}</p>
              <button onClick={() => play(featured, forYou.length ? forYou : (trending[0]?.tracks ?? []))}
                className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.06em] hover:scale-[1.03] active:scale-95 transition-transform"
                style={{ background: 'var(--irid)', color: '#0b0d12', border: 'none', cursor: 'pointer', boxShadow: '0 6px 22px var(--gold-g)' }}>
                <Play size={15} fill="#0b0d12" stroke="#0b0d12" /> Play
              </button>
            </div>
          </div>
        </div>
      )}

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
