"use client";

import { Volume2, MoreHorizontal } from "lucide-react";
import { usePlayerStore } from "@/store/playerStore";

const FRIENDS: { name: string; listening: string; color: string; isLive?: boolean }[] = [
  { name: "Sofi", listening: "Lil Peep", color: "#d4a5f5", isLive: true },
  { name: "Daniel", listening: "Travis Scott", color: "#f5c6a0" },
  { name: "Nekichetire", listening: "3h ago", color: "#a0d4f5" },
  { name: "Tolik", listening: "5h ago", color: "#f5a0c6" },
  { name: "Kostia", listening: "8h ago", color: "#a0f5c6" },
  { name: "Dima V.", listening: "15h ago", color: "#f5e0a0" },
];

const YOUR_ACTIVITY: { name: string; sub: string; color: string }[] = [
  { name: "blackbear", sub: "Artist", color: "#c4b5f5" },
  { name: "Deep End", sub: "Foushée", color: "#f5c4d4" },
  { name: "Lil Peep", sub: "Artist", color: "#b5d4f5" },
  { name: "Gimme Love", sub: "Joji", color: "#f5e4b5" },
  { name: "Oliver Tree", sub: "Artist", color: "#b5f5d4" },
];

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
      style={{ background: color }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function RightPanel() {
  const { track } = usePlayerStore();

  return (
    <aside
      className="fixed top-0 right-0 h-full flex flex-col bg-[var(--surface)] z-20 overflow-y-auto pb-28"
      style={{ width: "var(--rightpanel-w)" }}
    >
      {/* Friends Activity */}
      <div className="px-4 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Friends Activity</h3>
        <ul className="space-y-3">
          {FRIENDS.map((f) => (
            <li key={f.name} className="flex items-center gap-2.5">
              <div className="relative">
                <Avatar name={f.name} color={f.color} />
                {f.isLive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--accent)] rounded-full border-2 border-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--foreground)] truncate">{f.name}</p>
                <p className="text-[10px] text-[var(--muted)] truncate">
                  {f.isLive ? `Listening to ${f.listening}` : `Listening ${f.listening}`}
                </p>
              </div>
              {f.isLive && (
                <Volume2 className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-4 border-t border-[var(--border)] my-2" />

      {/* Your Activity */}
      <div className="px-4 pt-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Your Activity</h3>
        <ul className="space-y-1">
          {YOUR_ACTIVITY.map((a) => (
            <li
              key={a.name}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors cursor-pointer group"
            >
              <Avatar name={a.name} color={a.color} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--foreground)] truncate">{a.name}</p>
                <p className="text-[10px] text-[var(--muted)] truncate">{a.sub}</p>
              </div>
              <button className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--foreground)] transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Now playing card */}
      {track && (
        <div className="mx-4 mt-4 p-3 bg-[var(--surface-3)] rounded-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">Now Playing</p>
          <p className="text-xs font-bold text-[var(--foreground)] truncate">{track.name}</p>
          <p className="text-[10px] text-[var(--muted)] truncate">{track.artists?.map((a) => a.name).join(", ")}</p>
        </div>
      )}
    </aside>
  );
}
