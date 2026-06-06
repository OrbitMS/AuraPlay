import React, { useState, useEffect, useContext } from 'react';
import { AudioContext, type Track } from '../context/AudioContext';
import { searchJamendo, popularJamendo, jamendoByTag, getJamendoClientId } from '../services/jamendo';
import { safeImageUrl } from '../lib/safeUrl';
import { rankItems } from '../lib/rankResults';
import { useLikes } from '../hooks/useLikes';
import { useHistory } from '../hooks/useHistory';
import { PageHeader } from '../components/PageHeader';
import { Search, Music2, Loader, Play } from 'lucide-react';

const TAGS = ['pop', 'rock', 'electronic', 'jazz', 'classical', 'hiphop', 'lounge', 'ambient', 'folk', 'metal'];

export const JamendoView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const currentTrackId = ctx?.currentTrack?.id;
  const hasKey = !!getJamendoClientId();

  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(hasKey);
  const { likedIds } = useLikes();
  const { history } = useHistory();

  const load = async (fn: () => Promise<Track[]>, q = '') => {
    setLoading(true);
    try {
      const res = await fn();
      setTracks(rankItems(res, t => ({ id: t.id, title: t.title, artist: t.artist }), q, likedIds, history.map(h => h.id)));
    } catch { setTracks([]); } finally { setLoading(false); }
  };

  useEffect(() => { if (hasKey) load(() => popularJamendo()); /* eslint-disable-next-line */ }, []);

  const doSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setTag(null);
    if (query.trim()) load(() => searchJamendo(query), query);
    else load(() => popularJamendo());
  };

  if (!hasKey) {
    return (
      <div className="px-[40px] pt-[36px] pb-[48px] w-full">
        <PageHeader eyebrow="Discover" title="Jamendo" subtitle="Creative-Commons music" />
        <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
          <Music2 size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">Jamendo needs a free Client ID</p>
          <p className="text-[11px] text-[var(--tt)] opacity-70 max-w-[360px] leading-relaxed" style={{ fontFamily: 'var(--fm)' }}>
            Create one at <span style={{ color: 'var(--gold)' }}>devportal.jamendo.com</span> and paste it into
            Settings → Jamendo. Then ~600k Creative-Commons tracks become searchable here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-[40px] pt-[36px] pb-[48px] w-full">
      <PageHeader eyebrow="Discover" title="Jamendo" subtitle="Creative-Commons · free & legal · full tracks" />

      <form onSubmit={doSearch} className="flex gap-3 mt-7 mb-5" style={{ maxWidth: 560 }}>
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--tt)] pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Creative-Commons music…"
            className="w-full rounded-[12px] outline-none"
            style={{ height: 52, paddingLeft: 46, paddingRight: 16, fontSize: 15, background: 'var(--s1)', border: '1px solid var(--bs)', color: 'var(--tp)' }} />
        </div>
        <button type="submit" disabled={loading}
          className="flex items-center justify-center gap-2 rounded-[12px] hover:scale-[1.03] transition-transform disabled:opacity-60"
          style={{ height: 52, padding: '0 26px', border: 'none', background: 'linear-gradient(135deg, var(--gold-b), var(--gold))', color: 'var(--obsidian)', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer' }}>
          {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} strokeWidth={2.5} />} Search
        </button>
      </form>

      {/* Tag chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-5">
        {TAGS.map(t => (
          <button key={t} onClick={() => { setTag(t); setQuery(''); load(() => jamendoByTag(t)); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all capitalize"
            style={{
              background: tag === t ? 'var(--gold-g)' : 'var(--s1)',
              borderColor: tag === t ? 'rgba(201,168,76,0.4)' : 'var(--bd)',
              color: tag === t ? 'var(--gold)' : 'var(--ts)', cursor: 'pointer',
            }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}><div className="w-full aspect-square rounded-[8px] bg-[var(--s2)] animate-pulse mb-2" /><div className="h-2.5 w-3/4 rounded bg-[var(--s3)] animate-pulse" /></div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-[12px] mt-10 text-center" style={{ color: 'var(--tt)' }}>No tracks found.</p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {tracks.map(t => {
            const active = currentTrackId === t.id;
            return (
              <div key={t.id} onClick={() => ctx?.playTrack(t, tracks)}
                className={`group cursor-pointer rounded-[10px] p-2.5 transition-colors ${active ? 'bg-[var(--gold-g)]' : 'hover:bg-white/[0.04]'}`}>
                <div className="relative mb-2">
                  <div className="w-full aspect-square rounded-[6px] overflow-hidden flex items-center justify-center" style={{ background: 'var(--s3)' }}>
                    {t.thumbnail
                      ? <img src={safeImageUrl(t.thumbnail)} className="w-full h-full object-cover" />
                      : <Music2 size={24} className="text-[var(--tt)] opacity-40" />}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-[6px] bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center shadow-lg">
                      <Play size={12} fill="var(--obsidian)" stroke="var(--obsidian)" />
                    </div>
                  </div>
                </div>
                <p className={`text-[12px] font-medium truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>{t.title}</p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>{t.artist}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
