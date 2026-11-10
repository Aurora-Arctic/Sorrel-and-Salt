// Values many tests spell the same way. A test that needs a different value for a reason keeps its own and says why.

// The address the app answers on in development.
export const ORIGIN = 'http://localhost:8000';

// A mail server that exists nowhere: a test that stubs `fetch` answers for it.
export const MAILPIT_URL = 'http://mailpit.test';

// An id no seeded row uses, for a workspace or a user a test only needs to name.
export const WORKSPACE_ID = '00000000-0000-4000-8000-000000000001';
export const USER_ID = '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f';

// A password that passes the policy.
export const PASSWORD = 'Testwort crowns the eastern hedge';
