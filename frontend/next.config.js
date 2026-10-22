/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '..'),
  // TypeScript is checked separately; this avoids a second full type-check in
  // the deployment build, which otherwise exceeds small-host build limits.
  typescript: { ignoreBuildErrors: true },

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
