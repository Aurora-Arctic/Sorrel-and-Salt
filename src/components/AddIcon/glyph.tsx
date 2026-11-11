import type { ReactElement } from 'react';
import type { useFade } from '../ClickFeedback/fade';
import { CheckIcon, MysticEyeIcon, PlusIcon } from '../IconTip';
import Spinner from '../Spinner';

/**
 * The glyph in the plus: the spinner while busy, the check once an add has worked, and `rest`,
 * the plus or, where a row's plus turns into a Quick Look, the eye. While the check fades back
 * (`returning`) both are drawn, stacked, so the one fades into the other; the stylesheet does the
 * drawing and the fades from the button's `data-state`.
 */
const AddGlyph = ({
  state,
  busy,
  onFaded,
  rest = 'plus',
}: {
  state: 'added' | 'returning' | undefined;
  busy: boolean;
  onFaded: ReturnType<typeof useFade>['onAnimationEnd'];
  rest?: 'plus' | 'eye';
}): ReactElement => {
  const Rest = rest === 'eye' ? MysticEyeIcon : PlusIcon;
  return state ? (
    <span className="add-icon__glyphs">
      <span className="add-icon__check" onAnimationEnd={onFaded}>
        <CheckIcon />
      </span>
      {state === 'returning' && (
        <span className={`add-icon__${rest}`}>
          <Rest />
        </span>
      )}
    </span>
  ) : busy ? (
    <Spinner />
  ) : (
    <Rest />
  );
};

export default AddGlyph;
