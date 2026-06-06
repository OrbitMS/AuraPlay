import React, { useState, useEffect, useContext } from 'react';
import { searchVideos, type VideoResult } from '../services/youtube';
import { AudioContext } from '../context/AudioContext';
import { PageHeader } from '../components/PageHeader';
import { VideoPlayer } from '../components/VideoPlayer';
import { safeImageUrl } from '../lib/safeUrl';
import { Search, Loader, Play, Video } from 'lucide-react';

function fmtDur(s?: number): string {
  if (!s || !isFinite(s)) return '';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${(m % 60).toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m}:${sec.toString().padStart(2, '0')}`;
}
function fmtViews(v?: number): string {
  if (!v) return '';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B views`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M views`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K views`;
  return `${v} views`;
}

const SUGGESTED = ['Official music video', 'Live performance', 'Lo-fi mix', 'New music videos 2026'];

export const VideosView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [playing, setPlaying] = useState<VideoResult | null>(null);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setSearched(true);
    try { setResults(await searchVideos(q)); }
    catch { setResults([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { run('Official music video'); /* eslint-disable-next-line */ }, []);

  const open = (v: VideoResult) => {
    // Pause audio playback so the two don't overlap
    if (ctx?.isPlaying) ctx.togglePlay();
    setPlaying(v);
  };

  return (
    <div className="px-[40px] pt-[36px] pb-[48px] w-full">
      <PageHeader eyebrow="Discover" title="Music Videos" subtitle="Official videos · live sets · visualizers" />

      <form onSubmit={e => { e.preventDefault(); run(query); }} className="flex gap-3 mt-7 mb-5" style={{ maxWidth: 560 }}>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tt)] pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search music videos…"
            className="w-full rounded-[12px] outline-none transition-all"
            style={{ height: 52, paddingLeft: 46, paddingRight: 16, fontSize: 15, color: 'var(--tp)', background: 'var(--s1)', border: '1px solid var(--bs)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold-d)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--bs)'; }} />
        </div>
        <button type="submit" disabled={loading}
          className="flex items-center justify-center gap-2 rounded-[12px] hover:scale-[1.03] active:scale-95 transition-transform disabled:opacity-60"
          style={{ height: 52, padding: '0 26px', border: 'none', background: 'var(--irid)', color: '#0b0d12', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer' }}>
          {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} strokeWidth={2.5} />} Search
        </button>
      </form>

      {/* Suggested chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-6">
        {SUGGESTED.map(s => (
          <button key={s} onClick={() => { setQuery(s); run(s); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all"
            style={{ background: 'var(--s1)', borderColor: 'var(--bd)', color: 'var(--ts)', cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i}>
              <div className="w-full rounded-[12px] bg-[var(--s2)] animate-pulse" style={{ aspectRatio: '16/9' }} />
              <div className="h-3 w-3/4 rounded bg-[var(--s3)] animate-pulse mt-2.5" />
              <div className="h-2.5 w-1/2 rounded bg-[var(--s3)] animate-pulse mt-1.5" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 gap-3 text-center">
          <Video size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">{searched ? 'No videos found' : 'Search for music videos'}</p>
        </div>
      ) : (
        <div className="grid gap-x-4 gap-y-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {results.map(v => (
            <div key={v.id} onClick={() => open(v)} className="group cursor-pointer">
              <div className="relative w-full rounded-[12px] overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--s2)' }}>
                {v.thumbnail
                  ? <img src={safeImageUrl(v.thumbnail)} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  : <div className="w-full h-full flex items-center justify-center"><Video size={28} className="text-[var(--tt)] opacity-40" /></div>}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--irid)', boxShadow: '0 0 24px var(--gold-g)' }}>
                    <Play size={22} fill="#0b0d12" stroke="#0b0d12" style={{ marginLeft: 2 }} />
                  </div>
                </div>
                {v.duration ? (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums"
                    style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', fontFamily: 'var(--fm)' }}>{fmtDur(v.duration)}</span>
                ) : null}
              </div>
              <p className="text-[13px] font-medium mt-2.5 leading-snug line-clamp-2" style={{ color: 'var(--tp)' }}>{v.title}</p>
              <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                {v.author}{v.views ? ` · ${fmtViews(v.views)}` : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {playing && <VideoPlayer video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
};
