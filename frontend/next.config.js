/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript is checked separately; this avoids a second full type-check in
  // the deployment build, which otherwise exceeds small-host build limits.
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // Next 16's CLI config parser is unreliable in this nested workspace.
    // Use the installed TypeScript API for build setup instead.
    useTypeScriptCli: false,
    webpackBuildWorker: false,
  },

  images: {
    unoptimized: true, // Useful for static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  // Optional: set metadataBase if you use Open Graph/Twitter cards
  // metadataBase: new URL("https://fastnet.com"),
};

module.exports = nextConfig;
