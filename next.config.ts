import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the e2e runner build into its own folder (see scripts/e2e.mjs).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
