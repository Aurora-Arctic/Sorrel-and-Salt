// Typed by hand the way client-preset types a document, so the tests need no
// document under src/ that would ship in src/gql/.
export type OkQuery = { ok: boolean };
export type OkQueryVariables = { [key: string]: never };
export type EchoQuery = { echo: string };
export type EchoQueryVariables = { word: string };

/** One request `send` made, as the catch-all handler recorded it. */
export type Captured = { url: string; headers: Headers; body: unknown };
