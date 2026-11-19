import { z } from "zod"
import { createTRPCRouter, protectedProcedure, ownerProcedure, adminProcedure, publicProcedure } from "@/server/trpc/init"
import prisma from "@/lib/prisma"
import { refreshDemandForecasts } from "@/lib/promotions/demandForecast"
import { refreshPlayerPreferences } from "@/lib/promotions/playerPreference"
import { generateLowDemandCampaigns } from "@/lib/promotions/campaignEngine"
import { runKiloPromotionDecision } from "@/lib/ai/kilo"

export const promotionsRouter = createTRPCRouter({
  ownerSettings: ownerProcedure
    .input(z.object({ facilityId: z.string().optional() }).optional())
    .query(async ({ ctx }) => {
      return prisma.ownerPromoSettings.findUnique({
        where: { ownerId: ctx.session.user.id },
      })
    }),

  myPreference: protectedProcedure.query(async ({ ctx }) => {
    return prisma.playerPreference.findUnique({ where: { userId: ctx.session.user.id } })
  }),

  refreshMyPreference: protectedProcedure.mutation(async ({ ctx }) => {
    const { refreshPlayerPreferences } = await import("@/lib/promotions/playerPreference")
    return refreshPlayerPreferences(ctx.session.user.id)
  }),
  updateOwnerSettings: ownerProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        maxDiscountPct: z.number().min(0).max(100).optional(),
        maxFlatDiscount: z.number().min(0).optional(),
        minBookingPrice: z.number().min(0).optional(),
        allowedDays: z.array(z.number().min(0).max(6)).optional(),
        allowedStartHour: z.number().min(0).max(23).optional(),
        allowedEndHour: z.number().min(0).max(23).optional(),
        monthlyBudget: z.number().min(0).optional(),
        autoApprove: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.ownerPromoSettings.upsert({
        where: { ownerId: ctx.session.user.id },
        create: { ownerId: ctx.session.user.id, ...input },
        update: input,
      })
    }),

  forecasts: ownerProcedure
    .input(z.object({ facilityId: z.string().optional(), date: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const facilities = await prisma.facility.findMany({ where: { ownerId: ctx.session.user.id }, select: { id: true } })
      const facilityIds = input?.facilityId ? [input.facilityId] : facilities.map((f) => f.id)
      const date = input?.date ? new Date(input.date) : new Date()
      date.setHours(0, 0, 0, 0)
      return prisma.demandForecast.findMany({
        where: { facilityId: { in: facilityIds }, date },
        orderBy: [{ facilityId: "asc" }, { hour: "asc" }],
      })
    }),

  refreshForecasts: ownerProcedure.mutation(async ({ ctx }) => {
    return refreshDemandForecasts(ctx.session.user.id)
  }),

  adminRefreshForecasts: adminProcedure.mutation(async () => {
    return refreshDemandForecasts()
  }),

  adminRefreshPlayerPreferences: adminProcedure
    .input(z.object({ userId: z.string().optional() }).optional())
    .mutation(async ({ input }) => {
      return refreshPlayerPreferences(input?.userId)
    }),

  platformSettings: adminProcedure.query(async () => {
    return prisma.platformPromoSettings.upsert({
      where: { id: "global" },
      create: { id: "global" },
      update: {},
    })
  }),

  updatePlatformSettings: adminProcedure
    .input(
      z.object({
        aiDistributionEnabled: z.boolean().optional(),
        globalMaxDiscountPct: z.number().min(0).max(100).optional(),
        globalMonthlyBudget: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.platformPromoSettings.upsert({
        where: { id: "global" },
        create: { id: "global", ...input },
        update: input,
      })
    }),

  trackOfferImpression: publicProcedure
    .input(z.object({ offerId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.offer.update({ where: { id: input.offerId }, data: { impressions: { increment: 1 } } })
      return { success: true }
    }),

  trackOfferClick: publicProcedure
    .input(z.object({ offerId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.offer.update({ where: { id: input.offerId }, data: { clicks: { increment: 1 } } })
      return { success: true }
    }),

  campaigns: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(50), status: z.string().optional() }))
    .query(async ({ input }) => {
      const where: any = input.status ? { status: input.status } : {}
      const [campaigns, total] = await Promise.all([
        prisma.promotionCampaign.findMany({
          where,
          include: { facility: { select: { name: true } }, _count: { select: { recipients: true } } },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.promotionCampaign.count({ where }),
      ])
      return { campaigns, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
    }),

  myCampaigns: ownerProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const facilities = await prisma.facility.findMany({ where: { ownerId: ctx.session.user.id }, select: { id: true } })
      const ids = facilities.map((f) => f.id)
      const [campaigns, total] = await Promise.all([
        prisma.promotionCampaign.findMany({
          where: { facilityId: { in: ids } },
          include: { _count: { select: { recipients: true } } },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        prisma.promotionCampaign.count({ where: { facilityId: { in: ids } } }),
      ])
      return { campaigns, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
    }),

  pauseCampaign: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.promotionCampaign.update({ where: { id: input.id }, data: { status: "PAUSED" } })
    }),

  resumeCampaign: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.promotionCampaign.update({ where: { id: input.id }, data: { status: "ACTIVE" } })
    }),

  generateLowDemandCampaigns: ownerProcedure.mutation(async ({ ctx }) => {
    return generateLowDemandCampaigns(ctx.session.user.id)
  }),

  adminGenerateLowDemandCampaigns: adminProcedure.mutation(async () => {
    return generateLowDemandCampaigns()
  }),

  aiDecide: ownerProcedure.mutation(async ({ ctx }) => {
    return runKiloPromotionDecision(ctx.session.user.id)
  }),

  adminAiDecide: adminProcedure.mutation(async () => {
    return runKiloPromotionDecision()
  }),

  perks: protectedProcedure.query(async () => {
    return prisma.rewardPerk.findMany({ where: { isActive: true }, orderBy: { costPoints: "asc" } })
  }),

  redeemPerk: protectedProcedure
    .input(z.object({ perkId: z.string(), metadata: z.record(z.any()).optional() }))
    .mutation(async ({ ctx, input }) => {
      const perk = await prisma.rewardPerk.findUnique({ where: { id: input.perkId } })
      if (!perk || !perk.isActive) throw new Error("Perk not available")
      const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { rewardPoints: true } })
      if (!user || user.rewardPoints < perk.costPoints) throw new Error("Insufficient reward points")

      // Apply perk effects
      const meta = input.metadata || {}
      if (perk.perkType === "TEAM_RENAME" && meta.teamId && meta.name) {
        const team = await prisma.team.findUnique({ where: { id: String(meta.teamId) } })
        if (!team || team.captainId !== ctx.session.user.id) throw new Error("Not authorized to rename this team")
        await prisma.team.update({ where: { id: team.id }, data: { name: String(meta.name) } })
      }
      if (perk.perkType === "TEAM_BOOST" && meta.teamId) {
        const team = await prisma.team.findUnique({ where: { id: String(meta.teamId) } })
        if (!team || team.captainId !== ctx.session.user.id) throw new Error("Not authorized to boost this team")
        const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        await prisma.team.update({ where: { id: team.id }, data: { boostedUntil: until } })
      }

      const [redemption] = await prisma.$transaction([
        prisma.rewardRedemption.create({
          data: { userId: ctx.session.user.id, perkId: perk.id, pointsSpent: perk.costPoints, metadata: meta },
        }),
        prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { rewardPoints: { decrement: perk.costPoints } },
        }),
        prisma.rewardTransaction.create({
          data: {
            userId: ctx.session.user.id,
            points: -perk.costPoints,
            type: "REDEEMED",
            description: `Redeemed perk: ${perk.name}`,
            referenceId: perk.id,
          },
        }),
      ])

      return redemption
    }),

  createPerk: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        description: z.string().optional(),
        costPoints: z.number().min(1),
        perkType: z.string(),
        targetScope: z.string().default("PLAYER"),
        maxRedemptionsPerUser: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.rewardPerk.create({ data: input })
    }),
})