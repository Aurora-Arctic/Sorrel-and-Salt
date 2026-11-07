import config from '../../../drizzle.config';

// The real migration config with only the migrations folder swapped, so a test
// applies a probe migration through the same credentials `npm run db:migrate` uses.
if (!process.env.LOCK_PROBE_MIGRATIONS) {
  throw new Error('LOCK_PROBE_MIGRATIONS is not set');
}

export default { ...config, out: process.env.LOCK_PROBE_MIGRATIONS };
