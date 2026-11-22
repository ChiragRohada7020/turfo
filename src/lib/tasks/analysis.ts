import prisma from "@/lib/prisma"
import { BookingStatus } from "@prisma/client"

export interface PlayerSituation {
  userId: string
  bookingCount: number
  completedBookings: number
  confirmedBookings: number
  cancelledBookings: number
  lastBookingDate: Date | null
  inactivityDays: number
  bookingFrequencyPerWeek: number
  preferredSports: { sport: string; count: number }[]
  preferredDays: number[]
  preferredHours: number[]
  groupBookings: number
  distinctSports: number
  taskCompletionCount: number
  rewardPoints: number
  engagementScore: number
  isNewPlayer: boolean
  isInactive: boolean
  isRegular: boolean
  isWeekendPlayer: boolean
  isGroupPlayer: boolean
  isLoyal: boolean
  sportsToExplore: string[]
}

export async function analyzePlayer(userId: string): Promise<PlayerSituation> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rewardPoints: true, createdAt: true },
  })

  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: { court: { select: { sportType: true } }, participants: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const completedBookings = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length
  const confirmedBookings = bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length
  const cancelledBookings = bookings.filter((b) => b.status === BookingStatus.CANCELLED).length

  const lastBooking = bookings[0] || null
  const lastBookingDate = lastBooking ? new Date(lastBooking.createdAt) : null
  const inactivityDays = lastBookingDate
    ? Math.floor((Date.now() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  const sportCounts: Record<string, number> = {}
  const dayCounts: Record<number, number> = {}
  const hourCounts: Record<number, number> = {}
  let groupBookings = 0

  for (const b of bookings) {
    const sport = b.court?.sportType || "FOOTBALL"
    sportCounts[sport] = (sportCounts[sport] || 0) + 1
    const d = new Date(b.startTime).getDay()
    dayCounts[d] = (dayCounts[d] || 0) + 1
    const h = new Date(b.startTime).getHours()
    hourCounts[h] = (hourCounts[h] || 0) + 1
    if ((b.participants?.length || 0) > 1 || (b.offlineFriends || 0) > 0 || (b.maxPlayers || 1) > 1) {
      groupBookings++
    }
  }

  const preferredSports = Object.entries(sportCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([sport, count]) => ({ sport, count }))

  const preferredDays = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => Number(d))

  const preferredHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => Number(h))

  const distinctSports = Object.keys(sportCounts).length

  const taskCompletionCount = await prisma.userTask.count({
    where: { userId, completed: true },
  })

  const engagementScore = Math.min(100, completedBookings * 5 + Math.max(0, 30 - inactivityDays) * 2 + taskCompletionCount * 3)

  const allSports = [
    "FOOTBALL",
    "CRICKET",
    "BADMINTON",
    "TENNIS",
    "BASKETBALL",
    "VOLLEYBALL",
    "SWIMMING",
    "GYM",
    "PICKLEBALL",
    "TABLE_TENNIS",
    "PS_GAMES",
  ]
  const sportsToExplore = allSports.filter((s) => !sportCounts[s])

  const now = Date.now()
  const firstBooking = bookings.length ? new Date(bookings[bookings.length - 1].createdAt) : null
  const ageDays = user?.createdAt ? Math.floor((now - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0

  const isNewPlayer = bookings.length <= 1 || ageDays < 14
  const isInactive = inactivityDays >= 7
  const isRegular = bookings.length >= 5 && inactivityDays < 7
  const isWeekendPlayer = preferredDays.some((d) => d === 0 || d === 6)
  const isGroupPlayer = groupBookings >= 2
  const isLoyal = completedBookings >= 9

  // booking frequency per week over last 8 weeks
  const eightWeeksAgo = new Date(now - 56 * 24 * 60 * 60 * 1000)
  const recentBookings = bookings.filter((b) => new Date(b.createdAt) >= eightWeeksAgo).length
  const bookingFrequencyPerWeek = recentBookings / 8

  return {
    userId,
    bookingCount: bookings.length,
    completedBookings,
    confirmedBookings,
    cancelledBookings,
    lastBookingDate,
    inactivityDays,
    bookingFrequencyPerWeek,
    preferredSports,
    preferredDays,
    preferredHours,
    groupBookings,
    distinctSports,
    taskCompletionCount,
    rewardPoints: user?.rewardPoints || 0,
    engagementScore,
    isNewPlayer,
    isInactive,
    isRegular,
    isWeekendPlayer,
    isGroupPlayer,
    isLoyal,
    sportsToExplore,
  }
}