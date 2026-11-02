import { useId, type ReactElement } from 'react';
import type { AccessCardsProps, AccessMark } from './types';
import './index.scss';

// Who may see each kind of data, as one card per kind: its summary line carries a mark per role,
// and opening it shows every role's full wording. A row of role labels over the cards shares the
// cards' columns and pins to the top of the window while they scroll past. Native `<details>`, so
// it reads and opens with no script (claude-docs/components/access-cards.md).

const MARK_WORD: Record<AccessMark, string> = { yes: 'Yes', part: 'In Part', no: 'No' };

// The mark's drawing is CSS; the hidden text, where given, is what a screen reader gets in its place.
const Mark = ({ mark, spoken }: { mark: AccessMark; spoken?: string }): ReactElement => (
  <span className={`access-cards__mark access-cards__mark--${mark}`}>
    {spoken && <span className="access-cards__spoken">{spoken}</span>}
  </span>
);

const Chevron = (): ReactElement => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6l5 5 5-5" />
  </svg>
);

// Each card is named by its kind of data alone, not by the marks' hidden text on the same line.
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
            <abbr key={role.name} title={role.name}>
              {role.short}
            </abbr>
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
              <span className="access-cards__chevron">
                <Chevron />
              </span>
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
