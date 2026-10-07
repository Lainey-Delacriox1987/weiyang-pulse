import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeYoung Pulse｜黑客松现场互动与投票",
  description: "在黑客松现场破冰、求助、播报进度，让每一次互动点亮大屏。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
