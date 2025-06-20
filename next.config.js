const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'images.unsplash.com',
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.googleusercontent.com https://*.googleapis.com https://*.gstatic.com; connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://supabase.co https://*.supabase.co wss://*.supabase.co https://overpass-api.de;"
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfills para módulos de Node.js
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http2: false,
        zlib: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        util: require.resolve('util/'),
        url: require.resolve('url/'),
        assert: require.resolve('assert/'),
        querystring: require.resolve('querystring-es3'),
        events: require.resolve('events/'),
      };

      // Asegurarse de que los módulos node: se resuelvan correctamente
      config.resolve.alias = {
        ...config.resolve.alias,
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        process: require.resolve('process/browser'),
        events: require.resolve('events/'),
        'node:stream': require.resolve('stream-browserify'),
        'node:util': require.resolve('util/'),
        'node:buffer': require.resolve('buffer/'),
        'node:process': require.resolve('process/browser'),
        'node:events': require.resolve('events/'),
      };

      // Proveer variables globales necesarias
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: ['process/browser', 'process'],
          Buffer: ['buffer', 'Buffer'],
          stream: ['stream-browserify'],
          util: ['util'],
          assert: ['assert'],
          events: ['events'],
        })
      );
    }

    return config;
  }
};

module.exports = nextConfig; 