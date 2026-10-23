import type { NextConfig } from "next";

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
  images: {
    remotePatterns,
    /* AVIF first where the browser takes it, WebP where it does not */
    formats: ["image/avif", "image/webp"],
    /* the hero photograph is the LCP element: it is served at a higher
       quality than the default, and the other qualities are allowed here so
       the optimizer never answers with an error */
    qualities: [60, 70, 75, 80, 90],
    deviceSizes: [640, 750, 1024, 1280, 1536, 1920, 2560],
    /* a month of cache: the hero frames are the site, they do not change
       between deploys */
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
