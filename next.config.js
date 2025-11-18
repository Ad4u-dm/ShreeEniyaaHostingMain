
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const withNextIntl = require("next-intl/plugin")("./i18n/request.ts");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
    eslint: {
        ignoreDuringBuilds: true,
    },
    webpack: (config) => {
        config.module.rules.push({
            test: /\.map$/,
            use: "ignore-loader",
        });
        return config;
    },
};

module.exports = withPWA(withBundleAnalyzer(withNextIntl(nextConfig)));
