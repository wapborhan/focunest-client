const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export default function robots() {
  return { rules: [{ userAgent: "*", allow: ["/", "/login"], disallow: ["/api/", "/dashboard", "/cash", "/ibadat", "/tasks", "/settings"] }], sitemap: `${base}/sitemap.xml` };
}
