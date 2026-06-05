import React from 'react';
import { type AudioQuality } from '../hooks/useSettings';
import { setAudioQuality } from '../services/youtube';

interface Props {
  quality: AudioQuality;
  onQualityChange: (q: AudioQuality) => void;
}

const QUALITIES: { value: AudioQuality; label: string; sub: string; badge: string }[] = [
  {
    value: 'high',
    label: 'High',
    sub: 'Highest available — prefers Opus ~160 kbps (falls back to AAC). Recommended.',
    badge: 'Opus 160',
  },
  {
    value: 'medium',
    label: 'Medium',
    sub: 'Balanced mid-tier bitrate — good for most connections',
    badge: '~96kbps',
  },
  {
    value: 'low',
    label: 'Low',
    sub: 'Lowest bitrate — saves data on slow or metered connections',
    badge: '50kbps',
  },
];

export const SettingsView: React.FC<Props> = ({ quality, onQualityChange }) => {
  const handleChange = (q: AudioQuality) => {
    onQualityChange(q);
    setAudioQuality(q);
  };

  return (
    <div className="px-[36px] pt-[32px] pb-[40px] w-full max-w-[600px]">
      <h1 className="text-[28px] text-[var(--tp)] tracking-[-0.01em] leading-[1.1]" style={{ fontFamily: 'var(--fd)' }}>
        Settings
      </h1>
      <div className="text-[10px] text-[var(--tt)] mt-1.5 tracking-[0.08em] uppercase mb-8" style={{ fontFamily: 'var(--fm)' }}>
        Preferences
      </div>

      {/* Audio Quality */}
      <section className="mb-8">
        <h2 className="text-[13px] font-semibold text-[var(--tp)] mb-1 tracking-[0.01em]">Audio Quality</h2>
        <p className="text-[11px] text-[var(--ts)] mb-4 leading-relaxed" style={{ fontFamily: 'var(--fm)' }}>
          Higher quality uses more bandwidth. Changing this clears the stream cache so new streams use the selected quality.
        </p>

        <div className="flex flex-col gap-2">
          {QUALITIES.map(q => {
            const active = quality === q.value;
            return (
              <button
                key={q.value}
                onClick={() => handleChange(q.value)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-[8px] border text-left transition-all ${
                  active
                    ? 'border-[rgba(201,168,76,0.4)] bg-[var(--gold-g)]'
                    : 'border-[var(--bd)] bg-[var(--s1)] hover:border-[var(--bs)] hover:bg-[var(--s2)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Radio dot */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    active ? 'border-[var(--gold)]' : 'border-[var(--tt)]'
                  }`}>
                    {active && <div className="w-2 h-2 rounded-full bg-[var(--gold)]" />}
                  </div>
                  <div>
                    <div className={`text-[13px] font-semibold ${active ? 'text-[var(--gold)]' : 'text-[var(--tp)]'}`}>
                      {q.label}
                    </div>
                    <div className="text-[10px] text-[var(--ts)] mt-0.5" style={{ fontFamily: 'var(--fm)' }}>
                      {q.sub}
                    </div>
                  </div>
                </div>
                <span className={`text-[9px] font-bold tracking-[0.1em] px-2 py-0.5 rounded ${
                  active
                    ? 'bg-[var(--gold-d)] text-[var(--gold)]'
                    : 'bg-[var(--s3)] text-[var(--tt)]'
                }`} style={{ fontFamily: 'var(--fm)' }}>
                  {q.badge}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Info note */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-[8px] bg-[var(--s1)] border border-[var(--bd)]">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--tt)" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-[10px] text-[var(--ts)] leading-relaxed" style={{ fontFamily: 'var(--fm)' }}>
          Quality depends on what YouTube provides for each track. Exact bitrate may vary. Previously resolved stream URLs are cached for up to 50 minutes — changing quality immediately clears this cache.
        </p>
      </div>
    </div>
  );
};
