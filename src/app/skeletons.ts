import type { ComponentType } from 'react';
import type { SkeletonHost } from '../lib/navigation/skeleton-for';
import { CompendiumSkeleton } from './(public)/compendium/skeleton';
import { CompendiumEntrySkeleton } from './(public)/compendium/ingredients/[slug]/skeleton';
import { TermsSkeleton } from './(public)/terms/skeleton';
import { TermsVersionSkeleton } from './(public)/terms/versions/[number]/skeleton';
import { PrivacySkeleton } from './(public)/privacy/skeleton';
import { PrivacyVersionSkeleton } from './(public)/privacy/versions/[number]/skeleton';
import { CodeOfEthicsSkeleton } from './(public)/code-of-ethics/skeleton';
import { CodeOfEthicsVersionSkeleton } from './(public)/code-of-ethics/versions/[number]/skeleton';
import { DisclaimerSkeleton } from './(public)/disclaimer/skeleton';
import { DisclaimerVersionSkeleton } from './(public)/disclaimer/versions/[number]/skeleton';
import { SupportSkeleton } from './(public)/support/skeleton';
import { AccountSkeleton } from './(shell)/account/(tabs)/skeleton';
import { AccountSignInSkeleton } from './(shell)/account/(tabs)/sign-in/skeleton';
import { AccountSupportSkeleton } from './(shell)/account/(tabs)/support/skeleton';
import { AccountEmailSkeleton } from './(shell)/account/email/skeleton';
import { AccountTermsSkeleton } from './(shell)/account/terms/skeleton';
import { CovenPausedSkeleton } from './(shell)/coven-paused/[slug]/skeleton';
import { NewCovenSkeleton } from './(shell)/coven/new/skeleton';
import { CovenLandingSkeleton } from './(shell)/coven/skeleton';
import {
  CovenHomeSkeleton,
  CovenIngredientsSkeleton,
  CovenEntrySkeleton,
  SpellRecipeSkeleton,
} from './(shell)/coven/[slug]/skeleton';
import { InvitationsSkeleton, MembersSkeleton } from './(shell)/coven/[slug]/(people)/skeleton';
import {
  GrimoireDraftsSkeleton,
  GrimoireSkeleton,
} from './(shell)/coven/[slug]/grimoire/(list)/skeleton';

/**
 * What each page draws while it is on its way, by the address pattern the folders under `src/app`
 * name it with. `host` is the body that draws it: the shell's `main`, a coven's body or an admin
 * area's body. Each skeleton sits in `skeleton.tsx` beside its page or a layout above it.
 */
export const skeletons: Record<string, { host: SkeletonHost; Skeleton: ComponentType }> = {
  '/compendium': { host: 'main', Skeleton: CompendiumSkeleton },
  '/compendium/ingredients/[slug]': { host: 'main', Skeleton: CompendiumEntrySkeleton },
  '/terms': { host: 'main', Skeleton: TermsSkeleton },
  '/terms/versions/[number]': { host: 'main', Skeleton: TermsVersionSkeleton },
  '/privacy': { host: 'main', Skeleton: PrivacySkeleton },
  '/privacy/versions/[number]': { host: 'main', Skeleton: PrivacyVersionSkeleton },
  '/code-of-ethics': { host: 'main', Skeleton: CodeOfEthicsSkeleton },
  '/code-of-ethics/versions/[number]': { host: 'main', Skeleton: CodeOfEthicsVersionSkeleton },
  '/disclaimer': { host: 'main', Skeleton: DisclaimerSkeleton },
  '/disclaimer/versions/[number]': { host: 'main', Skeleton: DisclaimerVersionSkeleton },
  '/support': { host: 'main', Skeleton: SupportSkeleton },
  '/account': { host: 'main', Skeleton: AccountSkeleton },
  '/account/sign-in': { host: 'main', Skeleton: AccountSignInSkeleton },
  '/account/support': { host: 'main', Skeleton: AccountSupportSkeleton },
  '/account/email': { host: 'main', Skeleton: AccountEmailSkeleton },
  '/account/terms': { host: 'main', Skeleton: AccountTermsSkeleton },
  '/coven-paused/[slug]': { host: 'main', Skeleton: CovenPausedSkeleton },
  '/coven/new': { host: 'main', Skeleton: NewCovenSkeleton },
  '/coven': { host: 'main', Skeleton: CovenLandingSkeleton },
  '/coven/[slug]': { host: 'coven', Skeleton: CovenHomeSkeleton },
  '/coven/[slug]/members': { host: 'coven', Skeleton: MembersSkeleton },
  '/coven/[slug]/invitations': { host: 'coven', Skeleton: InvitationsSkeleton },
  '/coven/[slug]/grimoire': { host: 'coven', Skeleton: GrimoireSkeleton },
  '/coven/[slug]/grimoire/drafts': { host: 'coven', Skeleton: GrimoireDraftsSkeleton },
  '/coven/[slug]/grimoire/[id]': { host: 'coven', Skeleton: SpellRecipeSkeleton },
  '/coven/[slug]/ingredients': { host: 'coven', Skeleton: CovenIngredientsSkeleton },
  '/coven/[slug]/ingredients/[id]': { host: 'coven', Skeleton: CovenEntrySkeleton },
};
