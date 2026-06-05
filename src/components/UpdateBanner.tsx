import React, { useEffect, useState } from 'react';
import { checkForUpdate, installUpdate, type UpdateInfo } from '../services/updater';
import { Download, X, Loader } from 'lucide-react';

export const UpdateBanner: React.FC = () => {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Check shortly after launch so it doesn't compete with first paint
    const t = setTimeout(() => { checkForUpdate().then(setInfo).catch(() => {}); }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (!info || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      await installUpdate(info, setProgress);
      // app relaunches on success; if it returns, something went wrong
    } catch (err) {
      console.error('Update install failed:', err);
      setInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-[124px] right-6 z-40 animate-slide-in-right"
      style={{
        width: 320,
        background: 'linear-gradient(135deg, rgba(26,26,34,0.97), rgba(18,18,24,0.97))',
        border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        padding: 16,
      }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }}>
          <Download size={16} className="text-[var(--gold)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold" style={{ color: 'var(--tp)' }}>Update available</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
            Version {info.version} is ready to install
          </p>

          {installing ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Loader size={12} className="animate-spin text-[var(--gold)]" />
                <span className="text-[10px]" style={{ color: 'var(--ts)', fontFamily: 'var(--fm)' }}>
                  {progress > 0 ? `Downloading ${progress}%` : 'Starting…'}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--s4)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--gold)' }} />
              </div>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <button onClick={handleInstall}
                className="px-3 py-1.5 rounded-[6px] text-[11px] font-bold tracking-[0.05em] uppercase cursor-pointer transition-colors"
                style={{ background: 'var(--gold)', color: 'var(--obsidian)', border: 'none' }}>
                Install &amp; Restart
              </button>
              <button onClick={() => setDismissed(true)}
                className="px-3 py-1.5 rounded-[6px] text-[11px] cursor-pointer transition-colors hover:bg-white/[0.06]"
                style={{ background: 'transparent', color: 'var(--ts)', border: '1px solid var(--bd)' }}>
                Later
              </button>
            </div>
          )}
        </div>

        {!installing && (
          <button onClick={() => setDismissed(true)} title="Dismiss"
            className="flex-shrink-0 -mr-1 -mt-1 w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/[0.06]"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tt)' }}>
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
