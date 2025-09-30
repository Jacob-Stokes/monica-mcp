import { z } from 'zod';

// Only load .env if MONICA_API_TOKEN is not already set (for local development)
if (!process.env.MONICA_API_TOKEN) {
  const { config } = await import('dotenv');
  config();
}

const envSchema = z.object({
  MONICA_BASE_URL: z
    .string()
    .url()
    .default('https://app.monicahq.com'),
  MONICA_API_TOKEN: z
    .string()
    .min(1, 'MONICA_API_TOKEN is required to authenticate against Monica CRM.'),
  MONICA_USER_TOKEN: z.string().optional(),
  MONICA_TOKEN_TYPE: z.enum(['bearer', 'apiKey', 'legacy']).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info')
});

const parsed = envSchema.safeParse({
  MONICA_BASE_URL: process.env.MONICA_BASE_URL ?? 'https://app.monicahq.com',
  MONICA_API_TOKEN: process.env.MONICA_API_TOKEN,
  MONICA_USER_TOKEN: process.env.MONICA_USER_TOKEN,
  MONICA_TOKEN_TYPE: process.env.MONICA_TOKEN_TYPE as
    | 'bearer'
    | 'apiKey'
    | 'legacy'
    | undefined,
  LOG_LEVEL: (process.env.LOG_LEVEL as
    | 'fatal'
    | 'error'
    | 'warn'
    | 'info'
    | 'debug'
    | 'trace'
    | 'silent'
    | undefined) ?? 'info'
});

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'ENV'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid configuration. Please check your environment variables.\n${formatted}`);
}

type TokenType = 'bearer' | 'apiKey' | 'legacy';

export interface AppConfig {
  baseUrl: string;
  token: string;
  tokenType: TokenType;
  userToken?: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
}

const inferredTokenType: TokenType =
  parsed.data.MONICA_TOKEN_TYPE ?? (parsed.data.MONICA_USER_TOKEN ? 'legacy' : 'bearer');

if (inferredTokenType === 'legacy' && !parsed.data.MONICA_USER_TOKEN) {
  throw new Error(
    'MONICA_TOKEN_TYPE is set to legacy but MONICA_USER_TOKEN is missing. Monica legacy auth requires both MONICA_API_TOKEN and MONICA_USER_TOKEN.'
  );
}

export const appConfig: AppConfig = {
  baseUrl: parsed.data.MONICA_BASE_URL.replace(/\/$/, ''),
  token: parsed.data.MONICA_API_TOKEN,
  tokenType: inferredTokenType,
  userToken: parsed.data.MONICA_USER_TOKEN,
  logLevel: parsed.data.LOG_LEVEL
};
