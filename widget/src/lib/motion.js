// Motion primitives — IntersectionObserver-based reveals + iframe height
// reporting via postMessage.

import { useEffect, useRef, useState } from 'react';

// Reveal: returns a ref + boolean. Element fades up when it enters viewport.
export function useReveal({ threshold = 0.1, once = true } = {}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) io.disconnect();
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return [ref, shown];
}

// Reports document height to parent window via postMessage. Hosts can use this
// to auto-resize the iframe (no fixed height, no scroll-inside-scroll).
export function useIframeHeight(deps = []) {
  useEffect(() => {
    if (window.parent === window) return; // not in an iframe
    const post = () => {
      try {
        const h = Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight || 0,
        );
        window.parent.postMessage({ type: 'rivr-booking:height', height: h }, '*');
      } catch {
        /* ignore */
      }
    };
    post();
    const id = window.setTimeout(post, 600); // catch late layout shifts
    window.addEventListener('resize', post);
    return () => {
      window.removeEventListener('resize', post);
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function prefersReducedMotion() {
  return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
