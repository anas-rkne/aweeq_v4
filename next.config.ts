import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const backendUrl = new URL(
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
);
const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
);

const remotePatterns = [backendUrl, siteUrl].map((url) => ({
  protocol: url.protocol.replace(":", "") as "http" | "https",
  hostname: url.hostname,
  port: url.port,
  pathname: "/**",
}));

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns,
    /* AVIF first where the browser takes it, WebP where it does not */
    formats: ["image/avif", "image/webp"],
    /* the hero photograph is the LCP element: it is served at a higher
       quality than the default, and the other qualities are allowed here so
       the optimizer never answers with an error */
    qualities: [60, 70, 75, 80, 90],
    deviceSizes: [640, 750, 1024, 1280, 1536, 1920, 2560],
    /* Optimized derivatives are keyed by URL, not by file content. A month of
       cache therefore means a replaced image (same file name) keeps serving
       the old bytes for a month — from this server's image cache and from the
       visitor's browser. One minute is long enough to absorb traffic and short
       enough that swapping a file under the same name takes effect on its own. */
    minimumCacheTTL: 60,
  },
};

export default withNextIntl(nextConfig);
