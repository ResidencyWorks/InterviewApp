/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type checking is handled by lefthook pre-push hooks
    ignoreBuildErrors: false,
  },
  eslint: {
    // Linting is handled by Biome
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['localhost'],
  },
}

export default nextConfig
