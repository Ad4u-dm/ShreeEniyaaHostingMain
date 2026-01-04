
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

let withBundleAnalyzer;
try {
    // Try to load the analyzer (devDependency). If it's not installed
    // (for example in production builds where devDependencies are skipped),
    // fall back to a no-op wrapper so the build does not fail.
    withBundleAnalyzer = require("@next/bundle-analyzer")({
        enabled: process.env.ANALYZE === "true",
    });
} catch (err) {
    // eslint-disable-next-line no-console
    console.warn("@next/bundle-analyzer not available; continuing without it.");
    withBundleAnalyzer = (cfg) => cfg;
}

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
