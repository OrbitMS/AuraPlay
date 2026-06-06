import React, { useContext } from 'react';
import { AudioContext } from '../context/AudioContext';
import type { Track } from '../context/AudioContext';
import { useLikes } from '../hooks/useLikes';
import { safeImageUrl } from '../lib/safeUrl';
import { Heart } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const audioContext = useContext(AudioContext);
  const currentTrackId = audioContext?.currentTrack?.id;
  const { liked, toggle } = useLikes();

  const playTrack = (track: Track) => {
    audioContext?.playTrack(track, liked);
  };

  return (
    <div className="px-[36px] pt-[32px] pb-[40px] w-full">
      <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em] leading-[1.1]" style={{ fontFamily: 'var(--fd)' }}>
        Favorites
      </h1>
      <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>
        {liked.length} {liked.length === 1 ? 'track' : 'tracks'}
      </div>

      {liked.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
          <Heart size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">No liked songs yet</p>
          <p className="text-[11px] text-[var(--tt)] opacity-60" style={{ fontFamily: 'var(--fm)' }}>
            Click the heart on any track to save it here
          </p>
        </div>
      ) : (
        <>
          {/* Play all */}
          <button
            onClick={() => liked.length > 0 && playTrack(liked[0])}
            className="mt-6 mb-6 px-5 py-2.5 bg-[var(--gold)] text-[var(--obsidian)] border-none rounded-[7px] text-[11px] font-bold tracking-[0.07em] uppercase cursor-pointer hover:bg-[var(--gold-b)] transition-colors"
          >
            Play All
          </button>

          {/* Column headers */}
          <div className="grid grid-cols-[30px_1fr_160px_38px] gap-x-[14px] px-[10px] pb-[8px] border-b border-[var(--bd)] mb-[2px]">
            {['#', 'Track', 'Artist', ''].map((h, i) => (
              <div key={i} className="text-[10px] text-[var(--ts)] tracking-[0.12em] uppercase font-semibold" style={{ fontFamily: 'var(--fm)' }}>{h}</div>
            ))}
          </div>

          <div className="flex flex-col">
            {liked.map((track, idx) => {
              const active = currentTrackId === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`cv-row grid grid-cols-[30px_1fr_160px_38px] gap-x-[14px] items-center px-[10px] py-[7px] rounded-[5px] cursor-pointer border-l-2 transition-colors ${active ? 'bg-[var(--gold-g)] border-[var(--gold)]' : 'border-transparent hover:bg-white/[0.025]'}`}
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
                    <img
                      src={safeImageUrl(track.thumbnail)}
                      className={`w-11 h-11 rounded-[6px] object-cover bg-[var(--s2)] flex-shrink-0 border ${active ? 'border-[rgba(201,168,76,0.3)]' : 'border-[var(--bd)]'}`}
                    />
                    <span className={`text-[12px] font-medium tracking-[0.01em] truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>
                      {track.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--ts)] truncate tracking-[0.02em]" style={{ fontFamily: 'var(--fm)' }}>
                    {track.artist}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggle(track); }}
                    title="Remove from favorites"
                    className="flex items-center justify-center w-9 h-9 rounded-[7px] transition-colors hover:bg-white/[0.08]"
                  >
                    <Heart size={18} fill="#c9a84c" stroke="#c9a84c" />
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
