import { env } from './config/env';
import app from './app';
import { logger } from './utils/logger';
import { startScheduler } from './modules/notifications/notifications.scheduler';

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${env.NODE_ENV}]`);
  startScheduler();
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});
