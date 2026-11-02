import { cronAuthorised } from '@/lib/cron-request';
import { requestOrigin } from '@/lib/request-origin';
import { startSupportRetention } from '@/modules/support';

// Vercel Cron calls this once a day (vercel.json). It takes no session, reads and returns no application data and only starts the
// support-retention job, which runs as the System account, so it is no third access path (rule 1). A request without CRON_SECRET
// is refused. The origin is read against Better Auth's allowed hosts, so a forged Host cannot point the notices' links elsewhere.
export async function GET(request: Request): Promise<Response> {
  if (!cronAuthorised(request)) return new Response(null, { status: 401 });
  await startSupportRetention(await requestOrigin(request, '/'));
  return new Response(null, { status: 204 });
}
