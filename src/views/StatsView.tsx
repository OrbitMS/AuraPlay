import React, { useContext } from 'react';
import { AudioContext, type Track } from '../context/AudioContext';
import { useStats } from '../hooks/useStats';
import { safeImageUrl } from '../lib/safeUrl';
import { PageHeader } from '../components/PageHeader';
import { BarChart3, Trash2, Music2 } from 'lucide-react';

export const StatsView: React.FC = () => {
  const ctx = useContext(AudioContext);
  const { summary, topTracks, topArtists, clearStats } = useStats();
  const tracks = topTracks(25);
  const artists = topArtists(10);
  const currentId = ctx?.currentTrack?.id;

  const playFrom = (id: string) => {
    const list: Track[] = tracks.map(t => ({ id: t.id, title: t.title, artist: t.artist, thumbnail: t.thumbnail }));
    const t = list.find(x => x.id === id);
    if (t) ctx?.playTrack(t, list);
  };

  const since = summary.since ? new Date(summary.since).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : null;
  const maxArtist = artists[0]?.count ?? 1;

  return (
    <div className="px-[40px] pt-[36px] pb-[48px] w-full">
      <PageHeader
        eyebrow="Library"
        title="Your Stats"
        subtitle={since ? `Listening since ${since}` : 'Your listening at a glance'}
        actions={summary.total > 0 ? (
          <button onClick={() => { if (confirm('Reset all listening stats?')) clearStats(); }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12px] transition-colors hover:text-red-400"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--ts)', cursor: 'pointer' }}>
            <Trash2 size={14} /> Reset
          </button>
        ) : undefined}
      />

      {summary.total === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3 text-center">
          <BarChart3 size={36} className="text-[var(--tt)] opacity-30" />
          <p className="text-[13px] text-[var(--tt)]">No listening data yet</p>
          <p className="text-[11px] text-[var(--tt)] opacity-60" style={{ fontFamily: 'var(--fm)' }}>Play some music and your stats will appear here</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 mt-7 mb-9" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <StatCard label="Total Plays" value={summary.total.toLocaleString()} />
            <StatCard label="Unique Tracks" value={summary.uniqueTracks.toLocaleString()} />
            <StatCard label="Top Artist" value={summary.topArtist ?? '—'} small />
          </div>

          <div className="grid gap-10" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>
            {/* Top tracks */}
            <section>
              <h2 className="text-[14px] font-semibold text-[var(--tp)] mb-3">Top Tracks</h2>
              <div className="flex flex-col">
                {tracks.map((t, i) => {
                  const active = currentId === t.id;
                  return (
                    <div key={t.id} onClick={() => playFrom(t.id)}
                      className={`cv-row group grid grid-cols-[26px_1fr_auto] gap-x-3 items-center px-[10px] py-[7px] rounded-[6px] cursor-pointer border-l-2 transition-colors ${active ? 'bg-[var(--gold-g)] border-[var(--gold)]' : 'border-transparent hover:bg-white/[0.03]'}`}>
                      <span className="text-[12px] text-[var(--tt)] text-center tabular-nums" style={{ fontFamily: 'var(--fm)' }}>{i + 1}</span>
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        {t.thumbnail
                          ? <img src={safeImageUrl(t.thumbnail)} className={`w-11 h-11 rounded-[6px] object-cover bg-[var(--s2)] flex-shrink-0 border ${active ? 'border-[rgba(201,168,76,0.3)]' : 'border-[var(--bd)]'}`} />
                          : <div className="w-11 h-11 rounded-[6px] bg-[var(--s2)] flex-shrink-0 border border-[var(--bd)] flex items-center justify-center"><Music2 size={13} className="text-[var(--tt)]" /></div>}
                        <div className="min-w-0">
                          <p className={`text-[12px] font-medium truncate ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>{t.title}</p>
                          <p className="text-[10px] text-[var(--ts)] truncate" style={{ fontFamily: 'var(--fm)' }}>{t.artist}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--ts)] tabular-nums whitespace-nowrap pl-2" style={{ fontFamily: 'var(--fm)' }}>
                        {t.count} {t.count === 1 ? 'play' : 'plays'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Top artists */}
            <section>
              <h2 className="text-[14px] font-semibold text-[var(--tp)] mb-3">Top Artists</h2>
              <div className="flex flex-col gap-3">
                {artists.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-3">
                    <span className="text-[11px] text-[var(--tt)] w-4 text-center tabular-nums" style={{ fontFamily: 'var(--fm)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="text-[12px] text-[var(--tp)] truncate">{a.name}</span>
                        <span className="text-[10px] text-[var(--ts)] tabular-nums flex-shrink-0" style={{ fontFamily: 'var(--fm)' }}>{a.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(a.count / maxArtist) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-b))' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-[12px] p-4" style={{ background: 'linear-gradient(140deg, var(--s2), var(--s1))', border: '1px solid var(--bd)' }}>
      <div className="text-[9px] font-bold tracking-[0.14em] uppercase mb-1.5" style={{ color: 'var(--tt)', fontFamily: 'var(--fm)' }}>{label}</div>
      <div className={`${small ? 'text-[16px]' : 'text-[26px]'} font-bold truncate`} style={{ color: 'var(--gold)' }}>{value}</div>
    </div>
  );
}
