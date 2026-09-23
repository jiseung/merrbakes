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
      },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
        port: ''
      }
      ]
  }
};

export default nextConfig;
