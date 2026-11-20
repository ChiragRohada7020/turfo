import type { MetadataRoute } from "next"
import { BLOGS } from "@/lib/blogs"

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://strikora.in"
  const blogEntries = BLOGS.map((post) => ({
    url: `${base}/blogs/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }))
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/offers`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/tournaments`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/blogs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...blogEntries,
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/auth/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/auth/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ]
}