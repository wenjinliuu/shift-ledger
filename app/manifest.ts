import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "工时簿 · 综合工时记录",
    short_name: "工时簿",
    description: "排班、工时与加班累计工具",
    start_url: "/",
    display: "standalone",
    background_color: "#edf5ff",
    theme_color: "#edf5ff",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
