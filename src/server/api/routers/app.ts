import { z } from "zod"
import { sponsorsRouter } from "./sponsors.router"
import { adminRouter } from "./admin.router"
import { createTRPCRouter, publicProcedure, protectedProcedure, ownerProcedure, adminProcedure } from "@/server/trpc/init"
import { TRPCError } from "@trpc/server"
import prisma from "@/lib/prisma"
import { Role, SportType, SurfaceType, BookingStatus, PaymentStatus, PayoutStatus, TeamRole, NotificationType, Prisma } from "@prisma/client"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { msg91 } from "@/lib/msg91/service"
import { createCashfreeOrder, generateOrderId, createCashfreeRefund, initiateCashfreePayout, createCashfreeContact } from "@/lib/cashfree"

export const appRouter = createTRPCRouter({
  auth: createTRPCRouter({
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
          name: z.string().min(2).optional(),
          phone: z.string().optional(),
          role: z.nativeEnum(Role).default(Role.PLAYER),
        })
      )
      .mutation(async ({ input }) => {
        const existingUser = await prisma.user.findUnique({
          where: { email: input.email },
        })

        if (existingUser) {
          throw new Error("Email already registered")
        }

        const passwordHash = await bcrypt.hash(input.password, 12)

        const user = await prisma.user.create({
          data: {
            email: input.email,
            passwordHash,
            name: input.name,
            phone: input.phone,
            role: input.role,
          },
        })

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      }),

    me: protectedProcedure.query(async ({ ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          avatarUrl: true,
          isPhoneVerified: true,
          createdAt: true,
        },
      })
      return user
    }),

    getProfile: protectedProcedure
      .query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            avatarUrl: true,
            role: true,
            address: true,
            city: true,
            state: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            cibilScore: true,
          },
        })
        return user
      }),

    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { passwordHash: true },
        })
        if (!user?.passwordHash) throw new Error("No password set")

        const bcrypt = await import("bcryptjs")
        const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash)
        if (!isValid) throw new Error("Current password is incorrect")

        const newHash = await bcrypt.hash(input.newPassword, 12)
        await prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { passwordHash: newHash },
        })
        return { success: true }
      }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).optional(),
          phone: z.string().optional(),
          avatarUrl: z.string().url().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await prisma.user.update({
          where: { id: ctx.session.user.id },
          data: input,
        })
        return { id: user.id, email: user.email, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl, address: user.address, city: user.city, state: user.state, postalCode: user.postalCode, latitude: user.latitude, longitude: user.longitude }
      }),

    // Public OTP endpoints for registration
    sendRegistrationOTP: publicProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ input }) => {
        const normalizedPhone = input.phone.startsWith("+91")
          ? input.phone
          : input.phone.startsWith("91")
          ? `+${input.phone}`
          : `+91${input.phone}`

        // Check if phone already registered
        const existing = await prisma.user.findFirst({
          where: { phone: normalizedPhone },
        })
        if (existing) throw new Error("Phone number already registered")

        const result = await msg91.sendOTP(normalizedPhone)
        return { success: true, otp: (result as any).otp }
      }),

    verifyRegistrationOTP: publicProcedure
      .input(z.object({ phone: z.string(), otp: z.string() }))
      .mutation(async ({ input }) => {
        const normalizedPhone = input.phone.startsWith("+91")
          ? input.phone
          : input.phone.startsWith("91")
          ? `+${input.phone}`
          : `+91${input.phone}`

        await msg91.verifyOTP(normalizedPhone, input.otp)
        return { success: true, phone: normalizedPhone }
      }),

    verifyPhone: protectedProcedure
      .input(z.object({ phone: z.string(), otp: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const normalizedPhone = input.phone.startsWith("+91")
          ? input.phone
          : input.phone.startsWith("91")
          ? `+${input.phone}`
          : `+91${input.phone}`

        await msg91.verifyOTP(normalizedPhone, input.otp)

        const user = await prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { phone: normalizedPhone, isPhoneVerified: true },
        })

        return { success: true, phone: user.phone }
      }),

    sendOTP: protectedProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const normalizedPhone = input.phone.startsWith("+91")
          ? input.phone
          : input.phone.startsWith("91")
          ? `+${input.phone}`
          : `+91${input.phone}`

        await msg91.sendOTP(normalizedPhone)
        return { success: true }
      }),
  }),

  facilities: createTRPCRouter({
    list: publicProcedure
      .input(
        z.object({
          city: z.string().optional(),
          sportTypes: z.array(z.nativeEnum(SportType)).optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          radiusKm: z.number().default(10),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        const where: Prisma.FacilityWhereInput = {
          isActive: true,
          ...(input.city && { city: { equals: input.city, mode: "insensitive" } }),
          ...(input.sportTypes?.length && { sportTypes: { hasSome: input.sportTypes } }),
        }

        // If coordinates provided, add spatial filter (simplified for now)
        // Full Oracle Spatial implementation would use SDO_NN

        const [facilities, total] = await Promise.all([
          prisma.facility.findMany({
            where,
            include: {
              courts: { where: { isActive: true }, include: { pricingRules: { where: { isActive: true } } } },
              owner: { select: { id: true, name: true, avatarUrl: true } },
              pricingRules: { where: { isActive: true } },
              reviews: { select: { rating: true } },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.facility.count({ where }),
        ])

        const facilitiesWithAvgRating = facilities.map((f) => {
          const allPricingRules = [
            ...f.pricingRules,
            ...f.courts.flatMap((c: any) => c.pricingRules || []),
          ]
          return {
            ...f,
            avgRating: f.reviews.length > 0
              ? f.reviews.reduce((sum, r) => sum + r.rating, 0) / f.reviews.length
              : 0,
            reviewCount: f.reviews.length,
            minPrice: allPricingRules.length > 0
              ? Math.min(...allPricingRules.map((p: any) => p.pricePerHour))
              : null,
          }
        })

        return {
          facilities: facilitiesWithAvgRating,
          total,
          page: input.page,
          totalPages: Math.ceil(total / input.limit),
        }
      }),

    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const facility = await prisma.facility.findUnique({
          where: { id: input.id },
          include: {
            courts: { where: { isActive: true }, include: { pricingRules: { where: { isActive: true } } } },
            owner: { select: { id: true, name: true, avatarUrl: true, phone: true } },
            pricingRules: { where: { isActive: true } },
            availability: { where: { date: { gte: new Date() }, isBlocked: false }, take: 30 },
            reviews: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        })

        if (!facility) throw new Error("Facility not found")

        const avgRating = facility.reviews.length > 0
          ? facility.reviews.reduce((sum, r) => sum + r.rating, 0) / facility.reviews.length
          : 0

        const minPrice = facility.pricingRules.length > 0
          ? Math.min(...facility.pricingRules.map((p) => p.pricePerHour))
          : null

        return { ...facility, avgRating, reviewCount: facility.reviews.length, minPrice }
      }),

    create: ownerProcedure
      .input(
        z.object({
          name: z.string().min(3),
          description: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().min(2).default("India"),
          postalCode: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          sportTypes: z.array(z.nativeEnum(SportType)).min(1),
          amenities: z.array(z.string()).default([]),
          images: z.array(z.string().url()).default([]),
          openTime: z.string().optional(),
          closeTime: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user exists (prevents FK constraint errors from stale sessions)
        const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id } })
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired. Please log in again." })

        // Auto-fill location from owner profile if not provided
        const owner = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { address: true, city: true, state: true, postalCode: true, latitude: true, longitude: true },
        })

        const facility = await prisma.facility.create({
          data: {
            name: input.name,
            description: input.description,
            address: input.address || owner?.address || "",
            city: input.city || owner?.city || "",
            state: input.state || owner?.state || "",
            country: input.country,
            postalCode: input.postalCode || owner?.postalCode || "",
            latitude: input.latitude ?? owner?.latitude ?? 0,
            longitude: input.longitude ?? owner?.longitude ?? 0,
            sportTypes: input.sportTypes,
            amenities: input.amenities,
            images: input.images,
            openTime: input.openTime || "06:00",
            closeTime: input.closeTime || "22:00",
            ownerId: ctx.session.user.id,
          },
        })
        return facility
      }),

    update: ownerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(3).optional(),
          description: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          postalCode: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          sportTypes: z.array(z.nativeEnum(SportType)).optional(),
          amenities: z.array(z.string()).optional(),
          images: z.array(z.string().url()).optional(),
          openTime: z.string().optional(),
          closeTime: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input
        const facility = await prisma.facility.findFirst({
          where: { id, ownerId: ctx.session.user.id },
        })
        if (!facility) throw new Error("Facility not found or access denied")

        return prisma.facility.update({ where: { id }, data })
      }),

    delete: ownerProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const facility = await prisma.facility.findFirst({
          where: { id: input.id, ownerId: ctx.session.user.id },
        })
        if (!facility) throw new Error("Facility not found or access denied")

        return prisma.facility.delete({ where: { id: input.id } })
      }),

    myFacilities: protectedProcedure.query(async ({ ctx }) => {
      return prisma.facility.findMany({
        where: { ownerId: ctx.session.user.id },
        include: {
          courts: true,
          _count: { select: { bookings: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    }),

    sportTypes: publicProcedure.query(async () => {
      const facilities = await prisma.facility.findMany({
        where: { isActive: true },
        select: { sportTypes: true },
      })
      const counts: Record<string, number> = {}
      facilities.forEach((f) => {
        f.sportTypes.forEach((sport) => {
          counts[sport] = (counts[sport] || 0) + 1
        })
      })
      return Object.entries(counts).map(([sport, count]) => ({ sport, count }))
    }),

    search: publicProcedure
      .input(
        z.object({
          query: z.string().optional(),
          latitude: z.number(),
          longitude: z.number(),
          radiusKm: z.number().default(10),
          sportTypes: z.array(z.nativeEnum(SportType)).optional(),
          date: z.string().optional(), // ISO date string
          startTime: z.string().optional(),
          endTime: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        // Simplified search - full Oracle Spatial implementation would use SDO_NN
        const where: Prisma.FacilityWhereInput = {
          isActive: true,
          ...(input.sportTypes?.length && { sportTypes: { hasSome: input.sportTypes } }),
        }

        const facilities = await prisma.facility.findMany({
          where,
          include: {
            courts: { where: { isActive: true } },
            pricingRules: { where: { isActive: true } },
            reviews: { select: { rating: true } },
          },
          take: 50,
        })

        // Calculate distance (Haversine formula) - in production use Oracle Spatial
        const facilitiesWithDistance = facilities.map((f) => {
          const R = 6371 // Earth radius in km
          const dLat = ((f.latitude - input.latitude) * Math.PI) / 180
          const dLon = ((f.longitude - input.longitude) * Math.PI) / 180
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((input.latitude * Math.PI) / 180) *
              Math.cos((f.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          const distance = R * c

          return {
            ...f,
            distance,
            avgRating: f.reviews.length > 0
              ? f.reviews.reduce((sum, r) => sum + r.rating, 0) / f.reviews.length
              : 0,
            reviewCount: f.reviews.length,
            minPrice: f.pricingRules.length > 0
              ? Math.min(...f.pricingRules.map((p) => p.pricePerHour))
              : null,
          }
        })

        return facilitiesWithDistance
          .filter((f) => f.distance <= input.radiusKm)
          .sort((a, b) => a.distance - b.distance)
      }),
  }),

  courts: createTRPCRouter({
    create: ownerProcedure
      .input(
        z.object({
          facilityId: z.string(),
          name: z.string().min(2),
          sportType: z.nativeEnum(SportType),
          surfaceType: z.nativeEnum(SurfaceType).optional(),
          capacity: z.number().min(1).default(10),
          dimensions: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const facility = await prisma.facility.findFirst({
          where: { id: input.facilityId, ownerId: ctx.session.user.id },
        })
        if (!facility) throw new Error("Facility not found or access denied")

        return prisma.court.create({ data: input })
      }),

    update: ownerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          sportType: z.nativeEnum(SportType).optional(),
          surfaceType: z.nativeEnum(SurfaceType).optional(),
          capacity: z.number().optional(),
          dimensions: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input
        const court = await prisma.court.findFirst({
          where: { id, facility: { ownerId: ctx.session.user.id } },
        })
        if (!court) throw new Error("Court not found or access denied")

        return prisma.court.update({ where: { id }, data })
      }),

    delete: ownerProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const court = await prisma.court.findFirst({
          where: { id: input.id, facility: { ownerId: ctx.session.user.id } },
        })
        if (!court) throw new Error("Court not found or access denied")

        return prisma.court.delete({ where: { id: input.id } })
      }),

    availability: publicProcedure
      .input(z.object({ courtId: z.string(), date: z.string() }))
      .query(async ({ input }) => {
        const date = new Date(input.date)
        date.setHours(0, 0, 0, 0)

        // Auto-cancel stale pending bookings (older than 1 minute without payment)
        const staleTime = new Date(Date.now() - 1 * 60 * 1000)
        await prisma.booking.updateMany({
          where: {
            courtId: input.courtId,
            status: "PENDING",
            createdAt: { lt: staleTime },
          },
          data: { status: "CANCELLED" },
        })
        await prisma.payment.updateMany({
          where: {
            booking: { courtId: input.courtId, status: "CANCELLED" },
            status: "PENDING",
          },
          data: { status: "FAILED" },
        })

        const availability = await prisma.availability.findFirst({
          where: { courtId: input.courtId, date },
        })

        if (!availability || availability.isBlocked) {
          return { slots: [], isBlocked: true, note: availability?.note }
        }

        const pricingRules = await prisma.pricingRule.findMany({
          where: { courtId: input.courtId, isActive: true },
        })

        const bookings = await prisma.booking.findMany({
          where: {
            courtId: input.courtId,
            startTime: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
        })

        // Generate available slots based on availability and pricing rules
        const slots = generateAvailableSlots(
          availability.startTime,
          availability.endTime,
          pricingRules,
          bookings,
          date
        )

        return { slots, isBlocked: false }
      }),
  }),

  pricing: createTRPCRouter({
    create: ownerProcedure
      .input(
        z.object({
          facilityId: z.string().optional(),
          courtId: z.string().optional(),
          name: z.string().min(2),
          dayOfWeek: z.array(z.number().min(0).max(6)).min(1),
          startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          pricePerHour: z.number().positive(),
          minDuration: z.number().min(30).default(60),
          maxDuration: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.facilityId) {
          const facility = await prisma.facility.findFirst({
            where: { id: input.facilityId, ownerId: ctx.session.user.id },
          })
          if (!facility) throw new Error("Facility not found or access denied")
        }
        if (input.courtId) {
          const court = await prisma.court.findFirst({
            where: { id: input.courtId, facility: { ownerId: ctx.session.user.id } },
          })
          if (!court) throw new Error("Court not found or access denied")
        }

        return prisma.pricingRule.create({ data: input })
      }),

    update: ownerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          dayOfWeek: z.array(z.number().min(0).max(6)).optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          pricePerHour: z.number().optional(),
          minDuration: z.number().optional(),
          maxDuration: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input
        const rule = await prisma.pricingRule.findFirst({
          where: {
            id,
            OR: [
              { facility: { ownerId: ctx.session.user.id } },
              { court: { facility: { ownerId: ctx.session.user.id } } },
            ],
          },
        })
        if (!rule) throw new Error("Pricing rule not found or access denied")

        return prisma.pricingRule.update({ where: { id }, data })
      }),

    delete: ownerProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const rule = await prisma.pricingRule.findFirst({
          where: {
            id: input.id,
            OR: [
              { facility: { ownerId: ctx.session.user.id } },
              { court: { facility: { ownerId: ctx.session.user.id } } },
            ],
          },
        })
        if (!rule) throw new Error("Pricing rule not found or access denied")

        return prisma.pricingRule.delete({ where: { id: input.id } })
      }),

    getRules: publicProcedure
      .input(z.object({ facilityId: z.string().optional(), courtId: z.string().optional() }))
      .query(async ({ input }) => {
        return prisma.pricingRule.findMany({
          where: {
            isActive: true,
            ...(input.facilityId && { facilityId: input.facilityId }),
            ...(input.courtId && { courtId: input.courtId }),
          },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        })
      }),
  }),

  bookings: createTRPCRouter({
    create: protectedProcedure
      .input(
        z.object({
          facilityId: z.string(),
          courtId: z.string().optional(),
          startTime: z.string().datetime(),
          endTime: z.string().datetime(),
          notes: z.string().optional(),
          maxPlayers: z.number().min(1).max(20).optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const courtId = input.courtId
        const facilityId = input.facilityId

        const startTime = new Date(input.startTime)
        const endTime = new Date(input.endTime)
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

        if (duration < 30) throw new Error("Minimum booking duration is 30 minutes")
        if (duration > 60) throw new Error("Maximum booking duration is 1 hour")

        // Prevent booking in the past
        if (startTime < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot book a time slot in the past" })
        }

        // Verify court belongs to facility (prevents tampering)
        if (courtId) {
          const court = await prisma.court.findFirst({
            where: { id: courtId, facilityId },
          })
          if (!court) throw new TRPCError({ code: "BAD_REQUEST", message: "Court does not belong to this facility" })
        }

        // Verify user exists (prevents FK constraint errors from stale sessions)
        const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id } })
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired. Please log in again." })

        // Check CIBIL score - minimum 600 to book
        if (user.cibilScore < 600) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Your CIBIL score (${user.cibilScore}) is too low to book. Minimum required: 600. Join other players' games to improve your score.`,
          })
        }

        // Check booking limit - max 2 active (pending/confirmed) bookings
        const activeBookings = await prisma.booking.count({
          where: {
            userId: ctx.session.user.id,
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          },
        })
        if (activeBookings >= 2) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You already have 2 active bookings. Please complete or cancel an existing booking before creating a new one.",
          })
        }

        // Check for conflicts (atomic with booking creation to prevent race conditions)
        const conflictingBooking = await prisma.booking.findFirst({
          where: {
            courtId: courtId || undefined,
            facilityId,
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            OR: [
              { startTime: { lt: endTime }, endTime: { gt: startTime } },
            ],
          },
        })

        if (conflictingBooking) throw new TRPCError({
          code: "CONFLICT",
          message: "Time slot not available",
        })

        // Calculate price
        const pricingRules = await prisma.pricingRule.findMany({
          where: {
            isActive: true,
            OR: [{ facilityId }, { courtId: courtId || "" }],
          },
        })

