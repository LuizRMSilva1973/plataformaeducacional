import type { RequestHandler } from 'express'
import { bindRequest } from '../server/logging.js'

export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now()
  const log = bindRequest({ requestId: req.requestId, userId: req.user?.id })
  ;(req as any).log = log

  res.on('finish', () => {
    const durationMs = Date.now() - start
    log.info('http_request', {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
    })
  })

  next()
}

