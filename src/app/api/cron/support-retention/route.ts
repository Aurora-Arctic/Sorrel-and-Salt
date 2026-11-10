import { cronRoute } from '@/lib/cron-request';
import { startSupportRetention } from '@/modules/support';

// Vercel Cron calls this once a day (vercel.json).
export const GET = cronRoute(async (origin) => startSupportRetention(await origin()));
