import { z } from "zod"
import { createTRPCRouter, adminProcedure } from "@/server/trpc/init"
import prisma from "@/lib/prisma"
import { Role, BookingStatus, PaymentStatus, PayoutStatus, Prisma } from "@prisma/client"

export const adminRouter = createTRPCRouter({
    users: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20), role: z.nativeEnum(Role).optional() }))
      .query(async ({ input }) => {
        const where: Prisma.UserWhereInput = {}
        if (input.role) where.role = input.role

        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            select: { id: true, email: true, name: true, phone: true, role: true, isPhoneVerified: true, isVerified: true, createdAt: true },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.user.count({ where }),
        ])

        return { users, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    facilities: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20), isActive: z.boolean().optional() }))
      .query(async ({ input }) => {
        const where: Prisma.FacilityWhereInput = {}
        if (input.isActive !== undefined) where.isActive = input.isActive

        const [facilities, total] = await Promise.all([
          prisma.facility.findMany({
            where,
            include: { owner: { select: { id: true, name: true, email: true } }, _count: { select: { bookings: true, courts: true } } },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.facility.count({ where }),
        ])

        return { facilities, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    analytics: adminProcedure.query(async () => {
      const [totalUsers, totalFacilities, totalBookings, totalRevenue, recentBookings] = await Promise.all([
        prisma.user.count(),
        prisma.facility.count(),
        prisma.booking.count(),
        prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCEEDED }, _sum: { amount: true, platformFee: true } }),
        prisma.booking.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { facility: true, user: true } }),
      ])

      return {
        totalUsers,
        totalFacilities,
        totalBookings,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalPlatformFees: totalRevenue._sum.platformFee || 0,
        recentBookings,
      }
    }),

    payouts: adminProcedure
      .input(z.object({ status: z.nativeEnum(PayoutStatus).optional(), page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const where: Prisma.PaymentWhereInput = {}
        if (input.status) where.payoutStatus = input.status

        const [payouts, total] = await Promise.all([
          prisma.payment.findMany({
            where,
            include: { booking: { include: { facility: { include: { owner: true } } } } },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.payment.count({ where }),
        ])

        return { payouts, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    pendingOwners: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const where: Prisma.UserWhereInput = {
          role: Role.OWNER,
          isVerified: false,
        }

        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            select: { id: true, email: true, name: true, phone: true, createdAt: true },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.user.count({ where }),
        ])

        return { users, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    verifyOwner: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          action: z.enum(["VERIFY", "REJECT"]),
        })
      )
      .mutation(async ({ input }) => {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
        })

        if (!user) throw new Error("User not found")
        if (user.role !== "OWNER") throw new Error("Only owner accounts can be verified")

        if (input.action === "VERIFY") {
          return prisma.user.update({
            where: { id: input.userId },
            data: { isVerified: true },
          })
        }

        // REJECT: delete the unverified owner account
        return prisma.user.delete({
          where: { id: input.userId },
        })
      }),
   })