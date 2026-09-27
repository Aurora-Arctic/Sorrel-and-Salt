import { createYoga } from 'graphql-yoga';
import { createContext } from '../../../graphql/context';
import { schema } from '../../../graphql/schema';

// Every browser-initiated read and write comes through here (CLAUDE.md rule 1).
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  context: ({ request }) => createContext({ request }),
  fetchAPI: { Response },
  // Local development only: every deploy, staging included, runs at
  // NODE_ENV=production.
  graphiql: process.env.NODE_ENV !== 'production',
  // Yoga's default reflects any Origin and allows credentials. The client is
  // same-origin, so no other origin gets a grant, a sibling preview included.
  cors: false,
});

// The route has no params, so Yoga is handed no server context of Next's.
async function handle(request: Request): Promise<Response> {
  return yoga.handleRequest(request, {});
}

export { handle as GET, handle as POST };
