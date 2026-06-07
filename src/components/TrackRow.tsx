import React from 'react';
import { safeImageUrl } from '../lib/safeUrl';
import { Play, Music2 } from 'lucide-react';

interface Props {
  index?: number;
  title: string;
  artist?: string;
  thumbnail?: string;
  active?: boolean;
  onPlay: () => void;
  /** Trailing action buttons (like/download/remove…), revealed on hover. */
  actions?: React.ReactNode;
  /** Trailing meta always visible (e.g. play count, duration). */
  meta?: React.ReactNode;
}

/**
 * Unified, modern track row: cover with hover-reveal play, index that becomes
 * a play glyph on hover, title/artist stack, an animated equalizer for the
 * active track, and hover-revealed trailing actions.
 */
export const TrackRow: React.FC<Props> = ({
  index, title, artist, thumbnail, active, onPlay, actions, meta,
}) => {
  return (
    <div
      onClick={onPlay}
      className="trow cv-row group grid items-center px-3 py-2 rounded-[10px] cursor-pointer"
      style={{
        gridTemplateColumns: `${index !== undefined ? '24px ' : ''}auto 1fr auto auto`,
        columnGap: 14,
        background: active ? 'var(--gold-g)' : 'transparent',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Index / play glyph */}
      {index !== undefined && (
        <div className="relative w-6 h-6 flex items-center justify-center flex-shrink-0">
          {active ? (
            <span className="flex items-end gap-[2px] h-3.5">
              <i className="eqbar" style={{ animationDelay: '0ms' }} />
              <i className="eqbar" style={{ animationDelay: '180ms' }} />
              <i className="eqbar" style={{ animationDelay: '360ms' }} />
            </span>
          ) : (
            <>
              <span className="trow-num text-[12px] tabular-nums" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>{index}</span>
              <Play size={13} fill="var(--tp)" stroke="var(--tp)" className="trow-play absolute" />
            </>
          )}
        </div>
      )}

      {/* Cover */}
      <div className="relative w-12 h-12 rounded-[8px] overflow-hidden flex-shrink-0"
        style={{ background: 'var(--s2)', border: `1px solid ${active ? 'var(--gold-d)' : 'var(--bd)'}`, boxShadow: active ? '0 0 0 1px var(--gold-d), 0 4px 14px var(--gold-g)' : 'none' }}>
        {thumbnail
          ? <img src={safeImageUrl(thumbnail)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.08]" />
          : <div className="w-full h-full flex items-center justify-center"><Music2 size={16} className="text-[var(--tt)]" /></div>}
        {index === undefined && (
          <div className="trow-hover absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
            <Play size={16} fill="var(--tp)" stroke="var(--tp)" />
          </div>
        )}
      </div>

      {/* Title + artist */}
      <div className="min-w-0">
        <p className="text-[14px] font-medium truncate" style={{ color: active ? 'var(--gold)' : 'var(--tp)' }}>{title}</p>
        {artist && <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--ts)' }}>{artist}</p>}
      </div>

      {/* Meta (always visible) */}
      <div className="flex items-center justify-end">{meta}</div>

      {/* Actions (hover) */}
      <div className="trow-hover flex items-center gap-1 justify-end">{actions}</div>
    </div>
  );
};
