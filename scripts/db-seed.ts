#!/usr/bin/env node
// M1.3 — wires `npm run db:seed` to the seed module's entrypoint.
//
// No scenario is implemented yet (see src/db/seed/index.ts), and scenario
// selection by environment variable is M1.24's job — this always seeds
// `minimal`, and always fails, until M1.21 gives it something to do.
//
// Usage: npm run db:seed

import { db } from '../src/db/connection.ts';
import { seed } from '../src/db/seed/index.ts';

await seed(db, { scenario: 'minimal' });
