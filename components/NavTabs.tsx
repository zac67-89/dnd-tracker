"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs({ campaignId }: { campaignId: string }) {
  const pathname = usePathname();
  const base = `/campaign/${campaignId}`;

  const tabs = [
    { href: `${base}/notes`, label: "Notes" },
    { href: `${base}/character`, label: "Character Sheet" },
    { href: `${base}/spells`, label: "Spells" },
    { href: `${base}/currency`, label: "Currency" },
    { href: `${base}/entities/characters`, label: "Characters" },
    { href: `${base}/entities/places`, label: "Places" },
    { href: `${base}/entities/items`, label: "Items" },
    { href: `${base}/equipment`, label: "Equipment" },
    { href: `${base}/settings`, label: "Settings" },
  ];

  return (
    <nav className="flex flex-wrap gap-1 border-b border-white/10 pb-2">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active ? "bg-amber-600 text-stone-900" : "text-neutral-300 hover:bg-white/5"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
