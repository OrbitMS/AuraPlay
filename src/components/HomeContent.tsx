import React, { useEffect, useState, useContext } from 'react';
import { getHomeFeed, searchMusic } from '../services/youtube';
import { AudioContext, type Track } from '../context/AudioContext';
import { useHistory } from '../hooks/useHistory';
import { useLikes } from '../hooks/useLikes';
import { Heart, Play } from 'lucide-react';

type SongCard = {
  id: string;
  name: string;
  artists: { name: string }[];
  thumbnails: { url: string }[];
};

function TrackCard({
  song,
  onPlay,
  active,
}: {
  song: SongCard;
  onPlay: () => void;
  active: boolean;
}) {
  const { toggle, isLiked } = useLikes();
  const liked = isLiked(song.id);
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
            className={`w-full aspect-square object-cover rounded-[6px] border ${
              active ? 'border-[rgba(201,168,76,0.4)]' : 'border-[var(--bd)]'
            } bg-[var(--s2)]`}
          />
        ) : (
          <div className={`w-full aspect-square rounded-[6px] border bg-[var(--s2)] ${active ? 'border-[rgba(201,168,76,0.4)]' : 'border-[var(--bd)]'}`} />
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-[6px] bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center shadow-lg">
            <Play size={12} fill="var(--obsidian)" stroke="var(--obsidian)" />
          </div>
        </div>
        {/* Like button */}
        <button
          onClick={(e) => { e.stopPropagation(); toggle(track); }}
          title={liked ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        >
          <Heart size={10} fill={liked ? '#c9a84c' : 'none'} stroke={liked ? '#c9a84c' : 'white'} />
        </button>
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
}: {
  title: string;
  songs: SongCard[];
  onPlay: (song: SongCard, all: SongCard[]) => void;
  currentId?: string;
  loading?: boolean;
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

  useEffect(() => {
    let cancelled = false;

    const fallback = async () => {
      const tracks = await searchMusic('top hits 2024');
      if (!cancelled) setFeedSections([{ title: 'Popular Right Now', tracks: tracks.slice(0, 15) }]);
    };

    getHomeFeed()
      .then(async (sections) => {
        if (cancelled) return;
        if (sections.length > 0) {
          setFeedSections(sections);
        } else {
          console.warn('Home feed returned empty, falling back to popular search');
          await fallback();
        }
      })
      .catch(async (err) => {
        console.warn('Home feed failed, falling back to popular search:', err);
        if (!cancelled) await fallback().catch(() => {});
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const play = (song: SongCard, all: SongCard[]) => {
    const toTrack = (s: SongCard): Track => ({
      id: s.id,
      title: s.name,
      artist: s.artists?.[0]?.name ?? '',
      thumbnail: s.thumbnails?.[0]?.url ?? '',
    });
    audioContext?.playTrack(toTrack(song), all.map(toTrack));
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
          />
        ))
      )}
    </div>
  );
};
