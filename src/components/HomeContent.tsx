import React, { useEffect, useState, useContext } from 'react';
import { getHomeFeed, getRelatedTracks, getAlbumTracks } from '../services/youtube';
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

function TrackCard({
  song,
  onPlay,
  active,
  loading,
}: {
  song: SongCard;
  onPlay: () => void;
  active: boolean;
  loading?: boolean;
}) {
  const { toggle, isLiked } = useLikes();
  const liked = isLiked(song.id);
  const isAlbum = song.itemType === 'album';
  const track: Track = {
    id: song.id,
    title: song.name,
    artist: song.artists?.[0]?.name ?? '',
    thumbnail: song.thumbnails?.[0]?.url ?? '',
  };

  return (
    <div
      onClick={onPlay}
      className={`group relative flex-shrink-0 w-[120px] cursor-pointer rounded-[8px] p-2.5 transition-colors ${
        active ? 'bg-[var(--gold-g)]' : 'hover:bg-white/[0.04]'
      }`}
    >
      <div className="relative mb-2.5">
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
          {loading ? (
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

        {/* Like button — only for songs, not albums */}
        {!isAlbum && (
          <button
            onClick={(e) => { e.stopPropagation(); toggle(track); }}
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
}

function Section({
  title,
  songs,
  onPlay,
  currentId,
  loading,
  loadingAlbumId,
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
      <h2 className="text-[14px] font-semibold text-[var(--tp)] mb-3 tracking-[-0.01em]">
        {title}
      </h2>
      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[120px]">
              <div className="w-full aspect-square rounded-[6px] bg-[var(--s2)] animate-pulse mb-2.5" />
              <div className="h-2.5 w-3/4 rounded bg-[var(--s3)] animate-pulse mb-1.5" />
              <div className="h-2 w-1/2 rounded bg-[var(--s3)] animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {songs.map((song) => (
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

export const HomeContent: React.FC = () => {
  const audioContext = useContext(AudioContext);
  const currentTrackId = audioContext?.currentTrack?.id;
  const { history } = useHistory();
  const [feedSections, setFeedSections] = useState<{ title: string; tracks: SongCard[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAlbumId, setLoadingAlbumId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fallback: seed getRelatedTracks from a known-reliable YouTube Music video
    // (Blinding Lights by The Weeknd — consistently streamable worldwide)
    const fallback = async () => {
      const SEED_ID = '4NRXx6U8ABQ';
      const tracks = await getRelatedTracks(SEED_ID);
      if (!cancelled && tracks.length > 0) {
        const cards: SongCard[] = tracks.slice(0, 15).map(t => ({
          id: t.id, name: t.title, artists: [{ name: t.artist }], thumbnails: [{ url: t.thumbnail }],
        }));
        setFeedSections([{ title: 'Popular Right Now', tracks: cards }]);
      }
    };

    getHomeFeed()
      .then(async (sections) => {
        if (cancelled) return;
        if (sections.length > 0) {
          setFeedSections(sections);
        } else {
          console.warn('Home feed returned empty, falling back to related tracks');
          await fallback();
        }
      })
      .catch(async (err) => {
        console.warn('Home feed failed, falling back to related tracks:', err);
        if (!cancelled) await fallback().catch(() => {});
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const toTrack = (s: SongCard): Track => ({
    id: s.id,
    title: s.name,
    artist: s.artists?.[0]?.name ?? '',
    thumbnail: s.thumbnails?.[0]?.url ?? '',
  });

  const play = async (song: SongCard, _all: SongCard[]) => {
    if (song.itemType === 'album') {
      // Fetch album tracks, then play the first one with the rest queued
      setLoadingAlbumId(song.id);
      try {
        const albumTracks = await getAlbumTracks(song.id);
        if (albumTracks.length === 0) return;
        const tracks = albumTracks.map(t => ({
          id: t.id, title: t.title, artist: t.artist,
          thumbnail: t.thumbnail || song.thumbnails?.[0]?.url || '',
        }));
        audioContext?.playTrack(tracks[0], tracks);
      } catch (err) {
        console.error('Failed to load album tracks:', err);
      } finally {
        setLoadingAlbumId(null);
      }
      return;
    }
    // Regular song — only play songs (not albums) from the all-cards list
    const playableSongs = _all.filter(s => s.itemType !== 'album');
    audioContext?.playTrack(toTrack(song), playableSongs.map(toTrack));
  };

  const historyCards: SongCard[] = history.map((t) => ({
    id: t.id,
    name: t.title,
    artists: [{ name: t.artist }],
    thumbnails: [{ url: t.thumbnail }],
  }));

  return (
    <div>
      {/* Recently played */}
      {historyCards.length > 0 && (
        <Section
          title="Recently Played"
          songs={historyCards}
          onPlay={play}
          currentId={currentTrackId}
        />
      )}

      {/* Home feed sections from YouTube Music */}
      {loading && feedSections.length === 0 ? (
        <Section title="Popular Right Now" songs={[]} onPlay={() => {}} loading />
      ) : (
        feedSections.map((sec) => (
          <Section
            key={sec.title}
            title={sec.title || 'Popular Right Now'}
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
