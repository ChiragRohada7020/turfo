import { z } from "zod"
import { createTRPCRouter, publicProcedure, protectedProcedure, adminProcedure } from "@/server/trpc/init"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

export const sponsorsRouter = createTRPCRouter({
    // Create sponsor (admin only)
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        logoUrl: z.string().optional(),
        website: z.string().optional(),
        contactEmail: z.string().email(),
        contactPhone: z.string().optional(),
        budget: z.number().min(0).default(100000),
        userId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const sponsor = await prisma.sponsor.create({
          data: {
            name: input.name,
            description: input.description,
            logoUrl: input.logoUrl,
            website: input.website,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            budget: input.budget,
            userId: input.userId,
          },
        })
        // Update user role to SPONSOR
        await prisma.user.update({
          where: { id: input.userId },
          data: { role: "SPONSOR" },
        })
        return sponsor
      }),

    // List all sponsors (admin)
    list: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const [sponsors, total] = await Promise.all([
          prisma.sponsor.findMany({
            include: { user: { select: { name: true, email: true } }, offers: { select: { id: true } } },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.sponsor.count(),
        ])
        return { sponsors, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    // Get sponsor by userId
    getByUser: protectedProcedure
      .query(async ({ ctx }) => {
        let sponsor = await prisma.sponsor.findUnique({
          where: { userId: ctx.session.user.id },
          include: { offers: true },
        })
        if (!sponsor && ctx.session.user.role === "SPONSOR") {
          const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id } })
          sponsor = await prisma.sponsor.create({
            data: {
              name: user?.name || "Sponsor",
              contactEmail: user?.email || `${user?.phone}@phone.local`,
              userId: ctx.session.user.id,
              isApproved: false,
              isActive: true,
            },
            include: { offers: true },
          })
        }
        return sponsor
      }),

    // Approve sponsor (admin)
    approve: adminProcedure
      .input(z.object({ sponsorId: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.sponsor.update({
          where: { id: input.sponsorId },
          data: { isApproved: true },
        })
      }),

    // Toggle active (admin or sponsor)
    toggleActive: protectedProcedure
      .input(z.object({ sponsorId: z.string(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const sponsor = await prisma.sponsor.findUnique({ where: { id: input.sponsorId } })
        if (!sponsor) throw new Error("Sponsor not found")
        if (sponsor.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }
        return prisma.sponsor.update({
          where: { id: input.sponsorId },
          data: { isActive: input.isActive },
        })
      }),
  })
