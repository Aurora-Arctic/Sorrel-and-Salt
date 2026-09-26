import type { CSSProperties, ReactElement, ReactNode } from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render,
} from '@react-email/components';
import { EMAIL_THEMES } from '../theme';
import { ORNAMENTS, ornamentPath, type Corner } from '../ornaments';

// Every mail's frame: the site's palette, type and corner photographs
// (claude-docs/email.md, "Design"). Dark is written inline, because clients
// that ignore `prefers-color-scheme` (Gmail) also ignore most <style>; light
// is the override in the one media query, for the clients that honour it.

const { dark, light } = EMAIL_THEMES;

/** The one media query the light theme sits under; the workshop preview rewrites it to show either theme. */
export const LIGHT_MEDIA = '@media (prefers-color-scheme: light)';

const BODY_FONT = 'Lexend, Arial, Helvetica, sans-serif';
const HEADING_FONT = "'Cormorant Unicase', Georgia, 'Times New Roman', serif";

// Our own copy first; Google's only if ours fails to load, so an opened mail
// normally asks nothing of Google. Both are the latin subset Google serves.
const FONT_FACES = [
  {
    family: 'Cormorant Unicase',
    weight: '700',
    file: 'cormorant-unicase-700-latin.woff2',
    google:
      'https://fonts.gstatic.com/s/cormorantunicase/v25/HI_ViZUaILtOqhqgDeXoF_n1_fTGX9Nvsdco5m2WDgzT.woff2',
  },
  {
    family: 'Lexend',
    // One variable file covers every weight.
    weight: '300 700',
    file: 'lexend-latin.woff2',
    google: 'https://fonts.gstatic.com/s/lexend/v26/wlpwgwvFAVdoq2_v-6QU82RHaA.woff2',
  },
];

function stylesheet(origin: string): string {
  const faces = FONT_FACES.map(
    ({ family, weight, file, google }) =>
      `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;` +
      `src:url('${origin}/email/fonts/${file}') format('woff2'),url('${google}') format('woff2');}`,
  ).join('');
  return (
    faces +
    `${LIGHT_MEDIA}{` +
    // React Email's Body repeats the page style on the one cell it wraps everything in.
    `.ss-page,.ss-page>table>tbody>tr>td{background-color:${light.page}!important;color:${light.text}!important;}` +
    `.ss-text{color:${light.text}!important;}` +
    `.ss-muted{color:${light.muted}!important;}` +
    `.ss-link{color:${light.accent}!important;}` +
    `.ss-wordmark{color:${light.text}!important;}` +
    `.ss-button{background-color:${light.accent}!important;color:${light.onAccent}!important;}` +
    `.ss-sorrel{background-image:url(${origin}${ornamentPath('sorrel', 'light')})!important;}` +
    `.ss-salt{background-image:url(${origin}${ornamentPath('salt', 'light')})!important;}` +
    '}'
  );
}

// How far each photograph runs under the text, in CSS pixels.
const OVERLAP = 56;

// The wordmark's row, top right, beside the sorrel.
const WORDMARK_TOP = 24;
const WORDMARK_LINE = 24;

/** One corner photograph as the background of a section; the light one is the media query's. */
function ornament(corner: Corner, origin: string, position: string): CSSProperties {
  const { width, height } = ORNAMENTS[corner];
  return {
    backgroundImage: `url(${origin}${ornamentPath(corner, 'dark')})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: position,
    backgroundSize: `${width}px ${height}px`,
  };
}

interface EmailLayoutProps {
  /** The line a client shows beside the subject in the inbox. */
  preview: string;
  heading: string;
  /** The site's origin, which serves the images and fonts under /email/. */
  origin: string;
  children: ReactNode;
}

export function EmailLayout({ preview, heading, origin, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        {/* Tells Apple Mail the mail has its own dark and light, so it does not invert it. */}
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
        <style dangerouslySetInnerHTML={{ __html: stylesheet(origin) }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="ss-page"
        style={{
          margin: 0,
          padding: '0 0 24px',
          backgroundColor: dark.page,
          color: dark.text,
          fontFamily: BODY_FONT,
          fontWeight: 300,
        }}
      >
        {/* Backgrounds rather than images, so the text can run over their edges:
            Gmail strips the negative margins an overlap would otherwise take. */}
        <Container style={{ maxWidth: '600px' }}>
          <Section className="ss-sorrel" style={ornament('sorrel', origin, 'left top')}>
            <Section className="ss-salt" style={ornament('salt', origin, 'right bottom')}>
              <Section style={{ padding: `${WORDMARK_TOP}px 32px 0` }}>
                <Text style={{ margin: 0, textAlign: 'right', lineHeight: `${WORDMARK_LINE}px` }}>
                  <Link
                    href={origin}
                    className="ss-wordmark"
                    style={{
                      color: dark.text,
                      fontFamily: HEADING_FONT,
                      fontSize: '21px',
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                      textDecoration: 'none',
                    }}
                  >
                    Sorrel &amp; Salt
                  </Link>
                </Text>
              </Section>
              <Section
                style={{
                  // The heading starts OVERLAP above the sorrel's lower edge.
                  padding: `${ORNAMENTS.sorrel.height - OVERLAP - WORDMARK_TOP - WORDMARK_LINE}px 32px ${ORNAMENTS.salt.height - OVERLAP}px`,
                }}
              >
                <Heading
                  as="h1"
                  className="ss-text"
                  style={{
                    margin: '0 0 16px',
                    color: dark.text,
                    fontFamily: HEADING_FONT,
                    fontSize: '32px',
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    lineHeight: 1.2,
                  }}
                >
                  {heading}
                </Heading>
                {children}
              </Section>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function Paragraph({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text
      className={muted ? 'ss-muted' : 'ss-text'}
      style={{
        margin: '0 0 16px',
        color: muted ? dark.muted : dark.text,
        fontSize: muted ? '14px' : '16px',
        lineHeight: 1.6,
      }}
    >
      {children}
    </Text>
  );
}

/** The one thing to do. The HTML has a button, with the link written out for a client that hides buttons; the text part has the link once. */
export function Action({ href, label, part }: { href: string; label: string; part: Part }) {
  if (part === 'text') return <Paragraph>{href}</Paragraph>;
  return (
    <>
      <Section style={{ margin: '8px 0 24px' }}>
        <Button
          href={href}
          className="ss-button"
          style={{
            backgroundColor: dark.accent,
            color: dark.onAccent,
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {label}
        </Button>
      </Section>
      <Paragraph muted>
        Or copy this link into your browser:
        <br />
        <Link
          href={href}
          className="ss-link"
          style={{ color: dark.accent, wordBreak: 'break-all' }}
        >
          {href}
        </Link>
      </Paragraph>
    </>
  );
}

/**
 * Which part of the message is rendering. Where the two media differ, a
 * template words each its own way. A prop, never React context or state:
 * src/lib/auth.ts imports the templates, so Next compiles them as server
 * components, where `createContext` does not exist.
 */
export type Part = 'html' | 'text';

/** Renders a template once per part, so the text part is written for text rather than stripped from the HTML. */
export async function renderParts(
  email: (part: Part) => ReactElement,
): Promise<{ html: string; text: string }> {
  return {
    html: await render(email('html')),
    text: await render(email('text'), {
      plainText: true,
      // Headings as written: the converter capitalises them by default.
      htmlToTextOptions: { selectors: [{ selector: 'h1', options: { uppercase: false } }] },
    }),
  };
}
