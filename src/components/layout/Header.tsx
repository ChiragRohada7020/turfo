"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import {
  LayoutDashboard,
  Search,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Bell,
  User,
  MapPin,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Search", href: "/search", icon: Search },
  { name: "Bookings", href: "/dashboard/bookings", icon: Calendar },
  { name: "Teams", href: "/teams", icon: Users },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border">
      <div className="grid grid-cols-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-1 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MobileHeader() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [sheetOpen, setSheetOpen] = useState(false)

  const isDashboard = pathname.startsWith("/dashboard")
  const isAuth = pathname.startsWith("/auth")

  if (isAuth) {
    return (
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
          </Link>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 p-4">
                {status === "loading" ? (
                  <div className="animate-pulse h-12 bg-muted rounded" />
                ) : session ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {session.user?.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{session.user?.name}</p>
                        <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                        <Badge variant="outline" className="mt-1 text-xs">{session.user?.role}</Badge>
                      </div>
                    </div>
                    <nav className="flex flex-col gap-2">
                      <Link href="/dashboard" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg", pathname === "/dashboard" && "bg-primary text-primary-foreground")}>
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Link>
                      <Link href="/search" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg", pathname === "/search" && "bg-primary text-primary-foreground")}>
                        <Search className="h-5 w-5" />
                        <span>Find Facilities</span>
                      </Link>
                      <Link href="/dashboard/bookings" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg", pathname.startsWith("/dashboard/bookings") && "bg-primary text-primary-foreground")}>
                        <Calendar className="h-5 w-5" />
                        <span>My Bookings</span>
                      </Link>
                      <Link href="/teams" className={cn("flex items-center gap-3 px-3 py-2 rounded-lg", pathname === "/teams" && "bg-primary text-primary-foreground")}>
                        <Users className="h-5 w-5" />
                        <span>My Teams</span>
                      </Link>
                    </nav>
                    <DropdownMenuSeparator className="my-2" />
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/" })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Link href="/auth/login" className="w-full">
                      <Button className="w-full" size="lg">Sign In</Button>
                    </Link>
                    <Link href="/auth/register" className="w-full">
                      <Button variant="outline" className="w-full" size="lg">Sign Up</Button>
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export function DesktopHeader() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  if (!session) {
    return (
      <header className="sticky top-0 z-40 hidden md:flex w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">TurfBook</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/search" className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/search" && "text-primary")}>
              Find Facilities
            </Link>
            <Link href="/auth/login" className="text-sm font-medium">
              Sign In
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>
    )
  }

  const isOwner = session.user?.role === "OWNER" || session.user?.role === "ADMIN"

  return (
    <header className="sticky top-0 z-40 hidden md:flex w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">TurfBook</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/search" className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/search" && "text-primary")}>
            Find Facilities
          </Link>
          {isOwner && (
            <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
              Dashboard
            </Link>
          )}
          <Link href="/teams" className="text-sm font-medium transition-colors hover:text-primary">
            Teams
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {session.user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-4 py-2 border-b">
                <p className="font-medium">{session.user?.name}</p>
                <p className="text-sm text-muted-foreground">{session.user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}