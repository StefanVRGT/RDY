/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure webpack to handle server-only modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle these Node.js modules on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        http2: false,
        perf_hooks: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
