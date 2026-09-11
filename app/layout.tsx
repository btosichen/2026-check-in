import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "914緊急救護組｜現場報到", description: "教師與職員無紙化報到系統", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-Hant"><body className="antialiased">{children}</body></html>; }
