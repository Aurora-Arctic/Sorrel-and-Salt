// Stands in for `next/navigation` in the design sync's build (vite.config.ts, resolve.alias).
// Its real hooks throw without a mounted App Router, which a design preview has none of.
// These read the same contexts the workshop's frames fill (.storybook/navigation.tsx:
// WorkshopPathname, WorkshopNavigation), so a story can set the page and the router;
// context-modules.ts exports those contexts and config storyImports.shim points the stories'
// imports of them at the bundle, so there is one instance. With nothing provided, the path is
// the one .storybook/preview.tsx sets as the framework default. An alias, not a rewrite of
// dist/ after the build, so the build says what it does.
import { useContext } from 'react';
import {
  PathnameContext,
  PathParamsContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';

const router = {
  push() {},
  replace() {},
  back() {},
  forward() {},
  refresh() {},
  prefetch() {},
};
const noParams = {};
const noSearch = new URLSearchParams();

export const useRouter = () => useContext(AppRouterContext) ?? router;
export const usePathname = () => useContext(PathnameContext) ?? '/admin/users';
export const useSearchParams = () => useContext(SearchParamsContext) ?? noSearch;
export const useParams = () => useContext(PathParamsContext) ?? noParams;
export const useSelectedLayoutSegment = () => null;
export const useSelectedLayoutSegments = () => [];
export const redirect = () => {};
export const notFound = () => {};
export const permanentRedirect = () => {};
