import { cronRoute } from '@/lib/cron-request';
import { startDailyDocumentMailing } from '@/modules/documents';

// Vercel Cron calls this once a day (vercel.json).
export const GET = cronRoute(async (origin) => startDailyDocumentMailing(await origin()));
