import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import prisma from "@/lib/prisma"
import { sendPushToUser } from "@/lib/push"
import { appRouter } from "@/server/api/routers/app"
import bcrypt from "bcryptjs"
import { encode, decode } from "next-auth/jwt"

const TOOLS = [
  { name: "auth.register", description: "Register a new user", params: { email: "string", password: "string", name: "string", role: "string" } },
  { name: "auth.login", description: "Login", params: { email: "string", password: "string" } },
  { name: "auth.me", description: "Current user profile", params: {} },
  { name: "player.searchFacilities", description: "Search facilities", params: { city: "string", sport: "string", minPrice: "number", maxPrice: "number", lat: "number", lng: "number", radiusKm: "number" } },
  { name: "player.getFacility", description: "Get facility", params: { id: "string" } },
  { name: "player.getAvailability", description: "Check availability", params: { courtId: "string", date: "string" } },
  { name: "player.createBooking", description: "Create booking", params: { facilityId: "string", courtId: "string", startTime: "string", endTime: "string", isPublic: "boolean", maxPlayers: "number" } },
  { name: "player.cancelBooking", description: "Cancel booking", params: { bookingId: "string" } },
  { name: "player.listBookings", description: "List bookings", params: { status: "string", page: "number", limit: "number" } },
  { name: "player.joinOpenGame", description: "Join open game", params: { bookingId: "string" } },
  { name: "player.leaveOpenGame", description: "Leave open game", params: { bookingId: "string" } },
  { name: "player.listOpenGames", description: "List open games", params: { city: "string", sport: "string", page: "number", limit: "number" } },
  { name: "player.findPlayers", description: "Find players", params: { city: "string", sport: "string" } },
  { name: "player.wallet", description: "Wallet", params: {} },
  { name: "player.notifications.list", description: "List notifications", params: { isRead: "boolean", limit: "number" } },
  { name: "owner.createFacility", description: "Create facility", params: { name: "string", description: "string", address: "string", city: "string", state: "string", country: "string", postalCode: "string", lat: "number", lng: "number", sportTypes: "array", amenities: "array", images: "array", openTime: "string", closeTime: "string" } },
  { name: "owner.updateFacility", description: "Update facility", params: { id: "string" } },
  { name: "owner.deleteFacility", description: "Delete facility", params: { id: "string" } },
  { name: "owner.listFacilities", description: "List owner facilities", params: {} },
  { name: "owner.addCourt", description: "Add court", params: { facilityId: "string", name: "string", sportType: "string", surfaceType: "string", capacity: "number", dimensions: "string", images: "array", pricePerHour: "number" } },
  { name: "owner.deleteCourt", description: "Delete court", params: { id: "string" } },
  { name: "owner.addPricingRule", description: "Add pricing rule", params: { facilityId: "string", courtId: "string", name: "string", dayOfWeek: "array", startTime: "string", endTime: "string", pricePerHour: "number", minDuration: "number", maxDuration: "number" } },
  { name: "owner.deletePricingRule", description: "Delete pricing rule", params: { id: "string" } },
  { name: "owner.listBookings", description: "List owner bookings", params: { status: "string", dateFrom: "string", dateTo: "string", page: "number", limit: "number" } },
  { name: "owner.verifyBooking", description: "Verify booking", params: { bookingId: "string", code: "string" } },
  { name: "owner.analytics", description: "Analytics", params: {} },
  { name: "owner.payouts", description: "Payouts", params: {} },
  { name: "admin.listUsers", description: "List users", params: { role: "string", page: "number" } },
  { name: "admin.approveOwner", description: "Approve owner", params: { userId: "string" } },
  { name: "admin.listFacilities", description: "List facilities", params: { page: "number" } },
  { name: "admin.payouts", description: "Admin payouts", params: { status: "string", page: "number" } },
  { name: "sponsor.createOffer", description: "Create offer", params: { title: "string", description: "string", discount: "number", validFrom: "string", validTo: "string", targetCity: "string" } },
  { name: "sponsor.verifyCoupon", description: "Verify coupon", params: { code: "string" } },
  { name: "notifications.send", description: "Send notification to a user", params: { userId: "string", email: "string", title: "string", message: "string", type: "string" } },
  { name: "sponsor.activateOffer", description: "Activate an offer", params: { offerId: "string", isActive: "boolean" } },
  { name: "sponsor.assignCoupon", description: "Assign a coupon to a player", params: { offerId: "string", userId: "string", email: "string", discountApplied: "number" } },
  { name: "promotions.ownerSettings", description: "Get owner promo settings", params: {} },
  { name: "promotions.updateOwnerSettings", description: "Update owner promo settings", params: {} },
  { name: "promotions.forecasts", description: "Get demand forecasts", params: { facilityId: "string", date: "string" } },
  { name: "promotions.refreshForecasts", description: "Refresh demand forecasts", params: {} },
  { name: "promotions.generateLowDemandCampaigns", description: "Generate low-demand campaigns", params: {} },
  { name: "promotions.aiDecide", description: "Run Kilo AI promotion decision", params: {} },
  { name: "promotions.perks", description: "List reward perks", params: {} },
  { name: "promotions.redeemPerk", description: "Redeem reward perk", params: { perkId: "string" } },
]

