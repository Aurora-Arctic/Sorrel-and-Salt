/** How long a compendium read, and the CDN's copy of the two routes built from it, is kept. In its own file because `next.config.ts` reads it and cannot import the server-only cache helper. */
export const COMPENDIUM_REVALIDATE_SECONDS = 3600;
