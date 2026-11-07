import { type ReactElement, useId } from 'react';
import LocalTime from '../LocalTime';

export interface SupportThreadEntry {
  id: string;
  name?: string;
  tag: string;
  internal?: boolean;
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
