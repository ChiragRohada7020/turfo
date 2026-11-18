import {
  Home,
  CalendarDays,
  Ticket,
  Users,
  ShieldCheck,
  Trophy,
  Building2,
  Gift,
  Wallet,
  Bell,
  Settings,
  MapPin,
  QrCode,
} from "lucide-react"

export type NavItem = {
  name: string
  href: string
  icon: any
  badge?: string
}

export const PLAYER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Book a Game", href: "/search", icon: CalendarDays },
  { name: "My Bookings", href: "/dashboard/bookings", icon: Ticket },
  { name: "Open Games", href: "/dashboard/open-games", icon: Users },
  { name: "Offers & Rewards", href: "/offers", icon: Gift },
  { name: "Find Players", href: "/find-players", icon: Users },
  { name: "Teams", href: "/dashboard/teams", icon: ShieldCheck },
  { name: "Tournaments", href: "/tournaments", icon: Trophy },
  { name: "Wallet", href: "/wallet", icon: Wallet },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Support", href: "/help", icon: ShieldCheck },
]

export const OWNER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Facilities", href: "/dashboard/facilities", icon: Building2 },
  { name: "Add Facility", href: "/dashboard/facilities/new", icon: CalendarDays },
  { name: "Bookings", href: "/dashboard/bookings", icon: Ticket },
  { name: "Verify Booking", href: "/dashboard/verify", icon: QrCode },
  { name: "Payouts", href: "/dashboard/payouts", icon: Wallet },
  { name: "Analytics", href: "/dashboard/analytics", icon: Trophy },
  { name: "Offers & Rewards", href: "/offers", icon: Gift },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Support", href: "/help", icon: ShieldCheck },
]

export const SPONSOR_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Offers", href: "/dashboard/sponsor", icon: Gift },
  { name: "Verify Coupon", href: "/dashboard/verify-offer", icon: QrCode },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Support", href: "/help", icon: ShieldCheck },
]

export const ADMIN_NAV: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Users", href: "/admin?tab=users", icon: Users },
  { name: "Facilities", href: "/admin?tab=facilities", icon: Building2 },
  { name: "Payouts", href: "/admin?tab=payouts", icon: Wallet },
  { name: "Pending Owners", href: "/admin?tab=pending", icon: ShieldCheck },
  { name: "Settings", href: "/admin?tab=settings", icon: Settings },
  { name: "Support", href: "/help", icon: ShieldCheck },
]

export function getNavForRole(role?: string): NavItem[] {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return role === "ADMIN" ? ADMIN_NAV : OWNER_NAV
    case "SPONSOR":
      return SPONSOR_NAV
    default:
      return PLAYER_NAV
  }
}
