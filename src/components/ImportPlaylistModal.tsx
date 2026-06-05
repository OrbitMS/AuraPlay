import React, { useState, useRef, useEffect } from 'react';
import { parseSourceList, matchSources, type MatchRow, type SourceTrack } from '../services/playlistImport';
import { getYouTubePlaylistTracks } from '../services/youtube';
import { getSpotifyTracks } from '../services/spotify';
import { isSpotifyConnected, getMySpotifyPlaylists, getSpotifyPlaylistTracksAuthed, type SpotifyPlaylist } from '../services/spotifyAuth';
import { createPlaylist } from '../hooks/usePlaylists';
import type { Track } from '../context/AudioContext';
import { X, FileText, Play, Music2, Check, AlertTriangle, XCircle, Loader, ListPlus } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCreated: (id: string) => void;
}

type Tab = 'paste' | 'spotify' | 'youtube';
type Stage = 'input' | 'matching' | 'review';

export const ImportPlaylistModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [tab, setTab] = useState<Tab>('paste');
  const [stage, setStage] = useState<Stage>('input');
  const [text, setText] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [name, setName] = useState('');
  const [myPlaylists, setMyPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const connected = isSpotifyConnected();

  // Load the user's Spotify playlists when the Spotify tab opens (if connected)
  useEffect(() => {
    if (tab === 'spotify' && connected && myPlaylists === null) {
      getMySpotifyPlaylists().then(setMyPlaylists).catch(() => setMyPlaylists([]));
    }
  }, [tab, connected, myPlaylists]);

  const importMyPlaylist = async (pl: SpotifyPlaylist) => {
    setError('');
    setStage('matching');
    setProgress({ done: 0, total: pl.trackCount });
    try {
      const tracks = await getSpotifyPlaylistTracksAuthed(pl.id);
      if (!name) setName(pl.name);
      setProgress({ done: 0, total: tracks.length });
      const result = await matchSources(tracks, (done, total) => setProgress({ done, total }));
      setRows(result);
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load that playlist.');
      setStage('input');
    }
  };
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(f);
  };

  const runMatch = async (sources: SourceTrack[], defaultName: string) => {
    if (!name) setName(defaultName);
    setStage('matching');
    setProgress({ done: 0, total: sources.length });
    const result = await matchSources(sources, (done, total) => setProgress({ done, total }));
    setRows(result);
    setStage('review');
  };

  const startPasteMatch = async () => {
    setError('');
    const sources = parseSourceList(text);
    if (sources.length === 0) { setError('No tracks found. Paste "Artist - Title" lines or a CSV export.'); return; }
    await runMatch(sources, 'Imported Playlist');
  };

  const startSpotify = async () => {
    setError('');
    if (!spotifyUrl.trim()) { setError('Paste a public Spotify playlist or album link.'); return; }
    setStage('matching');
    setProgress({ done: 0, total: 0 });
    try {
      const { name: plName, tracks } = await getSpotifyTracks(spotifyUrl);
      if (!name) setName(plName);
      setProgress({ done: 0, total: tracks.length });
      const result = await matchSources(tracks, (done, total) => setProgress({ done, total }));
      setRows(result);
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that Spotify link.');
      setStage('input');
    }
  };

  const startYouTube = async () => {
    setError('');
    if (!ytUrl.trim()) { setError('Paste a YouTube playlist link.'); return; }
    setStage('matching');
    setProgress({ done: 0, total: 0 });
    try {
      const tracks = await getYouTubePlaylistTracks(ytUrl);
      if (tracks.length === 0) { setError('No tracks found in that playlist (is it public?).'); setStage('input'); return; }
      setRows(tracks.map(t => ({ source: { title: t.title, artist: t.artist }, match: t, confidence: 'high', selected: true })));
      if (!name) setName('YouTube Playlist');
      setStage('review');
    } catch {
      setError('Could not load that playlist. Make sure the link is a public YouTube playlist.');
      setStage('input');
    }
  };

  const toggleRow = (i: number) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, selected: !r.selected && !!r.match } : r)));

  const create = () => {
    const tracks: Track[] = rows.filter(r => r.selected && r.match).map(r => r.match!);
    if (tracks.length === 0) { setError('Select at least one matched track.'); return; }
    const id = createPlaylist(name || 'Imported Playlist', tracks);
    onCreated(id);
  };

  const matchedCount = rows.filter(r => r.match).length;
  const selectedCount = rows.filter(r => r.selected && r.match).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="flex flex-col rounded-[14px] overflow-hidden"
        style={{ width: 620, maxHeight: '82vh', background: 'linear-gradient(180deg, #16161c, #0e0e12)', border: '1px solid var(--bs)', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-center gap-2.5">
            <ListPlus size={18} className="text-[var(--gold)]" />
            <span className="text-[15px] font-semibold" style={{ color: 'var(--tp)' }}>Import Playlist</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-white/[0.06]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {stage === 'input' && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {([['paste', 'Paste / CSV', FileText], ['spotify', 'Spotify Link', Music2], ['youtube', 'YouTube Link', Play]] as const).map(([id, label, Icon]) => (
                  <button key={id} onClick={() => { setTab(id); setError(''); }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold transition-colors"
                    style={{
                      background: tab === id ? 'var(--gold-g)' : 'var(--s1)',
                      border: `1px solid ${tab === id ? 'rgba(201,168,76,0.4)' : 'var(--bd)'}`,
                      color: tab === id ? 'var(--gold)' : 'var(--ts)', cursor: 'pointer',
                    }}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {tab === 'paste' && (
                <>
                  <p className="text-[11px] mb-2" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                    Paste one track per line as <b>Artist - Title</b>, or a CSV export (e.g. from Exportify for Spotify).
                  </p>
                  <textarea value={text} onChange={e => setText(e.target.value)}
                    placeholder={'Daft Punk - Get Lucky\nThe Weeknd - Blinding Lights\n…'}
                    className="w-full rounded-[8px] p-3 text-[12px] outline-none"
                    style={{ height: 200, background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)', resize: 'none', fontFamily: 'var(--fm)' }} />
                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-[7px] text-[11px]" style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--ts)', cursor: 'pointer' }}>
                      Upload CSV…
                    </button>
                    <input ref={fileRef} type="file" accept=".csv,.txt" onChange={onFile} className="hidden" />
                    <div className="flex-1" />
                    <button onClick={startPasteMatch} className="px-5 py-2 rounded-[7px] text-[11px] font-bold uppercase tracking-[0.06em]" style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
                      Match Tracks
                    </button>
                  </div>
                </>
              )}

              {tab === 'spotify' && (
                <>
                  <p className="text-[11px] mb-2" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                    Paste a <b>public</b> Spotify playlist or album link. Tracks are matched to YouTube Music.
                  </p>
                  <input value={spotifyUrl} onChange={e => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/…"
                    className="w-full rounded-[8px] px-3 py-3 text-[12px] outline-none"
                    style={{ background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)' }} />
                  <p className="text-[10px] mt-2 opacity-70" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>
                    Only public playlists; the first ~100 tracks are read. For private or huge playlists, use Paste / CSV.
                  </p>
                  <div className="flex justify-end mt-3">
                    <button onClick={startSpotify} className="px-5 py-2 rounded-[7px] text-[11px] font-bold uppercase tracking-[0.06em]" style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
                      Import from Spotify
                    </button>
                  </div>

                  {/* Connected account → your (private) playlists */}
                  {connected ? (
                    <div className="mt-5">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>
                        Your Spotify Playlists
                      </div>
                      {myPlaylists === null ? (
                        <div className="flex items-center gap-2 text-[11px] py-3" style={{ color: 'var(--ts)' }}>
                          <Loader size={13} className="animate-spin" /> Loading…
                        </div>
                      ) : myPlaylists.length === 0 ? (
                        <p className="text-[11px] py-2" style={{ color: 'var(--tt)' }}>No playlists found.</p>
                      ) : (
                        <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                          {myPlaylists.map(pl => (
                            <button key={pl.id} onClick={() => importMyPlaylist(pl)}
                              className="flex items-center gap-3 px-2.5 py-2 rounded-[6px] text-left transition-colors hover:bg-white/[0.05]"
                              style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                              <div className="w-9 h-9 rounded-[5px] overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--s3)' }}>
                                {pl.image ? <img src={pl.image} className="w-full h-full object-cover" /> : <Music2 size={14} className="text-[var(--tt)]" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] truncate" style={{ color: 'var(--tp)' }}>{pl.name}</p>
                                <p className="text-[10px]" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>{pl.trackCount} tracks</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] mt-4 opacity-70" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>
                      Want your private playlists? Connect Spotify in Settings.
                    </p>
                  )}
                </>
              )}

              {tab === 'youtube' && (
                <>
                  <p className="text-[11px] mb-2" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                    Paste a public <b>YouTube</b> or <b>YouTube Music</b> playlist link.
                  </p>
                  <input value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/playlist?list=…"
                    className="w-full rounded-[8px] px-3 py-3 text-[12px] outline-none"
                    style={{ background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)' }} />
                  <div className="flex justify-end mt-3">
                    <button onClick={startYouTube} className="px-5 py-2 rounded-[7px] text-[11px] font-bold uppercase tracking-[0.06em]" style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
                      Load Playlist
                    </button>
                  </div>
                </>
              )}
              {error && <p className="text-[11px] mt-3" style={{ color: '#e57373' }}>{error}</p>}
            </>
          )}

          {stage === 'matching' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader size={26} className="animate-spin text-[var(--gold)]" />
              <p className="text-[13px]" style={{ color: 'var(--tp)' }}>Matching tracks to YouTube Music…</p>
              {progress.total > 0 && (
                <>
                  <div className="w-[280px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s4)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%`, background: 'var(--gold)' }} />
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>{progress.done} / {progress.total}</p>
                </>
              )}
            </div>
          )}

          {stage === 'review' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Playlist name"
                  className="rounded-[7px] px-3 py-2 text-[13px] font-semibold outline-none flex-1 mr-3"
                  style={{ background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)' }} />
                <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                  {selectedCount} of {matchedCount} matched
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {rows.map((r, i) => (
                  <div key={i} onClick={() => toggleRow(i)}
                    className="flex items-center gap-3 px-2.5 py-2 rounded-[6px] cursor-pointer"
                    style={{ background: r.selected ? 'var(--gold-g)' : 'transparent', opacity: r.match ? 1 : 0.5 }}>
                    <span className="flex-shrink-0">
                      {r.confidence === 'high' ? <Check size={15} className="text-green-400" />
                        : r.confidence === 'low' ? <AlertTriangle size={15} className="text-[var(--gold)]" />
                        : <XCircle size={15} className="text-red-400" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] truncate" style={{ color: 'var(--tp)' }}>
                        {r.match ? r.match.title : r.source.title}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                        {r.match ? r.match.artist : r.source.artist || '—'}
                        {r.confidence === 'none' && ' · not found'}
                        {r.confidence === 'low' && ' · check match'}
                      </p>
                    </div>
                    {r.match && (
                      <span className="w-4 h-4 rounded-[4px] flex items-center justify-center flex-shrink-0"
                        style={{ border: `1.5px solid ${r.selected ? 'var(--gold)' : 'var(--tt)'}`, background: r.selected ? 'var(--gold)' : 'transparent' }}>
                        {r.selected && <Check size={11} className="text-[var(--obsidian)]" />}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {error && <p className="text-[11px] mt-3" style={{ color: '#e57373' }}>{error}</p>}
            </>
          )}
        </div>

        {/* Footer */}
        {stage === 'review' && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--bd)' }}>
            <button onClick={() => setStage('input')} className="px-4 py-2 rounded-[7px] text-[11px]" style={{ background: 'transparent', border: '1px solid var(--bd)', color: 'var(--ts)', cursor: 'pointer' }}>
              Back
            </button>
            <button onClick={create} className="px-5 py-2 rounded-[7px] text-[11px] font-bold uppercase tracking-[0.06em]" style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
              Create Playlist ({selectedCount})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
