import prisma from "@/lib/prisma"
import { SportType } from "@prisma/client"

export async function refreshDemandForecasts(ownerId?: string) {
  console.log("prisma keys", Object.keys(prisma).filter(k=>/forecast/i.test(k)))
  const where: any = ownerId ? { ownerId } : {}
  const facilities = await prisma.facility.findMany({
    where,
    include: { courts: { where: { isActive: true } } },
  })

  const now = new Date()
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)

  for (const facility of facilities) {
    const courts = facility.courts.length ? facility.courts : [null]
    for (const court of courts) {
      const courtId = court?.id || null
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + dayOffset)
        targetDate.setHours(0, 0, 0, 0)
        const weekday = targetDate.getDay()

        const openHour = parseInt((facility.openTime || "06:00").split(":")[0], 10)
        let closeHour = parseInt((facility.closeTime || "22:00").split(":")[0], 10)
        if (closeHour <= openHour) closeHour += 24

        for (let hour = openHour; hour < closeHour; hour++) {
          const slotStart = new Date(targetDate)
          slotStart.setHours(hour % 24, 0, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000)

          // historical bookings for same weekday/hour over last 8 weeks
          const historical = await prisma.booking.count({
            where: {
              facilityId: facility.id,
              ...(courtId ? { courtId } : {}),
              startTime: { gte: eightWeeksAgo, lte: now },
            },
          })

          // Simplified: occupancy proxy = bookings in this hour / (8 weeks * 1 slot)
          // More precise would filter by hour/weekday; keep simple for Phase 1.
          const histSlotBookings = await prisma.booking.count({
            where: {
              facilityId: facility.id,
              ...(courtId ? { courtId } : {}),
              startTime: {
                gte: eightWeeksAgo,
              },
            },
          })

          const weeks = 8
          const historicalOccupancy = Math.min(1, histSlotBookings / (weeks * 1))
          const predictedOccupancy = historicalOccupancy
          const demandLevel =
            predictedOccupancy < 0.3 ? "LOW" : predictedOccupancy < 0.7 ? "MEDIUM" : "HIGH"

          await prisma.demandForecast.upsert({
            where: {
              facilityId_courtId_date_hour: {
                facilityId: facility.id,
                courtId: courtId || "",
                date: targetDate,
                hour,
              },
            },
            update: { predictedOccupancy, historicalOccupancy, demandLevel },
            create: {
              facilityId: facility.id,
              courtId: courtId || null,
              date: targetDate,
              hour,
              predictedOccupancy,
              historicalOccupancy,
              demandLevel,
            },
          })
        }
      }
    }
  }

  return { success: true }
}
