import { type ReactElement, useId } from 'react';
import LocalTime from '../LocalTime';

// A request's thread (times short, `30 Oct, 2:01 pm`): the sender's message, then each reply, each with who wrote it, a tag and when. The
// caller says what to call each author, so staff see names and the sender sees "You" and "Staff".

export interface SupportThreadEntry {
  id: string;
  /** Who wrote it; left out where the tag alone says so. */
  name?: string;
  tag: string;
  at: Date;
  body: string;
}

const SupportThread = ({ entries }: { entries: readonly SupportThreadEntry[] }): ReactElement => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId}>Thread</h3>
      <ol className="support-detail__thread">
        {entries.map((entry) => (
          <li key={entry.id} className="support-detail__entry">
            <div className="support-detail__meta">
              {entry.name && <strong>{entry.name}</strong>}
              <span className="support-detail__tag">{entry.tag}</span>
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
