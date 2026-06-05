import React, { useState, useContext } from 'react';
import { AudioContext } from '../context/AudioContext';
import {
  usePlaylists, deletePlaylist, renamePlaylist, removeTrackFromPlaylist, createPlaylist,
} from '../hooks/usePlaylists';
import { ImportPlaylistModal } from '../components/ImportPlaylistModal';
import { safeImageUrl } from '../lib/safeUrl';
import { ListMusic, Plus, Download, Trash2, ChevronLeft, Play, Pencil } from 'lucide-react';

export const PlaylistsView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const { playlists } = usePlaylists();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const selected = playlists.find(p => p.id === selectedId) ?? null;
  const currentTrackId = ctx?.currentTrack?.id;

  /* ── Detail view ── */
  if (selected) {
    return (
      <div className="px-[36px] pt-[32px] pb-[40px] w-full">
        <button onClick={() => { setSelectedId(null); setEditingName(false); }}
          className="flex items-center gap-1.5 text-[12px] mb-5 transition-colors hover:text-[var(--tp)]"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
          <ChevronLeft size={15} /> All Playlists
        </button>

        <div className="flex items-center gap-3">
          {editingName ? (
            <input autoFocus defaultValue={selected.name}
              onBlur={e => { renamePlaylist(selected.id, e.target.value); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="text-[28px] rounded-[6px] px-2 outline-none"
              style={{ fontFamily: 'var(--fd)', background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)' }} />
          ) : (
            <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em]" style={{ fontFamily: 'var(--fd)' }}>{selected.name}</h1>
          )}
          <button onClick={() => setEditingName(v => !v)} title="Rename" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tt)' }}>
            <Pencil size={15} />
          </button>
        </div>
        <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>
          {selected.tracks.length} {selected.tracks.length === 1 ? 'track' : 'tracks'}
        </div>

        <div className="flex items-center gap-2 mt-6 mb-6">
          <button onClick={() => selected.tracks.length && ctx?.playTrack(selected.tracks[0], selected.tracks)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[7px] text-[11px] font-bold uppercase tracking-[0.07em] cursor-pointer"
            style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none' }}>
            <Play size={13} fill="currentColor" /> Play All
          </button>
          <button onClick={() => { if (confirm(`Delete "${selected.name}"?`)) { deletePlaylist(selected.id); setSelectedId(null); } }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[7px] text-[11px] transition-colors hover:text-red-400"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--ts)', cursor: 'pointer' }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>

        {selected.tracks.length === 0 ? (
          <p className="text-[12px] mt-10 text-center" style={{ color: 'var(--tt)' }}>This playlist is empty.</p>
        ) : (
          <div className="flex flex-col">
            {selected.tracks.map((track, idx) => {
              const active = currentTrackId === track.id;
              return (
                <div key={track.id} onClick={() => ctx?.playTrack(track, selected.tracks)}
                  className={`cv-row grid grid-cols-[30px_1fr_160px_32px] gap-x-[14px] items-center px-[10px] py-[7px] rounded-[5px] cursor-pointer border-l-2 transition-colors ${active ? 'bg-[var(--gold-g)] border-[var(--gold)]' : 'border-transparent hover:bg-white/[0.025]'}`}>
                  <span className="text-[10px] text-[var(--tt)] text-center" style={{ fontFamily: 'var(--fm)' }}>{String(idx + 1).padStart(2, '0')}</span>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {track.thumbnail
                      ? <img src={safeImageUrl(track.thumbnail)} className={`w-9 h-9 rounded-[4px] object-cover bg-[var(--s2)] flex-shrink-0 border ${active ? 'border-[rgba(201,168,76,0.3)]' : 'border-[var(--bd)]'}`} />
                      : <div className="w-9 h-9 rounded-[4px] bg-[var(--s2)] flex-shrink-0 border border-[var(--bd)]" />}
                    <span className={`text-[12px] font-medium truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>{track.title}</span>
                  </div>
                  <span className="text-[10px] text-[var(--ts)] truncate" style={{ fontFamily: 'var(--fm)' }}>{track.artist}</span>
                  <button onClick={e => { e.stopPropagation(); removeTrackFromPlaylist(selected.id, track.id); }}
                    title="Remove" className="flex items-center justify-center w-7 h-7 rounded-[4px] hover:bg-white/[0.06] text-[var(--tt)] hover:text-red-400"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="px-[36px] pt-[32px] pb-[40px] w-full">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em]" style={{ fontFamily: 'var(--fd)' }}>Playlists</h1>
          <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>
            {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { const id = createPlaylist('New Playlist'); setSelectedId(id); setEditingName(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[11px] font-semibold"
            style={{ background: 'var(--s1)', border: '1px solid var(--bd)', color: 'var(--ts)', cursor: 'pointer' }}>
            <Plus size={14} /> New
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[11px] font-bold uppercase tracking-[0.06em]"
            style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
            <Download size={14} /> Import
          </button>
        </div>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
          <ListMusic size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">No playlists yet</p>
          <p className="text-[11px] text-[var(--tt)] opacity-60" style={{ fontFamily: 'var(--fm)' }}>
            Import from Spotify (CSV), a YouTube link, or create one
          </p>
        </div>
      ) : (
        <div className="grid gap-3 mt-7" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {playlists.map(p => (
            <div key={p.id} onClick={() => setSelectedId(p.id)}
              className="lift cursor-pointer rounded-[12px] p-4 group"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--s1)')}>
              <div className="w-full aspect-square rounded-[8px] mb-3 flex items-center justify-center overflow-hidden" style={{ background: 'var(--s3)' }}>
                {p.tracks[0]?.thumbnail
                  ? <img src={safeImageUrl(p.tracks[0].thumbnail)} className="w-full h-full object-cover" />
                  : <ListMusic size={32} className="text-[var(--tt)] opacity-40" />}
              </div>
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--tp)' }}>{p.name}</p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                {p.tracks.length} {p.tracks.length === 1 ? 'track' : 'tracks'}
              </p>
            </div>
          ))}
        </div>
      )}

      {showImport && (
        <ImportPlaylistModal
          onClose={() => setShowImport(false)}
          onCreated={id => { setShowImport(false); setSelectedId(id); }}
        />
      )}
    </div>
  );
};
