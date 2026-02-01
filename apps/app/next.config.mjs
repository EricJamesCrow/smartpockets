/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    transpilePackages: ["@repo/ui", "@repo/backend", "@repo/email"],
};

export default nextConfig;
