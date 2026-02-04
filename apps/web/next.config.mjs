/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
        return [
            {
                source: "/signin",
                destination: "/sign-in",
                permanent: false,
            },
            {
                source: "/signup",
                destination: "/sign-up",
                permanent: false,
            },
            {
                source: "/signin/:path*",
                destination: "/sign-in/:path*",
                permanent: false,
            },
            {
                source: "/signup/:path*",
                destination: "/sign-up/:path*",
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
