/**
 * Centralised environment configuration.
 * All env vars are read and validated here at startup.
 */
export const env = {
  // Auth
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",

  // Database
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/innochat",

  // Redis
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  OPENAI_DEFAULT_MODEL: process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o",
  OPENAI_MAX_TOKENS: Number(process.env.OPENAI_MAX_TOKENS ?? 2048),

  // Serper
  SERPER_API_KEY: process.env.SERPER_API_KEY ?? "",
  SERPER_BASE_URL: "https://google.serper.dev",

  // App
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",

  // Rate limiting
  RATE_LIMIT_WINDOW_SEC: 60,
  RATE_LIMIT_MAX_REQUESTS: 20,

  // Context window
  CONTEXT_WINDOW_SIZE: 20,
  CONTEXT_TTL_SEC: 7200, // 2 hours
} as const;
