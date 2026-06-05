import React, { useState, useRef, useEffect } from 'react';
import { usePlaylists, addTracksToPlaylist, createPlaylist } from '../hooks/usePlaylists';
import type { Track } from '../context/AudioContext';
import { Plus, Check, ListPlus } from 'lucide-react';

interface Props { track: Track; size?: number; }

export const AddToPlaylistButton: React.FC<Props> = ({ track, size = 13 }) => {
  const { playlists } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const add = (id: string) => {
    addTracksToPlaylist(id, [track]);
    setOpen(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div ref={ref} className="relative flex items-center justify-center">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Add to playlist"
        className="flex items-center justify-center w-7 h-7 rounded-[4px] transition-colors hover:bg-white/[0.06]"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: added ? 'var(--gold)' : 'var(--tt)' }}>
        {added ? <Check size={size} /> : <Plus size={size} />}
      </button>

      {open && (
        <div onClick={e => e.stopPropagation()}
          className="absolute right-0 bottom-[34px] z-40 rounded-[9px] overflow-hidden"
          style={{ width: 200, background: 'rgba(22,22,28,0.98)', border: '1px solid var(--bs)', boxShadow: '0 12px 36px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)', borderBottom: '1px solid var(--bd)' }}>
            Add to playlist
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {playlists.length === 0 && (
              <div className="px-3 py-2 text-[11px]" style={{ color: 'var(--tt)' }}>No playlists yet</div>
            )}
            {playlists.map(p => (
              <button key={p.id} onClick={() => add(p.id)}
                className="w-full text-left px-3 py-2 text-[12px] truncate transition-colors hover:bg-white/[0.06]"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tp)' }}>
                {p.name}
              </button>
            ))}
          </div>
          <button onClick={() => add(createPlaylist('New Playlist'))}
            className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-[12px] transition-colors hover:bg-white/[0.06]"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', borderTop: '1px solid var(--bd)' }}>
            <ListPlus size={13} /> New playlist
          </button>
        </div>
      )}
    </div>
  );
};
