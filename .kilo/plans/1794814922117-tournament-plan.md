# Tournament System Plan

## Overview
Owners can host tournaments. Teams register and compete. Owners can set up prize pools and distribute coupons/rewards to winners.

## Database Schema

### New Models

```prisma
model Tournament {
  id              String   @id @default(cuid())
  name            String
  description     String?
  sportType       SportType
  facilityId      String
  ownerId         String
  format          String   @default("KNOCKOUT") // KNOCKOUT, LEAGUE, GROUP_STAGE
  startDate       DateTime
  endDate         DateTime
  entryFee        Float    @default(0)
  prizePool       Float    @default(0)
  maxTeams        Int      @default(8)
  minPlayersPerTeam Int    @default(5)
  maxPlayersPerTeam Int    @default(15)
  status          String   @default("DRAFT") // DRAFT, REGISTRATION_OPEN, IN_PROGRESS, COMPLETED, CANCELLED
  rules           String?  // Tournament rules text
  imageUrl        String?
  isPublic        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  facility        Facility @relation(fields: [facilityId], references: [id])
  owner           User     @relation("TournamentHost", fields: [ownerId], references: [id])
  teams           TournamentTeam[]
  matches         TournamentMatch[]
  rewards         TournamentReward[]
}

model TournamentTeam {
  id            String   @id @default(cuid())
  tournamentId  String
  teamId        String?  // Link to existing Team, or null for ad-hoc
  name          String
  captainId     String
  logoUrl       String?
  status        String   @default("REGISTERED") // REGISTERED, CONFIRMED, ELIMINATED, WINNER
  seed          Int?     // Seeding order
  registeredAt  DateTime @default(now())

  tournament    Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  team          Team?      @relation(fields: [teamId], references: [id])
  captain       User       @relation("TournamentCaptain", fields: [captainId], references: [id])
  players       TournamentPlayer[]
  homeMatches   TournamentMatch[] @relation("HomeTeam")
  awayMatches   TournamentMatch[] @relation("AwayTeam")
  wonMatches    TournamentMatch[] @relation("Winner")

  @@unique([tournamentId, name])
}

model TournamentPlayer {
  id                String   @id @default(cuid())
  tournamentTeamId  String
  userId            String
  role              String   @default("PLAYER") // PLAYER, CAPTAIN, SUBSTITUTE
  joinedAt          DateTime @default(now())

  team              TournamentTeam @relation(fields: [tournamentTeamId], references: [id], onDelete: Cascade)
  user              User           @relation(fields: [userId], references: [id])

  @@unique([tournamentTeamId, userId])
}

model TournamentMatch {
  id            String   @id @default(cuid())
  tournamentId  String
  round         Int      // 1 = first round, 2 = quarterfinals, etc.
  matchNumber   Int
  homeTeamId    String?
  awayTeamId    String?
  homeScore     Int?
  awayScore     Int?
  winnerId      String?
  status        String   @default("SCHEDULED") // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  scheduledAt   DateTime?
  courtId       String?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tournament    Tournament      @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  homeTeam      TournamentTeam? @relation("HomeTeam", fields: [homeTeamId], references: [id])
  awayTeam      TournamentTeam? @relation("AwayTeam", fields: [awayTeamId], references: [id])
  winner        TournamentTeam? @relation("Winner", fields: [winnerId], references: [id])
  court         Court?          @relation(fields: [courtId], references: [id])
}

model TournamentReward {
  id            String   @id @default(cuid())
  tournamentId  String
  position      Int      // 1 = winner, 2 = runner-up, etc.
  rewardType    String   // COUPON, CASH, TROPHY, CERTIFICATE
  title         String
  description   String?
  value         Float?   // cash amount or discount value
  couponCode    String?  // if reward is a coupon
  offerId       String?  // link to Offer if coupon reward
  createdAt     DateTime @default(now())

  tournament    Tournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  offer         Offer?     @relation(fields: [offerId], references: [id])
}
```

### Schema modifications
- Add Tournament, TournamentTeam, TournamentPlayer, TournamentMatch, TournamentReward models
- Add `tournaments Tournament[]` and `tournamentCaptain TournamentTeam[]` to User
- Add `tournaments Tournament[]` and `tournamentMatches TournamentMatch[]` to Facility
- Add `tournamentMatches TournamentMatch[]` to Court
- Add `tournamentRewards TournamentReward[]` to Offer (optional)

## API Endpoints

### Tournament Management (owner)
- `tournaments.create` - create tournament
- `tournaments.update` - update tournament details
- `tournaments.delete` - delete (only DRAFT)
- `tournaments.publish` - open registration
- `tournaments.start` - start tournament (generate brackets)
- `tournaments.cancel` - cancel tournament

### Tournament Registration (team captain)
- `tournaments.registerTeam` - register a team
- `tournaments.withdrawTeam` - withdraw registration
- `tournaments.addPlayer` - add player to team roster
- `tournaments.removePlayer` - remove player from roster

### Match Management (owner)
- `tournaments.createMatch` - schedule a match
- `tournaments.updateScore` - update match score
- `tournaments.completeMatch` - mark match complete, advance winner

### Rewards (owner)
- `tournaments.addReward` - add reward for a position
- `tournaments.distributeRewards` - distribute rewards to winners

### Player-facing
- `tournaments.list` - list public tournaments
- `tournaments.get` - get tournament details
- `tournaments.myTournaments` - tournaments user is participating in
- `tournaments.bracket` - get tournament bracket

## Bracket Generation Algorithm
- KNOCKOUT: Single elimination, standard seeding
- LEAGUE: Round-robin, all teams play each other
- GROUP_STAGE: Groups + knockout rounds

## UI Pages
- `/tournaments` - Browse tournaments
- `/tournaments/[id]` - Tournament details + bracket
- `/dashboard/tournaments` - Owner tournament management
- `/dashboard/tournaments/new` - Create tournament
- `/dashboard/tournaments/[id]/manage` - Manage tournament

## Implementation Order
1. Schema changes
2. Tournament CRUD API
3. Team registration API
4. Match scheduling + bracket generation
5. Score updates + winner advancement
6. Rewards distribution
7. UI pages
8. Integration with offers/coupons
EOF
echo "Plan written"