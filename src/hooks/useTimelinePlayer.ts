import { useState, useRef, useEffect, useCallback } from "react";

interface TimelinePlayerOptions {
  /** Total number of frames/steps in the timeline. */
  frameCount: number;
  /** Milliseconds between each step when playing. */
  intervalMs?: number;
}

interface TimelinePlayerState {
  /** Current frame index (0-based). */
  index: number;
  /** Whether the timeline is currently autoplaying. */
  playing: boolean;
  /** Whether the index is at the final frame. */
  isAtEnd: boolean;
  /** Set index directly (pauses playback). */
  setIndex: (i: number) => void;
  /** Step backward one frame (pauses playback). */
  stepBack: () => void;
  /** Step forward one frame (pauses playback). */
  stepForward: () => void;
  /** Toggle play/pause. */
  togglePlay: () => void;
}

/**
 * Hook for timeline autoplay functionality.
 * When play is triggered at the end, it resets to the beginning.
 * Playback stops automatically when it reaches the last frame.
 */
export function useTimelinePlayer({
  frameCount,
  intervalMs = 1200,
}: TimelinePlayerOptions): TimelinePlayerState {
  const [index, setIndex] = useState(frameCount - 1);
  const [playing, setPlaying] = useState(false);
  const indexRef = useRef(index);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    if (!playing) return;

    // If starting from the end, reset to beginning
    if (indexRef.current >= frameCount - 1) {
      setIndex(0);
    }

    const id = setInterval(() => {
      if (indexRef.current >= frameCount - 1) {
        setPlaying(false);
        return;
      }
      setIndex((i) => i + 1);
    }, intervalMs);

    return () => clearInterval(id);
  }, [playing, frameCount, intervalMs]);

  const handleSetIndex = useCallback((i: number) => {
    setPlaying(false);
    setIndex(i);
  }, []);

  const stepBack = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const stepForward = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(frameCount - 1, i + 1));
  }, [frameCount]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  return {
    index,
    playing,
    isAtEnd: index === frameCount - 1,
    setIndex: handleSetIndex,
    stepBack,
    stepForward,
    togglePlay,
  };
}
