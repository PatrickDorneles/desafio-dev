import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: process.env.TURSO_DATABASE_URL ? 'turso' : 'sqlite',
  schema: './src/**/entities/*.ts',
  out: './drizzle',
  dbCredentials: process.env.TURSO_DATABASE_URL
    ? {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: process.env.DB_PATH ?? './data/app.db' },
});
