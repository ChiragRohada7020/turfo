import { PrismaClient, Role, SportType, SurfaceType, BookingStatus, PaymentStatus, PayoutStatus, TeamRole, NotificationType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.upsert({
    where: { email: "admin@turfbooking.com" },
    update: {},
    create: {
      email: "admin@turfbooking.com",
      name: "Admin User",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isPhoneVerified: true,
    },
  })
  console.log("✅ Admin user created:", admin.email)

  // Create test owner
  const ownerPassword = await bcrypt.hash("owner123", 12)
  const owner = await prisma.user.upsert({
    where: { email: "owner@turfbooking.com" },
    update: {},
    create: {
      email: "owner@turfbooking.com",
      name: "Facility Owner",
      passwordHash: ownerPassword,
      role: Role.OWNER,
      phone: "+919876543210",
      isPhoneVerified: true,
    },
  })
  console.log("✅ Owner user created:", owner.email)

  // Create test player
  const playerPassword = await bcrypt.hash("player123", 12)
  const player = await prisma.user.upsert({
    where: { email: "player@turfbooking.com" },
    update: {},
    create: {
      email: "player@turfbooking.com",
      name: "Test Player",
      passwordHash: playerPassword,
      role: Role.PLAYER,
      phone: "+919876543211",
      isPhoneVerified: true,
    },
  })
  console.log("✅ Player user created:", player.email)

  // Create sample facility
  const facility = await prisma.facility.create({
    data: {
      name: "Green Field Sports Complex",
      description: "Premier sports facility with multiple turfs and courts",
      address: "123 Sports Street",
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
  console.log("✅ Facility created:", facility.name)

  // Create courts
  const footballCourt = await prisma.court.create({
    data: {
      name: "Turf A - 7v7 Football",
      facilityId: facility.id,
      sportType: SportType.FOOTBALL,
      surfaceType: SurfaceType.ARTIFICIAL_TURF,
      capacity: 14,
      dimensions: "100x60 ft",
      isActive: true,
    },
  })
  console.log("✅ Court created:", footballCourt.name)

  const cricketNet = await prisma.court.create({
    data: {
      name: "Cricket Net 1",
      facilityId: facility.id,
      sportType: SportType.CRICKET,
      surfaceType: SurfaceType.ARTIFICIAL_TURF,
      capacity: 4,
      dimensions: "60x30 ft",
      isActive: true,
    },
  })
  console.log("✅ Court created:", cricketNet.name)

  const badmintonCourt = await prisma.court.create({
    data: {
      name: "Badminton Court 1",
      facilityId: facility.id,
      sportType: SportType.BADMINTON,
      surfaceType: SurfaceType.WOOD,
      capacity: 4,
      dimensions: "44x20 ft",
      isActive: true,
    },
  })
  console.log("✅ Court created:", badmintonCourt.name)

  // Create pricing rules
  await prisma.pricingRule.createMany({
    data: [
      {
        facilityId: facility.id,
        courtId: footballCourt.id,
        name: "Weekday Morning",
        dayOfWeek: [1, 2, 3, 4, 5],
        startTime: "06:00",
        endTime: "12:00",
        pricePerHour: 800,
        minDuration: 60,
        isActive: true,
      },
      {
        facilityId: facility.id,
        courtId: footballCourt.id,
        name: "Weekday Evening",
        dayOfWeek: [1, 2, 3, 4, 5],
        startTime: "17:00",
        endTime: "22:00",
        pricePerHour: 1500,
        minDuration: 60,
        isActive: true,
      },
      {
        facilityId: facility.id,
        courtId: footballCourt.id,
        name: "Weekend Peak",
        dayOfWeek: [0, 6],
        startTime: "08:00",
        endTime: "22:00",
        pricePerHour: 2000,
        minDuration: 60,
        isActive: true,
      },
      {
        facilityId: facility.id,
        courtId: cricketNet.id,
        name: "Weekday All Day",
        dayOfWeek: [1, 2, 3, 4, 5],
        startTime: "06:00",
        endTime: "22:00",
        pricePerHour: 500,
        minDuration: 60,
        isActive: true,
      },
      {
        facilityId: facility.id,
        courtId: cricketNet.id,
        name: "Weekend",
        dayOfWeek: [0, 6],
        startTime: "08:00",
        endTime: "22:00",
        pricePerHour: 700,
        minDuration: 60,
        isActive: true,
      },
      {
        facilityId: facility.id,
        courtId: badmintonCourt.id,
        name: "Weekday Morning",
        dayOfWeek: [1, 2, 3, 4, 5],
        startTime: "06:00",
        endTime: "12:00",
        pricePerHour: 300,
        minDuration: 60,
        isActive: true,
      },
      {
        facilityId: facility.id,
        courtId: badmintonCourt.id,
        name: "Weekday Evening",
        dayOfWeek: [1, 2, 3, 4, 5],
        startTime: "17:00",
        endTime: "22:00",
        pricePerHour: 500,
        minDuration: 60,
        isActive: true,
      },
      {
        facilityId: facility.id,
        courtId: badmintonCourt.id,
        name: "Weekend",
        dayOfWeek: [0, 6],
        startTime: "08:00",
        endTime: "22:00",
        pricePerHour: 600,
        minDuration: 60,
        isActive: true,
      },
    ],
  })
  console.log("✅ Pricing rules created")

  // Create availability for next 30 days
  const availabilityData = []
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    date.setHours(0, 0, 0, 0)

    // Football court availability
    availabilityData.push({
      facilityId: facility.id,
      courtId: footballCourt.id,
      date,
      startTime: "06:00",
      endTime: "22:00",
      isBlocked: false,
    })

    // Cricket net availability
    availabilityData.push({
      facilityId: facility.id,
      courtId: cricketNet.id,
      date,
      startTime: "06:00",
      endTime: "22:00",
      isBlocked: false,
    })

    // Badminton court availability
    availabilityData.push({
      facilityId: facility.id,
      courtId: badmintonCourt.id,
      date,
      startTime: "06:00",
      endTime: "22:00",
      isBlocked: false,
    })
  }

  await prisma.availability.createMany({
    data: availabilityData,
  })
  console.log("✅ Availability created for 30 days")

  console.log("🎉 Database seed completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })