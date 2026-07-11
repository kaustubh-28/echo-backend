import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';
import { logger } from '@shared/logger';

export interface RequestContext {
  log: pino.Logger;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

export function getRequestLogger(): pino.Logger {
  const store = requestContextStore.getStore();
  return store ? store.log : logger;
}

export const log = {
  info(msg: string, obj?: Record<string, unknown>): void {
    if (obj) {
      getRequestLogger().info(obj, msg);
    } else {
      getRequestLogger().info(msg);
    }
  },
  warn(msg: string, obj?: Record<string, unknown>): void {
    if (obj) {
      getRequestLogger().warn(obj, msg);
    } else {
      getRequestLogger().warn(msg);
    }
  },
  error(err: Error | unknown, msg?: string, obj?: Record<string, unknown>): void {
    if (obj) {
      getRequestLogger().error(
        { err, ...obj },
        msg || (err instanceof Error ? err.message : undefined),
      );
    } else {
      getRequestLogger().error(err, msg);
    }
  },
  debug(msg: string, obj?: Record<string, unknown>): void {
    if (obj) {
      getRequestLogger().debug(obj, msg);
    } else {
      getRequestLogger().debug(msg);
    }
  },
};
