import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  /** Optional large cover (for album/playlist hero) */
  cover?: React.ReactNode;
  /** Right-aligned actions (buttons) */
  actions?: React.ReactNode;
  /** Content shown under the title (e.g. Play All row) */
  children?: React.ReactNode;
  eyebrow?: string;
}

/** Modern gradient hero header used across views. */
export const PageHeader: React.FC<Props> = ({ title, subtitle, cover, actions, children, eyebrow }) => {
  return (
    <div className="flex items-end gap-6 mb-8">
      {cover && <div className="flex-shrink-0">{cover}</div>}
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--gold)' }}>
            {eyebrow}
          </div>
        )}
        <div className="flex items-end justify-between gap-4">
          <h1 className="leading-[1.05] truncate"
            style={{ fontSize: cover ? 40 : 30, fontWeight: 800, letterSpacing: '-0.022em', color: 'var(--tp)', fontFamily: 'var(--fd)' }}>
            {title}
          </h1>
          {actions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
        </div>
        {subtitle && (
          <p className="text-[12.5px] mt-2" style={{ color: 'var(--ts)' }}>{subtitle}</p>
        )}
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  );
};
