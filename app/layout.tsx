import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import PlayerBar from "@/components/PlayerBar";
import Sidebar from "@/components/Sidebar";

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
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <Sidebar />

        <div
          className="flex flex-col min-h-screen"
          style={{ marginLeft: "var(--sidebar-w)" }}
        >
          <main className="flex-1 px-6 pb-32">{children}</main>
        </div>

        <PlayerBar />
      </body>
    </html>
  );
}
