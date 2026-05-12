/**
 * @file auth.rate-limit.ts
 * Rate limiter específico para POST /api/auth/login.
 *
 * Clave por identidad normalizada (identifier/email en minúsculas)
 * con fallback por IP cuando no se envía identificador.
 * Los logins exitosos no consumen cuota (skipSuccessfulRequests).
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Extrae la clave de rate limiting del body de login.
 * Prioriza `identifier`, luego `email`, y como fallback usa la IP
 * mediante ipKeyGenerator (compatible con IPv6).
 */
function loginKeyGenerator(req: Request): string {
  const identifier = req.body?.identifier ?? req.body?.email;
  if (identifier && typeof identifier === 'string' && identifier.trim().length > 0) {
    return `login:${identifier.trim().toLowerCase()}`;
  }
  // Fallback: usar ipKeyGenerator que maneja IPv6 correctamente
  const clientIp = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `login:ip:${ipKeyGenerator(clientIp)}`;
}

/**
 * Middleware de rate limiting para POST /api/auth/login.
 *
 * - Ventana: 15 minutos
 * - Máximo: 10 intentos por identidad
 * - skipSuccessfulRequests: true (logins correctos no descuentan)
 * - Respuesta JSON normalizada con código TOO_MANY_REQUESTS
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,                   // 10 intentos por ventana
  standardHeaders: true,     // RateLimit-* headers estándar
  legacyHeaders: false,      // Sin headers X-RateLimit-* (deprecados)
  skipSuccessfulRequests: true, // Logins exitosos no consumen cuota
  keyGenerator: loginKeyGenerator,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en 15 minutos.',
      code: 'TOO_MANY_REQUESTS',
    });
  },
});
