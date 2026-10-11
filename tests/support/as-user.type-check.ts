import { FIXTURE_USERS } from '@/db/seed/standard';
import { asUser } from './as-user';

// A compile assertion, checked by `npm run typecheck` and run by nothing: a
// session is built only from a fixture user, so the acting user is the one a
// test named. `tsconfig.json` includes `tests/`, which is what reads this.
// @ts-expect-error — no `role`, so this is not a user
asUser({ id: FIXTURE_USERS.A.id });
