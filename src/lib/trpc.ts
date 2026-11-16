import { createTRPCNext } from "@trpc/next"
import type { AppRouter } from "@/server/api/routers/app"
import superjson from "superjson"
import { httpBatchLink } from "@trpc/client"

export const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    }
  },
  ssr: false,
})