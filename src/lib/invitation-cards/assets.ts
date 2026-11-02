import type { CardAssets } from './types';

// The files the print PDF embeds, served from `public/invitation-cards/`, so the browser that builds the PDF fetches them.
const FILES: Record<keyof CardAssets, string> = {
  salt: '/invitation-cards/salt.png',
  sorrel: '/invitation-cards/sorrel.png',
  cormorant600: '/invitation-cards/fonts/cormorant-unicase-600.ttf',
  lexend300: '/invitation-cards/fonts/lexend-300.ttf',
  lexend400: '/invitation-cards/fonts/lexend-400.ttf',
  lexend500: '/invitation-cards/fonts/lexend-500.ttf',
};

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function fetchCardAssets(): Promise<CardAssets> {
  const keys = Object.keys(FILES) as (keyof CardAssets)[];
  const bytes = await Promise.all(keys.map((key) => fetchBytes(FILES[key])));
  return Object.fromEntries(keys.map((key, i) => [key, bytes[i]])) as Record<
    keyof CardAssets,
    Uint8Array
  >;
}
