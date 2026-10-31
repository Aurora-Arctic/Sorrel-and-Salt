// The one password the e2e stand-in for the Have I Been Pwned range API lists as breached. Plain JavaScript,
// because the server's preload (pwned-range-preload.mjs) imports it before any TypeScript loader exists.

/** Long enough for every other rule, so only the breached list refuses it. */
export const BREACHED_PASSWORD = 'a breached passphrase for the e2e stand-in';
