import { defineConfig } from 'drizzle-kit';

import { withoutClientOnlyParams } from './src/db/connection-url';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  schema: './src/modules/*/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: withoutClientOnlyParams(process.env.DATABASE_URL),
  },
});
