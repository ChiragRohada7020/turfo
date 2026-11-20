#!/usr/bin/env node
// Comprehensive seed with multiple owners and their facilities
// Run with: node scripts/seed-multi-owners.js

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Role, SportType, SurfaceType } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding multiple owners and facilities...")

  const passwordHash = await bcrypt.hash("Test@123456", 12)

  // Owners
  const owners = [
    { email: "owner1@strikora.in", name: "Rahul Sharma", phone: "+919876543210" },
    { email: "owner2@strikora.in", name: "Priya Patel", phone: "+919876543211" },
    { email: "owner3@strikora.in", name: "Amit Kumar", phone: "+919876543212" },
  ]

  const ownerUsers = []
  for (const o of owners) {
    const user = await prisma.user.upsert({
      where: { email: o.email },
      update: {},
      create: {
        email: o.email,
        name: o.name,
        passwordHash,
        role: Role.OWNER,
        isPhoneVerified: true,
        phone: o.phone,
      },
    })
    ownerUsers.push(user)
    console.log("✅ Owner:", user.email)
  }

  // Facilities with courts and pricing
  const facilitiesData = [
    {
      owner: ownerUsers[0],
      facility: {
        name: "Elite Sports Arena",
        description: "Premium sports facility with football turf, cricket nets, and badminton courts. Floodlit for night games.",
        address: "123 Sports Complex Road",
        city: "Pachora",
        state: "Maharashtra",
        country: "India",
        postalCode: "560001",
        latitude: 12.9716,
        longitude: 77.5946,
        sportTypes: [SportType.FOOTBALL, SportType.CRICKET, SportType.BADMINTON],
        amenities: ["parking", "lights", "changing_room", "wifi", "cafeteria", "first_aid"],
        images: ["/placeholder.svg"],
      },
      courts: [
        { name: "Turf A - 7v7 Football", sportType: SportType.FOOTBALL, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 14, dimensions: "100x60 ft", pricePerHour: 1200, minDuration: 60 },
        { name: "Cricket Net 1", sportType: SportType.CRICKET, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 4, dimensions: "60x30 ft", pricePerHour: 500, minDuration: 60 },
        { name: "Badminton Court 1", sportType: SportType.BADMINTON, surfaceType: SurfaceType.WOOD, capacity: 4, dimensions: "44x20 ft", pricePerHour: 400, minDuration: 60 },
        { name: "Badminton Court 2", sportType: SportType.BADMINTON, surfaceType: SurfaceType.WOOD, capacity: 4, dimensions: "44x20 ft", pricePerHour: 400, minDuration: 60 },
      ],
    },
    {
      owner: ownerUsers[0],
      facility: {
        name: "GreenField Sports Complex",
        description: "Large multi-sport facility with cricket ground, football turf, and swimming pool.",
        address: "456 Green Park Avenue",
        city: "Pachora",
        state: "Maharashtra",
        country: "India",
        postalCode: "560002",
        latitude: 12.9352,
        longitude: 77.6245,
        sportTypes: [SportType.FOOTBALL, SportType.CRICKET, SportType.SWIMMING],
        amenities: ["parking", "lights", "changing_room", "wifi", "cafeteria", "shower", "locker"],
        images: ["/placeholder.svg"],
      },
      courts: [
        { name: "Main Football Turf", sportType: SportType.FOOTBALL, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 22, dimensions: "120x80 ft", pricePerHour: 2000, minDuration: 60 },
        { name: "Cricket Ground", sportType: SportType.CRICKET, surfaceType: SurfaceType.GRASS, capacity: 22, dimensions: "200x150 ft", pricePerHour: 3000, minDuration: 120 },
        { name: "Swimming Pool", sportType: SportType.SWIMMING, surfaceType: SurfaceType.WATER, capacity: 20, dimensions: "50x25 m", pricePerHour: 800, minDuration: 60 },
      ],
    },
    {
      owner: ownerUsers[1],
      facility: {
        name: "Pachora Turf Arena",
        description: "Modern sports facility with football, cricket, and pickleball courts. Perfect for weekend games.",
        address: "789 Sports Street",
        city: "Pachora",
        state: "Maharashtra",
        country: "India",
        postalCode: "424201",
        latitude: 20.6678,
        longitude: 75.3500,
        sportTypes: [SportType.FOOTBALL, SportType.CRICKET, SportType.PICKLEBALL],
        amenities: ["parking", "lights", "changing_room", "water", "first_aid"],
        images: ["/placeholder.svg"],
      },
      courts: [
        { name: "Football Turf", sportType: SportType.FOOTBALL, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 14, dimensions: "90x60 ft", pricePerHour: 800, minDuration: 60 },
        { name: "Cricket Net", sportType: SportType.CRICKET, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 6, dimensions: "50x30 ft", pricePerHour: 400, minDuration: 60 },
        { name: "Pickleball Court 1", sportType: SportType.PICKLEBALL, surfaceType: SurfaceType.HARD_COURT, capacity: 4, dimensions: "44x20 ft", pricePerHour: 300, minDuration: 30 },
        { name: "Pickleball Court 2", sportType: SportType.PICKLEBALL, surfaceType: SurfaceType.HARD_COURT, capacity: 4, dimensions: "44x20 ft", pricePerHour: 300, minDuration: 30 },
      ],
    },
    {
      owner: ownerUsers[1],
      facility: {
        name: "Sports Hub Pachora",
        description: "Indoor sports complex with badminton, table tennis, and basketball courts.",
        address: "101 Indoor Sports Complex",
        city: "Pachora",
        state: "Maharashtra",
        country: "India",
        postalCode: "424201",
        latitude: 20.6700,
        longitude: 75.3520,
        sportTypes: [SportType.BADMINTON, SportType.TABLE_TENNIS, SportType.BASKETBALL],
        amenities: ["parking", "lights", "changing_room", "wifi", "ac", "water", "first_aid"],
        images: ["/placeholder.svg"],
      },
      courts: [
        { name: "Badminton Court 1", sportType: SportType.BADMINTON, surfaceType: SurfaceType.WOOD, capacity: 4, dimensions: "44x20 ft", pricePerHour: 350, minDuration: 60 },
        { name: "Badminton Court 2", sportType: SportType.BADMINTON, surfaceType: SurfaceType.WOOD, capacity: 4, dimensions: "44x20 ft", pricePerHour: 350, minDuration: 60 },
        { name: "Table Tennis Table 1", sportType: SportType.TABLE_TENNIS, surfaceType: SurfaceType.WOOD, capacity: 4, dimensions: "9x5 ft", pricePerHour: 150, minDuration: 30 },
        { name: "Table Tennis Table 2", sportType: SportType.TABLE_TENNIS, surfaceType: SurfaceType.WOOD, capacity: 4, dimensions: "9x5 ft", pricePerHour: 150, minDuration: 30 },
        { name: "Basketball Court", sportType: SportType.BASKETBALL, surfaceType: SurfaceType.HARD_COURT, capacity: 10, dimensions: "94x50 ft", pricePerHour: 600, minDuration: 60 },
      ],
    },
    {
      owner: ownerUsers[2],
      facility: {
        name: "Champion Turf",
        description: "Premium football and cricket facility with floodlights and cafeteria.",
        address: "202 Champion Sports Road",
        city: "Pachora",
        state: "Maharashtra",
        country: "India",
        postalCode: "400001",
        latitude: 19.0760,
        longitude: 72.8777,
        sportTypes: [SportType.FOOTBALL, SportType.CRICKET],
        amenities: ["parking", "lights", "changing_room", "wifi", "cafeteria", "first_aid", "shower"],
        images: ["/placeholder.svg"],
      },
      courts: [
        { name: "Championship Football Turf", sportType: SportType.FOOTBALL, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 22, dimensions: "120x80 ft", pricePerHour: 2500, minDuration: 60 },
        { name: "Football Turf 2", sportType: SportType.FOOTBALL, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 14, dimensions: "90x60 ft", pricePerHour: 1500, minDuration: 60 },
        { name: "Cricket Practice Net", sportType: SportType.CRICKET, surfaceType: SurfaceType.ARTIFICIAL_TURF, capacity: 4, dimensions: "60x30 ft", pricePerHour: 600, minDuration: 60 },
      ],
    },
  ]

  for (const fd of facilitiesData) {
    let facility = await prisma.facility.findFirst({ where: { name: fd.facility.name } })
    if (!facility) {
      facility = await prisma.facility.create({
        data: {
          ...fd.facility,
          ownerId: fd.owner.id,
        },
      })
    }
    console.log("✅ Facility:", facility.name)

    for (const courtData of fd.courts) {
      const court = await prisma.court.create({
        data: {
          name: courtData.name,
          facilityId: facility.id,
          sportType: courtData.sportType,
          surfaceType: courtData.surfaceType,
          capacity: courtData.capacity,
          dimensions: courtData.dimensions,
          isActive: true,
        },
      })

      // Create pricing rule
      await prisma.pricingRule.create({
        data: {
          courtId: court.id,
          name: "Standard Rate",
          dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
          startTime: "06:00",
          endTime: "22:00",
          pricePerHour: courtData.pricePerHour,
          minDuration: courtData.minDuration,
          isActive: true,
        },
      })

      // Create availability for next 30 days
      const today = new Date()
      const availData = []
      for (let i = 0; i < 30; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        date.setHours(0, 0, 0, 0)
        availData.push({
          courtId: court.id,
          facilityId: facility.id,
          date,
          startTime: "06:00",
          endTime: "22:00",
          isBlocked: false,
        })
      }
      await prisma.availability.createMany({ data: availData, skipDuplicates: true })
    }
    console.log("  ✅ Courts and pricing created for:", facility.name)
  }

  console.log("\n🎉 Multi-owner seeding complete!")
  console.log("\n📋 Owner Accounts:")
  for (const o of owners) {
    console.log(`  ${o.name}: ${o.email} / Test@123456`)
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
