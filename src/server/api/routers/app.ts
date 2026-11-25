import { z } from "zod"
import { sponsorsRouter } from "./sponsors.router"
import { adminRouter } from "./admin.router"
import { promotionsRouter } from "./promotions.router"
import { tasksRouter } from "./tasks.router"
import { createTRPCRouter, publicProcedure, protectedProcedure, ownerProcedure, adminProcedure, sponsorProcedure } from "@/server/trpc/init"
import { TRPCError } from "@trpc/server"
import prisma from "@/lib/prisma"
import { Role, SportType, SurfaceType, BookingStatus, PaymentStatus, PayoutStatus, TeamRole, NotificationType, Prisma } from "@prisma/client"
import { randomBytes } from "crypto"
import bcrypt from "bcryptjs"
import { msg91 } from "@/lib/msg91/service"
import { authyo } from "@/lib/authyo/service"
import { sendWhatsAppOTP, verifyWhatsAppOTP, connectWhatsApp, getQrCode, isWhatsAppAuthenticated, disconnectWhatsApp, forceNewQR, getWhatsAppError, sendBookingNotification, sendBookingConfirmationToPlayer, sendBookingCancellationToPlayer, sendBookingCancellationToOwner } from "@/lib/whatsapp/service"
import { createCashfreeOrder, generateOrderId, createCashfreeRefund, initiateCashfreePayout, createCashfreeContact } from "@/lib/cashfree"
import { trackTaskProgress } from "@/lib/rewards/taskProgress"
import { onBookingCompleted, onBookingCancelled } from "@/lib/tasks/refresh"

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

        // Phone uniqueness per role
        if (input.phone) {
          const digits = input.phone.replace(/\D/g, "")
          const last10 = digits.slice(-10)
          const phoneVariants = [`+91${last10}`, `91${last10}`, last10]
          const existingPhone = await prisma.user.findFirst({
            where: { role: input.role, phone: { in: phoneVariants } },
          })
          if (existingPhone) throw new Error("Phone number already registered for this role")
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
           avatarUrl: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
           latitude: z.number().nullable().optional(),
           longitude: z.number().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
         const user = await prisma.user.update({
           where: { id: ctx.session.user.id },
           data: input,
         })
         // Sync owner location to their facilities so booking location buttons use the pinned location
         if (ctx.session.user.role === "OWNER" && (input.latitude !== undefined || input.longitude !== undefined || input.address !== undefined || input.city !== undefined || input.state !== undefined)) {
           await prisma.facility.updateMany({
             where: { ownerId: ctx.session.user.id },
             data: {
               ...(input.latitude !== undefined && input.latitude !== null && { latitude: input.latitude }),
               ...(input.longitude !== undefined && input.longitude !== null && { longitude: input.longitude }),
               ...(input.address !== undefined && { address: input.address }),
               ...(input.city !== undefined && { city: input.city }),
               ...(input.state !== undefined && { state: input.state }),
             },
           })
         }
         try { const { trackTaskProgress } = await import("@/lib/rewards/taskProgress"); await trackTaskProgress(ctx.session.user.id, "COMPLETE_PROFILE" as any, 1) } catch (e) { console.error(e) }
         return { id: user.id, email: user.email, name: user.name, phone: user.phone, avatarUrl: user.avatarUrl, address: user.address, city: user.city, state: user.state, postalCode: user.postalCode, latitude: user.latitude, longitude: user.longitude }
      }),

    // Public OTP endpoints for login (via WhatsApp, falls back to SMS) - no existence check
    sendLoginOTP: publicProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ input }) => {
        const digits = input.phone.replace(/\D/g, "")
        const last10 = digits.slice(-10)
        const normalizedPhone = `+91${last10}`

        let otpSent = false
        if (isWhatsAppAuthenticated()) {
          const result = await sendWhatsAppOTP(normalizedPhone)
          if (result.type === "success") {
            otpSent = true
          } else {
            console.log("[WhatsApp] OTP send failed, falling back to SMS:", result.message)
          }
        }
        if (!otpSent) {
          const result = await authyo.sendOTP(normalizedPhone)
          if (!result.success) throw new Error(result.message)
        }
        return { success: true }
      }),

    // Public OTP endpoints for registration (via WhatsApp, falls back to SMS)
    sendRegistrationOTP: publicProcedure
      .input(z.object({ phone: z.string(), email: z.string().email().optional(), role: z.nativeEnum(Role).optional() }))
      .mutation(async ({ input }) => {
        const digits = input.phone.replace(/\D/g, "")
        const last10 = digits.slice(-10)
        const phoneVariants = [`+91${last10}`, `91${last10}`, last10, `+${digits}`]

        const normalizedPhone = `+91${last10}`

        if (input.role) {
          const existingPhone = await prisma.user.findFirst({
            where: { role: input.role, phone: { in: phoneVariants } },
          })
          if (existingPhone) throw new Error("Phone number already registered for this role")
        }

        // Check if email already registered
        if (input.email) {
          const existingEmail = await prisma.user.findUnique({
            where: { email: input.email.toLowerCase() },
          })
          if (existingEmail) throw new Error("Email already registered")
        }

        // Try WhatsApp first, fall back to SMS
        let otpSent = false
        if (isWhatsAppAuthenticated()) {
          const result = await sendWhatsAppOTP(normalizedPhone)
          if (result.type === "success") {
            otpSent = true
          } else {
            console.log("[WhatsApp] OTP send failed, falling back to SMS:", result.message)
          }
        }
        if (!otpSent) {
          const result = await authyo.sendOTP(normalizedPhone)
          if (!result.success) throw new Error(result.message)
        }
        return { success: true }
      }),

    verifyRegistrationOTP: publicProcedure
      .input(z.object({ phone: z.string(), otp: z.string() }))
      .mutation(async ({ input }) => {
        const normalizedPhone = input.phone.startsWith("+91")
          ? input.phone
          : input.phone.startsWith("91")
          ? `+${input.phone}`
          : `+91${input.phone}`

        // Try WhatsApp OTP first, fall back to SMS
        try {
          await verifyWhatsAppOTP(normalizedPhone, input.otp)
          return { success: true, phone: normalizedPhone }
        } catch (whatsappErr) {
          console.log("[WhatsApp] OTP verify failed, trying SMS:", (whatsappErr as Error).message)
        }

        await authyo.verifyOTP(normalizedPhone, input.otp)
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

        // Try WhatsApp OTP first, fall back to SMS
        try {
          await verifyWhatsAppOTP(normalizedPhone, input.otp)
        } catch (whatsappErr) {
          console.log("[WhatsApp] OTP verify failed, trying SMS:", (whatsappErr as Error).message)
          await msg91.verifyOTP(normalizedPhone, input.otp)
        }

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

        // Try WhatsApp first, fall back to SMS
        let otpSent = false
        if (isWhatsAppAuthenticated()) {
          const result = await sendWhatsAppOTP(normalizedPhone)
          if (result.type === "success") {
            otpSent = true
          }
        }
        if (!otpSent) {
          await msg91.sendOTP(normalizedPhone)
        }
        return { success: true }
      }),

    whatsappConnect: publicProcedure.mutation(async () => {
      await forceNewQR()
      return { authenticated: isWhatsAppAuthenticated(), qrCode: getQrCode() }
    }),

    whatsappStatus: publicProcedure.query(async () => {
      return {
        authenticated: isWhatsAppAuthenticated(),
        qrCode: getQrCode(),
        error: getWhatsAppError(),
      }
    }),

    whatsappDisconnect: publicProcedure.mutation(async () => {
      await disconnectWhatsApp()
      return { success: true }
    }),

    sendWhatsAppOTP: publicProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ input }) => {
        const normalizedPhone = input.phone.startsWith("+91")
          ? input.phone
          : input.phone.startsWith("91")
          ? `+${input.phone}`
          : `+91${input.phone}`

        const result = await sendWhatsAppOTP(normalizedPhone)
        if (result.type === "error") throw new Error(result.message)
        return { success: true }
      }),

    verifyWhatsAppOTP: publicProcedure
      .input(z.object({ phone: z.string(), otp: z.string() }))
      .mutation(async ({ input }) => {
        const normalizedPhone = input.phone.startsWith("+91")
          ? input.phone
          : input.phone.startsWith("91")
          ? `+${input.phone}`
          : `+91${input.phone}`

        await verifyWhatsAppOTP(normalizedPhone, input.otp)
        return { success: true, phone: normalizedPhone }
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
           latitude: z.number().nullable().optional(),
           longitude: z.number().nullable().optional(),
          radiusKm: z.number().default(10),
          page: z.number().default(1),
          limit: z.number().default(20),
        })
      )
      .query(async ({ input }) => {
        const where: Prisma.FacilityWhereInput = {
          isActive: true,
          owner: { isVerified: true },
          ...(input.city && { city: { equals: input.city.trim(), mode: "insensitive" } }),
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
             owner: { select: { id: true, name: true, avatarUrl: true, phone: true, latitude: true, longitude: true, isVerified: true } },
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
          facilityType: z.string().optional(),
          contactPhone: z.string().optional(),
          whatsappNumber: z.string().optional(),
          landmark: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().min(2).default("India"),
          postalCode: z.string().optional(),
            latitude: z.number().optional(),
           longitude: z.number().optional(),
          sportTypes: z.array(z.nativeEnum(SportType)).min(1),
          amenities: z.array(z.string()).default([]),
          images: z.array(z.string()).default([]),
          openTime: z.string().optional(),
          closeTime: z.string().optional(),
          courts: z.array(z.object({
            name: z.string(),
            sportType: z.nativeEnum(SportType),
            surfaceType: z.string(),
            capacity: z.number(),
            pricePerHour: z.number(),
            images: z.array(z.string()).optional(),
          })).optional(),
          pricingRules: z.array(z.object({
            name: z.string(),
            courtId: z.string().optional(),
            dayOfWeek: z.array(z.number()),
            startTime: z.string(),
            endTime: z.string(),
            pricePerHour: z.number(),
            minDuration: z.number().optional(),
            maxDuration: z.number().optional(),
          })).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify user exists (prevents FK constraint errors from stale sessions)
        const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id } })
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired. Please log in again." })

        if (user.bookingBanUntil && user.bookingBanUntil > new Date() && user.role !== "OWNER" && user.role !== "ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: `You cannot book until ${user.bookingBanUntil.toLocaleString()} due to a recent no-show.` })
        }

        // Auto-fill location from owner profile if not provided
        const owner = await prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { address: true, city: true, state: true, postalCode: true, latitude: true, longitude: true },
        })

        const facility = await prisma.facility.create({
          data: {
            name: input.name,
            description: input.description,
            facilityType: input.facilityType,
            contactPhone: input.contactPhone,
            whatsappNumber: input.whatsappNumber,
            landmark: input.landmark,
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

        if (input.courts && input.courts.length > 0) {
          const courtMap: Record<string, string> = {}
          for (const court of input.courts) {
            const createdCourt = await prisma.court.create({
              data: {
                name: court.name,
                facilityId: facility.id,
                sportType: court.sportType,
                surfaceType: court.surfaceType as any,
                capacity: court.capacity,
                images: court.images || [],
                isActive: true,
              },
            })
            courtMap[court.name] = createdCourt.id
            // Create default standard rate pricing rule
            await prisma.pricingRule.create({
              data: {
                facilityId: facility.id,
                courtId: createdCourt.id,
                name: "Standard Rate",
                dayOfWeek: [0,1,2,3,4,5,6],
                startTime: "06:00",
                endTime: "22:00",
                pricePerHour: court.pricePerHour,
                minDuration: 30,
                maxDuration: 1440,
                isActive: true,
              },
            })
          }

          // Create custom pricing rules if provided
          if (input.pricingRules && input.pricingRules.length > 0) {
            for (const rule of input.pricingRules) {
              const courtId = rule.courtId ? courtMap[rule.courtId] : null
              await prisma.pricingRule.create({
                data: {
                  facilityId: facility.id,
                  courtId: courtId || undefined,
                  name: rule.name,
                  dayOfWeek: rule.dayOfWeek,
                  startTime: rule.startTime,
                  endTime: rule.endTime,
                  pricePerHour: rule.pricePerHour,
                  minDuration: rule.minDuration || 30,
                  maxDuration: rule.maxDuration || 60,
                  isActive: true,
                },
              })
            }
          }
        }

        return facility
      }),

    update: ownerProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(3).optional(),
          description: z.string().optional(),
          facilityType: z.string().optional(),
          contactPhone: z.string().optional(),
          whatsappNumber: z.string().optional(),
          landmark: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          postalCode: z.string().optional(),
           latitude: z.number().optional(),
           longitude: z.number().optional(),
          sportTypes: z.array(z.nativeEnum(SportType)).optional(),
          amenities: z.array(z.string()).optional(),
          images: z.array(z.string()).optional(),
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

        const updated = await prisma.facility.update({ where: { id }, data })

        // If openTime or closeTime changed, update pricing rules too
        if (input.openTime || input.closeTime) {
          const newOpenTime = input.openTime || facility.openTime
          const newCloseTime = input.closeTime || facility.closeTime
          await prisma.pricingRule.updateMany({
            where: { facilityId: id },
            data: { startTime: newOpenTime, endTime: newCloseTime },
          })
        }

        return updated
      }),

    delete: ownerProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const facility = await prisma.facility.findFirst({
          where: { id: input.id, ownerId: ctx.session.user.id },
        })
        if (!facility) throw new Error("Facility not found or access denied")

        return prisma.facility.update({ where: { id: input.id }, data: { isActive: false } })
      }),

    myFacilities: protectedProcedure.query(async ({ ctx }) => {
      return prisma.facility.findMany({
        where: { ownerId: ctx.session.user.id, isActive: true },
        include: {
          courts: true,
          _count: { select: { bookings: true, reviews: true, courts: true } },
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
          images: z.array(z.string()).default([]),
          pricePerHour: z.number().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const facility = await prisma.facility.findFirst({
          where: { id: input.facilityId, ownerId: ctx.session.user.id },
        })
        if (!facility) throw new Error("Facility not found or access denied")

        const court = await prisma.court.create({ data: {
          facilityId: input.facilityId,
          name: input.name,
          sportType: input.sportType,
          surfaceType: input.surfaceType,
          capacity: input.capacity,
          dimensions: input.dimensions,
          images: input.images,
        } })

        if (input.pricePerHour || true) {
          await prisma.pricingRule.create({
            data: {
              facilityId: input.facilityId,
              courtId: court.id,
              name: "Standard Rate",
              dayOfWeek: [0,1,2,3,4,5,6],
              startTime: facility.openTime || "06:00",
              endTime: facility.closeTime || "22:00",
              pricePerHour: input.pricePerHour || 500,
              minDuration: 30,
              maxDuration: 1440,
              isActive: true,
            },
          })
        }

        return court
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
           images: z.array(z.string()).optional(),
           pricePerHour: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
         const { id, pricePerHour, ...data } = input
         const court = await prisma.court.findFirst({
           where: { id, facility: { ownerId: ctx.session.user.id } },
         })
         if (!court) throw new Error("Court not found or access denied")

         const updated = await prisma.court.update({ where: { id }, data })

         // Update pricing rule if pricePerHour provided
         if (input.pricePerHour) {
           const facility = await prisma.facility.findUnique({ where: { id: court.facilityId } })
           const existingRule = await prisma.pricingRule.findFirst({ where: { courtId: id } })
           if (existingRule) {
             await prisma.pricingRule.update({ where: { id: existingRule.id }, data: { pricePerHour: input.pricePerHour, startTime: facility?.openTime || existingRule.startTime, endTime: facility?.closeTime || existingRule.endTime } })
           } else {
             await prisma.pricingRule.create({
               data: {
                 facilityId: court.facilityId,
                 courtId: id,
                 name: "Standard Rate",
                 dayOfWeek: [0,1,2,3,4,5,6],
                 startTime: facility?.openTime || "06:00",
                 endTime: facility?.closeTime || "22:00",
                 pricePerHour: input.pricePerHour,
                 minDuration: 30,
                 maxDuration: 1440,
                 isActive: true,
               },
             })
           }
         }

         return updated
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

        let availability: any = await prisma.availability.findFirst({
          where: { courtId: input.courtId, date },
        })

        if (!availability) {
          const court = await prisma.court.findUnique({
            where: { id: input.courtId },
            include: { facility: { select: { openTime: true, closeTime: true } } },
          })
          availability = {
            id: "default",
            courtId: input.courtId,
            date,
            startTime: court?.facility?.openTime || "06:00",
            endTime: court?.facility?.closeTime || "22:00",
            isBlocked: false,
            note: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any
        }

        if (availability.isBlocked) {
          return { slots: [], isBlocked: true, note: availability.note }
        }

        const court = await prisma.court.findUnique({
          where: { id: input.courtId },
          select: { facilityId: true },
        })
        let pricingRules = await prisma.pricingRule.findMany({
          where: {
            isActive: true,
            OR: [
              { courtId: input.courtId },
              { facilityId: court?.facilityId, courtId: null },
            ],
          },
        })

        // Fallback: if no pricing rules, use facility open/close times with default price
        if (pricingRules.length === 0 && court?.facilityId) {
          const fac = await prisma.facility.findUnique({ where: { id: court.facilityId }, select: { openTime: true, closeTime: true } })
          pricingRules = [{
            dayOfWeek: [0,1,2,3,4,5,6],
            startTime: fac?.openTime || "06:00",
            endTime: fac?.closeTime || "22:00",
            pricePerHour: 500,
          }] as any
        }

        const bookings = await prisma.booking.findMany({
          where: {
            courtId: input.courtId,
            startTime: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) },
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          },
        })

        // Prefer court-specific pricing rules
        const courtSpecificRules = pricingRules.filter((r: any) => r.courtId === input.courtId)
        const rulesToUse = courtSpecificRules.length > 0 ? courtSpecificRules : pricingRules

        // Generate available slots based on availability and pricing rules
        const slots = generateAvailableSlots(
          availability.startTime,
          availability.endTime,
          rulesToUse,
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
          players: z.number().min(1).max(50).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const courtId = input.courtId
        const facilityId = input.facilityId

        const facilityRecord = await prisma.facility.findUnique({ where: { id: facilityId }, select: { ownerId: true } })
        const isOwnerBooking = facilityRecord?.ownerId === ctx.session.user.id

        // Owners can only book their own facilities
        if (ctx.session.user.role === "OWNER" && !isOwnerBooking) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Owners cannot book other owners' facilities" })
        }

        const startTime = new Date(input.startTime)
        let endTime = new Date(input.endTime)
        if (endTime <= startTime) endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
        const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

        if (!isOwnerBooking) {
          if (duration < 30) throw new Error("Minimum booking duration is 30 minutes")
          if (duration > 60) throw new Error("Maximum booking duration is 1 hour")
        }

        // Prevent booking in the past
        if (startTime < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot book a time slot in the past" })
        }

        // Verify court belongs to facility (prevents tampering)
        let courtSportType: string | null = null
        if (courtId) {
          const court = await prisma.court.findFirst({
            where: { id: courtId, facilityId },
          })
          if (!court) throw new TRPCError({ code: "BAD_REQUEST", message: "Court does not belong to this facility" })
          courtSportType = court.sportType
        }

        // Verify user exists (prevents FK constraint errors from stale sessions)
        const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id } })
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired. Please log in again." })

         if (user.bookingBanUntil && user.bookingBanUntil > new Date() && user.role !== "OWNER" && user.role !== "ADMIN") {
          throw new TRPCError({ code: "FORBIDDEN", message: `You cannot book until ${user.bookingBanUntil.toLocaleString()} due to a recent no-show.` })
        }

        // Check CIBIL score - minimum 600 to book (skip for owner)
        if (!isOwnerBooking && user.cibilScore < 600) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Your CIBIL score (${user.cibilScore}) is too low to book. Minimum required: 600. Join other players' games to improve your score.`,
          })
        }

        // If player cancelled a booking in last 24h, block booking
        if (!isOwnerBooking) {
          const recentCancel = await prisma.booking.findFirst({
            where: {
              userId: ctx.session.user.id,
              status: BookingStatus.CANCELLED,
              updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          })
          if (recentCancel) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You cannot book for 24 hours after cancelling a booking." })
          }
        }

        // Expire stale confirmed bookings and penalize
        if (!isOwnerBooking) {
          const expired = await prisma.booking.findMany({
            where: {
              userId: ctx.session.user.id,
              status: BookingStatus.CONFIRMED,
              endTime: { lt: new Date() },
            },
          })
          for (const b of expired) {
            await prisma.booking.update({ where: { id: b.id }, data: { status: BookingStatus.NO_SHOW } })
            await prisma.user.update({ where: { id: ctx.session.user.id }, data: { cibilScore: { decrement: 30 }, noShowCount: { increment: 1 } } })
            await prisma.notification.create({
              data: {
                userId: ctx.session.user.id,
                type: "BOOKING_CANCELLED",
                title: "Booking Expired",
                message: "Your booking expired without verification. CIBIL score decreased.",
                data: { bookingId: b.id },
              },
            })
          }
          if (expired.length > 0) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You have an expired unverified booking. You cannot book for 24 hours." })
          }
        }

        // Check booking limit - max 2 active (pending/confirmed) bookings (skip for owner)
        if (!isOwnerBooking) {
        const activeBookings = await prisma.booking.count({
          where: {
            userId: ctx.session.user.id,
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          },
        })
        if (activeBookings >= 2) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You already have 2 active bookings. Please complete or cancel an existing booking before creating a new one.",
          })
        }
        }

        // Check for conflicts (atomic with booking creation to prevent race conditions)
        const conflictingBooking = await prisma.booking.findFirst({
          where: {
            courtId: courtId || undefined,
            facilityId,
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
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

        const toRuleMins = (t: string) => {
          const [h, m] = String(t).split(":").map(Number)
          return (h || 0) * 60 + (m || 0)
        }
        const slotMins = toRuleMins(timeStr)
        const matchingRules = pricingRules.filter((r) => {
          if (!r.dayOfWeek.includes(dayOfWeek)) return false
          const ruleStart = toRuleMins(r.startTime)
          let ruleEnd = toRuleMins(r.endTime)
          if (ruleEnd <= ruleStart) ruleEnd += 24 * 60
          let adjustedSlot = slotMins
          if (adjustedSlot < ruleStart && ruleEnd > 24 * 60) adjustedSlot += 24 * 60
          if (!(ruleStart <= adjustedSlot && adjustedSlot < ruleEnd)) return false
          if (r.maxDuration && duration > r.maxDuration) return false
          return true
        })
        const applicableRule = matchingRules.sort((a: any, b: any) => {
          const aDur = (parseInt(a.endTime.split(":")[0]) * 60 + parseInt(a.endTime.split(":")[1])) - (parseInt(a.startTime.split(":")[0]) * 60 + parseInt(a.startTime.split(":")[1]))
          const bDur = (parseInt(b.endTime.split(":")[0]) * 60 + parseInt(b.endTime.split(":")[1])) - (parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1]))
          return aDur - bDur
        })[0]

        if (!applicableRule) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This time slot is not available. Please select an available slot.",
          })
        }

        const playerCount = courtSportType === "PS_GAMES" ? (input.players || 1) : 1
        const totalPrice = (applicableRule.pricePerHour * duration * playerCount) / 60
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
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
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
              totalPrice: totalPrice,
              status: BookingStatus.CONFIRMED,
              verificationCode,
              maxPlayers: input.maxPlayers || (courtSportType === "PS_GAMES" ? (input.players || 1) : 1),
              isPublic: input.isPublic || false,
              notes: input.notes,
            },
          })
        }, { isolationLevel: "Serializable" })

        // Create notification for facility owner + send WhatsApp message
        try {
          const facility = await prisma.facility.findUnique({
            where: { id: facilityId },
            select: { ownerId: true, name: true, address: true, latitude: true, longitude: true, owner: { select: { name: true, phone: true } } },
          })
          if (facility?.ownerId && facility.ownerId !== ctx.session.user.id) {
            await prisma.notification.create({
              data: {
                userId: facility.ownerId,
                type: "BOOKING_CONFIRMED",
                title: "New Booking",
                message: `New booking for ${facility.name} on ${startTime.toLocaleString()}`,
                data: { bookingId: booking.id, facilityId },
              },
            })

            // Send WhatsApp message to facility owner
            const ownerPhone = facility.owner?.phone
            const player = await prisma.user.findUnique({
              where: { id: ctx.session.user.id },
              select: { name: true, phone: true },
            })

            if (ownerPhone && player) {
              const scannerUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://strikora.in"}/dashboard/verify?scan=1`
              await sendBookingNotification(ownerPhone, {
                facilityName: facility.name,
                courtName: null,
                playerName: player.name || "Player",
                playerPhone: player.phone || "",
                startTime,
                endTime,
                totalPrice: totalPrice,
                duration,
                bookingId: booking.id,
                notes: input.notes,
                scannerUrl,
              }).catch((err) => console.error("[WhatsApp] Owner notification failed:", err.message))
            }
          }

          // Send WhatsApp confirmation to player with Google Maps link
          const player = await prisma.user.findUnique({
            where: { id: ctx.session.user.id },
            select: { name: true, phone: true },
          })

          if (player?.phone && facility) {
            await sendBookingConfirmationToPlayer(player.phone, {
              facilityName: facility.name,
              courtName: null,
              facilityAddress: facility.address || null,
              facilityLatitude: facility.latitude || null,
              facilityLongitude: facility.longitude || null,
              startTime,
              endTime,
              totalPrice: totalPrice,
              duration,
              bookingId: booking.id,
              verificationCode: booking.verificationCode,
            }).catch((err) => console.error("[WhatsApp] Player confirmation failed:", err.message))
          }
        } catch (e) {
          console.error("Failed to send booking WhatsApp notifications:", e)
        }
        let paymentRecord = null
        if (!isOwnerBooking) {
        const paymentRecordTmp = await prisma.payment.create({
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
        paymentRecord = paymentRecordTmp
        }

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
              facility: { select: { id: true, name: true, address: true, city: true, state: true, latitude: true, longitude: true, images: true, ownerId: true } },
              court: { select: { id: true, name: true } },
              payment: { select: { status: true, amount: true } },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { startTime: "asc" },
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
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
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
        const isSelf = booking.userId === ctx.session.user.id
        const isAdmin = ctx.session.user.role === "ADMIN"
        if (!isSelf && !isAdmin) {
          throw new Error("Access denied")
        }
        if (booking.status === BookingStatus.CANCELLED) throw new Error("Already cancelled")
        if (booking.status === BookingStatus.COMPLETED) throw new Error("Cannot cancel completed booking")
        if (booking.payment?.status === PaymentStatus.REFUNDED) throw new Error("Payment already refunded")

        const isOwnerOrAdmin = isAdmin && !isSelf

        // Require reason for confirmed bookings
        if (booking.status === BookingStatus.CONFIRMED && !input.reason) {
          throw new Error("Please provide a cancellation reason")
        }

        const updated = await prisma.$transaction(async (tx) => {
          const u = await tx.booking.update({
            where: { id: input.id },
            data: {
              status: BookingStatus.CANCELLED,
              notes: input.reason ? `Cancelled: ${input.reason}` : `Cancelled by ${isOwnerOrAdmin ? "owner" : "player"}`,
            },
          })
          if (booking.payment) {
            await tx.payment.update({
              where: { id: booking.payment.id },
              data: { status: PaymentStatus.FAILED },
            })
          }
          await tx.user.update({
            where: { id: ctx.session.user.id },
            data: { cibilScore: { decrement: 50 } },
          })
          // Deduct reward points as cancellation penalty (only for player cancellations)
          if (isSelf) {
            await tx.user.update({
              where: { id: booking.userId },
              data: { rewardPoints: { decrement: 5 } },
            })
            await tx.rewardTransaction.create({
              data: {
                userId: booking.userId,
                points: -5,
                type: "PENALTY" as any,
                status: "COMPLETED",
                description: "Cancellation penalty",
                referenceId: booking.id,
              },
            })
          }
          return u
        })

        // Create notification for the other party + send WhatsApp cancellation
        try {
          const facility = await prisma.facility.findUnique({
            where: { id: booking.facilityId },
            select: { ownerId: true, name: true, address: true, latitude: true, longitude: true, owner: { select: { name: true, phone: true } } },
          })
          const player = await prisma.user.findUnique({
            where: { id: booking.userId },
            select: { name: true, phone: true },
          })

          if (isOwnerOrAdmin) {
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

            // WhatsApp to player
            if (player?.phone && facility) {
              await sendBookingCancellationToPlayer(player.phone, {
                facilityName: facility.name,
                courtName: null,
                startTime: booking.startTime,
                endTime: booking.endTime,
                totalPrice: Number(booking.totalPrice || 0),
                duration: booking.duration,
                bookingId: booking.id,
                cancelledBy: "Facility Owner",
                reason: input.reason || undefined,
              }).catch((err) => console.error("[WhatsApp] Player cancellation failed:", err.message))
            }
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

            // WhatsApp to owner
            const ownerPhone = facility?.owner?.phone
            if (ownerPhone && player && facility) {
              await sendBookingCancellationToOwner(ownerPhone, {
                facilityName: facility.name,
                courtName: null,
                playerName: player.name || "Player",
                playerPhone: player.phone || "",
                startTime: booking.startTime,
                endTime: booking.endTime,
                totalPrice: Number(booking.totalPrice || 0),
                duration: booking.duration,
                bookingId: booking.id,
                reason: input.reason || undefined,
              }).catch((err) => console.error("[WhatsApp] Owner cancellation failed:", err.message))
            }
          }
        } catch (e) {
          console.error("Failed to send cancellation notifications:", e)
        }

        try { await onBookingCancelled(booking.userId, booking.id) } catch (e) { console.error(e) }
        return { ...updated, refundPercent: 0, refundAmount: 0 }
      }),

    // Owner offline booking (no payment, multiple slots)
    ownerCreateOffline: ownerProcedure
      .input(z.object({
        facilityId: z.string(),
        courtId: z.string().optional(),
        slots: z.array(z.object({ startTime: z.string().datetime(), endTime: z.string().datetime() })).min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const facility = await prisma.facility.findFirst({ where: { id: input.facilityId, ownerId: ctx.session.user.id } })
        if (!facility) throw new TRPCError({ code: "FORBIDDEN", message: "Facility not found or access denied" })

        const created = []
        for (const slot of input.slots) {
          const startTime = new Date(slot.startTime)
          let endTime = new Date(slot.endTime)
          if (endTime <= startTime) endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
          if (duration < 30) throw new TRPCError({ code: "BAD_REQUEST", message: "Minimum booking duration is 30 minutes" })

          const conflict = await prisma.booking.findFirst({
            where: {
              courtId: input.courtId || undefined,
              facilityId: input.facilityId,
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
              OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
            },
          })
          if (conflict) throw new TRPCError({ code: "CONFLICT", message: "Time slot not available" })

          // Calculate price from pricing rules (if any)
          const pricingRules = await prisma.pricingRule.findMany({
            where: {
              isActive: true,
              ...(input.courtId ? { courtId: input.courtId } : { facilityId: input.facilityId, courtId: null }),
            },
          })
          const istOffset = 5.5 * 60 * 60 * 1000
          const istTime = new Date(startTime.getTime() + istOffset)
          const dayOfWeek = istTime.getUTCDay()
          const timeStr = `${istTime.getUTCHours().toString().padStart(2, "0")}:${istTime.getUTCMinutes().toString().padStart(2, "0")}`
          const toRuleMins2 = (t: string) => { const [h, m] = String(t).split(":").map(Number); return (h || 0) * 60 + (m || 0) }
          const slotMins2 = toRuleMins2(timeStr)
          const applicableRule = pricingRules
            .filter((r: any) => {
              if (!r.dayOfWeek.includes(dayOfWeek)) return false
              const rs = toRuleMins2(r.startTime)
              let re = toRuleMins2(r.endTime)
              if (re <= rs) re += 24 * 60
              let as = slotMins2
              if (as < rs && re > 24 * 60) as += 24 * 60
              return rs <= as && as < re
            })
            .sort((a: any, b: any) => a.pricePerHour - b.pricePerHour)[0]
          const totalPrice = applicableRule ? (applicableRule.pricePerHour * duration) / 60 : 0

          const booking = await prisma.booking.create({
            data: {
              userId: ctx.session.user.id,
              facilityId: input.facilityId,
              courtId: input.courtId,
              startTime,
              endTime,
              duration,
              totalPrice,
              status: BookingStatus.CONFIRMED,
              verificationCode: randomBytes(16).toString("hex"),
              maxPlayers: 1,
              isPublic: false,
              notes: input.notes || "Offline booking by owner",
            },
          })
          created.push(booking)
        }
        return { bookings: created, count: created.length }
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
        if (spotsTaken >= maxPlayers) throw new Error("No spots available")

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

        try { await trackTaskProgress(ctx.session.user.id, "JOIN_OPEN_GAMES", 1) } catch (e) { console.error(e) }

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
        if (joinRequest.booking.participants.length >= maxPlayers) {
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
              rewardPoints: { decrement: 10 },
            },
          })
          await tx.rewardTransaction.create({
            data: {
              userId: input.userId,
              points: -10,
              type: "PENALTY" as any,
              status: "COMPLETED",
              description: "No-show penalty",
              referenceId: booking.id,
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
                rewardPoints: { decrement: 10 },
              },
            })
            await tx.rewardTransaction.create({
              data: {
                userId: ns.userId,
                points: -10,
                type: "PENALTY" as any,
                status: "COMPLETED",
                description: "No-show penalty",
                referenceId: booking.id,
              },
            })
            await tx.bookingParticipant.delete({ where: { id: ns.id } })
          }
        })

        return { markedNoShows: noShows.length }
      }),
    togglePublic: protectedProcedure
      .input(z.object({ bookingId: z.string(), isPublic: z.boolean(), maxPlayers: z.number().min(1).max(20).optional(), offlineFriends: z.number().min(0).max(20).optional() }))
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
            ...(input.offlineFriends !== undefined && { offlineFriends: input.offlineFriends }),
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
              facility: { select: { id: true, name: true, address: true, city: true, state: true, latitude: true, longitude: true, images: true, ownerId: true } },
              court: { select: { id: true, name: true } },
              payment: { select: { status: true, amount: true, platformFee: true, ownerPayout: true } },
            },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            orderBy: { startTime: "asc" },
          }),
          prisma.booking.count({ where }),
        ])

        return { bookings, total, page: input.page, totalPages: Math.ceil(total / input.limit) }
      }),

    ownerAnalytics: ownerProcedure.query(async ({ ctx }) => {
      const days = 7
      const now = new Date()
      const result = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const start = new Date(d)
        start.setHours(0, 0, 0, 0)
        const end = new Date(d)
        end.setHours(23, 59, 59, 999)
        const count = await prisma.booking.count({
          where: {
            facility: { ownerId: ctx.session.user.id },
            startTime: { gte: start, lte: end },
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
          },
        })
        result.push({ date: start.toISOString().split("T")[0], count })
      }
      return result
    }),

    verify: ownerProcedure
      .input(z.object({ bookingId: z.string(), code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findFirst({
          where: { id: input.bookingId, facility: { ownerId: ctx.session.user.id } },
          include: { facility: true, user: { select: { name: true, email: true, phone: true } } },
        })
        if (!booking) throw new Error("Booking not found or access denied")
        if (booking.status === BookingStatus.CANCELLED) throw new Error("Booking is cancelled")
        if (booking.status === BookingStatus.COMPLETED) throw new Error("Booking already verified")
        if (booking.verificationCode !== input.code) throw new Error("Invalid verification code")
        if (new Date(booking.endTime) < new Date()) throw new Error("Booking expired")

        await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.COMPLETED } })

        try { await onBookingCompleted(booking.userId, booking.id) } catch (e) { console.error(e) }

        // Credit reward points (5 points per hour booked) after completion
        const rewardPointsEarned = Math.max(1, Math.round((booking.duration / 60) * 5))
        let totalRewardPoints = 0
        try {
          const { creditPoints } = await import("@/lib/tasks/reward")
          await creditPoints({
            userId: booking.userId,
            points: rewardPointsEarned,
            description: `Reward for completed booking (${booking.duration} min)`,
            referenceId: booking.id,
            idempotencyKey: `booking-reward:${booking.id}`,
          })
          const u = await prisma.user.findUnique({ where: { id: booking.userId }, select: { rewardPoints: true } })
          totalRewardPoints = u?.rewardPoints || 0
        } catch (e) { console.error("Failed to credit reward points:", e) }

        await prisma.notification.create({
          data: {
            userId: booking.userId,
            type: "BOOKING_CONFIRMED",
            title: "Booking Completed",
            message: `Your booking has been verified and completed. You earned ${rewardPointsEarned} reward points. Total reward points: ${totalRewardPoints}.`,
            data: { bookingId: booking.id },
          },
        })

        // Send WhatsApp completion message with reward details
        if (booking.user?.phone) {
          try {
            const { sendWhatsAppMessage } = await import("@/lib/whatsapp/service")
            const msg = `✅ *Booking Completed*

🏟️ *Facility:* ${booking.facility?.name || ""}
⏱️ *Duration:* ${booking.duration} minutes
🎁 *Reward Points Earned:* ${rewardPointsEarned}
⭐ *Total Reward Points:* ${totalRewardPoints}

Thank you for playing! 🌐 https://strikora.in`
            await sendWhatsAppMessage(booking.user.phone, msg)
          } catch (e) { console.error("Failed to send WhatsApp completion message:", e) }
        }

        return {
          success: true,
          bookingId: booking.id,
          facility: booking.facility?.name,
          player: booking.user?.name,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: "COMPLETED",
        }
      }),

    complete: ownerProcedure
      .input(z.object({ bookingId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await prisma.booking.findFirst({
          where: { id: input.bookingId, facility: { ownerId: ctx.session.user.id } },
          include: { facility: true, user: { select: { name: true, email: true, phone: true } } },
        })
        if (!booking) throw new Error("Booking not found or access denied")
        if (booking.status === BookingStatus.CANCELLED) throw new Error("Booking is cancelled")
        if (booking.status === BookingStatus.COMPLETED) throw new Error("Booking already completed")

        await prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.COMPLETED } })

        try { await onBookingCompleted(booking.userId, booking.id) } catch (e) { console.error(e) }

        const rewardPointsEarned = Math.max(1, Math.round((booking.duration / 60) * 5))
        let totalRewardPoints = 0
        try {
          const { creditPoints } = await import("@/lib/tasks/reward")
          await creditPoints({
            userId: booking.userId,
            points: rewardPointsEarned,
            description: `Reward for completed booking (${booking.duration} min)`,
            referenceId: booking.id,
            idempotencyKey: `booking-reward:${booking.id}`,
          })
          const u = await prisma.user.findUnique({ where: { id: booking.userId }, select: { rewardPoints: true } })
          totalRewardPoints = u?.rewardPoints || 0
        } catch (e) { console.error("Failed to credit reward points:", e) }

        await prisma.notification.create({
          data: {
            userId: booking.userId,
            type: "BOOKING_CONFIRMED",
            title: "Booking Completed",
            message: `Your booking has been completed. You earned ${rewardPointsEarned} reward points. Total reward points: ${totalRewardPoints}.`,
            data: { bookingId: booking.id },
          },
        })

        if (booking.user?.phone) {
          try {
            const { sendWhatsAppMessage } = await import("@/lib/whatsapp/service")
            const msg = `✅ *Booking Completed*

🏟️ *Facility:* ${booking.facility?.name || ""}
⏱️ *Duration:* ${booking.duration} minutes
🎁 *Reward Points Earned:* ${rewardPointsEarned}
⭐ *Total Reward Points:* ${totalRewardPoints}

Thank you for playing! 🌐 https://strikora.in`
            await sendWhatsAppMessage(booking.user.phone, msg)
          } catch (e) { console.error("Failed to send WhatsApp completion message:", e) }
        }

        return { success: true, bookingId: booking.id }
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
    create: sponsorProcedure
      .input(z.object({
        sponsorId: z.string().optional(),
        code: z.string().min(3).max(20),
        title: z.string().min(1),
        description: z.string().optional(),
        discountType: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
        discountValue: z.number().min(0),
        minBookingAmount: z.number().min(0).default(0),
        maxDiscount: z.number().optional(),
        validityDays: z.number().min(1).default(30),
        validFrom: z.string().datetime().optional(),
        validTo: z.string().datetime().optional(),
        maxUses: z.number().min(1).default(100),
        maxUsesPerUser: z.number().min(1).default(1),
        targetAudience: z.enum(["ALL", "FREQUENT", "NEW", "HIGH_RELIABILITY", "SPECIFIC_SPORT"]).default("ALL"),
        targetSport: z.nativeEnum(SportType).optional(),
        targetCity: z.string().optional(),
        imageUrl: z.string().optional(),
        terms: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let sponsorId = input.sponsorId
        if (!sponsorId) {
          let systemSponsor = await prisma.sponsor.findFirst({ where: { name: "Strikora System" } })
          if (!systemSponsor) {
            // need a user for sponsor; use first admin or create? fallback to ctx user
            systemSponsor = await prisma.sponsor.create({
              data: { name: "Strikora System", contactEmail: "system@strikora.local", userId: ctx.session.user.id, isApproved: true, isActive: true },
            })
          }
          sponsorId = systemSponsor.id
        }
        const sponsor = await prisma.sponsor.findUnique({ where: { id: sponsorId } })
        if (!sponsor) throw new Error("Sponsor not found")
        if (sponsor.userId !== ctx.session.user.id && ctx.session.user.role !== "ADMIN") {
          throw new Error("Access denied")
        }
        if (!sponsor.isApproved) throw new Error("Sponsor not approved yet")

        const offer = await prisma.offer.create({
          data: {
            sponsorId: sponsorId,
            code: input.code.toUpperCase(),
            title: input.title,
            description: input.description,
            discountType: input.discountType,
            discountValue: input.discountValue,
            minBookingAmount: input.minBookingAmount,
            maxDiscount: input.maxDiscount,
            validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
            validTo: input.validTo ? new Date(input.validTo) : new Date(Date.now() + (input.validityDays || 30) * 24 * 60 * 60 * 1000),
            maxUses: input.maxUses,
            maxUsesPerUser: input.maxUsesPerUser,
            targetAudience: input.targetAudience,
            targetSport: input.targetSport,
            targetCity: input.targetCity,
            imageUrl: input.imageUrl,
            validityDays: input.validityDays ?? 30,
            isActive: false, // Requires admin approval
          },
        })
        return offer
      }),

    // Update offer (sponsor)
    update: sponsorProcedure
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
        validityDays: z.number().min(1).optional(),
        isActive: z.boolean().optional(),
        imageUrl: z.string().optional(),
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
            ...(input.validityDays !== undefined && { validityDays: input.validityDays }),
            ...(input.isActive !== undefined && { isActive: input.isActive }),
            ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
          },
        })
      }),

    // List sponsor's offers
    myOffers: sponsorProcedure
      .query(async ({ ctx }) => {
        const sponsor = await prisma.sponsor.findUnique({ where: { userId: ctx.session.user.id } })
        if (!sponsor) return []
        const offers = await prisma.offer.findMany({
          where: { sponsorId: sponsor.id },
          orderBy: { createdAt: "desc" },
        })
        const offerIds = offers.map((o) => o.id)
        const offerCodes = offers.map((o) => o.code)
        
        // Batch queries
        const [distributedCounts, redemptions] = await Promise.all([
          prisma.campaignRecipient.groupBy({
            by: ["couponCode"],
            where: { couponCode: { in: offerCodes } },
            _count: { couponCode: true },
          }),
          prisma.offerRedemption.findMany({
            where: { offerId: { in: offerIds }, status: "REDEEMED" },
            select: { offerId: true, userId: true },
          }),
        ])
        
        const distributedMap = new Map(distributedCounts.map((d) => [d.couponCode, d._count.couponCode]))
        const redemptionsByOffer = new Map<string, { userIds: Set<string>; count: number }>()
        for (const r of redemptions) {
          if (!redemptionsByOffer.has(r.offerId)) {
            redemptionsByOffer.set(r.offerId, { userIds: new Set(), count: 0 })
          }
          const entry = redemptionsByOffer.get(r.offerId)!
          entry.userIds.add(r.userId)
          entry.count++
        }
        
        return offers.map((offer: any) => ({
          ...offer,
          distributedCount: distributedMap.get(offer.code) || 0,
          redeemedCount: redemptionsByOffer.get(offer.id)?.count || 0,
          customersGained: redemptionsByOffer.get(offer.id)?.userIds.size || 0,
        }))
      }),

    // Recent redemptions for sponsor's offers
    recentRedemptions: sponsorProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ ctx, input }) => {
        const sponsor = await prisma.sponsor.findUnique({ where: { userId: ctx.session.user.id } })
        if (!sponsor) return []
        const offers = await prisma.offer.findMany({
          where: { sponsorId: sponsor.id },
          select: { id: true },
        })
        const offerIds = offers.map((o) => o.id)
        return prisma.offerRedemption.findMany({
          where: { offerId: { in: offerIds }, status: "REDEEMED" },
          include: {
            user: { select: { id: true, name: true, email: true } },
            offer: { select: { id: true, code: true, title: true } },
          },
          orderBy: { usedAt: "desc" },
          take: input.limit,
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
  received: protectedProcedure
    .query(async ({ ctx }) => {
      const now = new Date()
      const cached = await prisma.offerRecommendation.findUnique({ where: { userId: ctx.session.user.id } })
      if (cached && cached.expiresAt > now) {
        const cachedOffers = await prisma.offer.findMany({
          where: { id: { in: cached.offerIds }, validFrom: { lte: now }, validTo: { gte: now }, sponsor: { isApproved: true, isActive: true }, OR: [{ isActive: true }, { redemptions: { some: { userId: ctx.session.user.id } } }] },
          include: { sponsor: { select: { name: true, logoUrl: true, budget: true, spentBudget: true, user: { select: { city: true, state: true } } } } },
        })
        return cachedOffers.filter((o: any) => o.usedCount < o.maxUses && o.sponsor.spentBudget < o.sponsor.budget)
      }

      const recipients = await prisma.campaignRecipient.findMany({
        where: { userId: ctx.session.user.id },
        select: { couponCode: true, isHoldout: true },
      })
      const codes = recipients.filter((r) => !r.isHoldout).map((r) => r.couponCode)
      if (codes.length === 0) {
        // Fallback: show offers that have been assigned to this user via redemptions
        const userRedemptions = await prisma.offerRedemption.findMany({ where: { userId: ctx.session.user.id, status: "ACTIVE" }, select: { offerId: true } })
        const assignedOfferIds = userRedemptions.map((r) => r.offerId)
        if (assignedOfferIds.length === 0) return []
        const assignedOffers = await prisma.offer.findMany({
          where: { id: { in: assignedOfferIds }, validFrom: { lte: now }, validTo: { gte: now }, sponsor: { isApproved: true, isActive: true }, OR: [{ isActive: true }, { redemptions: { some: { userId: ctx.session.user.id } } }] },
          include: { sponsor: { select: { name: true, logoUrl: true, budget: true, spentBudget: true, user: { select: { city: true, state: true } } } } },
        })
        return assignedOffers.filter((o: any) => o.usedCount < o.maxUses && o.sponsor.spentBudget < o.sponsor.budget)
      }

      const offers = await prisma.offer.findMany({
        where: {
          code: { in: codes },
          validFrom: { lte: now },
          validTo: { gte: now },
          sponsor: { isApproved: true, isActive: true },
          OR: [{ isActive: true }, { redemptions: { some: { userId: ctx.session.user.id } } }],
        },
        include: { sponsor: { select: { name: true, logoUrl: true, budget: true, spentBudget: true, user: { select: { city: true, state: true } } } } },
      })
      const offerIds = offers.map((o) => o.id)
      const userRedemptions = await prisma.offerRedemption.groupBy({
        by: ["offerId"],
        where: { userId: ctx.session.user.id, offerId: { in: offerIds } },
        _count: { offerId: true },
      })
      const redemptionMap = new Map(userRedemptions.map((r) => [r.offerId, r._count.offerId]))
      const eligible = offers.filter((o: any) => o.usedCount < o.maxUses && o.sponsor.spentBudget < o.sponsor.budget && (redemptionMap.get(o.id) || 0) < o.maxUsesPerUser)

      // AI-driven offer decision
      const completedCount = await prisma.booking.count({ where: { userId: ctx.session.user.id, status: BookingStatus.COMPLETED } })
      const totalBookings = await prisma.booking.count({ where: { userId: ctx.session.user.id } })
      const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { cibilScore: true, rewardPoints: true } })

      try {
        const apiKey = process.env.KILO_API_KEY
        const apiUrl = process.env.KILO_API_URL
        const model = process.env.KILO_MODEL || "kilo-auto/small"
        if (apiKey && apiUrl && eligible.length > 0) {
          const offerList = eligible.map((o: any) => ({ id: o.id, title: o.title, discountValue: o.discountValue, minBookingAmount: o.minBookingAmount }))
          const prompt = `You are an offer recommendation engine for a sports booking platform. Decide which offers to show to this player to increase engagement and bookings.
Player stats: completedBookings=${completedCount}, totalBookings=${totalBookings}, cibilScore=${user?.cibilScore}, rewardPoints=${user?.rewardPoints}.
If rewardPoints > 500, the player should also receive at least one offer (if available).
Candidate offers: ${JSON.stringify(offerList)}.
Return ONLY a JSON array of offer IDs to show to this player. Return at most 2 offer IDs. Distribute offers gradually to avoid showing all at once. If player has completed at least 3 bookings or rewardPoints > 500, favor rewarding them; otherwise show at most 1 offer.`
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
          })
          if (res.ok) {
            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content || "[]"
            const match = content.match(/\[[\s\S]*\]/)
            const ids: string[] = match ? JSON.parse(match[0]) : []
            if (Array.isArray(ids) && ids.length > 0) {
              const idSet = new Set(ids)
              const selected = eligible.filter((o: any) => idSet.has(o.id)).slice(0, 2)
              if (selected.length > 0) {
                await prisma.offerRecommendation.upsert({
                  where: { userId: ctx.session.user.id },
                  update: { offerIds: selected.map((o: any) => o.id), playerSummary: { completedCount, totalBookings } as any, computedAt: now, expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000) },
                  create: { userId: ctx.session.user.id, offerIds: selected.map((o: any) => o.id), playerSummary: { completedCount, totalBookings } as any, expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000) },
                })
                return selected
              }
            }
          }
        }
      } catch (e) {
        console.error("[AI offers] failed", e)
      }

      // Fallback heuristic (gradual distribution)
      let result: any[] = []
      if (completedCount >= 3 || (user?.rewardPoints || 0) > 500) result = eligible.slice(0, 2)
      else result = eligible.slice(0, 1)
      if (result.length === 0 && eligible.length > 0 && (user?.rewardPoints || 0) > 500) result = eligible.slice(0, 1)

      // AI branch returns directly above; if reached here, store cache
      await prisma.offerRecommendation.upsert({
        where: { userId: ctx.session.user.id },
        update: { offerIds: result.map((o: any) => o.id), playerSummary: { completedCount, totalBookings } as any, computedAt: now, expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000) },
        create: { userId: ctx.session.user.id, offerIds: result.map((o: any) => o.id), playerSummary: { completedCount, totalBookings } as any, expiresAt: new Date(now.getTime() + 6 * 60 * 60 * 1000) },
      })

      return result
    }),

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

    // List all active tasks
    tasks: protectedProcedure
      .query(async ({ ctx }) => {
        const tasks = await prisma.task.findMany({
          where: { isActive: true, OR: [{ userId: null }, { userId: ctx.session.user.id }] },
          orderBy: { createdAt: "desc" },
        })
        const userTasks = await prisma.userTask.findMany({ where: { userId: ctx.session.user.id } })
        const userTaskMap = new Map(userTasks.map((ut) => [ut.taskId, ut]))
        return tasks.map((task) => {
          const ut = userTaskMap.get(task.id)
          return {
            id: task.id,
            title: task.title,
            description: task.description,
            type: task.type,
            category: task.category,
            target: task.target,
            rewardPoints: task.rewardPoints,
            progress: ut?.progress || 0,
            completed: ut?.completed || false,
            completedAt: ut?.completedAt,
            status: ut?.status || task.status,
            expiresAt: task.expiresAt,
          }
        })
      }),

    // Update task progress
    updateTaskProgress: protectedProcedure
      .input(z.object({ taskId: z.string(), increment: z.number().min(1).default(1) }))
      .mutation(async ({ ctx, input }) => {
        const { trackTaskProgress } = await import("@/lib/rewards/taskProgress")
        const task = await prisma.task.findUnique({ where: { id: input.taskId } })
        if (task) await trackTaskProgress(ctx.session.user.id, task.type, input.increment)
        const { verifyAndCreditTask } = await import("@/lib/tasks/verification")
        return verifyAndCreditTask(ctx.session.user.id, input.taskId)
      }),

    // AI-generated personalized tasks
    generateTasks: protectedProcedure
      .mutation(async ({ ctx }) => {
        const { generateTasksForPlayer } = await import("@/lib/tasks/generator")
        return generateTasksForPlayer(ctx.session.user.id)
      }),

    // Get user's personalized tasks
    myTasks: protectedProcedure
      .query(async ({ ctx }) => {
        const { expireStaleTasks } = await import("@/lib/tasks/refresh")
        await expireStaleTasks()
        const tasks = await prisma.task.findMany({
          where: { isActive: true, OR: [{ userId: null }, { userId: ctx.session.user.id }] },
          orderBy: { createdAt: "desc" },
        })
        const userTasks = await prisma.userTask.findMany({ where: { userId: ctx.session.user.id } })
        const userTaskMap = new Map(userTasks.map((ut) => [ut.taskId, ut]))
        return tasks.map((task) => {
          const ut = userTaskMap.get(task.id)
          return {
            id: task.id,
            title: task.title,
            description: task.description,
            type: task.type,
            category: task.category,
            target: task.target,
            rewardPoints: task.rewardPoints,
            progress: ut?.progress || 0,
            completed: ut?.completed || false,
            completedAt: ut?.completedAt,
            isAiGenerated: task.isAiGenerated,
            expiresAt: task.expiresAt,
            targetTurfId: task.targetTurfId,
            targetSport: task.targetSport,
            status: ut?.status || task.status,
          }
        })
      }),

    // Reward points (delegated)
    myRewardPoints: protectedProcedure
      .query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({ where: { id: ctx.session.user.id }, select: { rewardPoints: true } })
        return user?.rewardPoints || 0
      }),

    myRewardTransactions: protectedProcedure
      .query(async ({ ctx }) => {
        return prisma.rewardTransaction.findMany({ where: { userId: ctx.session.user.id }, orderBy: { createdAt: "desc" }, take: 20 })
      }),

    // Redeem an offer
    createRedemption: protectedProcedure
      .input(z.object({ offerId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const offer = await prisma.offer.findUnique({ where: { id: input.offerId } })
        if (!offer || !offer.isActive) throw new Error("Offer not available")
        const redemption = await prisma.offerRedemption.create({
          data: { offerId: input.offerId, userId: ctx.session.user.id, discountApplied: 0 },
        })
        return { verificationCode: redemption.verificationCode }
      }),

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
      const bookings = await prisma.booking.findMany({
        where: {
          facility: { ownerId: ctx.session.user.id },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] },
        },
        select: { totalPrice: true, userId: true },
      })

      const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalPrice || 0), 0)
      const totalEarnings = totalRevenue
      const totalPlatformFees = 0
      const pendingPayouts = 0
      const completedPayouts = totalRevenue
      const bookingCount = bookings.length
      const playerCount = new Set(bookings.map((b) => b.userId)).size

      return {
        totalRevenue,
        totalPlatformFees,
        totalEarnings,
        pendingPayouts,
        completedPayouts,
        paymentCount: bookings.length,
        bookingCount,
        playerCount,
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
        try { await trackTaskProgress(ctx.session.user.id, "CREATE_TEAM", 1) } catch (e) { console.error(e) }
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

  promotions: promotionsRouter,

  players: createTRPCRouter({
    list: publicProcedure
      .input(z.object({ city: z.string().optional(), limit: z.number().default(50) }).optional())
      .query(async ({ input }) => {
        const where: any = { role: "PLAYER" }
        if (input?.city) where.city = { equals: input.city, mode: "insensitive" }
        return prisma.user.findMany({
          where,
          select: { id: true, name: true, phone: true, address: true, city: true, state: true, postalCode: true, avatarUrl: true, rewardPoints: true, playerPreference: { select: { preferredSport: true, preferredTimes: true, preferredDays: true, engagementScore: true } }, _count: { select: { bookings: true } } },
          take: input?.limit || 50,
          orderBy: { createdAt: "desc" },
        })
      }),

    invite: protectedProcedure
      .input(z.object({ userId: z.string(), message: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.session.user.id) throw new Error("Cannot invite yourself")
        await prisma.notification.create({
          data: {
            userId: input.userId,
            type: "SYSTEM",
            title: "Player Invitation",
            message: input.message || "A player invited you to join their game.",
            data: { fromUserId: ctx.session.user.id },
          },
        })
        return { success: true }
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

  tasks: tasksRouter,
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
  let endMinutes = endHour * 60 + endMin
  // Handle overnight hours (e.g., 18:00 - 02:00)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60
  }

const istOffset = 5.5 * 60 * 60 * 1000

  const bookedSlots = existingBookings.map((b) => {
    const istStart = new Date(b.startTime.getTime() + istOffset)
    const istEnd = new Date(b.endTime.getTime() + istOffset)
    let start = istStart.getUTCHours() * 60 + istStart.getUTCMinutes()
    let end = istEnd.getUTCHours() * 60 + istEnd.getUTCMinutes()
    // Handle overnight bookings - adjust to match slot time scale
    if (end <= start) end += 24 * 60
    // If slot range crosses midnight, adjust booked slots that are before startMinutes
    if (start < startMinutes && startMinutes > 12 * 60) {
      start += 24 * 60
      end += 24 * 60
    }
    return { start, end }
  })

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    const slotStart = minutes
    const slotEnd = minutes + 30

    const isBooked = bookedSlots.some((b) => b.start < slotEnd && b.end > slotStart)
    if (isBooked) continue

const istDate = new Date(date.getTime() + istOffset)
    const dayOfWeek = istDate.getUTCDay()
    const timeStr = `${String(Math.floor((slotStart % (24 * 60)) / 60)).padStart(2, "0")}:${String(slotStart % 60).padStart(2, "0")}`

    const slotMinutes = slotStart % (24 * 60)

    const matchingRules = pricingRules.filter(
      (r: any) => {
        if (!r.dayOfWeek.includes(dayOfWeek)) return false
        const ruleStart = parseInt(r.startTime.split(":")[0]) * 60 + parseInt(r.startTime.split(":")[1])
        let ruleEnd = parseInt(r.endTime.split(":")[0]) * 60 + parseInt(r.endTime.split(":")[1])
        if (ruleEnd <= ruleStart) ruleEnd += 24 * 60
        // Adjust slotMinutes for overnight comparison
        let adjustedSlot = slotMinutes
        if (adjustedSlot < ruleStart && ruleEnd > 24 * 60) {
          adjustedSlot += 24 * 60
        }
        return ruleStart <= adjustedSlot && adjustedSlot < ruleEnd
      }
    )

    // Prefer the most specific (narrowest time window) rule
    const rule = matchingRules.sort((a: any, b: any) => {
      const aStart = parseInt(a.startTime.split(":")[0]) * 60 + parseInt(a.startTime.split(":")[1])
      let aEnd = parseInt(a.endTime.split(":")[0]) * 60 + parseInt(a.endTime.split(":")[1])
      if (aEnd <= aStart) aEnd += 24 * 60
      const aDur = aEnd - aStart
      const bStart = parseInt(b.startTime.split(":")[0]) * 60 + parseInt(b.startTime.split(":")[1])
      let bEnd = parseInt(b.endTime.split(":")[0]) * 60 + parseInt(b.endTime.split(":")[1])
      if (bEnd <= bStart) bEnd += 24 * 60
      const bDur = bEnd - bStart
      return aDur - bDur
    })[0]

    if (rule) {
        slots.push({
          startTime: timeStr,
          endTime: `${String(Math.floor((slotEnd % (24 * 60)) / 60)).padStart(2, "0")}:${String(slotEnd % 60).padStart(2, "0")}`,
          pricePerHour: rule.pricePerHour,
          minDuration: rule.minDuration,
          maxDuration: rule.maxDuration,
        })
    }
  }

  return slots
}