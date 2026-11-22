# AI-Powered Personalized Tasks & Reward Points Engine

## Goal
Extend the existing task/reward implementation into a robust, event-driven, personalized system with deterministic verification and a transactional reward ledger. No second points system.

## Current State
Core models (`Task`, `UserTask`, `RewardTransaction`, `TaskSettings`, `TaskTemplate`, `PlayerPreference`) and libraries (`src/lib/tasks/*`, `src/lib/rewards/taskProgress.ts`) already exist. Main gaps: booking-task verification can be bypassed via progress clicks, owner analytics are approximate, cancellation handling does not update progress, AI calls can hang, and generated tasks are not marked with AI usage.

## Implementation Plan

### 1. Verification hardening (`src/lib/tasks/verification.ts`)
- `evaluateTask`: filter qualifying bookings by `task.startDate` for booking criteria so pre-existing bookings do not count; use `task.startDate` as default `since`.
- `verifyAndCreditTask`: wrap evaluation, upsert, and credit in a serializable `prisma.$transaction`; re-check `rewardTransactionId` inside transaction; update task/user task status atomically.
- `handleBookingCancelled`: recompute progress for every completed task; update `UserTask.progress`; reverse only when no longer completed; avoid swallowing errors silently.
- Add explicit guards for cancelled/refunded/non-COMPLETED bookings (already filtered by `BookingStatus.COMPLETED`).

### 2. Prevent click-based booking rewards (`src/lib/rewards/taskProgress.ts`)
- Skip tasks with type `BOOK_TURFS` in `trackTaskProgress`; booking progress must come from real booking events.
- Allow progress increments only for action-based task types (`JOIN_OPEN_GAMES`, `CREATE_TEAM`, `REFER_FRIEND`, `COMPLETE_PROFILE`, `PLAY_TOURNAMENT`, `PLAY_GAMES`).
- After increment, call `verifyAndCreditTask` instead of directly crediting points.

### 3. Reward ledger (`src/lib/tasks/reward.ts`)
- Keep `creditPoints`/`reversePoints` as single source of truth.
- Add optional `ownerId` to `getRewardLiability` for owner-scoped liability; default remains global.
- Ensure reversals create a linked reversal transaction and mark original as `REVERSED`.

### 4. Personalized generation (`src/lib/tasks/generator.ts`)
- Mark `isAiGenerated` based on whether AI specs were actually used.
- Add request timeout to Kilo API call with `AbortController`; fall back to deterministic specs on failure/timeout.
- Clamp rewards to `maxRewardPointsPerTask` and monthly budget.
- Reduce repetitive fallback output by only adding engagement task when no equivalent active task exists.

### 5. Event-driven refresh (`src/lib/tasks/refresh.ts`)
- `refreshTasksForPlayer(..., "booking_cancelled")` must call `handleBookingCancelled`.
- `onBookingCancelled` should also trigger task refresh/generation for comeback challenges when player becomes inactive.
- Keep generation gated by active-task limit and duplicate title/type keys.

### 6. Owner dashboard and controls (`src/server/api/routers/tasks.router.ts`, `src/app/dashboard/tasks/page.tsx`)
- Improve `ownerAnalytics`: points distributed from `RewardTransaction`, owner-scoped reward liability, completion rate, category effectiveness, bookings/repeat bookings attributed heuristic.
- Add task template endpoints: list, approve/reject, and view individual task performance.
- Expose pause/resume AI generation through existing settings (`aiEnabled`).

### 7. AI architecture
- Use cached recommendations via `PlayerPreference.taskRecommendation`; do not generate on dashboard open.
- Background/admin generation endpoints already exist; keep them as the generation trigger.
- Ensure all AI failures fall back to deterministic specs.

### 8. Testing
- Add tests for: task generation per player situation, duplicate prevention, expiry, booking verification, points crediting, cancellation reversal, reward ledger, concurrent completion, AI failure fallback.
- Add concurrency test invoking `verifyAndCreditTask` twice and asserting one transaction.

## Risks
- Serializable transactions may reduce throughput; acceptable for reward correctness.
- Booking attribution is heuristic without a `taskId` on `Booking`; future schema addition can improve accuracy.
- Owner-specific settings require player-to-owner mapping; global settings remain fallback.

## Validation
- `npm run typecheck`
- `npm test`
- Manual flow: complete booking -> task verifies -> points credited once; cancel booking -> reversal recorded.
