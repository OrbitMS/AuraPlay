import React, { useContext } from 'react';
import { AudioContext } from '../context/AudioContext';
import type { Track } from '../context/AudioContext';
import { Download, Trash2 } from 'lucide-react';
import { safeImageUrl } from '../lib/safeUrl';

export const DownloadedView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const currentTrackId = ctx?.currentTrack?.id;
  const downloaded = ctx?.downloaded ?? [];

  const toTrack = (t: { id: string; title: string; artist: string; thumbnail: string }): Track => ({
    id: t.id, title: t.title, artist: t.artist, thumbnail: t.thumbnail,
  });

  const playFrom = (id: string) => {
    const tracks = downloaded.map(toTrack);
    const track = tracks.find(t => t.id === id);
    if (track) ctx?.playTrack(track, tracks);
  };

  return (
    <div className="px-[36px] pt-[32px] pb-[40px] w-full">
      <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em] leading-[1.1]" style={{ fontFamily: 'var(--fd)' }}>
        Downloaded
      </h1>
      <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>
        {downloaded.length} {downloaded.length === 1 ? 'track' : 'tracks'} · available offline
      </div>

      {downloaded.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
          <Download size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">No downloads yet</p>
          <p className="text-[11px] text-[var(--tt)] opacity-60" style={{ fontFamily: 'var(--fm)' }}>
            Click the download icon on any track to save it for offline listening
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={() => downloaded.length > 0 && playFrom(downloaded[0].id)}
            className="mt-6 mb-6 px-5 py-2.5 bg-[var(--gold)] text-[var(--obsidian)] border-none rounded-[7px] text-[11px] font-bold tracking-[0.07em] uppercase cursor-pointer hover:bg-[var(--gold-b)] transition-colors"
          >
            Play All
          </button>

          <div className="grid grid-cols-[30px_1fr_160px_38px] gap-x-[14px] px-[10px] pb-[8px] border-b border-[var(--bd)] mb-[2px]">
            {['#', 'Track', 'Artist', ''].map((h, i) => (
              <div key={i} className="text-[10px] text-[var(--ts)] tracking-[0.12em] uppercase font-semibold" style={{ fontFamily: 'var(--fm)' }}>{h}</div>
            ))}
          </div>

          <div className="flex flex-col">
            {downloaded.map((track, idx) => {
              const active = currentTrackId === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playFrom(track.id)}
                  className={`cv-row grid grid-cols-[30px_1fr_160px_38px] gap-x-[14px] items-center px-[10px] py-[7px] rounded-[5px] cursor-pointer border-l-2 transition-colors ${active ? 'bg-[var(--gold-g)] border-[var(--gold)]' : 'border-transparent hover:bg-white/[0.025]'}`}
                >
                  <span className="text-[10px] text-[var(--tt)] text-center" style={{ fontFamily: 'var(--fm)' }}>
                    {active ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" className="animate-spin-slow mx-auto">
                        <path d="M12 2a10 10 0 1 0 0 20"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {track.thumbnail ? (
                      <img src={safeImageUrl(track.thumbnail)} className={`w-11 h-11 rounded-[6px] object-cover bg-[var(--s2)] flex-shrink-0 border ${active ? 'border-[rgba(201,168,76,0.3)]' : 'border-[var(--bd)]'}`} />
                    ) : (
                      <div className={`w-11 h-11 rounded-[6px] bg-[var(--s2)] flex-shrink-0 border ${active ? 'border-[rgba(201,168,76,0.3)]' : 'border-[var(--bd)]'}`} />
                    )}
                    <span className={`text-[12px] font-medium tracking-[0.01em] truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>{track.title}</span>
                  </div>
                  <span className="text-[10px] text-[var(--ts)] truncate tracking-[0.02em]" style={{ fontFamily: 'var(--fm)' }}>{track.artist}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); ctx?.removeDownload(track.id); }}
                    title="Delete download"
                    className="flex items-center justify-center w-9 h-9 rounded-[7px] transition-colors hover:bg-white/[0.08] text-[var(--ts)] hover:text-red-400"
                  >
                    <Trash2 size={17} />
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
