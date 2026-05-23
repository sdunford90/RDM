import React, { useState, useRef, useEffect } from 'react';
import { STAGES, STAGES_BY_ID } from '../utils/stages';

export default function StagePill({ stage, onChange, size = 'sm', disabled = false }) {
  const s = STAGES_BY_ID[stage] || STAGES_BY_ID.new;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled || !onChange}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`${padding} font-medium rounded-full inline-flex items-center gap-1.5 transition-shadow ${onChange ? 'hover:shadow-card cursor-pointer' : 'cursor-default'}`}
        style={{ background: s.tint, color: s.color, border: `1px solid ${s.color}33` }}
        title={onChange ? 'Change stage' : s.label}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
        {s.label}
        {onChange && <span className="opacity-50 ml-0.5">▾</span>}
      </button>
      {open && onChange && (
        <div className="absolute z-30 mt-1 left-0 bg-surface border border-hairline rounded-lg shadow-pop py-1 min-w-[160px]">
          {STAGES.map(opt => (
            <button
              key={opt.id}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onChange(opt.id); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
              <span className="text-ink">{opt.label}</span>
              {opt.id === stage && <span className="ml-auto text-accent text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
