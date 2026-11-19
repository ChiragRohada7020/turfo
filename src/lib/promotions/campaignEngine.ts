import prisma from "@/lib/prisma"

export async function generateLowDemandCampaigns(ownerId?: string, maxCampaigns = 5) {
  const facilities = await prisma.facility.findMany({
    where: ownerId ? { ownerId, isActive: true } : { isActive: true },
    include: { courts: { where: { isActive: true } }, owner: true },
  })

  const results: any[] = []
  let created = 0

  for (const facility of facilities) {
    if (created >= maxCampaigns) break
    const settings = await prisma.ownerPromoSettings.findUnique({ where: { ownerId: facility.ownerId } })
    if (settings && !settings.enabled) continue

    const maxDiscountPct = settings?.maxDiscountPct ?? 20
    const monthlyBudget = settings?.monthlyBudget ?? 0
    const spentBudget = settings?.spentBudget ?? 0
    if (monthlyBudget > 0 && spentBudget >= monthlyBudget) continue

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const forecasts = await prisma.demandForecast.findMany({
      where: { facilityId: facility.id, date: { in: [today, tomorrow] }, demandLevel: "LOW" },
      orderBy: { predictedOccupancy: "asc" },
      take: 3,
    })

    for (const f of forecasts) {
      if (created >= maxCampaigns) break
      if (settings?.allowedDays?.length && !settings.allowedDays.includes(new Date(f.date).getDay())) continue
      if (settings && (f.hour < settings.allowedStartHour || f.hour >= settings.allowedEndHour)) continue

      // skip if campaign already exists for this facility/date/hour
      const existing = await prisma.promotionCampaign.findFirst({
        where: { facilityId: facility.id, applicableHours: { has: f.hour }, startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      })
      if (existing) continue
      if (settings?.allowedDays?.length && !settings.allowedDays.includes(new Date(f.date).getDay())) continue
      if (settings && (f.hour < settings.allowedStartHour || f.hour >= settings.allowedEndHour)) continue

      // find or create system sponsor
      let systemSponsor = await prisma.sponsor.findFirst({ where: { name: "TurfPlay System" } })
      if (!systemSponsor) {
        systemSponsor = await prisma.sponsor.create({
          data: { name: "TurfPlay System", contactEmail: "system@turfplay.local", userId: facility.ownerId, isApproved: true, isActive: true },
        })
      }

      const code = `LOW${facility.id.slice(-4)}${f.date.toISOString().slice(5, 10).replace("-", "")}${f.hour}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      const discountValue = Math.min(maxDiscountPct, 15)

      const offer = await prisma.offer.create({
        data: {
          sponsorId: systemSponsor.id,
          code,
          title: `Off-peak ${discountValue}% off`,
          description: `Discount for ${f.hour}:00 slot`,
          discountType: "PERCENTAGE",
          discountValue,
          minBookingAmount: settings?.minBookingPrice || 0,
          maxDiscount: settings?.maxFlatDiscount || undefined,
          validFrom: new Date(),
          validTo: new Date(Date.now() + 24 * 60 * 60 * 1000),
          maxUses: 50,
          maxUsesPerUser: 1,
          targetAudience: "ALL",
          targetCity: facility.city,
          isActive: settings?.autoApprove ?? false,
        },
      })

      const campaign = await prisma.promotionCampaign.create({
        data: {
          facilityId: facility.id,
          courtId: f.courtId,
          name: `Low-demand ${f.hour}:00`,
          type: "LOW_DEMAND",
          fundingSource: "OWNER",
          discountType: "PERCENTAGE",
          discountValue,
          minBookingAmount: settings?.minBookingPrice || 0,
          applicableHours: [f.hour],
          applicableDays: [new Date(f.date).getDay()],
          startAt: new Date(),
          endAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          budget: monthlyBudget,
          status: settings?.autoApprove ? "ACTIVE" : "DRAFT",
          createdBy: facility.ownerId,
          aiGenerated: false,
          description: `Auto-generated promotion for low-demand slot`,
        },
      })

      // find eligible players: those with preference matching hour/day or all players
      const prefs = await prisma.playerPreference.findMany({
        where: {
          OR: [{ preferredTimes: { has: f.hour } }, { preferredDays: { has: new Date(f.date).getDay() } }],
        },
        take: 100,
      })
      const userIds = (prefs.length ? prefs.map((p) => p.userId) : (await prisma.user.findMany({ where: { role: "PLAYER" }, take: 50 })).map((u) => u.id)).slice(0, 20)

      for (const uid of userIds) {
        const isHoldout = Math.random() < 0.1
        await prisma.campaignRecipient.create({
          data: { campaignId: campaign.id, userId: uid, couponCode: code, isHoldout },
        }).catch(() => {})
        if (!isHoldout) {
          await prisma.notification.create({
            data: {
              userId: uid,
              type: "SYSTEM",
              title: "New offer available",
              message: `Use code ${code} for ${discountValue}% off at ${facility.name}`,
              data: { campaignId: campaign.id, offerCode: code },
            },
          }).catch(() => {})
        }
      }

      results.push({ campaignId: campaign.id, offerCode: code, recipients: userIds.length })
      created++
    }
  }

  return { success: true, campaigns: results.length, details: results }
}
