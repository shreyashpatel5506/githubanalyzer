import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/app/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/plans"],
        disallow: ["/api/", "/dashboard", "/history", "/profile", "/repos"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
