import React, { useState, useContext } from 'react';
import { AudioContext } from '../context/AudioContext';
import {
  usePlaylists, deletePlaylist, renamePlaylist, removeTrackFromPlaylist, createPlaylist,
} from '../hooks/usePlaylists';
import { ImportPlaylistModal } from '../components/ImportPlaylistModal';
import { PageHeader } from '../components/PageHeader';
import { TrackRow } from '../components/TrackRow';
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

  /* ── Detail ── */
  if (selected) {
    const cover = selected.tracks[0]?.thumbnail;
    return (
      <div className="px-[40px] pt-[28px] pb-[48px] w-full">
        <button onClick={() => { setSelectedId(null); setEditingName(false); }}
          className="flex items-center gap-1.5 text-[12px] mb-6 transition-colors hover:text-[var(--tp)]"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
          <ChevronLeft size={15} /> All Playlists
        </button>

        <PageHeader
          eyebrow="Playlist"
          title={selected.name}
          subtitle={`${selected.tracks.length} ${selected.tracks.length === 1 ? 'track' : 'tracks'}`}
          cover={
            <div className="rounded-[14px] overflow-hidden flex items-center justify-center"
              style={{ width: 168, height: 168, background: 'var(--s2)', border: '1px solid var(--bd)', boxShadow: 'var(--sh2)' }}>
              {cover ? <img src={safeImageUrl(cover)} alt="" className="w-full h-full object-cover" /> : <ListMusic size={48} className="opacity-30" style={{ color: 'var(--tt)' }} />}
            </div>
          }
          actions={
            <>
              <button onClick={() => setEditingName(v => !v)} title="Rename"
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/[0.08]"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
                <Pencil size={16} />
              </button>
              <button onClick={() => { if (confirm(`Delete "${selected.name}"?`)) { deletePlaylist(selected.id); setSelectedId(null); } }} title="Delete playlist"
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/[0.08] text-[var(--ts)] hover:text-red-400"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={16} />
              </button>
              {selected.tracks.length > 0 && (
                <button onClick={() => ctx?.playTrack(selected.tracks[0], selected.tracks)}
                  className="play-fab rounded-full" style={{ width: 56, height: 56 }} title="Play all">
                  <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
                </button>
              )}
            </>
          }
        >
          {editingName && (
            <input autoFocus defaultValue={selected.name}
              onBlur={e => { renamePlaylist(selected.id, e.target.value); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              className="text-[16px] rounded-[8px] px-3 py-2 outline-none w-full max-w-[320px]"
              style={{ background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)' }} />
          )}
        </PageHeader>

        {selected.tracks.length === 0 ? (
          <p className="text-[13px] mt-10 text-center" style={{ color: 'var(--tt)' }}>This playlist is empty.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {selected.tracks.map((track, i) => (
              <TrackRow key={track.id} index={i + 1} title={track.title} artist={track.artist}
                thumbnail={track.thumbnail} active={currentTrackId === track.id}
                onPlay={() => ctx?.playTrack(track, selected.tracks)}
                actions={
                  <button onClick={e => { e.stopPropagation(); removeTrackFromPlaylist(selected.id, track.id); }} title="Remove"
                    className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/[0.08] text-[var(--ts)] hover:text-red-400"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                } />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── List ── */
  return (
    <div className="px-[40px] pt-[36px] pb-[48px] w-full">
      <PageHeader
        eyebrow="Library"
        title="Playlists"
        subtitle={`${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}`}
        actions={
          <>
            <button onClick={() => { const id = createPlaylist('New Playlist'); setSelectedId(id); setEditingName(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12px] font-semibold"
              style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--tp)', cursor: 'pointer' }}>
              <Plus size={15} /> New
            </button>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12px] font-bold"
              style={{ background: 'linear-gradient(135deg, var(--gold-b), var(--gold))', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
              <Download size={15} /> Import
            </button>
          </>
        }
      />

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-28 gap-3 text-center">
          <ListMusic size={38} className="opacity-25" style={{ color: 'var(--tt)' }} />
          <p className="text-[14px]" style={{ color: 'var(--ts)' }}>No playlists yet</p>
          <p className="text-[12px]" style={{ color: 'var(--tt)' }}>Import from Spotify, a YouTube link, or create one</p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
          {playlists.map(p => (
            <div key={p.id} onClick={() => setSelectedId(p.id)}
              className="lift cursor-pointer rounded-[16px] p-4 group"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}>
              <div className="w-full aspect-square rounded-[12px] mb-3.5 flex items-center justify-center overflow-hidden relative" style={{ background: 'var(--s3)' }}>
                {p.tracks[0]?.thumbnail
                  ? <img src={safeImageUrl(p.tracks[0].thumbnail)} className="w-full h-full object-cover" />
                  : <ListMusic size={34} className="opacity-40" style={{ color: 'var(--tt)' }} />}
                <div className="lift absolute bottom-2 right-2 play-fab rounded-full opacity-0 group-hover:opacity-100" style={{ width: 44, height: 44 }}
                  onClick={e => { e.stopPropagation(); if (p.tracks.length) ctx?.playTrack(p.tracks[0], p.tracks); }}>
                  <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
                </div>
              </div>
              <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--tp)' }}>{p.name}</p>
              <p className="text-[11px] truncate mt-1" style={{ color: 'var(--ts)' }}>
                {p.tracks.length} {p.tracks.length === 1 ? 'track' : 'tracks'}
              </p>
            </div>
          ))}
        </div>
      )}

      {showImport && (
        <ImportPlaylistModal onClose={() => setShowImport(false)} onCreated={id => { setShowImport(false); setSelectedId(id); }} />
      )}
    </div>
  );
};
