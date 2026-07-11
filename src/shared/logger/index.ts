import pino from 'pino';
import pretty from 'pino-pretty';
import { env } from '@config/env';

const isDevelopment = env.NODE_ENV === 'development';

const pinoOptions: pino.LoggerOptions = {
  level: env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  formatters: {
    log(object) {
      const logObject = { ...object };
      delete logObject.responseTime;
      return logObject;
    },
  },
};

const devStream = isDevelopment
  ? pretty({
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
      ignore: 'pid,hostname',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messageFormat: (log: any, messageKey: string): string => {
        const uuid = log.uuid || log.reqId;
        const msg = log[messageKey] as string;
        return uuid ? `[${uuid}] ${msg}` : msg;
      },
    })
  : undefined;

export const logger = devStream ? pino(pinoOptions, devStream) : pino(pinoOptions);

export default logger;
