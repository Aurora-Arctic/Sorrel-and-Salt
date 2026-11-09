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
import { AboutSkeleton } from './(public)/about/skeleton';
import { DisclaimerSkeleton } from './(public)/disclaimer/skeleton';
import { DisclaimerVersionSkeleton } from './(public)/disclaimer/versions/[number]/skeleton';
import { SupportSkeleton } from './(public)/support/skeleton';
import { HelpSkeleton } from './(public)/help/skeleton';
import { HelpGlossaryPageSkeleton } from './(public)/help/glossary/skeleton';
import { HelpSearchPageSkeleton } from './(public)/help/search/skeleton';
import { HelpArticlePageSkeleton } from './(public)/help/[slug]/skeleton';
import { HelpSubPageSkeleton } from './(public)/help/[slug]/[child]/skeleton';
import {
  StaffHelpArticleSkeleton,
  StaffHelpSkeleton,
  StaffHelpSubPageSkeleton,
} from './(shell)/help/staff/skeleton';
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
 */ import {
  CategoriesSkeleton,
  CategoryGroupsSkeleton,
  CelestialBodiesSkeleton,
  CuratorCompendiumSkeleton,
  CuratorSkeleton,
  DeitiesSkeleton,
  DeityTraditionsSkeleton,
  FormGroupsSkeleton,
  FormsSkeleton,
  ZodiacSignsSkeleton,
} from './(shell)/curator/skeleton';
import {
  BusinessCardsSkeleton,
  CardSignUpsSkeleton,
  InvitationCardsSkeleton,
  KeepersDocumentSkeleton,
  KeepersEmailUpdatesSkeleton,
  KeepersHelpSkeleton,
  KeepersHelpNewSkeleton,
  KeepersHelpEditSkeleton,
  KeepersInvitationsSkeleton,
  KeepersSkeleton,
  KeepersSupportSkeleton,
  PrivilegeChangesSkeleton,
  UsersSkeleton,
} from './(shell)/keepers/skeleton';

export const skeletons: Record<string, { host: SkeletonHost; Skeleton: ComponentType }> = {
  '/compendium': { host: 'main', Skeleton: CompendiumSkeleton },
  '/compendium/ingredients/[slug]': { host: 'main', Skeleton: CompendiumEntrySkeleton },
  '/terms': { host: 'main', Skeleton: TermsSkeleton },
  '/terms/versions/[number]': { host: 'main', Skeleton: TermsVersionSkeleton },
  '/privacy': { host: 'main', Skeleton: PrivacySkeleton },
  '/privacy/versions/[number]': { host: 'main', Skeleton: PrivacyVersionSkeleton },
  '/code-of-ethics': { host: 'main', Skeleton: CodeOfEthicsSkeleton },
  '/code-of-ethics/versions/[number]': { host: 'main', Skeleton: CodeOfEthicsVersionSkeleton },
  '/about': { host: 'main', Skeleton: AboutSkeleton },
  '/disclaimer': { host: 'main', Skeleton: DisclaimerSkeleton },
  '/disclaimer/versions/[number]': { host: 'main', Skeleton: DisclaimerVersionSkeleton },
  '/support': { host: 'main', Skeleton: SupportSkeleton },
  '/help': { host: 'main', Skeleton: HelpSkeleton },
  '/help/glossary': { host: 'main', Skeleton: HelpGlossaryPageSkeleton },
  '/help/search': { host: 'main', Skeleton: HelpSearchPageSkeleton },
  '/help/[slug]': { host: 'main', Skeleton: HelpArticlePageSkeleton },
  '/help/[slug]/[child]': { host: 'main', Skeleton: HelpSubPageSkeleton },
  '/help/staff': { host: 'main', Skeleton: StaffHelpSkeleton },
  '/help/staff/[slug]': { host: 'main', Skeleton: StaffHelpArticleSkeleton },
  '/help/staff/[slug]/[child]': { host: 'main', Skeleton: StaffHelpSubPageSkeleton },
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
  '/curator': { host: 'admin', Skeleton: CuratorSkeleton },
  '/curator/compendium': { host: 'admin', Skeleton: CuratorCompendiumSkeleton },
  '/curator/categories': { host: 'admin', Skeleton: CategoriesSkeleton },
  '/curator/category-groups': { host: 'admin', Skeleton: CategoryGroupsSkeleton },
  '/curator/forms': { host: 'admin', Skeleton: FormsSkeleton },
  '/curator/form-groups': { host: 'admin', Skeleton: FormGroupsSkeleton },
  '/curator/deities': { host: 'admin', Skeleton: DeitiesSkeleton },
  '/curator/deity-traditions': { host: 'admin', Skeleton: DeityTraditionsSkeleton },
  '/curator/celestial-bodies': { host: 'admin', Skeleton: CelestialBodiesSkeleton },
  '/curator/zodiac-signs': { host: 'admin', Skeleton: ZodiacSignsSkeleton },
  '/keepers': { host: 'admin', Skeleton: KeepersSkeleton },
  '/keepers/users': { host: 'admin', Skeleton: UsersSkeleton },
  '/keepers/privilege-changes': { host: 'admin', Skeleton: PrivilegeChangesSkeleton },
  '/keepers/invitations': { host: 'admin', Skeleton: KeepersInvitationsSkeleton },
  '/keepers/invitation-cards': { host: 'admin', Skeleton: InvitationCardsSkeleton },
  '/keepers/card-sign-ups': { host: 'admin', Skeleton: CardSignUpsSkeleton },
  '/keepers/support': { host: 'admin', Skeleton: KeepersSupportSkeleton },
  '/keepers/business-cards': { host: 'admin', Skeleton: BusinessCardsSkeleton },
  '/keepers/documents': { host: 'admin', Skeleton: KeepersEmailUpdatesSkeleton },
  '/keepers/documents/[key]': { host: 'admin', Skeleton: KeepersDocumentSkeleton },
  '/keepers/help': { host: 'admin', Skeleton: KeepersHelpSkeleton },
  '/keepers/help/new': { host: 'admin', Skeleton: KeepersHelpNewSkeleton },
  '/keepers/help/[id]': { host: 'admin', Skeleton: KeepersHelpEditSkeleton },
};
