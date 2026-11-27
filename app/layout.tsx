import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LibreVsChrome } from "@/components/vsme/LibreVsChrome";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LibreVS — VS 2026 reporting",
  description: "Self-hosted VS 2026 sustainability reporting for European SMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <LibreVsChrome>{children}</LibreVsChrome>
        </Providers>
      </body>
    </html>
  );
}
