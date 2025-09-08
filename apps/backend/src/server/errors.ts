import type { ErrorRequestHandler } from 'express'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = (err && (err.status || err.statusCode)) || 500
  const message = err?.message || 'Internal Server Error'
  const body: Record<string, unknown> = { error: message }
  if (process.env.NODE_ENV === 'development') {
    body.stack = err?.stack
  }
  res.status(typeof status === 'number' ? status : 500).json(body)
}

