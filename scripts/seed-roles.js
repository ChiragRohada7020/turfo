#!/usr/bin/env node
// Comprehensive seed script for all roles
// Run with: node scripts/seed-roles.js

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Role, SportType, SurfaceType, BookingStatus } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding users for all roles...")

  const passwordHash = await bcrypt.hash("Test@123456", 12)

  // 1. Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@erp.rohadas.in" },
    update: {},
    create: {
      email: "admin@erp.rohadas.in",
      name: "Super Admin",
      passwordHash,
      role: Role.ADMIN,
      isPhoneVerified: true,
      phone: "+919999999990",
    },
  })
  console.log("✅ Admin:", admin.email)

  // 2. Create Owner
  const owner = await prisma.user.upsert({
    where: { email: "owner@erp.rohadas.in" },
    update: {},
    create: {
      email: "owner@erp.rohadas.in",
      name: "Facility Owner",
      passwordHash,
      role: Role.OWNER,
      isPhoneVerified: true,
      phone: "+919999999991",
    },
  })
  console.log("✅ Owner:", owner.email)

  // 3. Create Player
  const player = await prisma.user.upsert({
    where: { email: "player@erp.rohadas.in" },
    update: {},
    create: {
      email: "player@erp.rohadas.in",
      name: "Test Player",
      passwordHash,
      role: Role.PLAYER,
      isPhoneVerified: true,
      phone: "+919999999992",
    },
  })
  console.log("✅ Player:", player.email)

  // 4. Create sample facility for owner
  const facility = await prisma.facility.upsert({
    where: { id: "sample-facility-1" },
    update: {},
    create: {
      id: "sample-facility-1",
      name: "Elite Sports Arena",
      description: "Premium sports facility with multiple courts",
      address: "123 Sports Complex Road",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      postalCode: "560001",
      latitude: 12.9716,
      longitude: 77.5946,
      sportTypes: [SportType.FOOTBALL, SportType.CRICKET, SportType.BADMINTON],
      amenities: ["parking", "lights", "changing_room", "wifi", "cafeteria"],
      images: [],
      ownerId: owner.id,
      isActive: true,
    },
  })
  console.log("✅ Facility:", facility.name)

  // 5. Create courts
  const footballCourt = await prisma.court.upsert({
    where: { id: "court-football-1" },
    update: {},
    create: {
      id: "court-football-1",
      name: "Turf A - 7v7 Football",
      facilityId: facility.id,
      sportType: SportType.FOOTBALL,
      surfaceType: SurfaceType.ARTIFICIAL_TURF,
      capacity: 14,
      dimensions: "100x60 ft",
      isActive: true,
    },
  })
  console.log("✅ Court:", footballCourt.name)

  const cricketCourt = await prisma.court.upsert({
    where: { id: "court-cricket-1" },
    update: {},
    create: {
      id: "court-cricket-1",
      name: "Cricket Net 1",
      facilityId: facility.id,
      sportType: SportType.CRICKET,
      surfaceType: SurfaceType.ARTIFICIAL_TURF,
      capacity: 4,
      dimensions: "60x30 ft",
      isActive: true,
    },
  })
  console.log("✅ Court:", cricketCourt.name)

  // 6. Create pricing rules
  await prisma.pricingRule.upsert({
    where: { id: "pricing-football-weekday" },
    update: {},
    create: {
      id: "pricing-football-weekday",
      courtId: footballCourt.id,
      name: "Weekday Morning",
      dayOfWeek: [1, 2, 3, 4, 5],
      startTime: "06:00",
      endTime: "12:00",
      pricePerHour: 800,
      minDuration: 60,
      isActive: true,
    },
  })

  await prisma.pricingRule.upsert({
    where: { id: "pricing-football-peak" },
    update: {},
    create: {
      id: "pricing-football-peak",
      courtId: footballCourt.id,
      name: "Weekend Peak",
      dayOfWeek: [0, 6],
      startTime: "08:00",
      endTime: "22:00",
      pricePerHour: 2000,
      minDuration: 60,
      isActive: true,
    },
  })

  await prisma.pricingRule.upsert({
    where: { id: "pricing-cricket-weekday" },
    update: {},
    create: {
      id: "pricing-cricket-weekday",
      courtId: cricketCourt.id,
      name: "All Day",
      dayOfWeek: [1, 2, 3, 4, 5, 6],
      startTime: "06:00",
      endTime: "22:00",
      pricePerHour: 500,
      minDuration: 60,
      isActive: true,
    },
  })
  console.log("✅ Pricing rules created")

  // 7. Create availability for next 30 days
  const today = new Date()
  const availabilityData = []
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    date.setHours(0, 0, 0, 0)

    availabilityData.push(
      { courtId: footballCourt.id, date, startTime: "06:00", endTime: "22:00", isBlocked: false },
      { courtId: cricketCourt.id, date, startTime: "06:00", endTime: "22:00", isBlocked: false }
    )
  }

  await prisma.availability.createMany({
    data: availabilityData,
    skipDuplicates: true,
  })
  console.log("✅ Availability created for 30 days")

  console.log("\n🎉 Seeding complete!")
  console.log("\n📋 Test Accounts:")
  console.log("┌─────────────┬─────────────────────────────┬──────────────┬─────────┐")
  console.log("│ Role        │ Email                       │ Password     │ Phone   │")
  console.log("├─────────────┼─────────────────────────────┼──────────────┼─────────┤")
  console.log("│ ADMIN       │ admin@erp.rohadas.in        │ Test@123456  │ Verified│")
  console.log("│ OWNER       │ owner@erp.rohadas.in        │ Test@123456  │ Verified│")
  console.log("│ PLAYER      │ player@erp.rohadas.in       │ Test@123456  │ Verified│")
  console.log("└─────────────┴─────────────────────────────┴──────────────┴─────────┘")
  console.log("\n🔗 Login at: https://erp.rohadas.in/auth/login")
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })