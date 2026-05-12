import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import PlayerBar from "@/components/PlayerBar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chef Music",
  description: "Search, discover and play music",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <ServiceWorkerRegistration />
        <Sidebar />

        <div
          className="flex flex-col min-h-screen"
          style={{ marginLeft: "var(--sidebar-w)" }}
        >
          <main className="flex-1 px-4 md:px-6 pb-44 md:pb-32">{children}</main>
        </div>

        <PlayerBar />
        <BottomNav />
      </body>
    </html>
  );
}
