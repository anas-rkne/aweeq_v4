/**
 * Brand font catalog.
 *
 * Fonts are self-hosted as local WOFF2 files in /public/fonts and declared
 * via @font-face in globals.css with a unicode-range per script (Arabic /
 * Latin). They never make a network request to fonts.googleapis.com or
 * fonts.gstatic.com. This file only exports the font-family tokens used by
 * Tailwind theme variables (--font-primary / --font-secondary).
 *
 * Arabic (Lyon Arabic Display): every Arabic glyph on the site.
 * Latin  (Ador Hairline):       every Latin glyph, digits and punctuation.
 */

export const fontPrimary =
  '"Lyon Arabic Display", "Ador Hairline", "Segoe UI", Tahoma, Arial, sans-serif';

export const fontSecondary =
  '"Ador Hairline", "Lyon Arabic Display", "Segoe UI", Tahoma, Arial, sans-serif';

export const fontPreloads = [
  "/fonts/lyon-arabic-display-regular.woff2",
  "/fonts/ador-hairline-bold.woff2",
] as const;
