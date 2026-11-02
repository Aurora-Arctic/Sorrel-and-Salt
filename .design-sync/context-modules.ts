// Modules whose React contexts the stories' own frames (.storybook/*) and fixtures also
// reach for. Built into the library in the same pass as the components, so the one copy
// is the one the components read; index.ts flattens its exports onto the bundle's
// global, and config storyImports.shim points the stories' imports of these at it.
export * from '../src/lib/navigation';
export * from '../src/lib/navigation/timing';
export * from '../src/components/Modal/route-modal-provider';
export * from '../src/components/ClickFeedback/status-region';
export * from '../src/components/CovenSwitchTargets/context';
export { TabSwitchContext } from '../src/components/TabbedPage/tab-switch';
export * from 'react-hook-form';
export * from '@tanstack/react-query';
export * from 'next/navigation';
// The contexts next/navigation's hooks read; .storybook/navigation.tsx fills them (see next-navigation.ts).
export {
  PathnameContext,
  PathParamsContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
export { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';

// The workshop's own sheets (.storybook/preview.tsx imports them, and the converter compiles
// story-side .scss as empty): theme tokens, the --font-body/--font-display names, body typography
// and the story frame. Pulled into the library's one stylesheet so previews match Storybook.
import '../.storybook/theme.scss';
import '../.storybook/story-frame.scss';
import '../.storybook/typography.scss';
import '../.storybook/layout.scss';
import '../.storybook/primitives.scss';
import './preview-host.scss';
// Story-side sheets two stories lay their grid out with; the converter would compile them as empty.
import '../src/components/MoonPhaseIcon/index.stories.scss';
import '../src/components/SpellCard/index.stories.scss';

// Marks a single-story page (`?story=`, what compare captures) so preview-host.scss can cancel the
// preview frame's 24px body padding there only. A card's own page keeps its padding.
if (typeof document !== 'undefined' && /[?&]story=/.test(location.search)) {
  document.documentElement.classList.add('ds-solo');
}
