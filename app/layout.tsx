import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "工时簿｜综合工时与排班记录",
  description: "为综合工时制设计的个人排班、工时与加班费计算工具。",
  applicationName: "工时簿",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "工时簿",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
