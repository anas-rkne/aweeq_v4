"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface FeaturedFragranceProps {
  frameCount?: number;
}

export function FeaturedFragrance({ frameCount = 152 }: FeaturedFragranceProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      const promises: Promise<HTMLImageElement | null>[] = [];

      for (let i = 1; i <= frameCount; i++) {
        const img = new window.Image();
        const num = i.toString().padStart(3, "0");
        img.src = `/featured_frames/frame-${num}.jpg`;

        promises.push(
          new Promise<HTMLImageElement | null>((resolve) => {
            img.onload = () => resolve(img);
            // a missing frame must not hold the whole film hostage
            img.onerror = () => resolve(null);
          })
        );
      }

      const result = await Promise.all(promises);
      if (cancelled) return;

      const loadedImages = result.filter(
        (img): img is HTMLImageElement => img !== null
      );

      if (loadedImages.length === 0) {
        console.error("No featured frames found in /featured_frames");
        return;
      }

      setImages(loadedImages);
      setLoaded(true);
    };

    preload();
    return () => {
      cancelled = true;
    };
  }, [frameCount]);

  useEffect(() => {
    if (!loaded || images.length === 0) return;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const text = textRef.current;
    if (!section || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let currentFrame = 0;

    // a tiny copy of a frame, stretched across the screen: bilinear smoothing
    // turns it into the soft, coloured haze that fills the sides
    const blurCache: (HTMLCanvasElement | null)[] = new Array(
      images.length
    ).fill(null);
    const blurredFrame = (index: number, img: HTMLImageElement) => {
      const cached = blurCache[index];
      if (cached) return cached;

      const small = document.createElement("canvas");
      small.width = 64;
      small.height = 64;
      small.getContext("2d")?.drawImage(img, 0, 0, 64, 64);
      blurCache[index] = small;
      return small;
    };

    const render = (index: number) => {
      const img = images[index];
      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "#020a14";
      ctx.fillRect(0, 0, cw, ch);

      // the master is portrait, so the picture itself is kept whole and the
      // same frame — blown up to cover and blurred — carries its light out to
      // the edges of the screen. no letterbox, no stretched bottle.
      ctx.globalAlpha = 0.55;
      ctx.drawImage(blurredFrame(index, img), 0, 0, cw, ch);
      ctx.globalAlpha = 1;

      const scale = Math.min(cw / img.width, ch / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      currentFrame = index;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      render(currentFrame);
    };
    resize();
    window.addEventListener("resize", resize);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        // the film itself; the gradient at its foot carries the page into
        // Packaging without a curtain or a hard cut
        end: "+=3600",
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    // ===== the film: the scroll is the playhead =====
    const frameObj = { frame: 0 };
    tl.to(
      frameObj,
      {
        frame: images.length - 1,
        duration: 0.88,
        ease: "none",
        onUpdate: () => {
          render(Math.round(frameObj.frame));
        },
      },
      0
    );

    // ===== the words: appear in the last tenth, then lift off =====
    if (text) {
      gsap.set(text, { opacity: 0, y: 60 });
      tl.to(
        text,
        {
          opacity: 1,
          y: 0,
          duration: 0.08,
          ease: "power2.out",
        },
        0.8
      ).to(
        text,
        {
          opacity: 0,
          y: -40,
          duration: 0.12,
          ease: "power2.in",
        },
        0.88
      );
    }

    return () => {
      window.removeEventListener("resize", resize);
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [loaded, images]);

  return (
    <section
      ref={sectionRef}
      id="featured-fragrance"
      className="featured-fragrance-section relative h-screen overflow-hidden bg-[#020a14]"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-[1] h-full w-full will-change-transform"
      />

      {/* ===== the scrim: on a wide screen the right half melts into the
          night, on a phone the words rest on the night at the foot ===== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[15] md:hidden"
        style={{
          backgroundImage:
            "linear-gradient(to top, #020A14 0%, rgba(2, 10, 20, 0.85) 34%, rgba(2, 10, 20, 0) 68%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-[15] hidden w-1/2 md:block"
        style={{
          backgroundImage:
            "linear-gradient(to left, #020A14 0%, rgba(2, 10, 20, 0.9) 38%, rgba(2, 10, 20, 0.55) 68%, rgba(2, 10, 20, 0) 100%)",
        }}
      />

      {/* the foot of the section melts into the midnight of the section that
          follows — a gradient only, no space, no divider */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-10 h-32 w-full md:h-64"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, #020A14 100%)",
        }}
      />

      {/* ===== the words: at the foot on a phone, centred on the right of
          the page on a wide screen ===== */}
      <div
        ref={textRef}
        className="pointer-events-none absolute inset-y-0 right-0 z-[20] flex w-full flex-col justify-end px-8 pb-20 text-right md:w-1/2 md:justify-center md:px-24 md:pb-0"
      >
        <h2 className="font-secondary text-[clamp(2.25rem,4.6vw,4.25rem)] leading-[1.04] tracking-[-0.02em] text-gold">
          عطر رافد - RAFID
        </h2>
        <p className="mt-6 max-w-[30rem] font-primary text-[clamp(1.05rem,1.5vw,1.35rem)] leading-[1.8] text-sand/90">
          عطر يحمل روح بلاد الرافدين. مستوحى من عمق التاريخ وقوة المكان، ليروي
          حكايات بابل في كل رشة.
        </p>
      </div>
    </section>
  );
}
