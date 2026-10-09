/**
 * Return paths that leave the site, each a shape a request can really carry:
 * protocol-relative, absolute, and backslash-prefixed, which some browsers
 * read as a host. Shared so every guard on `next` is held to the same set.
 */
export const UNSAFE_RETURN_PATHS = ['//evil.example', 'https://evil.example', '/\\evil.example'];
