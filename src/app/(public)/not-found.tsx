import { NotFoundScreen } from '@/components/ErrorScreens';

// A missing public page, inside the public layout, which owns the `main` the screen would otherwise nest a second one in.
export default function PublicNotFound() {
  return <NotFoundScreen withinMain />;
}
