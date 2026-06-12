import { getSiteUrl } from "@/app/lib/seo";
export default function sitemap() {
    const siteUrl = getSiteUrl();
    const now = new Date();
    return [
        {
            url: `${siteUrl}/`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${siteUrl}/pricing`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${siteUrl}/plans`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
        },
    ];
}
