/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack is default in Next.js 16; Node.js built-ins are excluded from the
  // client bundle automatically, so no custom webpack fallback config is needed.
  turbopack: {},
};

export default nextConfig;
