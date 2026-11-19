# MCP Tools & End-to-End Test Plan

## Goal
Define MCP-callable tools covering all player and owner flows, then implement comprehensive E2E tests validating each flow.

## Roles & Auth
- PLAYER, OWNER, SPONSOR, ADMIN
- Auth: session-based (NextAuth). MCP tools need a session token or service account.

## Core MCP Tools to Define

### Auth
- `auth.register` { email, password, name, role }
- `auth.login` { email, password } -> session
- `auth.me` -> user profile

### Player
- `player.searchFacilities` { city?, sport?, minPrice?, maxPrice?, lat?, lng?, radiusKm? }
- `player.getFacility` { id }
- `player.getAvailability` { courtId, date }
- `player.createBooking` { facilityId, courtId, startTime, endTime, isPublic?, maxPlayers? }
- `player.cancelBooking` { bookingId }
- `player.listBookings` { status?, page, limit }
- `player.joinOpenGame` { bookingId }
- `player.leaveOpenGame` { bookingId }
- `player.listOpenGames` { city?, sport? }
- `player.findPlayers` { city?, sport? }
- `player.wallet` (balance, transactions)
- `player.notifications.list` { isRead?, limit }

### Owner
- `owner.createFacility` { name, description, address, city, state, country, postalCode, lat, lng, sportTypes, amenities, images, openTime, closeTime }
- `owner.updateFacility` { id, ...fields }
- `owner.deleteFacility` { id }
- `owner.listFacilities`
- `owner.addCourt` { facilityId, name, sportType, surfaceType, capacity, dimensions, images, pricePerHour }
- `owner.deleteCourt` { id }
- `owner.addPricingRule` { facilityId?, courtId?, name, dayOfWeek, startTime, endTime, pricePerHour, minDuration, maxDuration }
- `owner.deletePricingRule` { id }
- `owner.listBookings` { status?, dateFrom?, dateTo?, page, limit }
- `owner.verifyBooking` { bookingId, code }
- `owner.analytics` -> daily counts, revenue
- `owner.payouts` -> summary

### Admin
- `admin.listUsers` { role?, page }
- `admin.approveOwner` { userId }
- `admin.listFacilities` { page }
- `admin.payouts` { status? }

### Sponsor
- `sponsor.createOffer` { title, description, discount, validFrom, validTo, targetCity? }
- `sponsor.verifyCoupon` { code }

## Validation / E2E Test Plan

### Setup
- Seed DB with owners, players, facilities, courts, pricing rules.
- Use a test database (separate DATABASE_URL).

### Test Scenarios (per role)

#### Player
1. Search facilities by city/sport/price -> returns correct results.
2. Get facility details -> includes courts, pricing, images.
3. Check availability -> slots match open/close and pricing rules; dynamic pricing slot shows correct price.
4. Create booking (30-min and 60-min) -> success, booking appears in list.
5. Create booking on already-booked slot -> conflict error.
6. Cancel booking -> status CANCELLED.
7. Join open game -> pending status shown.
8. Host approve -> player becomes participant.
9. Boundary: book 1-2 then 2-3 -> both succeed.
10. Wallet balance and transactions.

#### Owner
1. Create facility with address/location -> facility created with correct fields.
2. Add court with price -> court and standard pricing rule created.
3. Add dynamic pricing rule (peak hours) -> rule created, shows in list.
4. Delete pricing rule -> removed.
5. Edit facility -> changes persist.
6. Upload images -> images saved.
7. List bookings -> shows player bookings on own facilities.
8. Verify booking with code -> success.
9. Analytics chart data -> correct daily counts.
10. Payouts summary -> correct totals.

#### Admin
1. List users/facilities -> correct.
2. Approve pending owner -> role changes.

#### Sponsor
1. Create offer -> appears in offers list.
2. Verify coupon -> valid/invalid.

### Edge Cases
- Booking outside operating hours -> error.
- Booking with duration < 30 or > 60 -> error.
- Booking on blocked date -> no slots.
- Concurrent booking race -> conflict.
- Facility with no courts -> "No courts" shown, no price.
- Dynamic pricing narrower window overrides standard rate.

### Test Infrastructure
- Use Jest + Supertest for API integration tests.
- Use Playwright for E2E UI tests (install chromium).
- Separate test DB via DATABASE_URL env.
- Seed script for test data.
- CI: run `npm test` and `npm run build`.

## Open Questions
- Should MCP tools be exposed as a separate server or within the app?
- Do we need rate limiting on MCP tools?
- Should tests run against a real DB or in-memory?
