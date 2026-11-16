import { initTRPC, TRPCError } from "@trpc/server"
import superjson from "superjson"
import { ZodError } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import prisma from "@/lib/prisma"

export const createTRPCContext = async () => {
  const session = await getServerSession(authOptions)
  return { session, prisma }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" })
  }
  return next({ ctx: { ...ctx, session: { ...ctx.session, user: ctx.session.user } } })
})

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" })
  }
  return next({ ctx })
})

export const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" })
  }
  return next({ ctx })
})

export const middleware = t.middleware