import { type ReactElement, useId } from 'react';
import LocalTime from '../LocalTime';

// A request's thread (times short, `30 Oct, 2:01 pm`): the sender's message, then each reply, each with who wrote it, a tag and when. The
// caller says what to call each author, so staff see names and the sender sees "You" and "Staff".

export interface SupportThreadEntry {
  id: string;
  /** Who wrote it; left out where the tag alone says so. */
  name?: string;
  tag: string;
  /** A staff-only note: its tag reads "Staff · Internal", with Internal in the warning ink. */
  internal?: boolean;
  at: Date;
  body: string;
}

// `headingLevel` follows the title above it: 3 under a dialog’s title, 2 on a page whose only heading above is its h1.
const SupportThread = ({
  entries,
  headingLevel = 3,
}: {
  entries: readonly SupportThreadEntry[];
  headingLevel?: 2 | 3;
}): ReactElement => {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby={headingId}>
      <Heading id={headingId} className="support-detail__thread-title">
        Thread
      </Heading>
      <ol className="support-detail__thread">
        {entries.map((entry) => (
          <li key={entry.id} className="support-detail__entry">
            <div className="support-detail__meta">
              {entry.name && <strong>{entry.name}</strong>}
              <span className="support-detail__tag">
                {entry.internal ? (
                  <>
                    {entry.tag} · <span className="support-detail__internal">Internal</span>
                  </>
                ) : (
                  entry.tag
                )}
              </span>
              <LocalTime at={entry.at} short="minute" />
            </div>
            <p>{entry.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default SupportThread;
