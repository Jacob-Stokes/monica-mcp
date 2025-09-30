import { destination, pino, transport as buildTransport } from 'pino';
import { appConfig } from './config.js';

// Disable logging when running via stdio to avoid interfering with MCP protocol
const shouldLog = process.env.MCP_DISABLE_LOGS !== 'true' && !process.argv.includes('--silent');

const loggerDestination = (() => {
  if (!shouldLog) {
    return null;
  }

  const isPretty = process.env.NODE_ENV !== 'production' && process.stderr.isTTY;

  if (isPretty) {
    return buildTransport({
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:standard',
        colorize: true,
        ignore: 'pid,hostname',
        destination: 2
      }
    });
  }

  return destination({ fd: process.stderr.fd, sync: false });
})();

export const logger = shouldLog
  ? pino(
      {
        level: appConfig.logLevel,
        base: { app: 'monica-crm-mcp' },
        redact: {
          paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'req.headers["x-user-token"]'],
          remove: true
        }
      },
      loggerDestination ?? undefined
    )
  : ({
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {}
    } as any);
