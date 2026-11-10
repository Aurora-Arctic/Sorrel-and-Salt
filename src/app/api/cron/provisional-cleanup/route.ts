import { cronRoute } from '@/lib/cron-request';
import { startProvisionalCleanup } from '@/modules/identity';

// Vercel Cron calls this once a day (vercel.json).
export const GET = cronRoute(() => startProvisionalCleanup());
