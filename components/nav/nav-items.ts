import { LayoutDashboard, Users, BarChart3, Settings, Wallet, CheckSquare, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pairs", href: "/pairs", icon: Users },
  { label: "Approvals", href: "/approvals", icon: CheckSquare },
  { label: "Settlements", href: "/settlements", icon: Wallet },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

// Subset shown in the mobile bottom tab bar (max 5 to avoid crowding)
export const bottomNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pairs", href: "/pairs", icon: Users },
  { label: "Approvals", href: "/approvals", icon: CheckSquare },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];
