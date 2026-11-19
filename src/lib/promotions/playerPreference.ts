import prisma from "@/lib/prisma"

export async function refreshPlayerPreferences(userId?: string) {
  const users = await prisma.user.findMany({
    where: userId ? { id: userId } : { role: "PLAYER" },
    select: { id: true },
  })

  for (const u of users) {
    const bookings = await prisma.booking.findMany({
      where: { userId: u.id, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: { court: true, facility: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const sportCounts: Record<string, number> = {}
    const hourCounts: Record<number, number> = {}
    const dayCounts: Record<number, number> = {}
    let totalValue = 0
    for (const b of bookings) {
      if (b.court?.sportType) sportCounts[b.court.sportType] = (sportCounts[b.court.sportType] || 0) + 1
      const h = new Date(b.startTime).getHours()
      hourCounts[h] = (hourCounts[h] || 0) + 1
      const d = new Date(b.startTime).getDay()
      dayCounts[d] = (dayCounts[d] || 0) + 1
      totalValue += b.totalPrice || 0
    }

    const preferredSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as any
    const preferredTimes = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h]) => Number(h))
    const preferredDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => Number(d))

    const lastBookingAt = bookings[0]?.createdAt || null
    const inactivityDays = lastBookingAt ? Math.floor((Date.now() - new Date(lastBookingAt).getTime()) / (1000 * 60 * 60 * 24)) : 999

    const engagementScore = Math.min(100, bookings.length * 5 + Math.max(0, 30 - inactivityDays) * 2)

    await prisma.playerPreference.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        preferredSport,
        preferredTimes,
        preferredDays,
        lastBookingAt,
        bookingCount30d: bookings.filter((b) => new Date(b.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        avgBookingValue: bookings.length ? totalValue / bookings.length : 0,
        inactivityDays,
        engagementScore,
      },
      update: {
        preferredSport,
        preferredTimes,
        preferredDays,
        lastBookingAt,
        bookingCount30d: bookings.filter((b) => new Date(b.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        avgBookingValue: bookings.length ? totalValue / bookings.length : 0,
        inactivityDays,
        engagementScore,
      },
    })
  }

  return { success: true, count: users.length }
}