// Convert UTC to IST (UTC+5:30) for pricing rule lookup
        const istOffset = 5.5 * 60 * 60 * 1000
        const istTime = new Date(startTime.getTime() + istOffset)
        const dayOfWeek = istTime.getUTCDay()
        const timeStr = `${istTime.getUTCHours().toString().padStart(2, "0")}:${istTime.getUTCMinutes().toString().padStart(2, "0")}`

        const applicableRule = pricingRules.find(
          (r) =>
            r.dayOfWeek.includes(dayOfWeek) &&
            r.startTime <= timeStr &&
            r.endTime > timeStr &&
            duration >= r.minDuration &&
            (!r.maxDuration || duration <= r.maxDuration)
        )

        if (!applicableRule) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This time slot is outside operating hours (6:00 AM - 10:00 PM). Please select a slot between 06:00 and 22:00.",
          })
        }

        const totalPrice = (applicableRule.pricePerHour * duration) / 60
        const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 10
        const platformFee = (totalPrice * platformFeePercent) / 100
        const ownerPayout = totalPrice - platformFee


// In booking create, after creating booking:
        const verificationCode = randomBytes(16).toString("hex")

        // Create booking with conflict re-check in transaction (prevents race conditions)
        const booking = await prisma.$transaction(async (tx) => {
          // Re-check for conflicts inside transaction
          const conflict = await tx.booking.findFirst({
            where: {
              courtId: courtId || undefined,
              facilityId,
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
              OR: [
                { startTime: { lt: endTime }, endTime: { gt: startTime } },
              ],
            },
          })
          if (conflict) throw new TRPCError({
            code: "CONFLICT",
            message: "Time slot not available",
          })

          return tx.booking.create({
            data: {
              userId: ctx.session.user.id,
              facilityId,
              courtId,
              startTime,
              endTime,
              duration,
              totalPrice,
              status: BookingStatus.CONFIRMED,
              verificationCode,
              maxPlayers: input.maxPlayers || 1,
              isPublic: input.isPublic || false,
              notes: input.notes,
            },
          })
        }, { isolationLevel: "Serializable" })

        // Create payment record (offline payment - no gateway)
        const paymentRecord = await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: totalPrice,
            platformFee,
            ownerPayout,
            cashfreePaymentId: `OFFLINE_${booking.id}`,
            cashfreeOrderId: `OFFLINE_${booking.id}`,
            status: PaymentStatus.SUCCEEDED,
            paidAt: new Date(),
          },
        })

        // Create notification for booking confirmation
        await prisma.notification.create({
          data: {
            userId: ctx.session.user.id,
            type: "BOOKING_CONFIRMED",
            title: "Booking Confirmed",
            message: `Your booking has been confirmed. Payment of ₹${totalPrice} to be collected at venue.`,
            data: { bookingId: booking.id },
          },
        })

        return { booking, totalPrice, platformFee, ownerPayout, pricingRule: applicableRule, paymentLink: null, cfOrderId: null }
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.id },
          include: {
            facility: true,
            court: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
            payment: true,
            review: true,
          },
        })

        if (!booking) throw new Error("Booking not found")

        // Check access
        const isOwner = booking.facility.ownerId === ctx.session.user.id
        const isPlayer = booking.userId === ctx.session.user.id
        const isAdmin = ctx.session.user.role === "ADMIN"

        if (!isOwner && !isPlayer && !isAdmin) {
          throw new Error("Access denied")
        }

        return booking
      }),

    myBookings: protectedProcedure
      .input(
        z.object({
          status: z.nativeEnum(BookingStatus).optional(),
          page: z.number().default(1),
          limit: z.number().default(10),
        })
      )
      .query(async ({ ctx, input }) => {
        const where: Prisma.BookingWhereInput = {
          userId: ctx.session.user.id,
          ...(input.status && { status: input.status }),
        }

        const [bookings, total] = await Promise.all([
          prisma.booking.findMany({
            where,
            include: {
              facility: { select: { id: true, name: true, address: true, city: true, images: true } },
              court: { select: { id: true, name: true } },
              payment: { select: { status: true, amount: true } },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.booking.count({ where }),
        ])

        return { bookings, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    upcoming: protectedProcedure.query(async ({ ctx }) => {
      const now = new Date()
      return prisma.booking.findMany({
        where: {
          userId: ctx.session.user.id,
          startTime: { gte: now },
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        },
        include: {
          facility: { select: { id: true, name: true, address: true, city: true, images: true } },
          court: { select: { id: true, name: true } },
          payment: { select: { status: true, amount: true } },
        },
        orderBy: { startTime: "asc" },
        take: 10,
      })
    }),

    cancel: protectedProcedure
      .input(z.object({ id: z.string(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.id },
          include: { facility: true, payment: true, user: { select: { name: true, email: true } } },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN" && booking.facility.ownerId !== ctx.session.user.id) {
          throw new Error("Access denied")
        }
        if (booking.status === BookingStatus.CANCELLED) throw new Error("Already cancelled")
        if (booking.status === BookingStatus.COMPLETED) throw new Error("Cannot cancel completed booking")
        if (booking.payment?.status === PaymentStatus.REFUNDED) throw new Error("Payment already refunded")

        const isOwner = booking.facility.ownerId === ctx.session.user.id || ctx.session.user.role === "ADMIN"

        // Require reason for confirmed bookings
        if (booking.status === BookingStatus.CONFIRMED && !input.reason) {
          throw new Error("Please provide a cancellation reason")
        }

        const updated = await prisma.booking.update({
          where: { id: input.id },
          data: {
            status: BookingStatus.CANCELLED,
            notes: input.reason ? `Cancelled: ${input.reason}` : `Cancelled by ${isOwner ? "owner" : "player"}`,
          },
        })

        // No online payment - no refund processing needed
        // Update payment status if exists
        if (booking.payment) {
          await prisma.payment.update({
            where: { id: booking.payment.id },
            data: { status: PaymentStatus.FAILED },
          })
        }

        // Decrease CIBIL score for cancellation
        await prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { cibilScore: { decrement: 50 } },
        })

        // Create notification for the other party
        if (isOwner) {
          // Notify player
          await prisma.notification.create({
            data: {
              userId: booking.userId,
              type: "BOOKING_CANCELLED",
              title: "Booking Cancelled by Owner",
              message: `Your booking at ${booking.facility.name} has been cancelled by the facility.`,
              data: { bookingId: booking.id },
            },
          })
        } else {
          // Notify owner
          await prisma.notification.create({
            data: {
              userId: booking.facility.ownerId,
              type: "BOOKING_CANCELLED",
              title: "Booking Cancelled by Player",
              message: `${booking.user?.name || "A player"} cancelled their booking at ${booking.facility.name}.`,
              data: { bookingId: booking.id },
            },
          })
        }

        return { ...updated, refundPercent: 0, refundAmount: 0 }
      }),

    // Get public/open bookings (available to join)
    publicBookings: publicProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const now = new Date()
        const today = new Date(now)
        today.setHours(0, 0, 0, 0)

        const bookings = await prisma.booking.findMany({
          where: {
            isPublic: true,
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            startTime: { gte: today },
          },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, reliabilityScore: true, noShowCount: true, cibilScore: true } },
            facility: { select: { id: true, name: true, address: true, city: true, images: true } },
            court: { select: { id: true, name: true } },
            participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, reliabilityScore: true, noShowCount: true, cibilScore: true } } } },
          },
          orderBy: { startTime: "asc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        })

        return bookings.map((b) => ({
          ...b,
          spotsLeft: (b.maxPlayers || 1) - 1 - b.participants.length,
          totalSpots: b.maxPlayers || 1,
        }))
      }),

    // Request to join a public booking (creates a join request for host approval)
    joinBooking: protectedProcedure
      .input(z.object({ bookingId: z.string(), message: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
          include: { participants: true, user: { select: { name: true } } },
        })

        if (!booking) throw new Error("Booking not found")
        if (!booking.isPublic) throw new Error("This booking is not open for others")
        if (booking.status !== "CONFIRMED" && booking.status !== "PENDING") throw new Error("Booking is not active")
        if (booking.userId === ctx.session.user.id) throw new Error("You are the host of this booking")

        const maxPlayers = booking.maxPlayers || 1
        const spotsTaken = booking.participants.length
        if (spotsTaken >= maxPlayers - 1) throw new Error("No spots available")

        // Check if already joined
        const existing = booking.participants.find((p) => p.userId === ctx.session.user.id)
        if (existing) throw new Error("You have already joined this booking")

        // Check if already requested
        const existingRequest = await prisma.joinRequest.findUnique({
          where: { bookingId_userId: { bookingId: input.bookingId, userId: ctx.session.user.id } },
        })
        if (existingRequest && existingRequest.status === "PENDING") throw new Error("You already have a pending request")
        if (existingRequest && existingRequest.status === "APPROVED") throw new Error("You have already been approved")

        // Check reliability
        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { noShowCount: true, reliabilityScore: true, name: true, cibilScore: true },
        })
        if (user && user.noShowCount >= 3) {
          throw new Error("You have been restricted from joining open games due to multiple no-shows.")
        }
        if (user && user.cibilScore < 600) {
          throw new Error(`Your CIBIL score (${user.cibilScore}) is too low to join games. Minimum required: 600. Book and complete games to improve your score.`)
        }

        // Create join request
        const request = await prisma.joinRequest.create({
          data: {
            bookingId: input.bookingId,
            userId: ctx.session.user.id,
            message: input.message,
          },
        })

        // Increase CIBIL score for requesting to join
        await prisma.user.update({
          where: { id: ctx.session.user.id },
          data: { cibilScore: { increment: 5 } },
        })

        // Notify host
        await prisma.notification.create({
          data: {
            userId: booking.userId,
            type: "BOOKING_CONFIRMED",
            title: "New Join Request",
            message: `${user?.name || "A player"} wants to join your game at ${booking.facilityId}. ${input.message ? `Message: ${input.message}` : ""}`,
            data: { bookingId: booking.id, requestId: request.id, requesterId: ctx.session.user.id },
          },
        })

        return request
      }),

    // Approve a join request (host only)
    approveJoinRequest: protectedProcedure
      .input(z.object({ requestId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const joinRequest = await prisma.joinRequest.findUnique({
          where: { id: input.requestId },
          include: { booking: { include: { participants: true } }, user: { select: { name: true } } },
        })

        if (!joinRequest) throw new Error("Request not found")
        if (joinRequest.status !== "PENDING") throw new Error("Request already processed")
        if (joinRequest.booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }

        const maxPlayers = joinRequest.booking.maxPlayers || 1
        if (joinRequest.booking.participants.length >= maxPlayers - 1) {
          throw new Error("No spots available")
        }

        // Approve and add as participant
        await prisma.$transaction(async (tx) => {
          await tx.joinRequest.update({
            where: { id: input.requestId },
            data: { status: "APPROVED" },
          })
          await tx.bookingParticipant.create({
            data: {
              bookingId: joinRequest.bookingId,
              userId: joinRequest.userId,
            },
          })
          // Increase CIBIL score for joining
          await tx.user.update({
            where: { id: joinRequest.userId },
            data: { cibilScore: { increment: 15 } },
          })
          await tx.notification.create({
            data: {
              userId: joinRequest.userId,
              type: "BOOKING_CONFIRMED",
              title: "Join Request Approved",
              message: `Your request to join the game has been approved!`,
              data: { bookingId: joinRequest.bookingId },
            },
          })
        })

        return { success: true }
      }),

    // Reject a join request (host only)
    rejectJoinRequest: protectedProcedure
      .input(z.object({ requestId: z.string(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const joinRequest = await prisma.joinRequest.findUnique({
          where: { id: input.requestId },
          include: { booking: true },
        })

        if (!joinRequest) throw new Error("Request not found")
        if (joinRequest.status !== "PENDING") throw new Error("Request already processed")
        if (joinRequest.booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }

        await prisma.$transaction(async (tx) => {
          await tx.joinRequest.update({
            where: { id: input.requestId },
            data: { status: "REJECTED" },
          })
          await tx.notification.create({
            data: {
              userId: joinRequest.userId,
              type: "BOOKING_CANCELLED",
              title: "Join Request Rejected",
              message: `Your request to join the game was rejected. ${input.reason || ""}`,
              data: { bookingId: joinRequest.bookingId },
            },
          })
        })

        return { success: true }
      }),

    // Get pending join requests for a booking (host only)
    getJoinRequests: protectedProcedure
      .input(z.object({ bookingId: z.string() }))
      .query(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }

        const requests = await prisma.joinRequest.findMany({
          where: { bookingId: input.bookingId, status: "PENDING" },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, reliabilityScore: true, noShowCount: true, phone: true } },
          },
          orderBy: { createdAt: "asc" },
        })

        return requests
      }),

    // Get my join requests (as a requester)
    myJoinRequests: protectedProcedure
      .query(async ({ ctx }) => {
        const requests = await prisma.joinRequest.findMany({
          where: { userId: ctx.session.user.id },
          include: {
            booking: {
              include: {
                facility: { select: { name: true, city: true } },
                court: { select: { name: true } },
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })

        return requests
      }),

    // Leave a booking
    leaveBooking: protectedProcedure
      .input(z.object({ bookingId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const participant = await prisma.bookingParticipant.findUnique({
          where: { bookingId_userId: { bookingId: input.bookingId, userId: ctx.session.user.id } },
        })

        if (!participant) throw new Error("You have not joined this booking")

        await prisma.bookingParticipant.delete({
          where: { id: participant.id },
        })

        return { success: true }
      }),

    // Mark a participant as no-show (host only)
    markNoShow: protectedProcedure
      .input(z.object({ bookingId: z.string(), userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
          include: { participants: true },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied - only the host can mark no-shows")
        }

        const participant = booking.participants.find((p) => p.userId === input.userId)
        if (!participant) throw new Error("User is not a participant of this booking")

        // Increment no-show count and decrease reliability score
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: input.userId },
            data: {
              noShowCount: { increment: 1 },
              cibilScore: { decrement: 30 },
              reliabilityScore: { decrement: 10 },
            },
          })

          // Remove participant from booking
          await tx.bookingParticipant.delete({
            where: { id: participant.id },
          })

          // Create notification
          await tx.notification.create({
            data: {
              userId: input.userId,
              type: "BOOKING_CANCELLED",
              title: "Marked as No-Show",
              message: `You were marked as a no-show for a game at ${booking.facilityId}. Your reliability score has been affected.`,
              data: { bookingId: booking.id },
            },
          })
        })

        return { success: true }
      }),

    // Mark attendance (host confirms who showed up)
    markAttendance: protectedProcedure
      .input(z.object({ bookingId: z.string(), attendedUserIds: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
          include: { participants: true },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }

        const noShows = booking.participants.filter((p) => !input.attendedUserIds.includes(p.userId))

        await prisma.$transaction(async (tx) => {
          for (const ns of noShows) {
            await tx.user.update({
              where: { id: ns.userId },
              data: {
                noShowCount: { increment: 1 },
                cibilScore: { decrement: 30 },
                reliabilityScore: { decrement: 10 },
              },
            })
            await tx.bookingParticipant.delete({ where: { id: ns.id } })
          }
        })

        return { markedNoShows: noShows.length }
      }),
    togglePublic: protectedProcedure
      .input(z.object({ bookingId: z.string(), isPublic: z.boolean(), maxPlayers: z.number().min(1).max(20).optional() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }

        const updated = await prisma.booking.update({
          where: { id: input.bookingId },
          data: {
            isPublic: input.isPublic,
            ...(input.maxPlayers && { maxPlayers: input.maxPlayers }),
          },
        })

        return updated
      }),

    ownerBookings: ownerProcedure
      .input(
        z.object({
          facilityId: z.string().optional(),
          status: z.nativeEnum(BookingStatus).optional(),
          dateFrom: z.string().optional(),
          dateTo: z.string().optional(),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
      )
      .query(async ({ ctx, input }) => {
        const where: Prisma.BookingWhereInput = {
          facility: { ownerId: ctx.session.user.id },
          ...(input.facilityId && { facilityId: input.facilityId }),
          ...(input.status && { status: input.status }),
          ...((input.dateFrom || input.dateTo) && {
            startTime: {
              ...(input.dateFrom && { gte: new Date(input.dateFrom) }),
              ...(input.dateTo && { lte: new Date(input.dateTo) }),
            },
          }),
        }

        const [bookings, total] = await Promise.all([
          prisma.booking.findMany({
            where,
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
              court: { select: { id: true, name: true } },
              payment: { select: { status: true, amount: true, platformFee: true, ownerPayout: true } },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { startTime: "desc" },
          }),
          prisma.booking.count({ where }),
        ])

        return { bookings, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),
  }),

payments: createTRPCRouter({
    createOrder: protectedProcedure
      .input(z.object({ bookingId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
          include: { facility: true, court: true },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id) throw new Error("Access denied")
        if (booking.status !== BookingStatus.PENDING) throw new Error("Booking not in pending state")

        const totalPrice = booking.totalPrice
        const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 10
        const platformFee = (totalPrice * platformFeePercent) / 100
        const ownerPayout = totalPrice - platformFee

        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true, email: true, phone: true },
        })

        const orderId = generateOrderId("BK")
        const cfOrder = await createCashfreeOrder({
          orderId,
          orderAmount: totalPrice,
          orderCurrency: "INR",
          customerId: ctx.session.user.id,
          customerName: user?.name || "Customer",
          customerEmail: user?.email || undefined,
          customerPhone: user?.phone || "9999999999",
          orderNote: `Booking for ${booking.facility.name}`,
          orderTags: { bookingId: booking.id },
        })

        const paymentRecord = await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: totalPrice,
            platformFee,
            ownerPayout,
            cashfreePaymentId: cfOrder.cfOrderId,
            cashfreeOrderId: orderId,
            status: PaymentStatus.PENDING,
          },
        })

        return { paymentLink: cfOrder.paymentLink, cfOrderId: cfOrder.cfOrderId }
      }),

    webhook: publicProcedure
      .input(z.object({}))
      .mutation(async ({ input }) => {
        // Webhook is handled via Next.js API route at /api/payments/cashfree/webhook
        return { received: true }
      }),

    history: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const where: Prisma.PaymentWhereInput = {
          booking: { userId: ctx.session.user.id },
        }

        const [payments, total] = await Promise.all([
          prisma.payment.findMany({
            where,
            include: {
              booking: {
                include: {
                  facility: { select: { name: true } },
                  court: { select: { name: true } },
                },
              },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.payment.count({ where }),
        ])

        return { payments, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    refund: adminProcedure
      .input(z.object({ paymentId: z.string(), amount: z.number().optional() }))
      .mutation(async ({ input }) => {
        const payment = await prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: { booking: true },
        })

        if (!payment) throw new Error("Payment not found")

        // TODO: Process refund via Cashfree
        // const refund = await cashfree.refund(...)

        return { success: true }
      }),

    getByOrderId: publicProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ input }) => {
        const payment = await prisma.payment.findFirst({
          where: {
            OR: [
              { cashfreeOrderId: input.orderId },
              { cashfreePaymentId: input.orderId },
            ],
          },
          include: {
            booking: {
              include: {
                facility: true,
                court: true,
              },
            },
          },
        })

        if (!payment) throw new Error("Payment not found")

        return {
          status: payment.status,
          paidAt: payment.paidAt,
          booking: payment.booking
            ? {
                id: payment.booking.id,
                facilityId: payment.booking.facilityId,
                courtId: payment.booking.courtId,
                totalPrice: payment.booking.totalPrice,
                status: payment.booking.status,
                startTime: payment.booking.startTime,
                endTime: payment.booking.endTime,
                facility: payment.booking.facility,
                court: payment.booking.court,
              }
            : null,
        }
      }),

    retryPayment: protectedProcedure
      .input(z.object({ bookingId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
          include: { facility: true, court: true },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id) throw new Error("Access denied")

        // Check if there's an existing pending payment
        const existingPayment = await prisma.payment.findFirst({
          where: { bookingId: booking.id, status: "PENDING" },
        })

        if (existingPayment) {
          // Check if order is expired
          const orderAge = Date.now() - existingPayment.createdAt.getTime()
          if (orderAge < 24 * 60 * 60 * 1000) {
            throw new Error("Existing payment order is still valid. Please complete it.")
          }
          // Mark old payment as failed
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { status: "FAILED" },
          })
        }

        // Create new Cashfree order
        const totalPrice = booking.totalPrice
        const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 10
        const platformFee = (totalPrice * platformFeePercent) / 100
        const ownerPayout = totalPrice - platformFee

        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true, email: true, phone: true },
        })

        const orderId = generateOrderId("BK")
        const cfOrder = await createCashfreeOrder({
          orderId,
          orderAmount: totalPrice,
          orderCurrency: "INR",
          customerId: ctx.session.user.id,
          customerName: user?.name || "Customer",
          customerEmail: user?.email || undefined,
          customerPhone: user?.phone || "9999999999",
          orderNote: `Booking retry for ${booking.facility.name}`,
          orderTags: { bookingId: booking.id },
        })

        const paymentRecord = await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: totalPrice,
            platformFee,
            ownerPayout,
            cashfreePaymentId: cfOrder.cfOrderId,
            cashfreeOrderId: orderId,
            status: PaymentStatus.PENDING,
          },
        })

        return { paymentLink: cfOrder.paymentLink, cfOrderId: cfOrder.cfOrderId }
      }),
  }),

  sponsors: sponsorsRouter,

  offers: createTRPCRouter({
    // Create offer (sponsor)
    create: protectedProcedure
      .input(z.object({
        sponsorId: z.string(),
        code: z.string().min(3).max(20),
        title: z.string().min(1),
        description: z.string().optional(),
        discountType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
        discountValue: z.number().min(0),
        minBookingAmount: z.number().min(0).default(0),
        maxDiscount: z.number().optional(),
        validFrom: z.string().datetime(),
        validTo: z.string().datetime(),
        maxUses: z.number().min(1).default(100),
        maxUsesPerUser: z.number().min(1).default(1),
        targetAudience: z.enum(["ALL", "FREQUENT", "NEW", "HIGH_RELIABILITY", "SPECIFIC_SPORT"]).default("ALL"),
        targetSport: z.nativeEnum(SportType).optional(),
        targetCity: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const sponsor = await prisma.sponsor.findUnique({ where: { id: input.sponsorId } })
        if (!sponsor) throw new Error("Sponsor not found")
        if (sponsor.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }
        if (!sponsor.isApproved) throw new Error("Sponsor not approved yet")

        const offer = await prisma.offer.create({
          data: {
            sponsorId: input.sponsorId,
            code: input.code.toUpperCase(),
            title: input.title,
            description: input.description,
            discountType: input.discountType,
            discountValue: input.discountValue,
            minBookingAmount: input.minBookingAmount,
            maxDiscount: input.maxDiscount,
            validFrom: new Date(input.validFrom),
            validTo: new Date(input.validTo),
            maxUses: input.maxUses,
            maxUsesPerUser: input.maxUsesPerUser,
            targetAudience: input.targetAudience,
            targetSport: input.targetSport,
            targetCity: input.targetCity,
            isActive: false, // Requires admin approval
          },
        })
        return offer
      }),

    // Update offer (sponsor)
    update: protectedProcedure
      .input(z.object({
        offerId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        discountValue: z.number().optional(),
        minBookingAmount: z.number().optional(),
        maxDiscount: z.number().optional(),
        validFrom: z.string().datetime().optional(),
        validTo: z.string().datetime().optional(),
        maxUses: z.number().optional(),
        maxUsesPerUser: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const offer = await prisma.offer.findUnique({ where: { id: input.offerId }, include: { sponsor: true } })
        if (!offer) throw new Error("Offer not found")
        if (offer.sponsor.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }

        return prisma.offer.update({
          where: { id: input.offerId },
          data: {
            ...(input.title && { title: input.title }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
            ...(input.minBookingAmount !== undefined && { minBookingAmount: input.minBookingAmount }),
            ...(input.maxDiscount !== undefined && { maxDiscount: input.maxDiscount }),
            ...(input.validFrom && { validFrom: new Date(input.validFrom) }),
            ...(input.validTo && { validTo: new Date(input.validTo) }),
            ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
            ...(input.maxUsesPerUser !== undefined && { maxUsesPerUser: input.maxUsesPerUser }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
          },
        })
      }),

    // List sponsor's offers
    myOffers: protectedProcedure
      .query(async ({ ctx }) => {
        const sponsor = await prisma.sponsor.findUnique({ where: { userId: ctx.session.user.id } })
        if (!sponsor) return []
        return prisma.offer.findMany({
          where: { sponsorId: sponsor.id },
          orderBy: { createdAt: "desc" },
        })
      }),

    // Admin: list all offers
    adminList: adminProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const [offers, total] = await Promise.all([
          prisma.offer.findMany({
            include: { sponsor: { select: { name: true } } },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.offer.count(),
        ])
        return { offers, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    // Admin: approve offer
    approve: adminProcedure
      .input(z.object({ offerId: z.string() }))
      .mutation(async ({ input }) => {
        return prisma.offer.update({
          where: { id: input.offerId },
          data: { isActive: true },
        })
      }),

    // Get personalized offers for a user (algorithm)
    getPersonalized: protectedProcedure
      .input(z.object({ bookingAmount: z.number().optional(), sport: z.string().optional(), city: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const now = new Date()
        const user = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { id: true, reliabilityScore: true },
        })

        // Get user's booking count and most booked sport
        const userBookings = await prisma.booking.findMany({
          where: { userId: ctx.session.user.id },
          select: { court: { select: { sportType: true } }, facility: { select: { city: true } } },
        })
        const bookingCount = userBookings.length

        // Most common city from bookings
        const cityCounts: Record<string, number> = {}
        userBookings.forEach((b: any) => {
          const city = b.facility?.city
          if (city) cityCounts[city] = (cityCounts[city] || 0) + 1
        })
        const userCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

        // Most booked sport
        const sportCounts: Record<string, number> = {}
        userBookings.forEach((b: any) => {
          const sport = b.court?.sportType || "FOOTBALL"
          sportCounts[sport] = (sportCounts[sport] || 0) + 1
        })
        const mostBookedSport = Object.entries(sportCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

        // Get all active offers
        const offers = await prisma.offer.findMany({
          where: {
            isActive: true,
            validFrom: { lte: now },
            validTo: { gte: now },
          },
          include: { sponsor: { select: { name: true, logoUrl: true, isApproved: true, isActive: true, budget: true, spentBudget: true } } },
        })

        // Filter and score offers
        const scoredOffers = offers
          .filter((offer) => {
            if (!offer.sponsor.isApproved || !offer.sponsor.isActive) return false
            if (offer.usedCount >= offer.maxUses) return false
            if (offer.sponsor.spentBudget >= offer.sponsor.budget) return false
            if (input.bookingAmount && input.bookingAmount < offer.minBookingAmount) return false
            // Check per-user usage
            return true
          })
          .map((offer) => {
            let score = 0
            // Sport match
            if (offer.targetSport && offer.targetSport === (input.sport || mostBookedSport)) score += 30
            // City match
            if (offer.targetCity && offer.targetCity === (input.city || userCity)) score += 20
            // New user bonus
            if (bookingCount < 3 && offer.targetAudience === "NEW") score += 25
            // Frequent booker bonus
            if (bookingCount > 10 && offer.targetAudience === "FREQUENT") score += 25
            // High reliability
            if (user && user.reliabilityScore > 90 && offer.targetAudience === "HIGH_RELIABILITY") score += 15
            // ALL audience
            if (offer.targetAudience === "ALL") score += 10
            // Specific sport target
            if (offer.targetAudience === "SPECIFIC_SPORT" && offer.targetSport === (input.sport || mostBookedSport)) score += 20
            // Random factor for variety
            score += Math.random() * 10

            return { offer, score }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)

        // Check per-user usage limits
        const userRedemptions = await prisma.offerRedemption.findMany({
          where: { userId: ctx.session.user.id },
          select: { offerId: true },
        })
        const redemptionCounts: Record<string, number> = {}
        userRedemptions.forEach((r) => {
          redemptionCounts[r.offerId] = (redemptionCounts[r.offerId] || 0) + 1
        })

        const filteredOffers = scoredOffers.filter(({ offer }) => {
          const userUsage = redemptionCounts[offer.id] || 0
          return userUsage < offer.maxUsesPerUser
        })

        return filteredOffers.map(({ offer, score }) => ({
          id: offer.id,
          code: offer.code,
          title: offer.title,
          description: offer.description,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          maxDiscount: offer.maxDiscount,
          sponsorName: offer.sponsor.name,
          sponsorLogo: offer.sponsor.logoUrl,
          validTo: offer.validTo,
          score: Math.round(score),
        }))
      }),

    // Redeem an offer
    redeem: protectedProcedure
      .input(z.object({ offerId: z.string(), bookingId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const offer = await prisma.offer.findUnique({
          where: { id: input.offerId },
          include: { sponsor: true },
        })
        if (!offer) throw new Error("Offer not found")
        if (!offer.isActive) throw new Error("Offer is not active")
        const now = new Date()
        if (now < offer.validFrom || now > offer.validTo) throw new Error("Offer is not valid at this time")
        if (offer.usedCount >= offer.maxUses) throw new Error("Offer usage limit reached")
        if (offer.sponsor.spentBudget >= offer.sponsor.budget) throw new Error("Sponsor budget exhausted")

        // Check per-user usage
        const userUsage = await prisma.offerRedemption.count({
          where: { offerId: input.offerId, userId: ctx.session.user.id },
        })
        if (userUsage >= offer.maxUsesPerUser) throw new Error("You have already used this offer")

        // Calculate discount
        let discount = 0
        if (input.bookingId) {
          const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } })
          if (booking) {
            if (offer.discountType === "PERCENTAGE") {
              discount = (booking.totalPrice * offer.discountValue) / 100
              if (offer.maxDiscount) discount = Math.min(discount, offer.maxDiscount)
            } else {
              discount = offer.discountValue
            }
          }
        }

        // Create redemption
        const redemption = await prisma.offerRedemption.create({
          data: {
            offerId: input.offerId,
            userId: ctx.session.user.id,
            bookingId: input.bookingId,
            discountApplied: discount,
          },
        })

        // Update offer usage and sponsor budget
        await prisma.$transaction(async (tx) => {
          await tx.offer.update({
            where: { id: input.offerId },
            data: { usedCount: { increment: 1 } },
          })
          await tx.sponsor.update({
            where: { id: offer.sponsorId },
            data: { spentBudget: { increment: discount } },
          })
        })

        return { redemption, discount }
      }),

    // Get user's redemptions
    myRedemptions: protectedProcedure
      .query(async ({ ctx }) => {
        return prisma.offerRedemption.findMany({
          where: { userId: ctx.session.user.id },
          include: { offer: { include: { sponsor: { select: { name: true, logoUrl: true } } } } },
          orderBy: { redeemedAt: "desc" },
        })
      }),
  }),

  tournaments: createTRPCRouter({
    // Create tournament (owner)
    create: ownerProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        sportType: z.nativeEnum(SportType),
        facilityId: z.string(),
        format: z.enum(["KNOCKOUT", "LEAGUE"]).default("KNOCKOUT"),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        entryFee: z.number().min(0).default(0),
        prizePool: z.number().min(0).default(0),
        maxTeams: z.number().min(2).max(64).default(8),
        minPlayersPerTeam: z.number().min(1).default(5),
        maxPlayersPerTeam: z.number().min(1).default(15),
        rules: z.string().optional(),
        isPublic: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.create({
          data: {
            name: input.name,
            description: input.description,
            sportType: input.sportType,
            facilityId: input.facilityId,
            ownerId: ctx.session.user.id,
            format: input.format,
            startDate: new Date(input.startDate),
            endDate: new Date(input.endDate),
            entryFee: input.entryFee,
            prizePool: input.prizePool,
            maxTeams: input.maxTeams,
            minPlayersPerTeam: input.minPlayersPerTeam,
            maxPlayersPerTeam: input.maxPlayersPerTeam,
            rules: input.rules,
            isPublic: input.isPublic,
            status: "DRAFT",
          },
        })
        return tournament
      }),

    // Update tournament (owner)
    update: ownerProcedure
      .input(z.object({
        tournamentId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        entryFee: z.number().optional(),
        prizePool: z.number().optional(),
        maxTeams: z.number().optional(),
        rules: z.string().optional(),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.findUnique({ where: { id: input.tournamentId } })
        if (!tournament) throw new Error("Tournament not found")
        if (tournament.ownerId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") throw new Error("Access denied")
        if (tournament.status !== "DRAFT" && tournament.status !== "REGISTRATION_OPEN") throw new Error("Cannot edit tournament after it has started")

        return prisma.tournament.update({
          where: { id: input.tournamentId },
          data: {
            ...(input.name && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.startDate && { startDate: new Date(input.startDate) }),
            ...(input.endDate && { endDate: new Date(input.endDate) }),
            ...(input.entryFee !== undefined && { entryFee: input.entryFee }),
            ...(input.prizePool !== undefined && { prizePool: input.prizePool }),
            ...(input.maxTeams !== undefined && { maxTeams: input.maxTeams }),
            ...(input.rules !== undefined && { rules: input.rules }),
            ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
          },
        })
      }),

    // Publish tournament (open registration)
    publish: ownerProcedure
      .input(z.object({ tournamentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.findUnique({ where: { id: input.tournamentId } })
        if (!tournament) throw new Error("Tournament not found")
        if (tournament.ownerId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") throw new Error("Access denied")
        if (tournament.status !== "DRAFT") throw new Error("Tournament already published")

        return prisma.tournament.update({
          where: { id: input.tournamentId },
          data: { status: "REGISTRATION_OPEN" },
        })
      }),

    // List public tournaments
    list: publicProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20), sportType: z.nativeEnum(SportType).optional() }))
      .query(async ({ input }) => {
        const where: any = { isPublic: true, status: { in: ["REGISTRATION_OPEN", "IN_PROGRESS", "COMPLETED"] } }
        if (input.sportType) where.sportType = input.sportType

        const [tournaments, total] = await Promise.all([
          prisma.tournament.findMany({
            where,
            include: {
              facility: { select: { id: true, name: true, city: true, images: true } },
              owner: { select: { name: true } },
              _count: { select: { teams: true } },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { startDate: "asc" },
          }),
          prisma.tournament.count({ where }),
        ])
        return { tournaments, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    // Get tournament details
    get: publicProcedure
      .input(z.object({ tournamentId: z.string() }))
      .query(async ({ input }) => {
        const tournament = await prisma.tournament.findUnique({
          where: { id: input.tournamentId },
          include: {
            facility: true,
            owner: { select: { id: true, name: true } },
            teams: {
              include: {
                captain: { select: { id: true, name: true, avatarUrl: true } },
                players: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                _count: { select: { players: true } },
              },
              orderBy: { seed: "asc" },
            },
            matches: {
              include: {
                homeTeam: { select: { id: true, name: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, logoUrl: true } },
                winner: { select: { id: true, name: true } },
                court: { select: { id: true, name: true } },
              },
              orderBy: [{ round: "asc" }, { matchNumber: "asc" }],
            },
            rewards: true,
          },
        })
        if (!tournament) throw new Error("Tournament not found")
        return tournament
      }),

    // Owner's tournaments
    myTournaments: ownerProcedure
      .query(async ({ ctx }) => {
        return prisma.tournament.findMany({
          where: { ownerId: ctx.session.user.id },
          include: {
            facility: { select: { name: true, city: true } },
            _count: { select: { teams: true, matches: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      }),

    // Register a team
    registerTeam: protectedProcedure
      .input(z.object({
        tournamentId: z.string(),
        teamName: z.string().min(1),
        teamId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.findUnique({
          where: { id: input.tournamentId },
          include: { teams: true },
        })
        if (!tournament) throw new Error("Tournament not found")
        if (tournament.status !== "REGISTRATION_OPEN") throw new Error("Registration is not open")
        if (tournament.teams.length >= tournament.maxTeams) throw new Error("Tournament is full")

        // Check if team name already taken
        const existing = tournament.teams.find((t) => t.name === input.teamName)
        if (existing) throw new Error("Team name already taken")

        const team = await prisma.tournamentTeam.create({
          data: {
            tournamentId: input.tournamentId,
            teamId: input.teamId,
            name: input.teamName,
            captainId: ctx.session.user.id,
          },
        })

        // Add captain as player
        await prisma.tournamentPlayer.create({
          data: {
            tournamentTeamId: team.id,
            userId: ctx.session.user.id,
            role: "CAPTAIN",
          },
        })

        return team
      }),

    // Add player to team (captain only)
    addPlayer: protectedProcedure
      .input(z.object({ teamId: z.string(), userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const team = await prisma.tournamentTeam.findUnique({
          where: { id: input.teamId },
          include: { tournament: true, players: true },
        })
        if (!team) throw new Error("Team not found")
        if (team.captainId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Only the captain can add players")
        }
        if (team.players.length >= team.tournament.maxPlayersPerTeam) {
          throw new Error("Team is full")
        }

        const existing = team.players.find((p) => p.userId === input.userId)
        if (existing) throw new Error("Player already in team")

        return prisma.tournamentPlayer.create({
          data: {
            tournamentTeamId: input.teamId,
            userId: input.userId,
            role: "PLAYER",
          },
        })
      }),

    // Start tournament (generate brackets)
    start: ownerProcedure
      .input(z.object({ tournamentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.findUnique({
          where: { id: input.tournamentId },
          include: { teams: { orderBy: { seed: "asc" } } },
        })
        if (!tournament) throw new Error("Tournament not found")
        if (tournament.ownerId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") throw new Error("Access denied")
        if (tournament.status !== "REGISTRATION_OPEN") throw new Error("Tournament not in registration phase")
        if (tournament.teams.length < 2) throw new Error("Need at least 2 teams")

        // Generate bracket based on format
        const teams = tournament.teams
        const numTeams = teams.length

        if (tournament.format === "KNOCKOUT") {
          // Single elimination bracket
          const rounds = Math.ceil(Math.log2(numTeams))
          let matchNumber = 1

          // First round
          const firstRoundMatches = Math.ceil(numTeams / 2)
          for (let i = 0; i < firstRoundMatches; i++) {
            const homeIdx = i * 2
            const awayIdx = i * 2 + 1
            await prisma.tournamentMatch.create({
              data: {
                tournamentId: input.tournamentId,
                round: 1,
                matchNumber: matchNumber++,
                homeTeamId: teams[homeIdx]?.id || null,
                awayTeamId: teams[awayIdx]?.id || null,
                status: "SCHEDULED",
              },
            })
          }

          // Create placeholder matches for subsequent rounds
          let matchesInRound = Math.ceil(firstRoundMatches / 2)
          let round = 2
          while (matchesInRound >= 1) {
            for (let i = 0; i < matchesInRound; i++) {
              await prisma.tournamentMatch.create({
                data: {
                  tournamentId: input.tournamentId,
                  round,
                  matchNumber: matchNumber++,
                  status: "SCHEDULED",
                },
              })
            }
            matchesInRound = Math.ceil(matchesInRound / 2)
            round++
            if (matchesInRound === 0) break
          }
        }

        return prisma.tournament.update({
          where: { id: input.tournamentId },
          data: { status: "IN_PROGRESS" },
        })
      }),

    // Update match score
    updateScore: ownerProcedure
      .input(z.object({
        matchId: z.string(),
        homeScore: z.number().min(0),
        awayScore: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const match = await prisma.tournamentMatch.findUnique({
          where: { id: input.matchId },
          include: { tournament: true },
        })
        if (!match) throw new Error("Match not found")
        if (match.tournament.ownerId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") throw new Error("Access denied")

        const winnerId = input.homeScore > input.awayScore ? match.homeTeamId : input.awayScore > input.homeScore ? match.awayTeamId : null

        return prisma.tournamentMatch.update({
          where: { id: input.matchId },
          data: {
            homeScore: input.homeScore,
            awayScore: input.awayScore,
            winnerId,
            status: "COMPLETED",
          },
        })
      }),

    // Add reward
    addReward: ownerProcedure
      .input(z.object({
        tournamentId: z.string(),
        position: z.number().min(1),
        rewardType: z.enum(["COUPON", "CASH", "TROPHY", "CERTIFICATE"]),
        title: z.string(),
        description: z.string().optional(),
        value: z.number().optional(),
        couponCode: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.findUnique({ where: { id: input.tournamentId } })
        if (!tournament) throw new Error("Tournament not found")
        if (tournament.ownerId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") throw new Error("Access denied")

        return prisma.tournamentReward.create({
          data: {
            tournamentId: input.tournamentId,
            position: input.position,
            rewardType: input.rewardType,
            title: input.title,
            description: input.description,
            value: input.value,
            couponCode: input.couponCode,
          },
        })
      }),

    // Distribute rewards (mark tournament complete)
    complete: ownerProcedure
      .input(z.object({ tournamentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.findUnique({
          where: { id: input.tournamentId },
          include: { matches: true, teams: true, rewards: true },
        })
        if (!tournament) throw new Error("Tournament not found")
        if (tournament.ownerId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") throw new Error("Access denied")

        // Find winner (team with most match wins)
        const teamWins: Record<string, number> = {}
        tournament.matches.forEach((m) => {
          if (m.winnerId) {
            teamWins[m.winnerId] = (teamWins[m.winnerId] || 0) + 1
          }
        })
        const winnerId = Object.entries(teamWins).sort((a, b) => b[1] - a[1])[0]?.[0]

        if (winnerId) {
          await prisma.tournamentTeam.update({
            where: { id: winnerId },
            data: { status: "WINNER" },
          })
        }

        return prisma.tournament.update({
          where: { id: input.tournamentId },
          data: { status: "COMPLETED" },
        })
      }),

    // Delete tournament (only DRAFT)
    delete: ownerProcedure
      .input(z.object({ tournamentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const tournament = await prisma.tournament.findUnique({ where: { id: input.tournamentId } })
        if (!tournament) throw new Error("Tournament not found")
        if (tournament.ownerId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") throw new Error("Access denied")
        if (tournament.status !== "DRAFT") throw new Error("Can only delete draft tournaments")

        await prisma.tournament.delete({ where: { id: input.tournamentId } })
        return { success: true }
      }),
  }),

  cashfree: createTRPCRouter({
    onboarding: ownerProcedure
      .input(
        z.object({
          bankAccount: z.object({
            accountNumber: z.string(),
            ifsc: z.string(),
            accountHolderName: z.string(),
            accountType: z.enum(["SAVINGS", "CURRENT"]),
          }),
          businessDetails: z.object({
            businessName: z.string(),
            businessType: z.string(),
            gstin: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Create Cashfree Contact and Beneficiary
        let beneficiaryId = `CF_BEN_${ctx.session.user.id}`

        try {
          const contact = await createCashfreeContact({
            contactId: beneficiaryId,
            name: input.businessDetails.businessName,
            email: (await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { email: true } }))?.email || "",
            phone: input.bankAccount.accountHolderName ? "" : "",
            bankAccount: input.bankAccount.accountNumber,
            ifsc: input.bankAccount.ifsc,
            accountHolderName: input.bankAccount.accountHolderName,
          })
          beneficiaryId = contact.beneficiaryId
        } catch (e) {
          console.warn("[Onboarding] Contact creation warning:", e)
        }

        const cashfreeAccount = await prisma.cashfreeAccount.upsert({
          where: { userId: ctx.session.user.id },
          create: {
            userId: ctx.session.user.id,
            cashfreeContactId: beneficiaryId,
            isVerified: true,
            bankAccountVerified: true,
          },
          update: { cashfreeContactId: beneficiaryId, isVerified: true, bankAccountVerified: true },
        })

        return cashfreeAccount
      }),

    // Owner earnings summary
    ownerEarnings: ownerProcedure.query(async ({ ctx }) => {
      const payments = await prisma.payment.findMany({
        where: {
          booking: { facility: { ownerId: ctx.session.user.id } },
          status: PaymentStatus.SUCCEEDED,
        },
        select: { amount: true, platformFee: true, ownerPayout: true, payoutStatus: true, createdAt: true },
      })

      const totalEarnings = payments.reduce((sum, p) => sum + p.ownerPayout, 0)
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalPlatformFees = payments.reduce((sum, p) => sum + p.platformFee, 0)
      const pendingPayouts = payments.filter((p) => p.payoutStatus === PayoutStatus.PENDING).reduce((sum, p) => sum + p.ownerPayout, 0)
      const completedPayouts = payments.filter((p) => p.payoutStatus === PayoutStatus.SUCCESS || p.payoutStatus === PayoutStatus.PROCESSING).reduce((sum, p) => sum + p.ownerPayout, 0)

      return {
        totalRevenue,
        totalPlatformFees,
        totalEarnings,
        pendingPayouts,
        completedPayouts,
        paymentCount: payments.length,
      }
    }),

    // Owner payouts list
    ownerPayouts: ownerProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const where: Prisma.PaymentWhereInput = {
          booking: { facility: { ownerId: ctx.session.user.id } },
          status: PaymentStatus.SUCCEEDED,
        }

        const [payouts, total] = await Promise.all([
          prisma.payment.findMany({
            where,
            include: { booking: { include: { facility: { select: { name: true } } } } },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.payment.count({ where }),
        ])

        return { payouts, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    payout: adminProcedure
      .input(z.object({ paymentId: z.string() }))
      .mutation(async ({ input }) => {
        const payment = await prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: { booking: { include: { facility: { include: { owner: { include: { cashfreeAccount: true } } } } } } },
        })

        if (!payment) throw new Error("Payment not found")
        if (payment.payoutStatus !== PayoutStatus.PENDING) throw new Error("Payout already processed")
        if (payment.status !== PaymentStatus.SUCCEEDED) throw new Error("Payment not succeeded")

        const owner = payment.booking.facility.owner
        const beneficiaryId = owner.cashfreeAccount?.cashfreeContactId

        if (!beneficiaryId) throw new Error("Owner has no bank account configured")

        try {
          const payoutResult = await initiateCashfreePayout({
            transferId: `PAYOUT_${payment.id}_${Date.now()}`,
            amount: payment.ownerPayout,
            beneficiaryId,
            remarks: `Payout for booking ${payment.bookingId}`,
          })

          await prisma.payment.update({
            where: { id: input.paymentId },
            data: {
              payoutStatus: PayoutStatus.PROCESSING,
              payoutId: payoutResult.cfTransferId,
            },
          })

          return { success: true, cfTransferId: payoutResult.cfTransferId, status: payoutResult.status }
        } catch (error: any) {
          console.error("[Payout] Failed:", error.message)
          throw new Error(error.message || "Payout failed")
        }
      }),
  }),

  teams: createTRPCRouter({
    create: protectedProcedure
      .input(z.object({ 
        name: z.string().min(2).max(50),
        sportType: z.nativeEnum(SportType).optional().default(SportType.FOOTBALL),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const team = await prisma.team.create({
          data: {
            name: input.name,
            sportType: input.sportType,
            imageUrl: input.imageUrl,
            inviteCode: crypto.randomUUID(),
            captainId: ctx.session.user.id,
            members: { create: { userId: ctx.session.user.id, role: TeamRole.CAPTAIN } },
          },
        })
        return team
      }),

    join: protectedProcedure
      .input(z.object({ teamId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await prisma.teamMember.create({
          data: { userId: ctx.session.user.id, teamId: input.teamId },
        })
        return membership
      }),

    joinByInvite: protectedProcedure
      .input(z.object({ inviteCode: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const team = await prisma.team.findUnique({
          where: { inviteCode: input.inviteCode },
        })
        if (!team) throw new Error("Invalid invite link")

        const existing = await prisma.teamMember.findUnique({
          where: { userId_teamId: { userId: ctx.session.user.id, teamId: team.id } },
        })
        if (existing) throw new Error("You are already a member of this team")

        const membership = await prisma.teamMember.create({
          data: { userId: ctx.session.user.id, teamId: team.id },
        })
        return { membership, team }
      }),

    getByInviteCode: publicProcedure
      .input(z.object({ inviteCode: z.string() }))
      .query(async ({ input }) => {
        const team = await prisma.team.findUnique({
          where: { inviteCode: input.inviteCode },
          include: {
            captain: { select: { id: true, name: true } },
            _count: { select: { members: true } },
          },
        })
        if (!team) throw new Error("Invalid invite link")
        return team
      }),

    leave: protectedProcedure
      .input(z.object({ teamId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const membership = await prisma.teamMember.findUnique({
          where: { userId_teamId: { userId: ctx.session.user.id, teamId: input.teamId } },
        })

        if (!membership) throw new Error("Not a member of this team")
        if (membership.role === TeamRole.CAPTAIN) throw new Error("Captain cannot leave, transfer captaincy first")

        return prisma.teamMember.delete({ where: { id: membership.id } })
      }),

    myTeams: protectedProcedure.query(async ({ ctx }) => {
      return prisma.teamMember.findMany({
        where: { userId: ctx.session.user.id },
        include: {
          team: {
            include: {
              members: { include: { user: { select: { id: true, name: true, avatarUrl: true, cibilScore: true } } } },
              captain: { select: { id: true, name: true } },
              _count: { select: { members: true } },
            },
          },
        },
      })
    }),

    // List all teams (for discovery)
    list: publicProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20), search: z.string().optional() }))
      .query(async ({ input }) => {
        const where: any = {}
        if (input.search) {
          where.name = { contains: input.search, mode: "insensitive" }
        }

        const [teams, total] = await Promise.all([
          prisma.team.findMany({
            where,
            include: {
              captain: { select: { id: true, name: true } },
              _count: { select: { members: true } },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.team.count({ where }),
        ])

        return { teams, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    // Get team details
    get: publicProcedure
      .input(z.object({ teamId: z.string() }))
      .query(async ({ input }) => {
        const team = await prisma.team.findUnique({
          where: { id: input.teamId },
          include: {
            members: { include: { user: { select: { id: true, name: true, avatarUrl: true, cibilScore: true, noShowCount: true } } } },
            captain: { select: { id: true, name: true } },
            bookings: { select: { id: true, startTime: true, status: true } },
          },
        })
        if (!team) throw new Error("Team not found")
        return team
      }),

    // Transfer captaincy
    transferCaptaincy: protectedProcedure
      .input(z.object({ teamId: z.string(), newCaptainId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const team = await prisma.team.findUnique({
          where: { id: input.teamId },
          include: { members: true },
        })

        if (!team) throw new Error("Team not found")
        if (team.captainId !== ctx.session.user.id) throw new Error("Only the captain can transfer captaincy")

        const newCaptainMember = team.members.find((m) => m.userId === input.newCaptainId)
        if (!newCaptainMember) throw new Error("New captain must be a team member")

        await prisma.$transaction(async (tx) => {
          await tx.team.update({
            where: { id: input.teamId },
            data: { captainId: input.newCaptainId },
          })
          await tx.teamMember.update({
            where: { id: newCaptainMember.id },
            data: { role: TeamRole.CAPTAIN },
          })
          // Demote old captain
          const oldCaptainMember = team.members.find((m) => m.userId === ctx.session.user.id)
          if (oldCaptainMember) {
            await tx.teamMember.update({
              where: { id: oldCaptainMember.id },
              data: { role: TeamRole.MEMBER },
            })
          }
        })

        return { success: true }
      }),

    // Update team name (captain only)
    updateTeam: protectedProcedure
      .input(z.object({ teamId: z.string(), name: z.string().min(2).max(50).optional(), sportType: z.nativeEnum(SportType).optional(), imageUrl: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const team = await prisma.team.findUnique({
          where: { id: input.teamId },
        })

        if (!team) throw new Error("Team not found")
        if (team.captainId !== ctx.session.user.id) throw new Error("Only the captain can edit the team")

        const data: any = {}
        if (input.name !== undefined) data.name = input.name
        if (input.sportType !== undefined) data.sportType = input.sportType
        if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl

        return prisma.team.update({
          where: { id: input.teamId },
          data,
        })
      }),

    // Add a member to the team (captain only)
    addMember: protectedProcedure
      .input(z.object({ teamId: z.string(), userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const team = await prisma.team.findUnique({
          where: { id: input.teamId },
          include: { members: true },
        })

        if (!team) throw new Error("Team not found")
        if (team.captainId !== ctx.session.user.id) throw new Error("Only the captain can add members")

        const alreadyMember = team.members.find((m) => m.userId === input.userId)
        if (alreadyMember) throw new Error("User is already a member of this team")

        return prisma.teamMember.create({
          data: { userId: input.userId, teamId: input.teamId },
        })
      }),
  }),

  reviews: createTRPCRouter({
    create: protectedProcedure
      .input(
        z.object({
          bookingId: z.string(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findUnique({
          where: { id: input.bookingId },
          include: { facility: true },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id) throw new Error("Access denied")
        if (booking.status !== BookingStatus.COMPLETED) throw new Error("Can only review completed bookings")

        const existingReview = await prisma.review.findUnique({ where: { bookingId: input.bookingId } })
        if (existingReview) throw new Error("Already reviewed")

        const review = await prisma.review.create({
          data: {
            userId: ctx.session.user.id,
            facilityId: booking.facilityId,
            bookingId: input.bookingId,
            rating: input.rating,
            comment: input.comment,
          },
        })

        return review
      }),

    getByFacility: publicProcedure
      .input(z.object({ facilityId: z.string(), page: z.number().default(1), limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const [reviews, total] = await Promise.all([
          prisma.review.findMany({
            where: { facilityId: input.facilityId },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.review.count({ where: { facilityId: input.facilityId } }),
        ])

        return { reviews, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),
  }),

  notifications: createTRPCRouter({
    list: protectedProcedure
      .input(z.object({ isRead: z.boolean().optional(), page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        const where: Prisma.NotificationWhereInput = { userId: ctx.session.user.id }
        if (input.isRead !== undefined) where.isRead = input.isRead

        const [notifications, total] = await Promise.all([
          prisma.notification.findMany({
            where,
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.notification.count({ where }),
        ])

        return { notifications, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return prisma.notification.update({
          where: { id: input.id, userId: ctx.session.user.id },
          data: { isRead: true },
        })
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      return prisma.notification.updateMany({
        where: { userId: ctx.session.user.id, isRead: false },
        data: { isRead: true },
      })
    }),
  }),

  upload: createTRPCRouter({
    presign: protectedProcedure
      .input(z.object({ fileName: z.string(), fileType: z.string(), bucket: z.string() }))
      .mutation(async ({ input }) => {
        // TODO: Generate presigned URL for Oracle Object Storage
        // const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
        // const { getSignedUrl } = require("@aws-sdk/s3-request-presigner")

        const key = `${Date.now()}-${input.fileName.replace(/\s+/g, "-")}`

        return {
          uploadUrl: `https://example.com/upload/${key}`, // Placeholder
          key,
          expiresIn: 900,
        }
      }),

    confirm: protectedProcedure
      .input(z.object({ key: z.string(), bucket: z.string() }))
      .mutation(async ({ input }) => {
        // TODO: Verify upload and return permanent URL
        return { url: `https://example.com/${input.key}` }
      }),
  }),

  admin: adminRouter,
})

export type AppRouter = typeof appRouter

function generateAvailableSlots(
  startTime: string,
  endTime: string,
  pricingRules: any[],
  existingBookings: any[],
  date: Date
): any[] {
  const slots = []
  const [startHour, startMin] = startTime.split(":").map(Number)
  const [endHour, endMin] = endTime.split(":").map(Number)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

const istOffset = 5.5 * 60 * 60 * 1000

  const bookedSlots = existingBookings.map((b) => {
    const istStart = new Date(b.startTime.getTime() + istOffset)
    const istEnd = new Date(b.endTime.getTime() + istOffset)
    return {
      start: istStart.getUTCHours() * 60 + istStart.getUTCMinutes(),
      end: istEnd.getUTCHours() * 60 + istEnd.getUTCMinutes(),
    }
  })

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
    const slotStart = minutes
    const slotEnd = minutes + 60

    const isBooked = bookedSlots.some((b) => b.start < slotEnd && b.end > slotStart)
    if (isBooked) continue

const istDate = new Date(date.getTime() + istOffset)
    const dayOfWeek = istDate.getUTCDay()
    const timeStr = `${String(Math.floor(slotStart / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}`

    const rule = pricingRules.find(
      (r) =>
        r.dayOfWeek.includes(dayOfWeek) &&
        r.startTime <= timeStr &&
        r.endTime > timeStr
    )

    if (rule) {
      slots.push({
        startTime: timeStr,
        endTime: `${String(Math.floor(slotEnd / 60)).padStart(2, "0")}:${String(slotEnd % 60).padStart(2, "0")}`,
        pricePerHour: rule.pricePerHour,
        minDuration: rule.minDuration,
        maxDuration: rule.maxDuration,
      })
    }
  }

  return slots
}