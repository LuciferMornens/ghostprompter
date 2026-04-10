import { useEffect, type RefObject } from "react";

export function useAutoScroll(
  ref: RefObject<HTMLDivElement | null>,
  speedPxPerSec: number,
  playing: boolean,
  onStop?: () => void,
) {
  useEffect(() => {
    if (!playing) return;
    let stopped = false;
    let raf = 0;
    let last = performance.now();
    let logicalScrollTop: number | null = null;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const el = ref.current;
      if (el) {
        const maxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0);
        if (
          logicalScrollTop === null ||
          Math.abs(el.scrollTop - logicalScrollTop) > 1
        ) {
          logicalScrollTop = el.scrollTop;
        }
        const nextScrollTop = Math.min(
          logicalScrollTop + speedPxPerSec * dt,
          maxScrollTop,
        );
        logicalScrollTop = nextScrollTop;
        el.scrollTop = nextScrollTop;
        if (nextScrollTop >= maxScrollTop - 1) {
          if (!stopped) {
            stopped = true;
            onStop?.();
          }
          return; // reached end
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, playing, speedPxPerSec, onStop]);
}
