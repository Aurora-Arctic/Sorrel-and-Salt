import type { ReactElement } from 'react';
import IconTip, { LiddedEyeIcon } from '../IconTip';

/**
 * A hidden row's mark: the shut lidded eye, read as "Hidden" in the row's name. Not a tab stop, since the name already
 * carries the word; the tip is for a pointer.
 */
const HiddenEye = (): ReactElement => (
  <IconTip tip="Hidden" placement="above">
    {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an inline SVG drawn as one picture; an img would need a file */}
    <span className="help-outline__eye" role="img" aria-label="Hidden">
      <LiddedEyeIcon open={false} />
    </span>
  </IconTip>
);

export default HiddenEye;
