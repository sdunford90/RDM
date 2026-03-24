import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const TOOLTIP_WIDTH = 224;
const TOOLTIP_GAP = 8;

export default function InfoTip({ text }) {
  const [pos, setPos] = useState(null);
  const iconRef = useRef(null);

  const show = (e) => {
    const rect = iconRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(8, Math.min(left, vw - TOOLTIP_WIDTH - 8));

    const spaceAbove = rect.top;
    const above = spaceAbove > 80;
    const top = above
      ? rect.top - TOOLTIP_GAP
      : rect.bottom + TOOLTIP_GAP;

    setPos({ left, top, above });
  };

  const hide = () => setPos(null);

  return (
    <span
      ref={iconRef}
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <svg
        className="w-3 h-3 text-text-tertiary hover:text-accent cursor-help transition-colors flex-shrink-0"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      {pos && ReactDOM.createPortal(
        <span
          style={{
            position: 'fixed',
            left: pos.left,
            ...(pos.above
              ? { bottom: window.innerHeight - pos.top }
              : { top: pos.top }),
            width: TOOLTIP_WIDTH,
            zIndex: 9999,
          }}
          className="bg-gray-900 text-white text-[10px] leading-relaxed rounded-xl px-3 py-2 shadow-2xl pointer-events-none font-normal normal-case tracking-normal"
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  );
}
