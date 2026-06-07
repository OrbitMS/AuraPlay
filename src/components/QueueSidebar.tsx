import React, { useContext, useRef, useState } from 'react';
import { AudioContext } from '../context/AudioContext';
import { createPlaylist } from '../hooks/usePlaylists';
import { X, ListMusic, GripVertical, Trash2, Infinity, ListPlus, Check } from 'lucide-react';
import { safeImageUrl } from '../lib/safeUrl';

interface Props {
  onClose: () => void;
}

export const QueueSidebar: React.FC<Props> = ({ onClose }) => {
  const ctx = useContext(AudioContext);
  const dragIndexRef = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  if (!ctx) return null;
  const {
    queue, currentIndex, playAtIndex, removeFromQueue, reorderQueue, stopTrack,
    autoQueue, autoQueueStart, toggleAutoQueue,
  } = ctx;

  /* ── Drag-to-reorder ─────────────────────────────────────── */
  const onDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // Minimal ghost: use the row itself
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 12, 12);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(index);
  };

  const onDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from !== null && from !== toIndex) {
      reorderQueue(from, toIndex);
    }
    dragIndexRef.current = null;
    setDropTarget(null);
  };

  const onDragEnd = () => {
    dragIndexRef.current = null;
    setDropTarget(null);
  };

  const upNext = queue.slice(currentIndex + 1);
  const played = queue.slice(0, currentIndex);

  const saveQueue = () => {
    if (queue.length === 0) return;
    createPlaylist(`Queue · ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, queue);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 z-30 w-[340px] flex flex-col bg-[var(--obsidian)] border-l border-[var(--bd)] shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-[var(--bd)] flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <ListMusic size={18} className="text-[var(--gold)]" />
              <span className="text-[16px] font-bold text-[var(--tp)] tracking-[-0.01em]">Queue</span>
              <span className="text-[11px] text-[var(--tt)] ml-0.5" style={{ fontFamily: 'var(--fm)' }}>
                {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>
            <button
              onClick={onClose}
              title="Close queue"
              className="w-9 h-9 flex items-center justify-center rounded-[9px] text-[var(--tt)] hover:text-[var(--tp)] hover:bg-white/[0.06] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Action row — larger buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoQueue}
              title={autoQueue ? 'Auto-queue on — click to disable' : 'Auto-queue off — click to enable'}
              className={`flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[11px] font-semibold transition-colors ${
                autoQueue ? 'text-[var(--gold)] bg-[var(--gold-g)] border border-[var(--gold-d)]'
                  : 'text-[var(--ts)] border border-[var(--bd)] hover:text-[var(--tp)] hover:bg-white/[0.04]'
              }`}>
              <Infinity size={14} /> Auto
            </button>
            <button
              onClick={saveQueue}
              disabled={queue.length === 0}
              title="Save queue as a playlist"
              className="flex items-center justify-center gap-1.5 h-9 flex-1 rounded-[9px] text-[11px] font-semibold text-[var(--ts)] border border-[var(--bd)] hover:text-[var(--tp)] hover:bg-white/[0.04] transition-colors disabled:opacity-40">
              {saved ? <Check size={14} className="text-[var(--gold)]" /> : <ListPlus size={14} />}
              {saved ? 'Saved' : 'Save'}
            </button>
            {queue.length > 0 && (
              <button
                onClick={stopTrack}
                title="Clear queue"
                className="flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-[9px] text-[11px] font-semibold text-[var(--tt)] border border-[var(--bd)] hover:text-red-400 hover:border-red-400/40 hover:bg-white/[0.04] transition-colors">
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <ListMusic size={32} className="text-[var(--tt)] opacity-30" />
              <p className="text-[12px] text-[var(--tt)]">Queue is empty</p>
              <p className="text-[10px] text-[var(--tt)] opacity-50 leading-relaxed" style={{ fontFamily: 'var(--fm)' }}>
                Play a song to start the queue
              </p>
            </div>
          ) : (
            <div className="py-2">

              {/* Now Playing */}
              {currentIndex >= 0 && queue[currentIndex] && (
                <div className="px-3 mb-1">
                  <div className="px-2 py-1.5 text-[8px] font-bold tracking-[0.14em] uppercase text-[var(--tt)]">
                    Now Playing
                  </div>
                  <QueueRow
                    track={queue[currentIndex]}
                    index={currentIndex}
                    isActive
                    onPlay={() => {}}
                    onRemove={() => removeFromQueue(currentIndex)}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    isDropTarget={dropTarget === currentIndex}
                  />
                </div>
              )}

              {/* Up Next */}
              {upNext.length > 0 && (() => {
                // Split up-next into manually queued and auto-suggested
                const autoStart = autoQueueStart !== null ? Math.max(0, autoQueueStart - (currentIndex + 1)) : upNext.length;
                const manual = upNext.slice(0, autoStart);
                const suggested = upNext.slice(autoStart);
                return (
                  <div className="px-3 mt-2">
                    {manual.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-[8px] font-bold tracking-[0.14em] uppercase text-[var(--tt)]">
                          Up Next
                        </div>
                        {manual.map((track, i) => {
                          const queueIdx = currentIndex + 1 + i;
                          return (
                            <QueueRow
                              key={`${track.id}-${queueIdx}`}
                              track={track} index={queueIdx} isActive={false}
                              onPlay={() => playAtIndex(queueIdx)}
                              onRemove={() => removeFromQueue(queueIdx)}
                              onDragStart={onDragStart} onDragOver={onDragOver}
                              onDrop={onDrop} onDragEnd={onDragEnd}
                              isDropTarget={dropTarget === queueIdx}
                            />
                          );
                        })}
                      </>
                    )}
                    {suggested.length > 0 && (
                      <>
                        {/* Suggested divider */}
                        <div className="flex items-center gap-2 px-2 py-2 mt-1">
                          <div className="h-px flex-1 bg-[var(--bd)]" />
                          <div className="flex items-center gap-1 text-[8px] font-bold tracking-[0.14em] uppercase text-[var(--tt)]">
                            <Infinity size={8} className={autoQueue ? 'text-[var(--gold)]' : ''} />
                            Suggested
                          </div>
                          <div className="h-px flex-1 bg-[var(--bd)]" />
                        </div>
                        {suggested.map((track, i) => {
                          const queueIdx = currentIndex + 1 + autoStart + i;
                          return (
                            <QueueRow
                              key={`${track.id}-${queueIdx}`}
                              track={track} index={queueIdx} isActive={false}
                              onPlay={() => playAtIndex(queueIdx)}
                              onRemove={() => removeFromQueue(queueIdx)}
                              onDragStart={onDragStart} onDragOver={onDragOver}
                              onDrop={onDrop} onDragEnd={onDragEnd}
                              isDropTarget={dropTarget === queueIdx}
                            />
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Previously Played */}
              {played.length > 0 && (
                <div className="px-3 mt-2">
                  <div className="px-2 py-1.5 text-[8px] font-bold tracking-[0.14em] uppercase text-[var(--tt)]">
                    Previously Played
                  </div>
                  {played.map((track, i) => (
                    <QueueRow
                      key={`${track.id}-${i}`}
                      track={track}
                      index={i}
                      isActive={false}
                      dimmed
                      onPlay={() => playAtIndex(i)}
                      onRemove={() => removeFromQueue(i)}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      onDragEnd={onDragEnd}
                      isDropTarget={dropTarget === i}
                    />
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
};

/* ── Queue row ──────────────────────────────────────────────── */
interface RowProps {
  track: { id: string; title: string; artist: string; thumbnail: string };
  index: number;
  isActive: boolean;
  dimmed?: boolean;
  isDropTarget: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

const QueueRow: React.FC<RowProps> = ({
  track, index, isActive, dimmed, isDropTarget,
  onPlay, onRemove, onDragStart, onDragOver, onDrop, onDragEnd,
}) => (
  <div
    draggable
    onDragStart={e => onDragStart(e, index)}
    onDragOver={e => onDragOver(e, index)}
    onDrop={e => onDrop(e, index)}
    onDragEnd={onDragEnd}
    onClick={!isActive ? onPlay : undefined}
    className={[
      'group flex items-center gap-2.5 px-2 py-2 rounded-[8px] cursor-pointer select-none',
      'border-l-2 transition-colors',
      isActive
        ? 'bg-[var(--gold-g)] border-[var(--gold)]'
        : 'border-transparent hover:bg-white/[0.03]',
      dimmed ? 'opacity-40 hover:opacity-70' : '',
      isDropTarget ? 'outline outline-1 outline-[var(--gold)] outline-offset-[-1px]' : '',
    ].join(' ')}
  >
    {/* Drag handle */}
    <div className="text-[var(--tt)] opacity-0 group-hover:opacity-60 flex-shrink-0 cursor-grab active:cursor-grabbing transition-opacity">
      <GripVertical size={12} />
    </div>

    {/* Thumbnail */}
    {track.thumbnail ? (
      <img
        src={safeImageUrl(track.thumbnail)}
        alt=""
        className={`w-11 h-11 rounded-[7px] object-cover flex-shrink-0 border ${isActive ? 'border-[var(--gold-d)]' : 'border-[var(--bd)]'}`}
      />
    ) : (
      <div className="w-11 h-11 rounded-[7px] bg-[var(--s2)] flex-shrink-0 border border-[var(--bd)]" />
    )}

    {/* Text */}
    <div className="flex flex-col min-w-0 flex-1">
      <span className={`text-[12.5px] font-medium truncate leading-tight ${isActive ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>
        {track.title}
      </span>
      <span className="text-[10.5px] text-[var(--ts)] truncate leading-tight mt-0.5" style={{ fontFamily: 'var(--fm)' }}>
        {track.artist || 'Unknown Artist'}
      </span>
    </div>

    {/* Playing indicator / remove button */}
    {isActive ? (
      <div className="flex-shrink-0 ml-1">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" className="animate-spin-slow">
          <path d="M12 2a10 10 0 1 0 0 20"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </div>
    ) : (
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        title="Remove from queue"
        className="flex-shrink-0 ml-1 w-7 h-7 flex items-center justify-center rounded-[7px] text-[var(--tt)] hover:text-red-400 hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-all"
      >
        <X size={14} />
      </button>
    )}
  </div>
);
