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
  TrendingUp,
  QrCode,
} from "lucide-react"

export type NavItem = {
  name: string
  href: string
  icon: any
  badge?: string
  locked?: boolean
}

export const PLAYER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Book a Game", href: "/search", icon: CalendarDays },
  { name: "My Bookings", href: "/dashboard/bookings", icon: Ticket },
  { name: "Open Games", href: "/dashboard/open-games", icon: Users },
  { name: "Offers & Rewards", href: "/offers", icon: Gift },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Support", href: "/support", icon: ShieldCheck },
  { name: "Find Players", href: "/find-players", icon: Users, locked: true },
  { name: "Teams", href: "/dashboard/teams", icon: ShieldCheck, locked: true },
  { name: "Tournaments", href: "/tournaments", icon: Trophy, locked: true },
]

export const OWNER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Facilities", href: "/dashboard/facilities", icon: Building2 },
  { name: "Add Facility", href: "/dashboard/facilities/new", icon: CalendarDays },
  { name: "Bookings", href: "/dashboard/bookings", icon: Ticket },
  { name: "Verify Booking", href: "/dashboard/verify?scan=1", icon: QrCode },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Support", href: "/support", icon: ShieldCheck },
  { name: "Payouts", href: "/dashboard/payouts", icon: Wallet, locked: true },
  { name: "Analytics", href: "/dashboard/analytics", icon: Trophy, locked: true },
  { name: "Promotions", href: "/dashboard/promotions", icon: TrendingUp, locked: true },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Gift, locked: true },
  { name: "Offers & Rewards", href: "/offers", icon: Gift, locked: true },
]

export const SPONSOR_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "My Offers", href: "/dashboard/sponsor/offers", icon: Gift },
  { name: "Verify Coupon", href: "/dashboard/verify-offer", icon: QrCode },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Support", href: "/support", icon: ShieldCheck },
]

export const ADMIN_NAV: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: Home },
  { name: "Users", href: "/admin?tab=users", icon: Users },
  { name: "Facilities", href: "/admin?tab=facilities", icon: Building2 },
  { name: "Payouts", href: "/admin?tab=payouts", icon: Wallet },
  { name: "Pending Owners", href: "/admin?tab=pending", icon: ShieldCheck },
  { name: "Settings", href: "/admin?tab=settings", icon: Settings },
  { name: "Support", href: "/support", icon: ShieldCheck },
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
