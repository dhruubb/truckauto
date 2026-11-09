/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No ESLint config ships with the demo; type-checking still runs on build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
