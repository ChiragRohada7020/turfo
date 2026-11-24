/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "platform-lookaside.fbsbx.com",
      "avatars.githubusercontent.com",
      "localhost",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.oraclecloud.com",
      },
      {
        protocol: "https",
        hostname: "*.compat.objectstorage.*.oraclecloud.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push("baileys", "protobufjs", "long", "@hapi/boom")
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
}

module.exports = nextConfig