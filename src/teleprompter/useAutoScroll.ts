import { useEffect, type RefObject } from "react";

export function useAutoScroll(
  ref: RefObject<HTMLDivElement | null>,
  speedPxPerSec: number,
  playing: boolean,
) {
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const el = ref.current;
      if (el) {
        el.scrollTop += speedPxPerSec * dt;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          return; // reached end
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, playing, speedPxPerSec]);
}
