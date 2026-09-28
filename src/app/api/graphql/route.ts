import { createYoga } from 'graphql-yoga';
import { isBrowserNavigation, renderAltairPage } from '../../../graphql/altair';
import { protections } from '../../../graphql/armor';
import { createContext } from '../../../graphql/context';
import { maskedErrors } from '../../../graphql/errors';
import { schema } from '../../../graphql/schema';

// Every deploy, staging included, runs at NODE_ENV=production; local
// development is the one place that does not.
const production = process.env.NODE_ENV === 'production';

// Every browser-initiated read and write comes through here (CLAUDE.md rule 1).
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  context: ({ request }) => createContext({ request }),
  fetchAPI: { Response },
  plugins: protections({ production }),
  // Each service error leaves with its code; anything else leaves masked.
  maskedErrors,
  // The IDE is Altair, served by `handle` before Yoga sees the request.
  graphiql: false,
  // Yoga's default reflects any Origin and allows credentials. The client is
  // same-origin, so no other origin gets a grant, a sibling preview included.
  cors: false,
});

// The route has no params, so Yoga is handed no server context of Next's.
async function handle(request: Request): Promise<Response> {
  if (!production && isBrowserNavigation(request)) {
    return new Response(await renderAltairPage(request), {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
  return yoga.handleRequest(request, {});
}

export { handle as GET, handle as POST };
