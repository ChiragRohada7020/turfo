const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  Array.from(rateLimitMap.entries()).forEach(([key, entry]) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  })
}, 60000)
