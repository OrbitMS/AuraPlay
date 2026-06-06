import React, { useContext } from 'react';
import { AudioContext } from '../context/AudioContext';
import type { Track } from '../context/AudioContext';
import { PageHeader } from '../components/PageHeader';
import { TrackRow } from '../components/TrackRow';
import { Download, Trash2, Play } from 'lucide-react';

export const DownloadedView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const currentTrackId = ctx?.currentTrack?.id;
  const downloaded = ctx?.downloaded ?? [];

  const toTrack = (t: { id: string; title: string; artist: string; thumbnail: string }): Track => ({
    id: t.id, title: t.title, artist: t.artist, thumbnail: t.thumbnail,
  });
  const play = (id: string) => {
    const tracks = downloaded.map(toTrack);
    const t = tracks.find(x => x.id === id);
    if (t) ctx?.playTrack(t, tracks);
  };

  return (
    <div className="px-[40px] pt-[36px] pb-[48px] w-full">
      <PageHeader
        eyebrow="Library"
        title="Downloaded"
        subtitle={`${downloaded.length} ${downloaded.length === 1 ? 'track' : 'tracks'} · available offline`}
        actions={downloaded.length > 0 ? (
          <button onClick={() => play(downloaded[0].id)}
            className="play-fab rounded-full" style={{ width: 52, height: 52 }} title="Play all">
            <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
          </button>
        ) : undefined}
      />

      {downloaded.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-28 gap-3 text-center">
          <Download size={38} className="opacity-25" style={{ color: 'var(--tt)' }} />
          <p className="text-[14px]" style={{ color: 'var(--ts)' }}>No downloads yet</p>
          <p className="text-[12px]" style={{ color: 'var(--tt)' }}>Tap the download icon on any track to save it offline</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {downloaded.map((track, i) => (
            <TrackRow
              key={track.id}
              index={i + 1}
              title={track.title}
              artist={track.artist}
              thumbnail={track.thumbnail}
              active={currentTrackId === track.id}
              onPlay={() => play(track.id)}
              actions={
                <button onClick={e => { e.stopPropagation(); ctx?.removeDownload(track.id); }} title="Delete download"
                  className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/[0.08] text-[var(--ts)] hover:text-red-400"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
