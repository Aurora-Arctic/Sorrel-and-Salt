import { cronAuthorised } from '@/lib/cron-request';
import { startProvisionalCleanup } from '@/modules/identity';

// Vercel Cron calls this once a day (vercel.json). It takes no session, reads and returns no application data and only starts the
// provisional-cleanup job, so it is no third access path (rule 1). A request without CRON_SECRET is refused.
export async function GET(request: Request): Promise<Response> {
  if (!cronAuthorised(request)) return new Response(null, { status: 401 });
  await startProvisionalCleanup();
  return new Response(null, { status: 204 });
}
