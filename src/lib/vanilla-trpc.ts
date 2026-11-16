import { createTRPCProxyClient, httpBatchLink } from "@trpc/client"
import type { AppRouter } from "@/server/api/routers/app"
import superjson from "superjson"

export const vanillaTrpc = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
})