import { z } from "zod"
import { createTRPCRouter, publicProcedure, protectedProcedure, ownerProcedure, adminProcedure } from "@/server/trpc/init"
import prisma from "@/lib/prisma"
import { Role, SportType, SurfaceType, BookingStatus, PaymentStatus, PayoutStatus, TeamRole, NotificationType, Prisma } from "@prisma/client"
import bcrypt from "bcryptjs"
import { msg91 } from "@/lib/msg91/service"

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

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).optional(),
          phone: z.string().optional(),
          avatarUrl: z.string().url().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await prisma.user.update({
          where: { id: ctx.session.user.id },
          data: input,
        })
        return { id: user.id, email: user.email, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl }
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
              courts: { where: { isActive: true } },
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

        const facilitiesWithAvgRating = facilities.map((f) => ({
          ...f,
          avgRating: f.reviews.length > 0
            ? f.reviews.reduce((sum, r) => sum + r.rating, 0) / f.reviews.length
            : 0,
          reviewCount: f.reviews.length,
          minPrice: f.pricingRules.length > 0
            ? Math.min(...f.pricingRules.map((p) => p.pricePerHour))
            : null,
        }))

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
          address: z.string().min(5),
          city: z.string().min(2),
          state: z.string().min(2),
          country: z.string().min(2),
          postalCode: z.string().min(4),
          latitude: z.number(),
          longitude: z.number(),
          sportTypes: z.array(z.nativeEnum(SportType)).min(1),
          amenities: z.array(z.string()).default([]),
          images: z.array(z.string().url()).default([]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const facility = await prisma.facility.create({
          data: {
            ...input,
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
          bookings
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        const startTime = new Date(input.startTime)
        const endTime = new Date(input.endTime)
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

        if (duration < 30) throw new Error("Minimum booking duration is 30 minutes")

        // Check availability and pricing
        const courtId = input.courtId
        const facilityId = input.facilityId

        // Check for conflicts
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

        if (conflictingBooking) throw new Error("Time slot not available")

        // Calculate price
        const pricingRules = await prisma.pricingRule.findMany({
          where: {
            isActive: true,
            OR: [{ facilityId }, { courtId: courtId || "" }],
          },
        })

        const dayOfWeek = startTime.getDay()
        const timeStr = startTime.toTimeString().slice(0, 5)

        const applicableRule = pricingRules.find(
          (r) =>
            r.dayOfWeek.includes(dayOfWeek) &&
            r.startTime <= timeStr &&
            r.endTime > timeStr &&
            duration >= r.minDuration &&
            (!r.maxDuration || duration <= r.maxDuration)
        )

        if (!applicableRule) throw new Error("No pricing rule available for this time slot")

        const totalPrice = (applicableRule.pricePerHour * duration) / 60
        const platformFeePercent = Number(process.env.PLATFORM_FEE_PERCENT) || 10
        const platformFee = (totalPrice * platformFeePercent) / 100
        const ownerPayout = totalPrice - platformFee

        // Create booking
        const booking = await prisma.booking.create({
          data: {
            userId: ctx.session.user.id,
            facilityId,
            courtId,
            startTime,
            endTime,
            duration,
            totalPrice,
            status: BookingStatus.PENDING,
            notes: input.notes,
          },
        })

        return { booking, totalPrice, platformFee, ownerPayout, pricingRule: applicableRule }
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
            orderBy: { startTime: "desc" },
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
          include: { facility: true, payment: true },
        })

        if (!booking) throw new Error("Booking not found")
        if (booking.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }
        if (booking.status === BookingStatus.CANCELLED) throw new Error("Already cancelled")
        if (booking.status === BookingStatus.COMPLETED) throw new Error("Cannot cancel completed booking")

        const updated = await prisma.booking.update({
          where: { id: input.id },
          data: { status: BookingStatus.CANCELLED, notes: input.reason },
        })

        // Handle refund if payment was made
        if (booking.payment && booking.payment.status === PaymentStatus.SUCCEEDED) {
          // TODO: Implement refund logic with Cashfree
        }

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

        // TODO: Integrate with Cashfree PG to create order
        // const cashfreeOrder = await cashfree.createOrder(...)

        return {
          orderId: `CF_ORDER_${booking.id}`,
          amount: booking.totalPrice,
          currency: "INR",
        }
      }),

    webhook: publicProcedure
      .input(z.object({}))
      .mutation(async ({ input }) => {
        // TODO: Handle Cashfree webhook
        // Verify signature, update booking/payment status
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
        // TODO: Create Cashfree Contact and Beneficiary
        // const contact = await cashfree.createContact(...)
        // const beneficiary = await cashfree.createBeneficiary(...)

        const cashfreeAccount = await prisma.cashfreeAccount.upsert({
          where: { userId: ctx.session.user.id },
          create: {
            userId: ctx.session.user.id,
            cashfreeContactId: `CF_CONTACT_${ctx.session.user.id}`,
            isVerified: false,
            bankAccountVerified: false,
          },
          update: { cashfreeContactId: `CF_CONTACT_${ctx.session.user.id}` },
        })

        return cashfreeAccount
      }),

    kycStatus: ownerProcedure.query(async ({ ctx }) => {
      return prisma.cashfreeAccount.findUnique({
        where: { userId: ctx.session.user.id },
      })
    }),

    payout: adminProcedure
      .input(z.object({ paymentId: z.string() }))
      .mutation(async ({ input }) => {
        const payment = await prisma.payment.findUnique({
          where: { id: input.paymentId },
          include: { booking: { include: { facility: true } } },
        })

        if (!payment) throw new Error("Payment not found")
        if (payment.payoutStatus !== PayoutStatus.PENDING) throw new Error("Payout already processed")

        // TODO: Initiate payout via Cashfree Payouts API
        // const payout = await cashfree.initiatePayout(...)

        return { success: true }
      }),
  }),

  teams: createTRPCRouter({
    create: protectedProcedure
      .input(z.object({ name: z.string().min(2).max(50) }))
      .mutation(async ({ ctx, input }) => {
        const team = await prisma.team.create({
          data: {
            name: input.name,
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
              members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
              captain: { select: { id: true, name: true } },
            },
          },
        },
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

  admin: createTRPCRouter({
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
  }),
})

export type AppRouter = typeof appRouter

function generateAvailableSlots(
  startTime: string,
  endTime: string,
  pricingRules: any[],
  existingBookings: any[]
): any[] {
  const slots = []
  const [startHour, startMin] = startTime.split(":").map(Number)
  const [endHour, endMin] = endTime.split(":").map(Number)
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  const bookedSlots = existingBookings.map((b) => ({
    start: b.startTime.getHours() * 60 + b.startTime.getMinutes(),
    end: b.endTime.getHours() * 60 + b.endTime.getMinutes(),
  }))

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
    const slotStart = minutes
    const slotEnd = minutes + 60

    const isBooked = bookedSlots.some((b) => b.start < slotEnd && b.end > slotStart)
    if (isBooked) continue

    const dayOfWeek = new Date().getDay() // This would be dynamic based on date
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