// Header the site's own client sends on every request, so a script that is not
// a browser page can say it is not a cross-site form post.
export const CLIENT_HEADER = 'x-sorrel-client';
export const CLIENT_HEADER_VALUE = 'web';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function refuse(status: number, message: string): Response {
  return Response.json({ errors: [{ message }] }, { status });
}

// Refuses a request that could change data unless it is JSON and comes from
// this site: its Origin names this host, or it carries the client header, which
// a page on another site cannot add without a preflight that the endpoint
// never grants. Runs before Yoga, so no resolver runs for a refused request.
// Returns null when the request may go on.
export function refuseCrossSite(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method)) return null;

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return refuse(415, 'The request must be sent as application/json.');
  }

  if (request.headers.get(CLIENT_HEADER) === CLIENT_HEADER_VALUE) return null;

  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('host') ?? new URL(request.url).host;
    try {
      if (new URL(origin).host === host) return null;
    } catch {
      // An Origin that does not parse is refused below.
    }
  }
  return refuse(403, 'The request did not come from this site.');
}
