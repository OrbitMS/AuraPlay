import React, { useState, useContext } from 'react';
import { AudioContext, type Track } from '../context/AudioContext';
import { searchArchive, getArchiveItemTracks, type ArchiveItem } from '../services/archive';
import { safeImageUrl } from '../lib/safeUrl';
import { rankItems } from '../lib/rankResults';
import { Search, Library, ChevronLeft, Play, Loader, Disc3 } from 'lucide-react';

export const ArchiveView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const currentTrackId = ctx?.currentTrack?.id;
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [openItem, setOpenItem] = useState<ArchiveItem | null>(null);
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const res = await searchArchive(query);
      // Blend Archive's download-count popularity with query relevance
      setItems(rankItems(res, it => ({ id: it.identifier, title: it.title, artist: it.creator, views: it.downloads }), query, new Set(), []));
    }
    catch { setItems([]); }
    finally { setLoading(false); }
  };

  const openAndLoad = async (item: ArchiveItem) => {
    setOpenItem(item); setTracks(null); setLoadingTracks(true);
    try { setTracks(await getArchiveItemTracks(item.identifier)); }
    catch { setTracks([]); }
    finally { setLoadingTracks(false); }
  };

  /* ── Item detail ── */
  if (openItem) {
    return (
      <div className="px-[36px] pt-[32px] pb-[40px] w-full">
        <button onClick={() => setOpenItem(null)}
          className="flex items-center gap-1.5 text-[12px] mb-5 hover:text-[var(--tp)]"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ts)' }}>
          <ChevronLeft size={15} /> Back to results
        </button>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-[8px] overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--s3)' }}>
            <img src={safeImageUrl(openItem.thumbnail)} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[24px] text-[var(--tp)] tracking-[-0.01em] truncate" style={{ fontFamily: 'var(--fd)' }}>{openItem.title}</h1>
            <p className="text-[11px] text-[var(--ts)] mt-1 truncate" style={{ fontFamily: 'var(--fm)' }}>{openItem.creator || 'Internet Archive'}</p>
          </div>
        </div>

        {loadingTracks ? (
          <div className="flex items-center gap-2 mt-8 text-[12px]" style={{ color: 'var(--ts)' }}><Loader size={15} className="animate-spin" /> Loading tracks…</div>
        ) : !tracks || tracks.length === 0 ? (
          <p className="text-[12px] mt-8" style={{ color: 'var(--tt)' }}>No playable audio found in this item.</p>
        ) : (
          <>
            <button onClick={() => ctx?.playTrack(tracks[0], tracks)}
              className="flex items-center gap-2 mt-6 mb-5 px-5 py-2.5 rounded-[7px] text-[11px] font-bold uppercase tracking-[0.07em]"
              style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none', cursor: 'pointer' }}>
              <Play size={13} fill="currentColor" /> Play All ({tracks.length})
            </button>
            <div className="flex flex-col">
              {tracks.map((t, i) => {
                const active = currentTrackId === t.id;
                return (
                  <div key={t.id} onClick={() => ctx?.playTrack(t, tracks)}
                    className={`cv-row grid grid-cols-[30px_1fr] gap-x-[14px] items-center px-[10px] py-[8px] rounded-[5px] cursor-pointer border-l-2 ${active ? 'bg-[var(--gold-g)] border-[var(--gold)]' : 'border-transparent hover:bg-white/[0.025]'}`}>
                    <span className="text-[10px] text-[var(--tt)] text-center" style={{ fontFamily: 'var(--fm)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={`text-[12px] truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>{t.title}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Search + results ── */
  return (
    <div className="px-[36px] pt-[32px] pb-[40px] w-full">
      <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em]" style={{ fontFamily: 'var(--fd)' }}>Internet Archive</h1>
      <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase" style={{ fontFamily: 'var(--fm)' }}>
        Live Music · Public Domain · Free &amp; Legal
      </div>

      <form onSubmit={doSearch} className="flex gap-3 mt-7 mb-7" style={{ maxWidth: 560 }}>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tt)] pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search concerts, albums, artists…"
            className="w-full rounded-[12px] outline-none"
            style={{ height: 52, paddingLeft: 46, paddingRight: 16, fontSize: 15, background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)' }} />
        </div>
        <button type="submit" disabled={loading}
          className="flex items-center justify-center gap-2 rounded-[12px] hover:scale-[1.03] transition-transform disabled:opacity-60"
          style={{ height: 52, padding: '0 26px', border: 'none', background: 'linear-gradient(135deg, var(--gold-b), var(--gold))', color: 'var(--obsidian)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer' }}>
          {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} strokeWidth={2.5} />} Search
        </button>
      </form>

      {!searched ? (
        <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
          <Library size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">Search the Internet Archive</p>
          <p className="text-[11px] text-[var(--tt)] opacity-60" style={{ fontFamily: 'var(--fm)' }}>Thousands of legal live recordings, albums and rarities</p>
        </div>
      ) : loading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}><div className="w-full aspect-square rounded-[8px] bg-[var(--s2)] animate-pulse mb-2" /><div className="h-2.5 w-3/4 rounded bg-[var(--s3)] animate-pulse" /></div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-[12px] mt-10 text-center" style={{ color: 'var(--tt)' }}>No results.</p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {items.map(it => (
            <div key={it.identifier} onClick={() => openAndLoad(it)}
              className="lift group cursor-pointer rounded-[12px] p-3"
              style={{ background: 'var(--s1)', border: '1px solid var(--bd)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--s1)')}>
              <div className="w-full aspect-square rounded-[7px] overflow-hidden mb-2.5 flex items-center justify-center" style={{ background: 'var(--s3)' }}>
                <img src={safeImageUrl(it.thumbnail)} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
              </div>
              <p className="text-[12px] font-medium truncate" style={{ color: 'var(--tp)' }}>{it.title}</p>
              <p className="text-[10px] truncate mt-0.5 flex items-center gap-1" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                <Disc3 size={9} /> {it.creator || 'Archive'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
