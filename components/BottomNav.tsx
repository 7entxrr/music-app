"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Search, Library, Heart } from "lucide-react";

const NAV = [
  { href: "/", label: "Home", icon: Sparkles },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Library },
  { href: "/liked", label: "Liked", icon: Heart },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around z-50 md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href === "/search" && pathname.startsWith("/search"));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
              active ? "text-[var(--accent)]" : "text-[var(--muted)]"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
