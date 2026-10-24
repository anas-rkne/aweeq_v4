import Image from "next/image";
import { Instagram, Youtube } from "lucide-react";

const QUICK_LINKS = [
  { label: "الرئيسية", href: "#hero" },
  { label: "قصتنا", href: "#story" },
  { label: "المجموعات", href: "#beyond" },
  { label: "المجلة", href: "#journal" },
  { label: "تواصل", href: "#newsletter" },
] as const;

const HELP_LINKS = [
  { label: "الأسئلة الشائعة", href: "#footer" },
  { label: "الشحن", href: "#footer" },
  { label: "الرجوع", href: "#footer" },
  { label: "الشروط والأحكام", href: "#footer" },
  { label: "سياسة الخصوصية", href: "#footer" },
] as const;

export function Footer() {
  return (
    <footer id="footer" className="bg-[#0a1628] pb-12 pt-12">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 items-center gap-8 px-6 md:flex md:flex-row md:items-center md:justify-between md:gap-12 md:px-12">
        {/* far right: the mark */}
        <div className="col-start-1 row-start-1 flex justify-start">
          <a
            href="#hero"
            aria-label="3WEEQ — الرئيسية"
            className="inline-flex"
          >
            <Image
              src="/images/logo-mark.png"
              alt="3WEEQ"
              width={2785}
              height={841}
              quality={90}
              sizes="(min-width: 64rem) 12rem, 8rem"
              className="h-auto w-32 md:w-48"
            />
          </a>
        </div>

        {/* middle right: quick links */}
        <div className="col-start-1 row-start-2 text-right">
          <h3 className="mb-6 font-primary text-lg text-gold">روابط سريعة</h3>

          <ul className="space-y-4">
            {QUICK_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="font-primary text-sm text-sand transition-colors duration-300 hover:text-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* middle left: help */}
        <div className="col-start-2 row-start-2 text-right">
          <h3 className="mb-6 font-primary text-lg text-gold">مساعدة</h3>

          <ul className="space-y-4">
            {HELP_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="font-primary text-sm text-sand transition-colors duration-300 hover:text-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* far left: follow */}
        <div className="col-start-2 row-start-1 flex items-center  gap-3 text-left md:block">
          <div className="flex items-center justify-end gap-3">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex rounded-full border border-gold p-2 text-gold transition-colors duration-300 hover:bg-gold hover:text-royal-navy"
            >
              <Instagram className="h-4 w-4" strokeWidth={1.4} />
            </a>

            <a
              href="https://www.youtube.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Youtube"
              className="inline-flex rounded-full border border-gold p-2 text-gold transition-colors duration-300 hover:bg-gold hover:text-royal-navy"
            >
              <Youtube className="h-4 w-4" strokeWidth={1.4} />
            </a>
          </div>
        </div>
      </div>

      {/* the full-bleed golden panel */}
      <div className="w-full  pt-8">
        <Image
          src="/images/footer/footer_ornament.webp"
          alt=""
          width={1376}
          height={768}
          quality={90}
          sizes="100vw"
          className="pointer-events-none h-auto w-full select-none object-cover mix-blend-screen"
        />
      </div>

      <div className="px-6 md:px-12">
        <div className="mx-auto mt-8 flex w-full max-w-7xl flex-col items-center justify-between gap-4 text-sm text-sand/60 md:flex-row">
          <p className="font-primary">© 2026 3WEEQ. جميع الحقوق محفوظة.</p>

          <p
            dir="ltr"
            className="font-secondary text-[10px] tracking-[0.28em] md:text-left md:text-[11px]"
          >
            A JOURNEY ACROSS CIVILIZATIONS
          </p>
        </div>
      </div>
    </footer>
  );
}
