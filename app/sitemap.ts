import type { MetadataRoute } from "next";
import { FAMILY } from "@/lib/family";
import { snapshot } from "@/data/snapshot";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${FAMILY.siteUrl}/`,
      lastModified: new Date(snapshot.retrievedAt),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