async function getContext(req: NextRequest) {
  let session: any = await getServerSession(authOptions)
  if (!session?.user) {
    const auth = req.headers.get("authorization")
    if (auth?.startsWith("Bearer ")) {
      try {
        const token = auth.slice(7)
        const decoded: any = await decode({ token, secret: process.env.NEXTAUTH_SECRET! })
        if (decoded?.id) {
          session = { user: { id: decoded.id, role: decoded.role, email: decoded.email, name: decoded.name } }
        }
      } catch {}
    }
  }
  const cookieToken = req.cookies.get("mcp-token")?.value
  if (!session?.user && cookieToken) {
    try {
      const decoded: any = await decode({ token: cookieToken, secret: process.env.NEXTAUTH_SECRET! })
      if (decoded?.id) session = { user: { id: decoded.id, role: decoded.role, email: decoded.email, name: decoded.name } }
    } catch {}
  }
  return { session, prisma }
}

function caller(ctx: any) {
  return (appRouter as any).createCaller(ctx)
}

async function runTool(tool: string, params: any, req: NextRequest) {
  const ctx = await getContext(req)
  const c = caller(ctx)
  const p = params || {}

  const needAuth = () => {
    if (!ctx.session?.user) throw new Error("Not authenticated")
  }

  switch (tool) {
    // Auth
    case "auth.register":
    case "auth_register":
    case "register": {
      return await c.auth.register({ email: p.email, password: p.password, name: p.name, role: p.role, phone: p.phone })
    }
    case "auth.login":
    case "auth_login":
    case "login": {
      const user = await prisma.user.findUnique({ where: { email: p.email } })
      if (!user || !user.passwordHash) throw new Error("Invalid credentials")
      const ok = await bcrypt.compare(p.password, user.passwordHash)
      if (!ok) throw new Error("Invalid credentials")
      if (user.role === "OWNER" && !user.isVerified) throw new Error("Owner account pending verification")
      const token = await encode({ token: { id: user.id, role: user.role, email: user.email, name: user.name }, secret: process.env.NEXTAUTH_SECRET!, maxAge: 30 * 24 * 60 * 60 })
      return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
    }
    case "auth.me":
    case "auth_me":
    case "get_profile":
    case "getProfile": {
      needAuth()
      return await c.auth.me()
    }
    case "auth.updateProfile":
    case "update_profile": {
      needAuth()
      return await c.auth.updateProfile(p)
    }

    // Player
    case "player.searchFacilities":
    case "search_facilities":
    case "list_facilities": {
      return await c.facilities.list({
        city: p.city,
        sportTypes: p.sport ? [p.sport] : p.sportTypes,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
        latitude: p.lat ?? p.latitude,
        longitude: p.lng ?? p.longitude,
        radiusKm: p.radiusKm,
        page: p.page,
        limit: p.limit,
      })
    }
    case "player.getFacility":
    case "get_facility": {
      return await c.facilities.get({ id: p.id })
    }
    case "player.getAvailability":
    case "check_availability": {
      return await c.courts.availability({ courtId: p.courtId, date: p.date })
    }
    case "player.createBooking":
    case "create_booking": {
      needAuth()
      return await c.bookings.create({
        facilityId: p.facilityId,
        courtId: p.courtId,
        startTime: p.startTime,
        endTime: p.endTime,
        isPublic: p.isPublic,
        maxPlayers: p.maxPlayers,
        notes: p.notes,
      })
    }
    case "player.cancelBooking":
    case "cancel_booking": {
      needAuth()
      return await c.bookings.cancel({ id: p.bookingId || p.id, reason: p.reason })
    }
    case "player.listBookings":
    case "list_bookings": {
      needAuth()
      return await c.bookings.myBookings({ status: p.status, page: p.page, limit: p.limit })
    }
    case "player.joinOpenGame":
    case "join_game":
    case "joinBooking": {
      needAuth()
      return await c.bookings.joinBooking({ bookingId: p.bookingId, message: p.message })
    }
    case "player.leaveOpenGame":
    case "leave_game":
    case "leaveBooking": {
      needAuth()
      return await c.bookings.leaveBooking({ bookingId: p.bookingId })
    }
    case "player.listOpenGames":
    case "list_open_games": {
      return await c.bookings.publicBookings({ page: p.page, limit: p.limit })
    }
    case "player.findPlayers": {
      const where: any = { role: "PLAYER" }
      if (p.city) where.city = { equals: p.city, mode: "insensitive" }
      const users = await prisma.user.findMany({ where, select: { id: true, name: true, city: true, avatarUrl: true }, take: 50 })
      return { players: users }
    }
    case "player.wallet": {
      needAuth()
      const bal = await c.offers.myRewardPoints()
      const txs = await c.offers.myRewardTransactions()
      return { balance: bal, transactions: txs }
    }
    case "player.notifications.list":
    case "list_notifications": {
      needAuth()
      return await c.notifications.list({ isRead: p.isRead, page: p.page, limit: p.limit })
    }
    case "mark_notification_read": {
      needAuth()
      return await c.notifications.markRead({ id: p.notificationId || p.id })
    }

    // Owner
    case "owner.createFacility":
    case "create_facility": {
      needAuth()
      return await c.facilities.create({
        name: p.name,
        description: p.description,
        facilityType: p.facilityType,
        contactPhone: p.contactPhone,
        whatsappNumber: p.whatsappNumber,
        landmark: p.landmark,
        address: p.address,
        city: p.city,
        state: p.state,
        country: p.country,
        postalCode: p.postalCode,
        latitude: p.lat ?? p.latitude,
        longitude: p.lng ?? p.longitude,
        sportTypes: p.sportTypes,
        amenities: p.amenities,
        images: p.images,
        openTime: p.openTime,
        closeTime: p.closeTime,
        courts: p.courts,
        pricingRules: p.pricingRules,
      })
    }
    case "owner.updateFacility":
    case "update_facility": {
      needAuth()
      return await c.facilities.update(p)
    }
    case "owner.deleteFacility":
    case "delete_facility": {
      needAuth()
      return await c.facilities.delete({ id: p.id })
    }
    case "owner.listFacilities":
    case "my_facilities": {
      needAuth()
      return await c.facilities.myFacilities()
    }
    case "owner.addCourt":
    case "create_court": {
      needAuth()
      return await c.courts.create({
        facilityId: p.facilityId,
        name: p.name,
        sportType: p.sportType,
        surfaceType: p.surfaceType,
        capacity: p.capacity,
        dimensions: p.dimensions,
        images: p.images,
        pricePerHour: p.pricePerHour,
      })
    }
    case "owner.deleteCourt":
    case "delete_court": {
      needAuth()
      return await c.courts.delete({ id: p.id })
    }
    case "list_courts": {
      return await prisma.court.findMany({ where: { facilityId: p.facilityId } })
    }
    case "owner.addPricingRule":
    case "add_pricing_rule": {
      needAuth()
      return await c.pricing.create(p)
    }
    case "owner.deletePricingRule":
    case "delete_pricing_rule": {
      needAuth()
      return await c.pricing.delete({ id: p.id })
    }
    case "owner.listBookings":
    case "owner_list_bookings":
    case "ownerBookings": {
      needAuth()
      return await c.bookings.ownerBookings({
        facilityId: p.facilityId,
        status: p.status,
        dateFrom: p.dateFrom,
        dateTo: p.dateTo,
        page: p.page,
        limit: p.limit,
      })
    }
    case "owner.verifyBooking":
    case "verify_booking": {
      needAuth()
      return await c.bookings.verify({ bookingId: p.bookingId || p.id, code: p.code || p.verificationCode })
    }
    case "owner.analytics":
    case "owner_analytics": {
      needAuth()
      const daily = await c.bookings.ownerAnalytics()
      return { daily, total: (daily as any[]).reduce((s: number, x: any) => s + (x.count || 0), 0) }
    }
    case "owner.payouts":
    case "owner_payouts": {
      needAuth()
      const earnings = await c.cashfree.ownerEarnings()
      const payouts = await c.cashfree.ownerPayouts({ page: p.page, limit: p.limit })
      return { earnings, payouts }
    }

    // Admin
    case "admin.listUsers":
    case "admin_list_users":
    case "admin.users": {
      needAuth()
      return await c.admin.users({ role: p.role, page: p.page, limit: p.limit })
    }
    case "admin.approveOwner":
    case "approve_owner":
    case "admin.approve": {
      needAuth()
      return await c.admin.verifyOwner({ userId: p.userId, action: "VERIFY" })
    }
    case "admin.listFacilities":
    case "admin_list_facilities": {
      needAuth()
      return await c.admin.facilities({ page: p.page, limit: p.limit, isActive: p.isActive })
    }
    case "admin.payouts":
    case "admin_payouts": {
      needAuth()
      return await c.admin.payouts({ status: p.status, page: p.page, limit: p.limit })
    }

    // Sponsor
    case "sponsor.createOffer":
    case "create_offer":
    case "sponsor_createOffer": {
      needAuth()
      const sponsor = await prisma.sponsor.findUnique({ where: { userId: ctx.session.user.id } })
      if (!sponsor) throw new Error("Sponsor not found")
      let code = p.code
      if (!code) {
        const { randomBytes } = await import("crypto")
        const bytes = randomBytes(6)
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        code = ""
        for (let i = 0; i < bytes.length; i++) code += alphabet[bytes[i] % alphabet.length]
      }
      code = code.toUpperCase()
      return await c.offers.create({
        sponsorId: sponsor.id,
        code,
        title: p.title,
        description: p.description,
        discountType: p.discountType || "PERCENTAGE",
        discountValue: p.discount ?? p.discountValue,
        minBookingAmount: p.minBookingAmount || 0,
        maxDiscount: p.maxDiscount,
        validFrom: p.validFrom,
        validTo: p.validTo,
        maxUses: p.maxUses,
        maxUsesPerUser: p.maxUsesPerUser,
        targetAudience: p.targetAudience,
        targetSport: p.targetSport,
        targetCity: p.targetCity,
        imageUrl: p.imageUrl || p.image,
      })
    }
    case "sponsor.assignCoupon":
    case "assign_coupon":
    case "issue_coupon": {
      needAuth()
      const offer = await prisma.offer.findUnique({ where: { id: p.offerId } })
      if (!offer) throw new Error("Offer not found")
      const targetUser = p.userId
        ? await prisma.user.findUnique({ where: { id: p.userId } })
        : await prisma.user.findUnique({ where: { email: (p.email || "").toLowerCase() } })
      if (!targetUser) throw new Error("User not found")
      // sponsor ownership check (admins bypass)
      if (ctx.session.user.role !== "ADMIN") {
        const sponsor = await prisma.sponsor.findUnique({ where: { userId: ctx.session.user.id } })
        if (!sponsor || sponsor.id !== offer.sponsorId) throw new Error("Not authorized for this offer")
      }
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
      const length = Math.min(32, Math.max(12, Number(p.codeLength) || 16))
      const { randomBytes } = await import("crypto")
      const bytes = randomBytes(length)
      let code = ""
      for (let i = 0; i < length; i++) code += alphabet[bytes[i] % alphabet.length]
      const grouped = code.match(/.{1,4}/g)?.join("-") || code
      const redemption = await prisma.offerRedemption.create({
        data: {
          offerId: offer.id,
          userId: targetUser.id,
          verificationCode: code,
          discountApplied: p.discountApplied ?? offer.discountValue,
          status: "ACTIVE",
        },
      })
      return { verificationCode: code, displayCode: grouped, redemptionId: redemption.id, offerId: offer.id, userId: targetUser.id }
    }
    case "sponsor.activateOffer":
    case "activate_offer":
    case "update_offer": {
      needAuth()
      const offer = await prisma.offer.findUnique({ where: { id: p.offerId } })
      if (!offer) throw new Error("Offer not found")
      if (ctx.session.user.role !== "ADMIN") {
        const sponsor = await prisma.sponsor.findUnique({ where: { userId: ctx.session.user.id } })
        if (!sponsor || sponsor.id !== offer.sponsorId) throw new Error("Not authorized")
      }
      const updated = await prisma.offer.update({ where: { id: p.offerId }, data: { isActive: p.isActive !== false } })
      return updated
    }
    case "notifications.send":
    case "send_notification":
    case "notify_user": {
      needAuth()
      const targetUser = p.userId
        ? await prisma.user.findUnique({ where: { id: p.userId } })
        : await prisma.user.findUnique({ where: { email: (p.email || "").toLowerCase() } })
      if (!targetUser) throw new Error("User not found")
      const notif = await prisma.notification.create({
        data: {
          userId: targetUser.id,
          type: p.type || "SYSTEM",
          title: p.title || "Notification",
          message: p.message || "",
        },
      })
      await sendPushToUser(targetUser.id, { title: p.title || "Notification", body: p.message || "", url: "/" })
      return { success: true, notificationId: notif.id, userId: targetUser.id }
    }
    case "sponsor.verifyCoupon":
    case "verify_coupon":
    case "verifyCoupon": {
      const offer = await prisma.offer.findFirst({ where: { code: (p.code || p.verificationCode || "").toUpperCase() } })
      const now = new Date()
      const valid = !!offer && offer.isActive && offer.validFrom <= now && offer.validTo >= now
      return { valid, offer: valid ? offer : null }
    }

    // Tournaments
    case "list_tournaments": {
      return await c.tournaments.list({ sportType: p.sportType, page: p.page, limit: p.limit })
    }
    case "get_tournament": {
      return await c.tournaments.get({ tournamentId: p.tournamentId || p.id })
    }
    case "create_tournament": {
      needAuth()
      return await c.tournaments.create(p)
    }
    case "register_team": {
      needAuth()
      return await c.tournaments.registerTeam({ tournamentId: p.tournamentId, teamName: p.teamName })
    }
    case "publish_tournament":
    case "tournaments.publish": {
      needAuth()
      return await c.tournaments.publish({ tournamentId: p.tournamentId || p.id })
    }

    // Offers
    case "get_offers": {
      needAuth()
      return await c.offers.getPersonalized({ bookingAmount: p.bookingAmount, sport: p.sport, city: p.city })
    }
    case "redeem_offer": {
      needAuth()
      return await c.offers.redeem({ offerId: p.offerId, bookingId: p.bookingId })
    }

    // Notifications
    case "list_notifications": {
      needAuth()
      return await c.notifications.list({ page: p.page, limit: p.limit })
    }

    // Verification code direct
    case "verify_booking_code": {
      // alias handled by verify_booking
      needAuth()
      return await c.bookings.verify({ bookingId: p.bookingId || p.id, code: p.code || p.verificationCode })
    }

    default: {
      // try tRPC path direct
      const parts = tool.split(".")
      if (parts.length === 2 && (c as any)[parts[0]]?.[parts[1]]) {
        const fn = (c as any)[parts[0]][parts[1]]
        return await fn(p)
      }
      throw new Error(`Tool not implemented: ${tool}`)
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tool = searchParams.get("tool")
  if (tool) {
    const toolDef = TOOLS.find((t) => t.name === tool)
    if (!toolDef) return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    return NextResponse.json(toolDef)
  }
  return NextResponse.json({ name: "Strikora MCP Server", version: "1.0.0", tools: TOOLS, description: "Sports facility booking platform API" })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tool = body.tool || body.name || body.method
    const params = body.params || body.arguments || body.input || {}
    if (!tool) return NextResponse.json({ error: "Tool name required" }, { status: 400 })

    const result = await runTool(tool, params, request)

    // If login, set cookie
    const res = NextResponse.json({ tool, result, data: result, success: true })
    if (tool === "auth.login" || tool === "auth_login" || tool === "login") {
      if ((result as any)?.token) {
        res.cookies.set("next-auth.session-token", (result as any).token, { httpOnly: true, path: "/", maxAge: 30 * 24 * 60 * 60 })
        res.cookies.set("mcp-token", (result as any).token, { httpOnly: true, path: "/", maxAge: 30 * 24 * 60 * 60 })
      }
    }
    return res
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Execution failed", success: false }, { status: 400 })
  }
}
