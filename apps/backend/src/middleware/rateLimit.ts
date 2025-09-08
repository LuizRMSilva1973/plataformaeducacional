import type { RequestHandler } from 'express'

type KeyFn = (req: any) => string

interface Options {
  windowMs: number
  max: number
  keyGenerator?: KeyFn
}

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(opts: Options): RequestHandler {
  const { windowMs, max, keyGenerator } = opts
  return (req, res, next) => {
    const key = (keyGenerator ? keyGenerator(req) : req.ip) + ':' + req.path
    const now = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(Math.max(1, retryAfter)))
      return res.status(429).json({ error: 'Too Many Requests' })
    }
    bucket.count += 1
    return next()
  }
}

