/** @type {import('next').NextConfig} */
const nextConfig = {
    reactCompiler: true,
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    transpilePackages: ["@repo/ui", "@repo/backend", "@repo/email"],
};

export default nextConfig;
