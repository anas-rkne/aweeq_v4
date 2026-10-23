"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Four old worlds, told one after another.
 *
 * The section holds still while the pictures cross-fade through them — the
 * stone of Babylon, the silence of Egypt, the marble of Greece, the silk of
 * China — and only then lets go of the page.
 *
 * The images are 9:16 portraits: each one sits whole inside its frame
 * (object-contain) over a blurred copy of itself, so nothing is ever cut off
 * and the empty sides still carry the colour of the picture.
 */

const CIVILIZATIONS = [
  {
    id: "babylon",
    image: "/images/about/about_babel_2.jpg",
    alt: "لاماسو من بابل — حارس بوابة عشتار",
    label: "BABYLON · بابل",
    title: "The Lamassu",
    body: "من بوابة عشتار، حيث تُروى الحكايات بالنقوش المسمارية. من بابل، مهد الحضارات، نستلهم عطوراً تحمل عبق التاريخ، وتُخلّد أسراراً منذ آلاف السنين.",
    bodyEn:
      "From the Ishtar Gate, where stories are told through cuneiform. From Babylon, the cradle of civilizations, we draw fragrances that carry the scent of history and preserve secrets for millennia.",
  },
  {
    id: "egypt",
    image: "/images/about/about_egybt_2.jpg",
    alt: "أبو الهول، الحارس الصامت لوادي الملوك",
    label: "EGYPT · مصر",
    title: "The Sphinx",
    body: "أبو الهول، الحارس الصامت لوادي الملوك. من مصر، حيث يلتقي الذهب بالأسرار الخالدة، نصنع عطوراً ملكية تُجسد فخامة الفراعنة وخلود النيل.",
    bodyEn:
      "The Sphinx, the silent guardian of the Valley of the Kings. From Egypt, where gold meets eternal secrets, we craft royal fragrances embodying the luxury of the Pharaohs and the immortality of the Nile.",
  },
  {
    id: "greece",
    image: "/images/about/about_greese_2.jpg",
    alt: "رخام أثينا وأساطير الأولمب",
    label: "GREECE · اليونان",
    title: "Marble Memory",
    body: "من رخام أثينا وأساطير الأولمب، حيث تُنسج الحكايات عن الآلهة والأبطال. نقدم لكم عطوراً كلاسيكية تجمع بين الأناقة الإغريقية والحداثة الخالدة.",
    bodyEn:
      "From the marble of Athens and the myths of Olympus, where tales of gods and heroes are woven. We present classic fragrances that blend Greek elegance with timeless modernity.",
  },
  {
    id: "china",
    image: "/images/about/about_china_2.jpg",
    alt: "حرير الإمبراطوريات وسور الصين العظيم",
    label: "CHINA · الصين",
    title: "Silk & Stone",
    body: "من سور الصين العظيم، وحرير الإمبراطوريات، حيث تلتقي القوة بالرقي. نقدم عطوراً آسرة تجسد حكمة الشرق وتفاصيل الحضارة الصينية العريقة.",
    bodyEn:
      "From the Great Wall of China and the silk of empires, where power meets elegance. We present captivating fragrances embodying the wisdom of the East and the details of ancient Chinese civilization.",
  },
] as const;

const IMAGE_START_SCALE = 1.05;
const TEXT_START_Y = 20;

