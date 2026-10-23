"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll reveal for the sections below the fold.
 *
 * The hidden state lives in CSS inside a `prefers-reduced-motion: no-preference`
 * block, so with reduced motion requested the page is simply the finished
 * page — nothing waits for an animation that will not run. The mark starts on
 * the server as `out` and flips to `in` once 15% of the group is on screen
 * (threshold 0 for a group taller than the viewport, so the reveal stays
 * reachable). It fires once and never replays.
 */
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tall = el.getBoundingClientRect().height > window.innerHeight;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "in";
        observer.disconnect();
      },
      { threshold: tall ? 0 : 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal="out" className={className}>
      {children}
    </div>
  );
}
