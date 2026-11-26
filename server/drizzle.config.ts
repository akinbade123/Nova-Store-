import { defineConfig } from 'drizzle-kit';

// Generates SQL migrations from src/db/schema.ts into ./drizzle. Applying them is done by src/db/migrate.ts.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
