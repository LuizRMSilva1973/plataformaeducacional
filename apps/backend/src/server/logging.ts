type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function baseLog(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(data || {}),
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload))
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => baseLog('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => baseLog('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => baseLog('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => baseLog('error', msg, data),
}

export function bindRequest(data: Record<string, unknown>) {
  return {
    debug: (msg: string, extra?: Record<string, unknown>) => logger.debug(msg, { ...data, ...(extra || {}) }),
    info: (msg: string, extra?: Record<string, unknown>) => logger.info(msg, { ...data, ...(extra || {}) }),
    warn: (msg: string, extra?: Record<string, unknown>) => logger.warn(msg, { ...data, ...(extra || {}) }),
    error: (msg: string, extra?: Record<string, unknown>) => logger.error(msg, { ...data, ...(extra || {}) }),
  }
}

