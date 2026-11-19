import { indexNowKey } from '@/lib/indexnow';

/** The key file IndexNow fetches to check that a ping came from this site; the key is the body and nothing else. */
export async function GET(): Promise<Response> {
  const key = indexNowKey();
  if (!key) return new Response(null, { status: 404 });
  return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
