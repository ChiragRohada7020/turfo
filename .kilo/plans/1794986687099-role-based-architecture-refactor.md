# Role-Based Architecture Refactor Plan

## Goal
Refactor the codebase to implement strict separation of concerns by user role (Admin, Player, Owner, Sponsor). Centralize role-specific logic into dedicated modules, following a consistent architectural pattern to improve maintainability and scalability.

## Current State (Observed)

- Roles are defined in `prisma/schema.prisma` `Role` enum: `PLAYER`, `OWNER`, `SPONSOR`, `ADMIN`.
- Role-based navigation is **duplicated** in two places:
  - `src/components/layout/Sidebar.tsx` (PLAYER_NAV, OWNER_NAV, SPONSOR_NAV)
  - `src/app/(dashboard)/dashboard/page.tsx` (PLAYER_NAV, OWNER_NAV inline)
- Role-gated routes live in `src/middleware.ts` (owner-only: `/dashboard/facilities`, `/dashboard/payouts`; admin-only: `/admin`).
- All tRPC routers are in one monolithic file: `src/server/api/routers/app.ts` (~3000 lines), including `admin.*`, `sponsors.*`, `owners` (implicit via facilities/payouts), and player features.
- Pages are scattered: `src/app/(dashboard)/admin`, `src/app/dashboard/sponsor`, `src/app/dashboard/offers`, `src/app/(dashboard)/dashboard/*`, `src/app/dashboard/*`.
- `Role` checks are inlined in components (e.g., `session?.user?.role === "ADMIN"` in admin page).
- Shared components (Sidebar, Header) live in `src/components/layout/`.

## Proposed Target Structure

```
src/
  app/                          # Next.js App Router (thin route shells only)
    (auth)/                     # auth pages (login, register, etc.)
    (public)/                   # public pages (search, facility, tournaments, offers)
    (dashboard)/                # authenticated layout shell
      dashboard/page.tsx        # role-aware redirect/landing
      admin/page.tsx            # thin wrapper -> modules/admin
      sponsor/page.tsx          # thin wrapper -> modules/sponsor
      owner/...                 # owner-specific routes (facilities, payouts, analytics)
      player/...                # player-specific routes (bookings, teams, open-games)
    api/                        # API routes (unchanged location, thin wrappers)
  modules/                      # Role-based feature modules (NEW)
    admin/
      components/               # AdminDashboard, UserTable, PendingOwners, ...
      hooks/                    # useAdminAnalytics, useVerifyOwner, ...
      services/                 # admin.service.ts (tRPC client wrappers)
      types/                    # admin.types.ts
      index.ts                  # barrel export
    owner/
      components/               # FacilityManager, PayoutsPanel, AnalyticsCharts, ...
      hooks/
      services/
      types/
      index.ts
    player/
      components/               # BookingList, TeamCard, OpenGamesList, ...
      hooks/
      services/
      types/
      index.ts
    sponsor/
      components/               # OfferForm, SponsorDashboard, ...
      hooks/
      services/
      types/
      index.ts
    shared/                     # Cross-role shared code
      components/               # Sidebar, Header, Brand, StatCard, ...
      hooks/                    # useSession, useRole, ...
      services/                 # common trpc helpers
      types/                    # common types
      constants/                # role-nav config, routes
      index.ts
  server/
    api/
      routers/
        index.ts                # composes all routers
        admin.router.ts
        owner.router.ts
        player.router.ts        # bookings, teams, open-games
        sponsor.router.ts
        shared.router.ts        # facilities (public), reviews, notifications, uploads
    trpc/
      init.ts                   # (existing)
  lib/                          # framework-level (prisma, auth, utils, trpc client)
  components/ui/                # shadcn primitives (unchanged)
```

## Key Design Decisions

1. **Route shells stay thin**: `app/` pages only handle routing/layout and delegate rendering to `modules/<role>/components`. No business logic in page files.

2. **Role nav centralized**: Move PLAYER_NAV/OWNER_NAV/SPONSOR_NAV (and admin nav) into `modules/shared/constants/navigation.ts`, keyed by role. Sidebar reads from this single source. Remove duplicates from `dashboard/page.tsx`.

