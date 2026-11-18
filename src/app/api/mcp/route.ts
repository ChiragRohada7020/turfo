import { NextRequest, NextResponse } from "next/server"

// MCP Tool definitions
const TOOLS = [
  // Facilities
  { name: "list_facilities", description: "List all sports facilities", params: { city: "string", sportType: "string", page: "number", limit: "number" } },
  { name: "get_facility", description: "Get facility details by ID", params: { id: "string" } },
  { name: "create_facility", description: "Create a new facility", params: { name: "string", sportTypes: "array", description: "string", images: "array" } },
  { name: "update_facility", description: "Update a facility", params: { id: "string", name: "string", description: "string", isActive: "boolean" } },
  { name: "delete_facility", description: "Delete a facility", params: { id: "string" } },
  // Courts
  { name: "create_court", description: "Add a court to a facility", params: { facilityId: "string", name: "string", sportType: "string", capacity: "number", pricePerHour: "number" } },
  { name: "list_courts", description: "List courts for a facility", params: { facilityId: "string" } },
  // Bookings
  { name: "create_booking", description: "Create a booking", params: { facilityId: "string", courtId: "string", startTime: "string", endTime: "string", notes: "string" } },
  { name: "cancel_booking", description: "Cancel a booking", params: { id: "string", reason: "string" } },
  { name: "get_booking", description: "Get booking details", params: { id: "string" } },
  { name: "list_bookings", description: "List user bookings", params: { status: "string", page: "number", limit: "number" } },
  { name: "check_availability", description: "Check court availability", params: { courtId: "string", date: "string" } },
  // Open Games
  { name: "list_open_games", description: "List open games available to join", params: { page: "number", limit: "number" } },
  { name: "join_game", description: "Request to join an open game", params: { bookingId: "string", message: "string" } },
  { name: "leave_game", description: "Leave an open game", params: { bookingId: "string" } },
  // Offers
  { name: "get_offers", description: "Get personalized offers for a user", params: { bookingAmount: "number", sport: "string", city: "string" } },
  { name: "redeem_offer", description: "Redeem an offer", params: { offerId: "string", bookingId: "string" } },
  // Tournaments
  { name: "list_tournaments", description: "List tournaments", params: { sportType: "string", page: "number", limit: "number" } },
  { name: "get_tournament", description: "Get tournament details", params: { tournamentId: "string" } },
  { name: "create_tournament", description: "Create a tournament", params: { name: "string", sportType: "string", facilityId: "string", startDate: "string", endDate: "string", maxTeams: "number", entryFee: "number" } },
  { name: "register_team", description: "Register a team for a tournament", params: { tournamentId: "string", teamName: "string" } },
  // Users
  { name: "get_profile", description: "Get user profile", params: {} },
  { name: "update_profile", description: "Update user profile", params: { name: "string", phone: "string", address: "string", city: "string" } },
  // Verification
  { name: "verify_booking", description: "Verify a booking QR code", params: { verificationCode: "string" } },
  { name: "verify_coupon", description: "Verify a coupon code", params: { verificationCode: "string" } },
  // Notifications
  { name: "list_notifications", description: "List user notifications", params: { page: "number", limit: "number" } },
  { name: "mark_notification_read", description: "Mark notification as read", params: { notificationId: "string" } },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tool = searchParams.get("tool")

  if (tool) {
    // Return specific tool info
    const toolDef = TOOLS.find((t) => t.name === tool)
    if (!toolDef) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    }
    return NextResponse.json(toolDef)
  }

  // Return all tools
  return NextResponse.json({
    name: "TurfPlay MCP Server",
    version: "1.0.0",
    tools: TOOLS,
    description: "Sports facility booking platform API",
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tool, params } = body

    if (!tool) {
      return NextResponse.json({ error: "Tool name required" }, { status: 400 })
    }

    const toolDef = TOOLS.find((t) => t.name === tool)
    if (!toolDef) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    }

    // Execute tool by calling internal API
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const cookies = request.headers.get("cookie") || ""

    // Map tool names to API endpoints
    const endpointMap: Record<string, { method: string; path: string }> = {
      list_facilities: { method: "GET", path: "/api/trpc/facilities.list" },
      get_facility: { method: "GET", path: `/api/trpc/facilities.get?input=${encodeURIComponent(JSON.stringify({ json: { id: params?.id } }))}` },
      check_availability: { method: "GET", path: `/api/trpc/courts.availability?input=${encodeURIComponent(JSON.stringify({ json: { courtId: params?.courtId, date: params?.date } }))}` },
      list_open_games: { method: "GET", path: "/api/trpc/bookings.publicBookings" },
      list_tournaments: { method: "GET", path: "/api/trpc/tournaments.list" },
      get_tournament: { method: "GET", path: `/api/trpc/tournaments.get?input=${encodeURIComponent(JSON.stringify({ json: { tournamentId: params?.tournamentId } }))}` },
      get_profile: { method: "GET", path: "/api/trpc/auth.getProfile" },
      list_notifications: { method: "GET", path: "/api/trpc/notifications.list" },
    }

    const endpoint = endpointMap[tool]
    if (!endpoint) {
      return NextResponse.json({ error: "Tool execution not yet implemented", tool }, { status: 501 })
    }

    const response = await fetch(`${baseUrl}${endpoint.path}`, {
      method: endpoint.method,
      headers: { Cookie: cookies },
    })

    const data = await response.json()
    return NextResponse.json({ tool, result: data })
  } catch (error) {
    return NextResponse.json({ error: "Execution failed" }, { status: 500 })
  }
}