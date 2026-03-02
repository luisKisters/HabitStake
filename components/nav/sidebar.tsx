"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center px-4 font-bold">
        HabitStake
      </div>
      <nav className="flex-1 space-y-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-3 py-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeSwitcher />
      </div>
    </aside>
  );
}
