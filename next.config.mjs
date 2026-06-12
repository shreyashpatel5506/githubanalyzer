const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com",
            },
            {
                protocol: "https",
                hostname: "avatars.github.com",
            },
        ],
    },
};
export default nextConfig;
