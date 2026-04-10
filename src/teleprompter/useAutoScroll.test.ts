import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoScroll } from "./useAutoScroll";

// Map of id -> callback. cancelAnimationFrame deletes from the map.
let rafQueue: Map<number, (t: number) => void> = new Map();
let rafIdCounter = 0;
let cancelSpy: ReturnType<typeof vi.fn>;
let fakeNow = 0;

function flushRaf(dtMs: number) {
  fakeNow += dtMs;
  // Pop the lowest id (FIFO)
  const ids = Array.from(rafQueue.keys()).sort((a, b) => a - b);
  if (ids.length === 0) return;
  const id = ids[0];
  const cb = rafQueue.get(id);
  rafQueue.delete(id);
  if (cb) cb(fakeNow);
}

function rafQueueLength(): number {
  return rafQueue.size;
}

function makeRef(overrides: Partial<HTMLDivElement> = {}) {
  const el = {
    scrollTop: 0,
    clientHeight: 100,
    scrollHeight: 1000,
    ...overrides,
  } as unknown as HTMLDivElement;
  return { current: el };
}

function makeRoundedRef(overrides: Partial<HTMLDivElement> = {}) {
  let scrollTop = 0;
  const el = {
    clientHeight: 100,
    scrollHeight: 1000,
    ...overrides,
  } as Partial<HTMLDivElement>;
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    enumerable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = Math.round(value);
    },
  });
  return { current: el as HTMLDivElement };
}

beforeEach(() => {
  rafQueue = new Map();
  rafIdCounter = 0;
  fakeNow = 0;
  cancelSpy = vi.fn((id: number) => {
    rafQueue.delete(id);
  });
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    const id = ++rafIdCounter;
    rafQueue.set(id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", cancelSpy);
  vi.spyOn(performance, "now").mockImplementation(() => fakeNow);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useAutoScroll", () => {
  it("does not schedule rAF when playing=false", () => {
    const ref = makeRef();
    renderHook(() => useAutoScroll(ref, 60, false));
    expect(rafQueueLength()).toBe(0);
  });

  it("schedules rAF immediately when playing=true", () => {
    const ref = makeRef();
    renderHook(() => useAutoScroll(ref, 60, true));
    expect(rafQueueLength()).toBe(1);
  });

  it("advances scrollTop based on speed and elapsed time", () => {
    const ref = makeRef();
    renderHook(() => useAutoScroll(ref, 60, true));
    expect(ref.current.scrollTop).toBe(0);
    // First tick consumed (last set inside effect was performance.now()=0)
    flushRaf(1000); // 1 second elapsed; speed=60 → ~60px
    expect(ref.current.scrollTop).toBeCloseTo(60, 5);
  });

  it("accumulates scrollTop across multiple ticks", () => {
    const ref = makeRef();
    renderHook(() => useAutoScroll(ref, 100, true));
    flushRaf(500); // +50
    expect(ref.current.scrollTop).toBeCloseTo(50, 5);
    flushRaf(500); // +50
    expect(ref.current.scrollTop).toBeCloseTo(100, 5);
    flushRaf(250); // +25
    expect(ref.current.scrollTop).toBeCloseTo(125, 5);
  });

  it("keeps accumulating low speeds when scrollTop rounds to whole pixels", () => {
    const ref = makeRoundedRef();
    renderHook(() => useAutoScroll(ref, 20, true));

    for (let i = 0; i < 10; i += 1) {
      flushRaf(16);
    }

    expect(ref.current.scrollTop).toBeGreaterThan(0);
  });

  it("stops scheduling rAF when reaching the end", () => {
    const ref = makeRef({
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 200,
    });
    renderHook(() => useAutoScroll(ref, 200, true));
    // Initial schedule
    expect(rafQueueLength()).toBe(1);
    // 1s @ 200px/s = 200px → reaches end (scrollTop+clientHeight=300 >= 199)
    flushRaf(1000);
    // No additional rAF should be scheduled
    expect(rafQueueLength()).toBe(0);
  });

  it("calls onStop when reaching the end", () => {
    const ref = makeRef({
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 200,
    });
    const onStop = vi.fn();
    renderHook(() => useAutoScroll(ref, 200, true, onStop));

    flushRaf(1000);

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("calls cancelAnimationFrame on unmount while playing", () => {
    const ref = makeRef();
    const { unmount } = renderHook(() => useAutoScroll(ref, 60, true));
    expect(rafQueueLength()).toBe(1);
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
    // The id passed should be the latest one we returned (1)
    expect(cancelSpy).toHaveBeenCalledWith(1);
  });

  it("re-registers effect when speed changes", () => {
    const ref = makeRef();
    const { rerender } = renderHook(
      ({ speed, playing }: { speed: number; playing: boolean }) =>
        useAutoScroll(ref, speed, playing),
      { initialProps: { speed: 60, playing: true } },
    );
    expect(rafQueueLength()).toBe(1);
    // Tick once at the original speed
    flushRaf(1000);
    expect(ref.current.scrollTop).toBeCloseTo(60, 5);
    // Change speed → effect cleanup runs cancelAnimationFrame which clears
    // the rAF, then the effect runs again and schedules a fresh rAF.
    rerender({ speed: 120, playing: true });
    expect(rafQueueLength()).toBeGreaterThanOrEqual(1);
    // Reset scrollTop and tick to verify new speed (1s @ 120 → +120px)
    ref.current.scrollTop = 0;
    flushRaf(1000);
    expect(ref.current.scrollTop).toBeCloseTo(120, 5);
  });

  it("does not crash when ref.current is null", () => {
    const ref = { current: null } as { current: HTMLDivElement | null };
    renderHook(() => useAutoScroll(ref, 60, true));
    expect(() => flushRaf(500)).not.toThrow();
  });
});
