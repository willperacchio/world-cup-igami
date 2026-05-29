import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelinePlayer } from "../useTimelinePlayer";

describe("useTimelinePlayer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes at the final frame and reports isAtEnd", () => {
    const { result } = renderHook(() => useTimelinePlayer({ frameCount: 5 }));
    expect(result.current.index).toBe(4);
    expect(result.current.playing).toBe(false);
    expect(result.current.isAtEnd).toBe(true);
  });

  it("stepBack moves one frame earlier and clamps at 0", () => {
    const { result } = renderHook(() => useTimelinePlayer({ frameCount: 3 }));
    act(() => result.current.setIndex(2));
    act(() => result.current.stepBack());
    expect(result.current.index).toBe(1);
    act(() => result.current.stepBack());
    expect(result.current.index).toBe(0);
    act(() => result.current.stepBack());
    expect(result.current.index).toBe(0); // clamped
  });

  it("stepForward moves one frame later and clamps at frameCount-1", () => {
    const { result } = renderHook(() => useTimelinePlayer({ frameCount: 3 }));
    act(() => result.current.setIndex(0));
    act(() => result.current.stepForward());
    expect(result.current.index).toBe(1);
    act(() => result.current.stepForward());
    expect(result.current.index).toBe(2);
    act(() => result.current.stepForward());
    expect(result.current.index).toBe(2); // clamped
  });

  it("setIndex pauses playback as a side-effect", () => {
    const { result } = renderHook(() => useTimelinePlayer({ frameCount: 5 }));
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(true);
    act(() => result.current.setIndex(2));
    expect(result.current.playing).toBe(false);
    expect(result.current.index).toBe(2);
  });

  it("togglePlay from the end resets to 0 then advances on interval", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({ frameCount: 4, intervalMs: 100 }),
    );
    expect(result.current.index).toBe(3); // at end
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(true);
    expect(result.current.index).toBe(0); // reset

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.index).toBe(1);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.index).toBe(2);
  });

  it("auto-stops playback when reaching the final frame", () => {
    const { result } = renderHook(() =>
      useTimelinePlayer({ frameCount: 3, intervalMs: 50 }),
    );
    act(() => result.current.setIndex(0));
    act(() => result.current.togglePlay());

    // Advance one interval at a time so React commits between ticks and the
    // hook's indexRef (which is only synced via useEffect) stays current.
    act(() => { vi.advanceTimersByTime(50); }); // 0 -> 1
    act(() => { vi.advanceTimersByTime(50); }); // 1 -> 2
    act(() => { vi.advanceTimersByTime(50); }); // 2: at end, hook stops itself
    act(() => { vi.advanceTimersByTime(50); }); // additional ticks do nothing

    expect(result.current.index).toBe(2);
    expect(result.current.playing).toBe(false);
    expect(result.current.isAtEnd).toBe(true);
  });

  it("togglePlay toggles the playing flag", () => {
    const { result } = renderHook(() => useTimelinePlayer({ frameCount: 3 }));
    expect(result.current.playing).toBe(false);
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(true);
    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(false);
  });
});
