import {
  HelpCircle,
  MessageSquarePlus,
  BookOpen,
  Settings,
  LayoutDashboard,
  Building2,
  Tags,
  UserPlus,
  Flag,
  Globe,
  type LucideIcon,
} from "lucide-react";

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

const superAdminNav: DashboardNavItem[] = [
  { to: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/dashboard/mosques", label: "Manage Mosques", icon: Building2 },
  { to: "/dashboard/categories", label: "Manage Categories", icon: Tags },
  { to: "/dashboard/create-admin", label: "Create Mosque Admin", icon: UserPlus },
  { to: "/dashboard/reports", label: "Reports", icon: Flag },
  { to: "/dashboard/public-content", label: "Public Content", icon: Globe },
];

export function getNavForRole(role: UserRole | null | undefined): DashboardNavItem[] {
  switch (role) {
    case "super_admin":
      return superAdminNav;
    case "shaykh":
    case "mosque_admin":
    case "user":
    default:
      return userNav;
  }
}
