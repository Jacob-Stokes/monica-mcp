import { pino, transport as buildTransport } from 'pino';
import { appConfig } from './config.js';

// Disable logging when running via stdio to avoid interfering with MCP protocol
const shouldLogToConsole = process.env.MCP_DISABLE_LOGS !== 'true' && !process.argv.includes('--silent');
const logFilePath = process.env.MCP_LOG_FILE;

const loggerDestination = (() => {
  const targets: Array<{
    target: string;
    options: Record<string, unknown>;
    level?: string;
  }> = [];

  if (shouldLogToConsole) {
    const isPretty = process.env.NODE_ENV !== 'production' && process.stderr.isTTY;

    if (isPretty) {
      targets.push({
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          colorize: true,
          ignore: 'pid,hostname',
          destination: 2
        }
      });
    } else {
      targets.push({
        target: 'pino/file',
        options: {
          destination: 2,
          mkdir: false,
          append: true
        }
      });
    }
  }

  if (logFilePath) {
    targets.push({
      target: 'pino/file',
      options: {
        destination: logFilePath,
        mkdir: true,
        append: true
      }
    });
  }

  if (targets.length === 0) {
    return null;
  }

  return buildTransport({ targets });
})();

export const logger = loggerDestination
  ? pino(
      {
        level: appConfig.logLevel,
        base: { app: 'monica-crm-mcp' },
        redact: {
          paths: ['req.headers.authorization', 'req.headers["x-api-key"]', 'req.headers["x-user-token"]'],
          remove: true
        }
      },
      loggerDestination
    )
  : ({
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {}
    } as any);
