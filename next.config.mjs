/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.ko-fi.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
        port: ''
      }
      ]
  }
};

export default nextConfig;
