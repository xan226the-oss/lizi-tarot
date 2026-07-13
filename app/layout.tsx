import type { Metadata } from "next";
import { Cinzel, Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap"
});

const notoSerifSc = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-noto-serif-sc",
  display: "swap"
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap"
});

export const metadata: Metadata = {
  title: "粒子 | 塔罗抽牌",
  description: "用手势、牌阵与 AI 人格探索塔罗视角的网页应用。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={cn(
          notoSansSc.variable,
          notoSerifSc.variable,
          cinzel.variable,
          "font-sans antialiased"
        )}
      >
        {children}
      </body>
    </html>
  );
}
