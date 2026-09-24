/** @type {import('next').NextConfig} */
const nextConfig = {
  // /option16 was the storefront's working route before it became the homepage;
  // keep old links (and /club's HOME constant) working.
  async redirects() {
    return [
      { source: '/option16', destination: '/', permanent: true },
      // Tweat signup moved into /club's join section
      { source: '/tweat', destination: '/club#join', permanent: true },
    ];
  },
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
