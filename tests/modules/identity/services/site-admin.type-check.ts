import type { Curator, SiteAdmin } from '@/modules/identity';

// Compile assertions, checked by `npm run typecheck` and run by nothing: `tsconfig.json` includes `tests/`, which is what reads this file.
// An admin's proof is a curator's, so a curation write takes either; a curator's is not an admin's, so nothing on the people page takes it.

export const anAdminCurates = (admin: SiteAdmin): Curator => admin;
export const aCuratorManagesPeople = (curator: Curator): SiteAdmin =>
  // @ts-expect-error — a Curator lacks the admin brand.
  curator;
export const aLiteralCurates = (): Curator =>
  // @ts-expect-error — a Curator is assertCurator's alone; an object literal is not one.
  ({ userId: '6f1c2d4e-9b8a-4c3d-8e7f-0a1b2c3d4e5f' });
