import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";
import "./globals.css";

const sf = localFont({
  src: [
    { path: "./fonts/SFProDisplay-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/SFProDisplay-Medium.woff", weight: "500", style: "normal" },
    { path: "./fonts/SFProDisplay-Bold.woff", weight: "700", style: "normal" },
  ],
  variable: "--font-sf",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Shree Sai Trucks",
  description: "Live fleet tracking and shipment management for Shree Sai Trucks.",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  appleWebApp: { capable: true, title: "Shree Sai", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f2f4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={sf.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
