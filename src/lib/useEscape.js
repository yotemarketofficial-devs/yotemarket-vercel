/* useEscape — close-on-Escape for dialogs. Every modal is expected to dismiss on
   Esc (WAI-ARIA dialog pattern); most of ours only closed on an overlay click,
   which keyboard users can't do. Additive and safe: pass the same handler the
   close button uses. Listens on keydown so it fires wherever focus sits. */
import { useEffect } from 'react';

/**
 * @param {Function} onClose  called when Escape is pressed
 * @param {boolean}  active   false → no listener (e.g. a busy/blocking state)
 */
export function useEscape(onClose, active = true) {
  useEffect(() => {
    if (!active || typeof onClose !== 'function') return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, active]);
}

export default useEscape;