export function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.registerPlugin(ScrollTrigger);

    const images = gsap.utils.toArray<HTMLElement>(".about-image", section);
    const texts = gsap.utils.toArray<HTMLElement>(".about-text", section);
    const veil = veilRef.current;
    const room = roomRef.current;

    /**
     * One slide: the picture that leaves dims and pulls back, the picture that
     * arrives comes forward, and their words cross over each other in the same
     * beat. Then a pause, to read.
     */
    const step = (tl: gsap.core.Timeline, from: number) => {
      const outImage = images[from];
      const outText = texts[from];
      const inImage = images[from + 1];
      const inText = texts[from + 1];
      if (!outImage || !outText || !inImage || !inText) return;

      tl.to(
        outImage,
        { opacity: 0, scale: IMAGE_START_SCALE, duration: 1, ease: "power2.inOut" },
      )
        .to(outText, { opacity: 0, y: -TEXT_START_Y, duration: 1, ease: "power2.inOut" }, "<")
        .to(
          inImage,
          { opacity: 1, scale: 1, duration: 1, ease: "power2.inOut" },
          "<",
        )
        .to(inText, { opacity: 1, y: 0, duration: 1, ease: "power2.inOut" }, "<")
        // a breath, so the words can be read before the next world
        .to({}, { duration: 1 });
    };

    const build = (tl: gsap.core.Timeline, withVeil: boolean) => {
      for (let i = 0; i < CIVILIZATIONS.length - 1; i++) {
        step(tl, i);
      }

      // the last picture rests, then the night settles over it
      if (withVeil && veil) {
        tl.to(veil, { opacity: 0.4, duration: 1.2, ease: "power2.inOut" }, "+=0.6");
      } else {
        // the phone keeps the same pace, then rests: the last stretch of the
        // pin belongs to the portal
        tl.to({}, { duration: 1.8 });
      }
    };

    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (room) room.style.height = "0px";
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=4800",
          pin: true,
          pinSpacing: false,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      build(tl, true);

      // the room the sequence travels through: the pin adds no spacing of its
      // own, so the section leaves that room behind it
      if (room) room.style.height = "4800px";

      return () => {
        if (room) room.style.height = "";
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    mm.add("(max-width: 767px)", () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (room) room.style.height = "0px";
        return;
      }

      // the phone holds the section too, but for less time
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=3400",
          pin: true,
          pinSpacing: false,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      build(tl, false);

      if (room) room.style.height = "3400px";

      return () => {
        if (room) room.style.height = "";
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    const refresh = () => ScrollTrigger.refresh();
    void document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, []);

  return (
    <>
      <section
        id="story"
        ref={sectionRef}
        className="relative z-10 min-h-screen bg-[#020a14]"
      >
        <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
          {/* the pictures — on the left of the page */}
          <div className="relative order-first h-[46vh] w-full overflow-hidden bg-[#020a14] md:order-2 md:h-screen">
            {CIVILIZATIONS.map((c, i) => (
              <div
                key={c.id}
                className="about-image absolute inset-0"
                style={
                  i === 0
                    ? { opacity: 1, transform: "scale(1)" }
                    : { opacity: 0, transform: `scale(${IMAGE_START_SCALE})` }
                }
              >
                {/* the picture itself, filling the frame */}
                <Image
                  src={c.image}
                  alt={c.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  priority={i === 0}
                  loading={i === 0 ? undefined : "eager"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ))}

            {/* the stone dissolves into the night */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-[#020a14]/55 via-transparent to-[#020a14]/75"
            />

            {/* the picture dissolves into the night on the edge of the words */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-1/3 md:block md:w-1/2"
              style={{
                background:
                  "linear-gradient(to left, #020A14 0%, transparent 100%)",
              }}
            />

            {/* the closing veil, drawn over the last picture */}
            <div
              ref={veilRef}
              aria-hidden="true"
              className="about-veil pointer-events-none absolute inset-0 bg-[#020a14] opacity-0"
            />
          </div>

          {/* the words — on the right of the page */}
          <div className="order-2 relative flex flex-col overflow-hidden bg-[#020a14] p-8 md:order-1 md:p-24">
            {/* the night behind the words — barely there */}
            <Image
              src="/images/about/ABOUT_HERO_BG.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />

            {/* the night behind the words dissolves into the pictures */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 md:block md:w-1/2"
              style={{
                background:
                  "linear-gradient(to right, #020A14 0%, transparent 100%)",
              }}
            />

            {/* the little portal, standing in the empty corner */}
            <Image
              src="/images/about/top_right_about.png"
              alt=""
              width={768}
              height={1376}
              aria-hidden="true"
              className="pointer-events-none absolute right-8 top-8 z-10 hidden w-[5.5rem] md:right-13 md:top-0 md:block"
            />

            <div className="relative flex flex-1 flex-col">
              <div className="relative min-h-[14rem] w-full max-w-[34rem] flex-1 md:min-h-[28rem]">
                {CIVILIZATIONS.map((c, i) => (
                  <div
                    key={c.id}
                    className="about-text absolute inset-0 flex flex-col justify-center"
                    style={
                      i === 0
                        ? { opacity: 1, transform: "translateY(0)" }
                        : { opacity: 0, transform: `translateY(${TEXT_START_Y}px)` }
                    }
                  >
                    {/* the name of the world */}
                    <div className="flex items-center gap-4">
                      <span className="font-secondary text-[12px] tracking-[0.28em] text-gold">
                        {c.label}
                      </span>
                    </div>

                    <h2 className="mt-6 font-secondary text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.2] text-sand">
                      {c.title}
                    </h2>

                    <p className="mt-5 text-body text-sand/85">{c.body}</p>

                    <p className="mt-4 hidden text-[13px] leading-relaxed text-sand/45 md:block">
                      {c.bodyEn}
                    </p>
                  </div>
                ))}
              </div>

              {/* the way in — it sits at the foot of the words */}
              <a
                href="#civilizations"
                className="group mt-8 inline-flex w-fit items-center gap-5 md:mt-12"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full border border-gold/60 text-gold transition-colors duration-300 ease-out group-hover:bg-gold group-hover:text-[#020a14]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.2}
                    strokeLinecap="square"
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform duration-300 ease-out group-hover:-translate-x-1"
                  >
                    <path d="M19 12H5" />
                    <path d="M11 6l-6 6 6 6" />
                  </svg>
                </span>

                <span className="font-secondary text-[13px] tracking-[0.22em] text-sand/80 transition-colors duration-300 ease-out group-hover:text-gold">
                  READ OUR STORY
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* the seam: a sliver of night over the joint, so no edge of a picture
            can leak through while the pictures cross-fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-1 -translate-x-1/2 bg-[#020a14] md:block"
        />
      </section>

      {/* the room the pinned sequence travels through */}
      <div
        id="about-room"
        ref={roomRef}
        aria-hidden="true"
        className="h-[3400px] md:h-[4800px]"
      />
    </>
  );
}
