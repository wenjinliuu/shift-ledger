import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "工时簿 · 综合工时记录",
    short_name: "工时簿",
    description: "排班、工时与加班费预测工具",
    start_url: "/",
    display: "standalone",
    background_color: "#edf5ff",
    theme_color: "#edf5ff",
    orientation: "portrait",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
