import { useId, type ReactElement } from 'react';
import IconTip from '../IconTip';
import { ChevronIcon } from '../IconTip/icons';
import type { AccessCardsProps, AccessMark } from './types';
import './index.scss';

// Who may see each kind of data: one card per kind, a mark per role on its summary line, and a role row over the
// cards that pins under the bar. Native `<details>`, so a card opens with no script (claude-docs/components/access-cards.md).

const MARK_WORD: Record<AccessMark, string> = { yes: 'Yes', part: 'In Part', no: 'No' };

const Mark = ({ mark, spoken }: { mark: AccessMark; spoken?: string }): ReactElement => (
  <span className={`access-cards__mark access-cards__mark--${mark}`}>
    {spoken && <span className="access-cards__spoken">{spoken}</span>}
  </span>
);

// Each card is named by its kind of data alone, not by the marks' hidden text.
const AccessCards = ({ roles, rows }: AccessCardsProps): ReactElement => {
  const id = useId();
  return (
    <div className="access-cards">
      <ul className="access-cards__key" aria-label="How to read the marks">
        {(Object.keys(MARK_WORD) as AccessMark[]).map((mark) => (
          <li key={mark}>
            <Mark mark={mark} />
            {MARK_WORD[mark]}
          </li>
        ))}
      </ul>
      <p className="access-cards__note">
        The six columns are the roles, in order: {roles.map((role) => role.name).join(', ')}. Open a
        card to read each role's full wording.
      </p>
      <div className="access-cards__list">
        <div className="access-cards__row access-cards__columns" aria-hidden="true">
          <span className="access-cards__columns-label">Kind of Data</span>
          {roles.map((role) => (
            // A span, not a control: the row is hidden from assistive technology, and the note above
            // and each open card give a keyboard the full names. A tap opens the tip, as no hover can. Below,
            // as above would run under the bar when the row is stuck.
            <IconTip key={role.name} tip={role.name} placement="below" opensOnPress>
              <span className="access-cards__short">{role.short}</span>
            </IconTip>
          ))}
        </div>
        {rows.map(({ data, cells }, row) => (
          <details key={data} className="access-cards__card" aria-labelledby={`${id}-${row}`}>
            <summary className="access-cards__row access-cards__summary">
              <span className="access-cards__name" id={`${id}-${row}`}>
                {data}
              </span>
              {cells.map((cell, index) => (
                <Mark
                  key={roles[index].name}
                  mark={cell.mark}
                  spoken={`${roles[index].name}: ${MARK_WORD[cell.mark]}.`}
                />
              ))}
              <ChevronIcon className="access-cards__chevron" />
            </summary>
            <dl className="access-cards__detail">
              {cells.map((cell, index) => (
                <div key={roles[index].name}>
                  <Mark mark={cell.mark} spoken={`${MARK_WORD[cell.mark]}.`} />
                  <dt>{roles[index].name}</dt>
                  <dd>{cell.text}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
};

export default AccessCards;
