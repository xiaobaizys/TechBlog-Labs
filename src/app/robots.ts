import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://techblog-labs.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
