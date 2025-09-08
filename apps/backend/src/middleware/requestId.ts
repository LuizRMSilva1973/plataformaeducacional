import type { RequestHandler } from 'express'
import { randomUUID } from 'crypto'

export const requestId: RequestHandler = (req, res, next) => {
  const existing = (req.headers['x-request-id'] as string | undefined)?.trim()
  const id = existing && existing.length > 0 ? existing : randomUUID()
  req.requestId = id
  res.setHeader('x-request-id', id)
  next()
}

