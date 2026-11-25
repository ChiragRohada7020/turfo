import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import { verifyWhatsAppOTP } from "@/lib/whatsapp/service"
import { authyo } from "@/lib/authyo/service"

const verifiedPhones = new Map<string, number>()

const authPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/turf_booking",
    },
  },
})

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(authPrisma) as NextAuthOptions["adapter"],
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
       async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        const identifier = credentials.email.trim()

        const user = await authPrisma.user.findUnique({ where: { email: identifier.toLowerCase() } })

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials")
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)

        if (!isValid) {
          throw new Error("Invalid credentials")
        }

        // Owner accounts require admin approval before they can log in
        if (user.role === "OWNER" && !user.isVerified) {
          throw new Error(
            "Your owner account is pending admin verification. Please wait for approval before signing in."
          )
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatarUrl,
        }
      },
    }),
    CredentialsProvider({
      id: "phone",
      name: "phone",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
        role: { label: "Role", type: "text" },
        name: { label: "Name", type: "text" },
        state: { label: "State", type: "text" },
        city: { label: "City", type: "text" },
        referralCode: { label: "Referral Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) throw new Error("Invalid credentials")
        const normalizedPhone = credentials.phone.startsWith("+91")
          ? credentials.phone
          : credentials.phone.startsWith("91")
          ? `+${credentials.phone}`
          : `+91${credentials.phone.replace(/\D/g, "").slice(-10)}`
        const otp = credentials.otp.trim()

        const isRegistration = !!credentials.name

        if (!isRegistration) {
          // verify OTP
          try {
            await verifyWhatsAppOTP(normalizedPhone, otp)
          } catch (e) {
            try {
              await authyo.verifyOTP(normalizedPhone, otp)
            } catch (e2) {
              throw new Error("Invalid OTP")
            }
          }
          verifiedPhones.set(normalizedPhone, Date.now() + 5 * 60 * 1000)

          const roleFilter = credentials.role ? (credentials.role as any) : undefined
          const user = await authPrisma.user.findFirst({ where: { phone: normalizedPhone, ...(roleFilter && { role: roleFilter }) } })
          if (!user) throw new Error("NEW_USER")
          if (user.role === "OWNER" && !user.isVerified) {
            throw new Error("Your owner account is pending admin verification.")
          }
          return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.avatarUrl }
        }

        // registration mode: phone must be verified
        const expiry = verifiedPhones.get(normalizedPhone)
        if (!expiry || expiry < Date.now()) throw new Error("Phone not verified")
        verifiedPhones.delete(normalizedPhone)

        const userRole = credentials.role === "OWNER" ? "OWNER" : credentials.role === "SPONSOR" ? "SPONSOR" : "PLAYER"
        const existing = await authPrisma.user.findFirst({ where: { phone: normalizedPhone, role: userRole as any } })
        if (existing) {
          return { id: existing.id, email: existing.email, name: existing.name, role: existing.role, image: existing.avatarUrl }
        }

        const user = await authPrisma.user.create({
          data: {
            name: credentials.name?.trim() || null,
            email: `${normalizedPhone.replace(/\D/g, "")}@phone.local`,
            passwordHash: await bcrypt.hash(Math.random().toString(36), 12),
            phone: normalizedPhone,
            role: userRole as any,
            isPhoneVerified: true,
            isVerified: userRole !== "OWNER",
            city: credentials.city?.trim() || null,
            state: credentials.state?.trim() || null,
          },
        })
        await authPrisma.user.update({ where: { id: user.id }, data: { referralCode: `REF${user.id.slice(-6).toUpperCase()}` } })

        // referral handling
        if (credentials.referralCode) {
          const referrer = await authPrisma.user.findUnique({ where: { referralCode: credentials.referralCode.trim().toUpperCase() } })
          if (referrer && referrer.id !== user.id) {
            await authPrisma.$transaction(async (tx) => {
              await tx.referral.create({ data: { referrerId: referrer.id, refereeId: user.id, code: credentials.referralCode!.trim().toUpperCase(), rewardPoints: 1000 } })
              await tx.user.update({ where: { id: user.id }, data: { referredById: referrer.id } })
            })
          }
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role, image: user.avatarUrl }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
      }
      if (token.id) {
        const dbUser = await authPrisma.user.findUnique({ where: { id: token.id as string }, select: { role: true, name: true, avatarUrl: true } })
        if (dbUser) {
          token.role = dbUser.role
          token.name = dbUser.name
          token.picture = dbUser.avatarUrl
        }
      }
      if (trigger === "update" && session) {
        token.name = session.name
        token.image = session.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await authPrisma.user.findUnique({
          where: { email: user.email! },
        })

        if (existingUser) {
          await authPrisma.user.update({
            where: { id: existingUser.id },
            data: {
              avatarUrl: user.image,
              name: user.name ?? existingUser.name,
            },
          })
        }
      }
      return true
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
}

declare module "next-auth" {
  interface User {
    role?: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
  }
}