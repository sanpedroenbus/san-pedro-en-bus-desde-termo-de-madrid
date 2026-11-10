import type { MetadataRoute } from "next";
import { getMetadataBase } from "@/lib/metadata";

// Nothing is disallowed on purpose: /demo is kept out of search with a noindex
// tag (crawlers must be able to fetch it to see that), and /api/og has to stay
// fetchable for link previews -- some preview crawlers honour robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", getMetadataBase()).toString(),
  };
}
