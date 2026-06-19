/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Allow Next.js Image Optimization to serve external thumbnails ──
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "models.readyplayer.me",
      },
      {
        protocol: "https",
        hostname: "*.readyplayer.me",
      },
    ],
  },

  // ── Security Headers (Required for Audio Worklets) ──────────────────────
  async headers() {
    return [
      {
        // Allow SharedArrayBuffer (needed for some audio worklet environments)
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;