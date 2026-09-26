import { useEffect, useState } from 'react';
import type { Message } from '../src/lib/mail';
import { LIGHT_MEDIA } from '../src/emails/parts/layout';

// Shows a mail as a client would: the HTML in an iframe, so neither the
// workshop's styles nor its document reach it, and the plain-text part beneath.
// See claude-docs/workshop.md, "Mail templates".

/** The workshop's own origin, which serves public/ and so the mail's images and fonts. */
export const WORKSHOP_ORIGIN = typeof window === 'undefined' ? '' : window.location.origin;

/**
 * The mail as a client in `scheme` would apply it. A framed document's
 * `prefers-color-scheme` follows the browser, not the frame's `color-scheme`,
 * so the toolbar cannot reach the mail's media query; its one light block is
 * made to always or never apply instead.
 */
function inScheme(html: string, scheme: 'dark' | 'light'): string {
  return html.replace(LIGHT_MEDIA, scheme === 'light' ? '@media all' : '@media not all');
}

export default function EmailPreview({ message }: { message: () => Promise<Message> }) {
  const [rendered, setRendered] = useState<(Message & { scheme: 'dark' | 'light' }) | null>(null);
  const [height, setHeight] = useState(640);

  useEffect(() => {
    // After the workshop decorator's layout effect has set the theme, which
    // remounts the story on every switch, so this reads the current one; on
    // the toolbar's "auto" the page's color-scheme follows the system.
    const scheme = getComputedStyle(document.documentElement).colorScheme.includes('light')
      ? 'light'
      : 'dark';
    let live = true;
    message().then((result) => {
      if (live) setRendered({ ...result, scheme });
    });
    return () => {
      live = false;
    };
  }, [message]);

  if (!rendered) return <p>Rendering…</p>;

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: '720px' }}>
      <dl style={{ margin: 0 }}>
        <dt>To:</dt>
        <dd>{rendered.to}</dd>
        <dt>Subject:</dt>
        <dd>{rendered.subject}</dd>
      </dl>
      <iframe
        title={`HTML part: ${rendered.subject}`}
        srcDoc={inScheme(rendered.html, rendered.scheme)}
        style={{ width: '100%', height, border: 0 }}
        onLoad={(event) => {
          const document = event.currentTarget.contentDocument;
          if (document) setHeight(document.documentElement.scrollHeight);
        }}
      />
      <details>
        <summary>Plain-text part</summary>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{rendered.text}</pre>
      </details>
    </div>
  );
}
