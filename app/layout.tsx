import type { Metadata, Viewport } from "next";
import { fontPreloads } from "./fonts";
import "lenis/dist/lenis.css";
import "./globals.css";
import { SiteHeader } from "./components/site-header";
import { SmoothScroll } from "./components/smooth-scroll";

export const metadata: Metadata = {
  title: "3WWEQ",
  description: "3WWEQ — A world where civilizations are told in scent.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#020a14",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <head>
        {fontPreloads.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        {/* Without scripting the reveal observer never runs, so the content it
            would have hidden must be shown again. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
