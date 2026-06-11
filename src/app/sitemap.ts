import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { guides } from "@/lib/docs/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/claude`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/docs`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...guides.map((g) => ({
      url: `${SITE_URL}/docs/${g.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
