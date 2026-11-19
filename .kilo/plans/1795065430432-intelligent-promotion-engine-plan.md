# Intelligent Promotion & Rewards Engine Plan

## Goal
Build a rules-based (ML-ready) promotion system that increases paid bookings, fills low-demand slots, rewards players, and supports sponsor offers, while respecting owner controls and budgets.

## Scope (Phase 1)
- Demand forecasting from historical bookings.
- Player segmentation and preference signals.
- Automatic coupon/campaign generation and distribution.
- Owner promotional controls.
- Admin promotion dashboard.
- Sponsor campaign tracking.
- Reward task progress automation.
- Analytics and holdout-based measurement.

## Existing Assets to Reuse
- `Booking`, `Facility`, `Court`, `PricingRule`, `User`, `Offer`, `Sponsor`, `OfferRedemotion`, `Task`, `UserTask`, `RewardTransaction`, `Notification`.
- tRPC routers: `facilities`, `bookings`, `offers`, `sponsors`, `admin`, `notifications`.
- Upload routes for images.

## New Data Models
- `DemandForecast(facilityId, courtId?, date, hour, predictedOccupancy, historicalOccupancy, demandLevel)`
- `PlayerPreference(userId, preferredSport, preferredTimes[], preferredDays[], lastBookingAt, bookingCount30d, avgBookingValue, couponResponseScore)`
- `OwnerPromoSettings(ownerId/facilityId, enabled, maxDiscountPct, maxFlatDiscount, minBookingPrice, allowedDays[], allowedHours, monthlyBudget, spentBudget, autoApprove)`
- `PromotionCampaign(id, facilityId?, courtId?, name, type, fundingSource, discountType, discountValue, maxDiscount, minBookingAmount, applicableHours[], applicableDays[], startAt, endAt, budget, spent, status, createdBy)`
- `CampaignRecipient(campaignId, userId, couponCode, issuedAt, redeemedAt?, bookingId?)`
- `PromotionAudit(campaignId, action, metadata, createdAt)`
- `RewardPerk(id, name, description, costPoints, perkType, targetScope, isActive, maxRedemptionsPerUser?)`
- `RewardRedemption(id, userId, perkId, pointsSpent, status, metadata, createdAt)`

## Funding Rules
- Sponsor coupons are funded by sponsors and must not consume TurfPlay or owner budgets.
- TurfPlay/owner-funded coupons use separate campaign budgets and owner limits.
- Reward points are platform-issued (tasks/admin) and spent on perks, not cash discounts.

## Reward Points Economy
- Earn: task completion, admin grants, qualifying bookings, referrals.
- Spend: rename team, boost team listing, profile badges, priority placement, etc.
- Every spend creates a `RewardRedemption` and decrements `User.rewardPoints` transactionally.
- Perk effects must be reversible/expirable where appropriate (e.g., 7-day boost).

## Ordered Implementation Tasks
1. Add schema models + migrations and Prisma client regeneration.
2. Add owner promo settings CRUD (tRPC + UI) with validation that AI never exceeds limits.
3. Implement demand forecast job:
   - Aggregate last 8-12 weeks bookings by facility/court/day/hour.
   - Compute occupancy rates and demand levels (low/medium/high).
   - Store daily forecasts for next 7 days.
4. Implement player preference refresh job:
   - Derive preferred sport/time/day, frequency, inactivity, average value, coupon responsiveness.
5. Implement coupon eligibility engine:
   - Select low-demand slots.
   - Match eligible players by preference and inactivity.
   - Enforce owner settings, budget, min price, and no discounts on high-demand slots.
   - Generate coupon via existing `Offer` with funding source and campaign linkage.
6. Implement distribution:
   - In-app offers list already exists; add campaign-specific offers.
   - Create notifications with frequency caps and quiet hours.
   - Optional WhatsApp only with explicit opt-in.
7. Implement reward task progress automation:
   - Update `UserTask.progress` on booking completion, team creation, referrals.
   - Award points once with transaction records.
8. Implement reward perk store:
   - Admin CRUD for perks.
   - Player spend points to redeem perks.
   - Apply perk effects (team rename, boost, badge).
