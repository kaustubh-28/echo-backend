import app from './app';
import { env } from '@config/env';
import { connectDatabase, disconnectDatabase } from '@database/index';
import { logger } from '@shared/logger';
import { Server } from 'http';
import { seedConfig, loadConfigCache } from './modules/config/config.service';
import { AdminRepository } from './modules/admin/admin.repository';
import { AdminService } from './modules/admin/admin.service';

let server: Server;

async function bootstrap() {
  try {
    // 1. Establish Database Connection
    await connectDatabase();

    // Seed configurations and load validation caches
    await seedConfig();
    await loadConfigCache();

    // Seed default admin account
    const adminRepository = new AdminRepository();
    const adminService = new AdminService(adminRepository);
    await adminService.ensureAdminExists();

    // 2. Start the HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });

    server.on('error', (err) => {
      logger.fatal({ err }, 'Failed to start HTTP server');
      process.exit(1);
    });
  } catch (error) {
    logger.error({ error }, 'Server failed to start during bootstrap');
    process.exit(1);
  }
}

const handleShutdown = async (signal: string) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during database disconnection during shutdown');
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception! Exiting...');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection! Exiting...');
  process.exit(1);
});

bootstrap();
