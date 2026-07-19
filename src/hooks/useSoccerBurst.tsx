"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface BurstBall {
  id: number;
  dx: number;
  dy: number;
  dur: number;
  delay: number;
  size: number;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  balls: BurstBall[];
}

/**
 * Celebration flourish: a burst of ⚽ emoji flying out from a point. Used on
 * the most-recent-scorigami grid cell and the New Scorigami banner.
 *
 * Balls are portaled to <body> as fixed-position elements so no scroll
 * container clips them; bursts are throttled (700ms) so cursor wiggling
 * doesn't spam; everything is removed from the DOM after flight; and the
 * whole effect is skipped for reduced-motion users.
 */
export function useSoccerBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);
  const lastBurstAtRef = useRef(0);

  function spawnBurstAt(x: number, y: number) {
    const now = performance.now();
    if (now - lastBurstAtRef.current < 700) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lastBurstAtRef.current = now;

    const id = ++burstIdRef.current;
    const balls: BurstBall[] = Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 55 + Math.random() * 75;
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        // Slight downward bias so the balls feel like they drop back to earth.
        dy: Math.sin(angle) * dist + 25 + Math.random() * 30,
        dur: 0.7 + Math.random() * 0.4,
        delay: Math.random() * 0.1,
        size: 13 + Math.random() * 9,
      };
    });
    setBursts((prev) => [...prev, { id, x, y, balls }]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1400);
  }

  function spawnBurstFromElement(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    spawnBurstAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  const burstPortal: ReactNode =
    bursts.length > 0
      ? createPortal(
          <>
            {bursts.flatMap((burst) =>
              burst.balls.map((ball) => (
                <span
                  key={`${burst.id}-${ball.id}`}
                  aria-hidden
                  className="sb-ball"
                  style={{
                    left: burst.x,
                    top: burst.y,
                    fontSize: ball.size,
                    "--dx": `${ball.dx}px`,
                    "--dy": `${ball.dy}px`,
                    "--dur": `${ball.dur}s`,
                    "--delay": `${ball.delay}s`,
                  } as React.CSSProperties}
                >
                  ⚽
                </span>
              )),
            )}
          </>,
          document.body,
        )
      : null;

  return { spawnBurstAt, spawnBurstFromElement, burstPortal };
}
