
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.BUILD_MODE === 'static' ? 'export' : 'standalone',
    typescript: {
        // Skip type checking during build if SKIP_TYPE_CHECK is set
        ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
    },
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    turbopack: {},
    experimental: {
        // Disable worker threads to avoid prerendering context issues
        workerThreads: false,
        cpus: 1,
    },
    webpack: (config) => {
        config.module.rules.push({
            test: /\.map$/,
            use: "ignore-loader",
        });
        return config;
    },
};

module.exports = withPWA(withBundleAnalyzer(nextConfig));
