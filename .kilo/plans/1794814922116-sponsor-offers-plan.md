# Sponsor & Offers System Plan

## Overview
Add a sponsor system where sponsors can create accounts, create coupons/offers, and the platform distributes them to players via an algorithm based on player activity, reliability, sport preference, and location.

## Roles
- **SPONSOR** - new role added to Role enum
- Sponsors register, admin approves, then they can create offers
- Players see personalized offers on dashboard/search/booking
- Admin manages sponsors and offers

## Database Schema Changes

### New Models

```prisma
model Sponsor {
  id              String   @id @default(cuid())
  name            String
  description     String?
  logoUrl         String?
  website         String?
  contactEmail    String
  contactPhone    String?
  budget          Float    @default(0)      // total budget for offers
  spentBudget     Float    @default(0)      // amount used
  isApproved      Boolean  @default(false)  // admin approval
  isActive        Boolean  @default(true)
  userId          String   @unique          // sponsor user account
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id])
  offers          Offer[]
}

model Offer {
  id              String   @id @default(cuid())
  sponsorId       String
  code            String   @unique           // coupon code (e.g., "NIKE20")
  title           String
  description     String?
  discountType    String   // PERCENTAGE or FIXED
  discountValue   Float                     // 20 for 20% or 500 for ₹500
  minBookingAmount Float   @default(0)      // minimum booking to apply
  maxDiscount     Float?                    // cap on discount amount
  validFrom       DateTime
  validTo         DateTime
  maxUses         Int      @default(100)    // total usage limit
  usedCount       Int      @default(0)
  maxUsesPerUser  Int      @default(1)
  targetAudience  String   @default("ALL")  // ALL, FREQUENT, NEW, HIGH_RELIABILITY, SPECIFIC_SPORT
  targetSport     SportType?               // if SPECIFIC_SPORT
  targetCity      String?                  // if city-specific
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  sponsor         Sponsor  @relation(fields: [sponsorId], references: [id])
  redemptions     OfferRedemption[]
}

model OfferRedemption {
  id          String   @id @default(cuid())
  offerId     String
  userId      String
  bookingId   String?
  discountApplied Float
  redeemedAt  DateTime @default(now())

  offer       Offer    @relation(fields: [offerId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
  booking     Booking? @relation(fields: [bookingId], references: [id])

  @@unique([offerId, userId, bookingId])
}
```

### Schema modifications
- Add `SPONSOR` to Role enum
- Add `sponsor Sponsor?` relation to User
- Add `offerRedemptions OfferRedemption[]` to User
- Add `offerRedemptions OfferRedemption[]` to Booking

## API Endpoints

### Sponsor Management (admin)
- `sponsors.create` - admin creates sponsor account
- `sponsors.list` - admin lists all sponsors
- `sponsors.approve` - admin approves sponsor
- `sponsors.toggleActive` - admin activates/deactivates

### Offer Management (sponsor)
- `offers.create` - sponsor creates offer (pending admin approval)
- `offers.update` - sponsor updates offer
- `offers.delete` - sponsor deletes offer
- `offers.list` - sponsor lists their offers
- `offers.toggleActive` - sponsor activates/deactivates

### Offer Management (admin)
- `offers.adminList` - admin lists all offers
- `offers.approve` - admin approves offer
- `offers.toggleActive` - admin activates/deactivates

### Player-facing
- `offers.getPersonalized` - algorithm returns relevant offers for user
- `offers.redeem` - apply offer to booking
- `offers.myRedemptions` - user's redemption history

## Distribution Algorithm

For a given user, calculate relevance score for each active offer:

```
score = 0
// Sport match
if offer.targetSport === user.mostBookedSport: score += 30
// City match
if offer.targetCity === user.city: score += 20
// New user (fewer than 3 bookings)
if user.bookingCount < 3 AND offer.targetAudience === 'NEW': score += 25
// Frequent booker (more than 10 bookings)
if user.bookingCount > 10 AND offer.targetAudience === 'FREQUENT': score += 25
// High reliability
if user.reliabilityScore > 90 AND offer.targetAudience === 'HIGH_RELIABILITY': score += 15
// ALL audience
if offer.targetAudience === 'ALL': score += 10
// Random factor for variety
score += random(0, 10)

// Filter out:
- Offers past validTo date
- Offers where usedCount >= maxUses
- Offers where user has redeemed maxUsesPerUser times
- Offers where sponsor budget exhausted
- Offers where booking amount < minBookingAmount

// Return top 5 offers sorted by score
```

## UI Changes

### Sidebar
- Add "Offers" link for players (shows personalized offers)
- Add "Sponsor Dashboard" link for sponsors
- Add "Sponsors" link for admin

### Player-facing
- Dashboard: "Your Offers" section showing top 3 personalized offers
- Booking page: "Apply Coupon" field with available offers
- Offers page: browse all available offers

### Sponsor dashboard
- Create/edit offers form
- View offer stats (uses, redemptions, budget spent)
- View redemption history

### Admin
- Approve/reject sponsors
- Approve/reject offers
- View sponsor stats

## Files to Create/Modify

### New files
- `src/app/dashboard/offers/page.tsx` - player offers page
- `src/app/dashboard/sponsor/page.tsx` - sponsor dashboard
- `src/app/(dashboard)/admin/sponsors/page.tsx` - admin sponsor management
- `src/app/(dashboard)/admin/offers/page.tsx` - admin offer management
- `src/components/offers/OfferCard.tsx` - offer display component
- `src/components/offers/CouponInput.tsx` - coupon code input

### Modified files
- `prisma/schema.prisma` - add Sponsor, Offer, OfferRedemption models
- `src/server/api/routers/app.ts` - add sponsor/offer endpoints
- `src/components/layout/Sidebar.tsx` - add nav links

## Implementation Order
1. Schema changes + migration
2. Sponsor CRUD API
3. Offer CRUD API
4. Distribution algorithm
5. Redemption API
6. Player offers UI
7. Sponsor dashboard UI
8. Admin management UI
9. Integration with booking flow

## Open Questions
1. Should sponsors be able to set target audience by sport/city, or just ALL/FREQUENT/NEW?
2. Should offers apply automatically or require manual coupon code entry?
3. Should there be a platform fee for sponsor offers?
4. How should sponsor budget work - prepaid or postpaid?
5. Should offers be shown during booking or only on a separate page?
EOF
echo "Plan written"