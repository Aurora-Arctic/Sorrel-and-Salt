import type { MetadataRoute } from 'next';

import { SITE_NAME } from '../lib/site';

// Names the app for password managers and install prompts; no icons exist yet.
export default function manifest(): MetadataRoute.Manifest {
  return { name: SITE_NAME, short_name: SITE_NAME, start_url: '/' };
}
