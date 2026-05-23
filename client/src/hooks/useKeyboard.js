import { useEffect } from 'react';

export function useKeyboard(handlers, deps = []) {
  useEffect(() => {
    function onKey(e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/i.test(e.target.tagName)) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const h = handlers[key];
      if (h) {
        e.preventDefault();
        h(e);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
