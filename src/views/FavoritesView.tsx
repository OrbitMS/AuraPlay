import React, { useContext } from 'react';
import { AudioContext } from '../context/AudioContext';
import type { Track } from '../context/AudioContext';
import { useLikes } from '../hooks/useLikes';
import { PageHeader } from '../components/PageHeader';
import { TrackRow } from '../components/TrackRow';
import { Heart, Play } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const currentTrackId = ctx?.currentTrack?.id;
  const { liked, toggle } = useLikes();

  const play = (track: Track) => ctx?.playTrack(track, liked);

  return (
    <div className="px-[40px] pt-[36px] pb-[48px] w-full">
      <PageHeader
        eyebrow="Library"
        title="Favorites"
        subtitle={`${liked.length} ${liked.length === 1 ? 'track' : 'tracks'}`}
        actions={liked.length > 0 ? (
          <button onClick={() => play(liked[0])}
            className="play-fab rounded-full" style={{ width: 52, height: 52 }} title="Play all">
            <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
          </button>
        ) : undefined}
      />

      {liked.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-0.5">
          {liked.map((track, i) => (
            <TrackRow
              key={track.id}
              index={i + 1}
              title={track.title}
              artist={track.artist}
              thumbnail={track.thumbnail}
              active={currentTrackId === track.id}
              onPlay={() => play(track)}
              actions={
                <button onClick={e => { e.stopPropagation(); toggle(track); }} title="Remove from favorites"
                  className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/[0.08]"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Heart size={17} fill="var(--gold)" stroke="var(--gold)" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Empty = () => (
  <div className="flex flex-col items-center justify-center mt-28 gap-3 text-center">
    <Heart size={38} className="opacity-25" style={{ color: 'var(--tt)' }} />
    <p className="text-[14px]" style={{ color: 'var(--ts)' }}>No liked songs yet</p>
    <p className="text-[12px]" style={{ color: 'var(--tt)' }}>Tap the heart on any track to save it here</p>
  </div>
);
