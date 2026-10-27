export default function manifest() {
  return { name: "My Life Manager", short_name: "LifeManager", description: "Personal finance manager", start_url: "/dashboard", display: "standalone", background_color: "#f3f6f5", theme_color: "#0f766e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }, { src: "/apple-icon", sizes: "180x180", type: "image/png" }] };
}
