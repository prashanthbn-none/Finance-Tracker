// Small reusable UI primitives shared across pages.

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ open, onClose, title, children, maxWidth = 460 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px', zIndex: 1000,
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth, maxHeight: 'calc(100dvh - 40px)', padding: 0, overflow: 'hidden', boxShadow: 'none', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
          <h3 style={{ fontSize: 17 }}>{title}</h3>
          <button className="btn ghost" aria-label="Close" onClick={onClose} style={{ fontSize: 18, lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', minHeight: 0 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, children }) {
  return (
    <label className="field" style={{ marginBottom: 14 }}>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, body, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--ink-soft)' }}>
      <p style={{ fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>{title}</p>
      {body && <p style={{ maxWidth: 360, margin: '0 auto 16px', fontSize: 14 }}>{body}</p>}
      {action}
    </div>
  );
}

export function StatCard({ label, value, sub, tone }) {
  const valueColor = tone === 'pos' ? 'var(--evergreen)' : tone === 'neg' ? 'var(--clay)' : 'var(--ink)';
  return (
    <div className="card card-pad" style={{ minWidth: 0 }}>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>{label}</p>
      <p className="num" style={{ fontSize: 30, fontWeight: 500, color: valueColor, margin: '6px 0 0', lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

export function ProgressBar({ ratio, color = 'var(--evergreen)', height = 8 }) {
  return (
    <div style={{ height, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, ratio * 100))}%`, background: color, borderRadius: 999, transition: 'width .3s' }} />
    </div>
  );
}

// Circular progress ring. `ratio` 0..1. Used by savings goals.
export function CircularProgress({ ratio, size = 72, stroke = 7, color = 'var(--evergreen)', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, ratio));
  const offset = circ * (1 - clamped);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size > 60 ? 15 : 12, fontWeight: 600 }}>
        {children}
      </div>
    </div>
  );
}