3. **tRPC routers split by role**: Break `app.ts` into `admin.router.ts`, `owner.router.ts`, `player.router.ts`, `sponsor.router.ts`, `shared.router.ts`. Compose in `server/api/routers/index.ts`. Preserves existing procedure names (admin.users, sponsors.getByUser, etc.) to avoid client breakage, or migrate with a deprecation shim.

4. **Role guards centralized**: Create `modules/shared/hooks/useRole.ts` and `modules/shared/components/RoleGuard.tsx`. Middleware continues to enforce server-side; client uses RoleGuard for UX.

5. **Shared components**: Move Sidebar, Header, Brand into `modules/shared/components/layout/`. Single source of truth.

6. **Feature co-location**: Each role module owns its components/hooks/services/types. Cross-role reuse goes through `modules/shared`.

## Migration Phases

### Phase 1 — Centralize shared layout & nav (low risk)
- Move `Sidebar`, `Header`, `Brand` to `modules/shared/components/layout/`.
- Extract role nav configs to `modules/shared/constants/navigation.ts`.
- Update all pages to import from shared. Remove inline PLAYER_NAV/OWNER_NAV from dashboard/page.tsx.
- Add missing "Open Games" (already present) and verify "Teams" -> /dashboard/teams (done).

### Phase 2 — Create module scaffolding (no behavior change)
- Create `src/modules/{admin,owner,player,sponsor,shared}/` with `components/hooks/services/types/index.ts`.
- Add barrel exports.

### Phase 3 — Move role-specific code into modules
- Admin: move admin dashboard + admin.* tRPC usage into modules/admin.
- Owner: facilities, payouts, analytics, verify into modules/owner.
- Sponsor: sponsor dashboard + offers into modules/sponsor.
- Player: bookings, teams, open-games, tournaments, wallet into modules/player.
- Pages become thin wrappers importing module components.

### Phase 4 — Split tRPC routers
- Split `app.ts` into per-role router files.
- Compose in `server/api/routers/index.ts`.
- Keep procedure paths stable (admin.*, sponsors.*, etc.) to avoid client changes; alternatively migrate clients and remove shims.

### Phase 5 — Role guards & cleanup
- Add `RoleGuard` component and `useRole` hook.
- Remove duplicated nav/constants.
- Update middleware matcher if routes move (keep URLs stable to avoid breaking links).

## Risks & Mitigations
- **Large blast radius**: Phase incrementally; keep URLs and tRPC procedure names stable to minimize breakage.
- **Import path churn**: Use barrel exports (`modules/<role>/index.ts`) and path aliases (`@/modules/...`).
- **Regression risk**: Run `npm run typecheck` and `npm run lint` after each phase; smoke-test routes.
- **No tests currently**: Recommend adding route-level smoke tests before large moves.

## Out of Scope
- Database schema changes (roles already defined).
- Authentication provider changes.
- UI/visual redesign (only structural).

## Open Questions
1. Should routes be reorganized into role-based route groups (`(admin)`, `(owner)`, etc.) or keep current URLs? Recommendation: keep URLs stable, organize code via modules.
2. Should tRPC procedure names change (e.g., `admin.users` -> `admin.users.list`)? Recommendation: keep stable in Phase 4, refactor names later.
3. Do you want a single shared layout per role (e.g., admin layout with admin sidebar) or one global layout? Recommendation: per-role layout components in modules, composed by route shells.

## Validation
- `npm run typecheck` passes.
- `npm run lint` passes.
- All routes (/, /search, /dashboard, /dashboard/teams, /dashboard/open-games, /dashboard/facilities, /dashboard/payouts, /admin, /dashboard/sponsor, /dashboard/offers, /wallet, /tournaments) return 200 for appropriate roles.
- Sidebar shows role-appropriate nav and "Open Games" present for players.

## Deliverable
This plan is implementation-ready. Switch to an implementation-capable agent to execute phases 1-5.
