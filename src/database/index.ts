import mongoose from 'mongoose';
import { env } from '@config/env';
import { logger } from '@shared/logger';

export async function connectDatabase(): Promise<void> {
  const { MONGODB_URI } = env;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection successfully established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected');
  });

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB on startup');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    logger.info('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error({ error }, 'Error during MongoDB disconnection');
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<{
  status: 'connected' | 'disconnected' | 'connecting' | 'disconnecting';
  responseTimeMs?: number;
}> {
  const readyState = mongoose.connection.readyState;
  const stateMap: Record<number, 'connected' | 'disconnected' | 'connecting' | 'disconnecting'> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const status = stateMap[readyState] || 'disconnected';

  if (status !== 'connected' || !mongoose.connection.db) {
    return { status };
  }

  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const responseTimeMs = Date.now() - start;
    return { status: 'connected', responseTimeMs };
  } catch {
    return { status: 'disconnected' };
  }
}
