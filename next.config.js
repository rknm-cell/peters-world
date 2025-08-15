/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    optimizePackageImports: ['@trpc/server', '@trpc/client', '@trpc/react-query', '@trpc/next'],
  },
  // Disable font optimization to fix lightningcss issues on Vercel
  optimizeFonts: false,
};

export default config;