9. Sponsor automation:
   - Add sponsor campaign metrics (impressions, clicks, redemptions, conversion).
   - Match sponsor offers to player segments.
   - Keep sponsor funding separate from TurfPlay funding.
10. Admin dashboard:
    - Campaign list, pause/resume, manual coupons, limits, fraud monitoring.
    - Reward point grants and perk management.
11. Analytics:
    - Occupancy, redemption, conversion, incremental value with holdout comparison.
    - Dashboard widgets for owners and admins.
12. Job scheduling:
    - Use cron/worker or Next.js scheduled route + Redis lock.
    - Nightly forecast refresh, hourly campaign evaluation.
13. Validation:
    - Unit tests for eligibility and budget enforcement.
    - Integration tests for coupon redemption and reward awarding.
    - Load test forecast job.

## Failure Modes
- No historical data: fall back to facility open/close hours and conservative rules.
- Budget exhausted: stop issuing coupons for that campaign/owner.
- Slot becomes booked: deactivate or stop distributing campaign.
- Duplicate rewards: enforce unique constraints and transactional updates.
- Coupon stacking: enforce server-side single-coupon rule unless configured.
- Insufficient points: reject perk redemption atomically.

## Validation Plan
- Typecheck and build.
- Seed test data and run forecast/campaign jobs manually.
- Verify low-demand slots receive coupons and high-demand slots do not.
- Verify owner limits are never exceeded.
- Verify reward points awarded once per qualifying event.
- Verify point spend cannot exceed balance.

## Open Questions
- Should promotion jobs run in-process, via cron, or a separate worker service?
- What consent tracking exists for WhatsApp/push notifications?
- Should holdout groups be per facility or platform-wide?
- Which perks are available at launch and what are their point costs?

## Access Control Update
- Offer creation and management are restricted to `SPONSOR` and `ADMIN` roles only.
- `OWNER` and `PLAYER` must not create, edit, or manage offers.
- Remove "Offers & Rewards" offer-creation entry from owner navigation; sponsors retain it.
- Sponsors fund their own coupons; TurfPlay/owner-funded promotions remain separate.

## AI Decision Integration (Kilo)
- Store `KILO_API_KEY` server-side only; never expose to client.
- AI agent reads aggregated demand/player/owner data via MCP tools and proposes campaigns.
- AI output must conform to a strict JSON schema: campaign type, target segment, discount limits, validity, budget.
- Server validates all AI proposals against owner settings, budgets, and safety rules before creation.
- AI never directly issues coupons; it only proposes; backend executes.
- Log AI decisions and outcomes for audit and model improvement.
- Fallback to rules-based engine if AI is unavailable or proposal invalid.

## AI Learning & Player Emotion Signals
- AI should learn from whole-system context: bookings, cancellations, no-shows, offer redemptions, task completion, notifications, sponsor clicks, team activity, and owner settings.
- Player emotional/engagement signals (derived, not raw sentiment):
  - Inactivity streak and comeback patterns.
  - Booking hesitation/abandonment where tracked.
  - Coupon responsiveness and fatigue.
  - Reliability/cancellation behavior.
  - Social/team participation.
- Use these signals to decide offer type, timing, tone, and frequency.
- Protect privacy: aggregate/minimize data, honor opt-outs, no sensitive inference claims.
- Continuous learning loop: store decisions, outcomes, and rewards; retrain/adjust rules periodically.

## Admin AI Controls
- Admin can enable/disable AI offer distribution globally and per facility.
- Admin can set global safety limits: max discount, budget caps, allowed hours, frequency caps.
- Admin can pause/resume campaigns and review AI proposals before execution.
- All AI actions must be auditable and reversible where possible.

## AI Offer Description & Gradual Distribution
- AI should generate clear, human-readable offer/reward descriptions and targeting rationale.
- Distribution must be gradual and throttled (batches, time windows, per-user caps).
- Do not broadcast all offers at once; prioritize highest-value recipients and slots.
- Track fatigue and stop sending when engagement drops.

## Task Strategy
- Phase 1: shared baseline tasks for all players to build habit (refer friend, complete first booking, join open game, complete profile).
- Phase 2: AI personalizes tasks based on player behavior and preferences.
- Tasks must have transparent requirements, progress tracking, expiry, and anti-duplicate reward protection.
