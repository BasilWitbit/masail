import { HelpCircle, MessageSquarePlus, BookOpen, Settings, type LucideIcon } from "lucide-react";

export type UserRole = "user" | "shaykh" | "mosque_admin" | "super_admin";

export type DashboardNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const userNav: DashboardNavItem[] = [
  { to: "/dashboard/questions", label: "My Questions", icon: HelpCircle },
  { to: "/dashboard/ask", label: "Ask a Question", icon: MessageSquarePlus },
  { to: "/dashboard/library", label: "Q&A Library", icon: BookOpen },
  { to: "/dashboard/settings", label: "Account Settings", icon: Settings },
];

// Placeholder role-specific nav sets — extend without touching the shell.
export function getNavForRole(role: UserRole | null | undefined): DashboardNavItem[] {
  switch (role) {
    case "shaykh":
    case "mosque_admin":
    case "super_admin":
    case "user":
    default:
      return userNav;
  }
}
