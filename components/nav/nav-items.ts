import { LayoutDashboard, Users, BarChart3, Settings, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pairs", href: "/pairs", icon: Users },
  { label: "Settlements", href: "/settlements", icon: Wallet },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
