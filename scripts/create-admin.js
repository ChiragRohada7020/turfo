#!/usr/bin/env node
// Script to create admin user
// Run with: node scripts/create-admin.js

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@strikora.in"
  const password = process.env.ADMIN_PASSWORD || "Admin@123456"
  const name = process.env.ADMIN_NAME || "Super Admin"

  console.log(`Creating admin user: ${email}`)

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  })

  if (existingAdmin) {
    console.log("Admin user already exists")
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: Role.ADMIN,
      isPhoneVerified: true,
    },
  })

  console.log("✅ Admin user created successfully!")
  console.log(`   Email: ${admin.email}`)
  console.log(`   Name: ${admin.name}`)
  console.log(`   Role: ${admin.role}`)
  console.log(`   ID: ${admin.id}`)
  console.log(`\nLogin with:`)
  console.log(`   Email: ${email}`)
  console.log(`   Password: ${password}`)
}

main()
  .catch((e) => {
    console.error("Error creating admin:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })