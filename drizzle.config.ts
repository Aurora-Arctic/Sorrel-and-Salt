import { defineConfig } from 'drizzle-kit';

import { withMigrationLockTimeout, withoutClientOnlyParams } from './src/db/connection-url';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default defineConfig({
  schema: './src/modules/*/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Every migration statement gives up a lock it cannot take within the timeout rather than queue the site behind it.
    url: withMigrationLockTimeout(withoutClientOnlyParams(process.env.DATABASE_URL)),
  },
});
