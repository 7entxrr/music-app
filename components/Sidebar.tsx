"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Library,
  Radio,
  Video,
  Heart,
  Disc3,
  MicVocal,
  Clock,
  Music2,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Recommend",
    items: [
      { href: "/", label: "For you", icon: Sparkles },
      { href: "/library", label: "Library", icon: Library },
      { href: "/radio", label: "Radio Station", icon: Radio },
      { href: "/videos", label: "Music Video", icon: Video },
    ],
  },
  {
    label: "My music",
    items: [
      { href: "/liked", label: "Liked Songs", icon: Heart },
      { href: "/albums", label: "Albums", icon: Disc3 },
      { href: "/artists", label: "Artists", icon: MicVocal },
      { href: "/recent", label: "Recent", icon: Clock },
    ],
  },
  {
    label: "Playlists",
    items: [
      { href: "/playlist/hip-hop", label: "Hip-hop", icon: Music2 },
      { href: "/playlist/jazz", label: "Jazz", icon: Music2 },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-full hidden md:flex flex-col bg-[var(--surface)] z-20 overflow-y-auto"
      style={{ width: "var(--sidebar-w)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center shadow-sm">
          <Music2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-[var(--foreground)] text-[15px] tracking-tight">Chef Music</span>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 pb-4 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] px-2 mb-1.5">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? "bg-[var(--accent-light)] text-[var(--accent)]"
                          : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* New Playlist button */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent-hover)] transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Playlist
        </button>
      </div>
    </aside>
  );
}
