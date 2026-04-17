import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler.middleware';
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import schedulesRouter from './modules/schedules/schedules.router';
import webhooksRouter from './modules/webhooks/webhooks.router';
import notificationsRouter from './modules/notifications/notifications.router';
import auditRouter from './modules/audit/audit.router';
import settingsRouter from './modules/settings/settings.router';
import { sendSuccess } from './utils/response';

const app = express();

app.use(helmet());

// Support comma-separated list of origins (e.g. localhost + LAN IP)
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // En desarrollo, permitimos cualquier origen para facilitar pruebas en red (móviles, otros PCs)
    if (env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // En producción, somos estrictos con la lista de orígenes permitidos
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  statusCode: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Inténtalo más tarde.',
    code: 'BAD_REQUEST',
  },
});
app.use(limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  statusCode: 401,
  message: {
    success: false,
    error: 'Demasiados intentos de login. Inténtalo más tarde.',
    code: 'UNAUTHORIZED',
  },
});

app.get('/api/health', (_req, res) => {
  return sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingsRouter);

app.use(errorHandler);

export default app;
