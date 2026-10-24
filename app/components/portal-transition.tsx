"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * The glowing portal.
 *
 * The First Chapter stands behind the About — a fixed layer, held shut by a
 * round door. When the scroll carries the About to its end, the door opens:
 * a circle of light grows from the middle of the screen, its edge burning
 * gold, and Mesopotamia stands revealed inside it while the About fades out
 * from under the light.
 *
 * The circle is a clip-path on the chapter itself, so nothing of the chapter
 * leaks out around the edge of the opening. The gold ring is a second circle,
 * the same circle seen edge on: it is scaled on the same curve, so the light
 * always sits exactly on the rim of the door.
 *
 * The range is the last screen of the About's pinned journey: the chapter
 * arrives at the bottom of the viewport, and the door opens while it climbs.
 */
export function PortalTransition() {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const about = document.getElementById("story");
    const room = document.getElementById("about-room");
    const first = document.getElementById("first-chapter");
    const content = document.getElementById("first-chapter-content");
    const ring = ringRef.current;
    if (!about || !room || !first || !content || !ring) return;

    /**
     * Without motion there is no door: the chapter simply takes its place in
     * the flow, and the page is read from top to bottom.
     */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      first.style.clipPath = "none";
      first.style.position = "relative";
      first.style.inset = "auto";
      first.style.zIndex = "auto";
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /**
     * The radius a percentage of a circle is measured against: the diagonal
     * of the box, normalised. The door is cut from the chapter, which fills
     * the screen, so the gold ring is drawn at that same radius and the two
     * stay together as the circle grows.
     */
    const diagonal = () =>
      Math.sqrt((window.innerWidth ** 2 + window.innerHeight ** 2) / 2);

    const sizeRing = () => {
      const r = diagonal();
      ring.style.width = `${r * 2}px`;
      ring.style.height = `${r * 2}px`;
      ring.style.left = `calc(50% - ${r}px)`;
      ring.style.top = `calc(50% - ${r}px)`;
    };
    sizeRing();

    /**
     * The door opens over the last screen of the About's pinned journey: the
     * journey ends where the About's own pin ends, and the door opens one
     * screen before that. The pin is the only honest measure of where the
     * About stops being held, so the range is taken from it.
     */
    const aboutPin = ScrollTrigger.getAll().find((st) => st.trigger === about);
    const range = () => {
      const end = aboutPin ? aboutPin.end : 0;
      return { start: end - window.innerHeight, end };
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: room,
        start: () => range().start,
        end: () => range().end,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(
      first,
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(150% at 50% 50%)", duration: 1, ease: "power2.inOut" },
    )
      // the chapter comes forward, a little, as the door opens
      .fromTo(
        content,
        { scale: 1 },
        { scale: 1.08, duration: 1, ease: "power2.out" },
        "<",
      )
      // the gold edge of the door, burning on the rim
      .fromTo(
        ring,
        { scale: 0, opacity: 0 },
        { scale: 1.5, opacity: 1, duration: 1, ease: "power2.inOut" },
        "<",
      )
      // the About goes under the light
      .to(about, { autoAlpha: 0, duration: 0.75, ease: "power2.inOut" }, "<")
      // and a breath, for the door to settle
      .to({}, { duration: 0.25 });

    const onResize = () => {
      sizeRing();
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", onResize);
    const refresh = () => ScrollTrigger.refresh();
    void document.fonts?.ready.then(refresh);

    return () => {
      window.removeEventListener("resize", onResize);
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30">
      {/* the burning edge of the door */}
      <div
        ref={ringRef}
        className="absolute rounded-full border-2 border-brand-gold/90 opacity-0 will-change-transform"
        style={{
          boxShadow:
            "0 0 70px 18px rgba(205,158,97,0.45), inset 0 0 70px 18px rgba(205,158,97,0.28)",
        }}
      />
    </div>
  );
}
