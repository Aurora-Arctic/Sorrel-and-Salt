import type { CSSProperties, ReactElement, ReactNode } from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  render,
} from 'react-email';
import { EMAIL_THEMES } from '../theme';
import { ORNAMENTS, ornamentPath, type Corner } from '../ornaments';
import type { Message } from '../../lib/types';
import type { BaseEmailProps, MessageInput } from '../types';
import type { EmailLayoutProps, InkProps, Part } from './types';

// Every mail's frame: the site's palette, type and corner photographs
// (claude-docs/email.md, "Design"). Dark is written inline, because clients
// that ignore `prefers-color-scheme` (Gmail) also ignore most <style>; light
// is the override in the one media query, for the clients that honour it.
// Zoho Mail reads no <style> at all and, in its Night mode, inverts every
// inline colour it can see — so the dark is written in the two forms it leaves
// alone: a gradient for a background, and an anchor around every run of text
// (MB.262; the measurements are in email.md).

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
    // Under `screen` because Outlook for Windows (the Word engine) skips the
    // block: it then never sees a first face it has not installed, and falls to
    // the next font in the stack instead of Times New Roman.
    `@media screen{${faces}}` +
    `${LIGHT_MEDIA}{` +
    // Every light rule hangs off the one page cell, so a client applies all of
    // them or none. A bare class per element let a client keep the text rules
    // and drop the page rule, which rendered dark text on the dark page.
    // `background`, not `background-color`: the shorthand also clears the
    // gradient the inline dark is painted with.
    `.ss-page{background:${light.page}!important;color:${light.text}!important;}` +
    `.ss-page .ss-text{color:${light.text}!important;}` +
    `.ss-page .ss-muted{color:${light.muted}!important;}` +
    `.ss-page .ss-link{color:${light.accent}!important;}` +
    `.ss-page .ss-wordmark{color:${light.text}!important;}` +
    `.ss-page .ss-button{background:${light.accent}!important;color:${light.onAccent}!important;}` +
    `.ss-page .ss-sorrel{background-image:url(${origin}${ornamentPath('sorrel', 'light')})!important;}` +
    `.ss-page .ss-salt{background-image:url(${origin}${ornamentPath('salt', 'light')})!important;}` +
    // The surround outside the page cell; readable whichever way it goes.
    `.ss-body{background:${light.page}!important;}` +
    '}'
  );
}

// How far the sorrel runs under the heading, in CSS pixels. Only the 32px bold
// heading meets it, at 4.78:1 (measured in MB.118).
const OVERLAP = 56;

// Word treats a unitless or fractional line height unreliably; this makes it keep the pixel one.
// React's CSSProperties does not list the Word-only property, hence the cast.
const EXACT_LINES = { msoLineHeightRule: 'exactly' } as CSSProperties;

// The margin every Paragraph ends on. The salt's padding is built from it, so
// the photograph meets the text block's edge and never an icon: measured in
// MB.118, the light salt's darkest pixel holds the muted ink at 2.14:1 and the
// link at 1.66:1, and no opacity fixes the link.
const PARAGRAPH_GAP = 16;

// The wordmark's row, top right, beside the sorrel.
const WORDMARK_TOP = 24;
const WORDMARK_LINE = 24;

/**
 * A background Zoho Mail's Night mode keeps: it inverts a `background-color`
 * and leaves a gradient alone, so the colour is painted twice, as itself and
 * as a one-colour gradient over it. The shorthand, because Gmail for Android
 * mangles a gradient written as `background-image` (email-bugs#135).
 */
function paint(color: string): string {
  return `${color} linear-gradient(${color},${color})`;
}

// Zoho leaves an <a> alone when its background is an image of any kind — it
// cannot judge the contrast, so it does not try — and this gradient paints
// nothing. It is what lets a run of text keep its colour there.
const INK_BACKGROUND = 'linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0))';

/**
 * A run of text in the one element Zoho Mail's Night mode does not recolour:
 * an anchor over a (transparent) gradient. No `href`, so it is text, not a
 * link; the text must sit directly inside it, since Zoho still rewrites any
 * element nested within.
 */
function Ink({ className, color, font, children }: InkProps) {
  return (
    // oxlint-disable-next-line jsx-a11y/anchor-is-valid -- an anchor with no href is the point: it is text that Zoho Mail Night mode leaves uncoloured
    <a
      className={className}
      style={{ background: INK_BACKGROUND, color, fontFamily: font, textDecoration: 'none' }}
    >
      {children}
    </a>
  );
}

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

// Outlook for Windows ignores `max-width`, so the container sits in a fixed-width
// table only it reads. React cannot write a comment, so the layout renders
// these two placeholders and `renderParts` swaps each for its conditional
// comment in the HTML part.
const MSO_OPEN = '<span data-mso="open"></span>';
const MSO_CLOSE = '<span data-mso="close"></span>';
const MSO_OPEN_COMMENT =
  '<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->';
const MSO_CLOSE_COMMENT = '<!--[if mso]></td></tr></table><![endif]-->';

/** A padded block as a table of its own: Word honours padding only on a cell, not on a Section's. */
function PaddedCell({ padding, children }: { padding: string; children: ReactNode }) {
  return (
    <table role="presentation" width="100%" border={0} cellPadding={0} cellSpacing={0}>
      <tbody>
        <tr>
          <td style={{ padding }}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function EmailLayout({ preview, heading, origin, children }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        {/* Tells Apple Mail the mail has its own dark and light, so it does not invert it. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
        <style dangerouslySetInnerHTML={{ __html: stylesheet(origin) }} />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        className="ss-body"
        style={{
          margin: 0,
          padding: 0,
          background: paint(dark.page),
          color: dark.text,
          fontFamily: BODY_FONT,
          fontWeight: 300,
        }}
      >
        {/* The page colour on one cell of our own, the one element every light
            rule is scoped beneath; Section cannot put a class on its cell. */}
        <table
          role="presentation"
          width="100%"
          border={0}
          cellPadding={0}
          cellSpacing={0}
          align="center"
        >
          <tbody>
            <tr>
              <td
                className="ss-page"
                style={{ background: paint(dark.page), color: dark.text, padding: '0 0 24px' }}
              >
                <span data-mso="open" />
                {/* Backgrounds rather than images, so the text can run over their edges:
              Gmail strips the negative margins an overlap would otherwise take. */}
                <Container style={{ maxWidth: '600px' }}>
                  <Section className="ss-sorrel" style={ornament('sorrel', origin, 'left top')}>
                    <Section className="ss-salt" style={ornament('salt', origin, 'right bottom')}>
                      <PaddedCell padding={`${WORDMARK_TOP}px 32px 0`}>
                        <Text
                          style={{
                            margin: 0,
                            textAlign: 'right',
                            lineHeight: `${WORDMARK_LINE}px`,
                          }}
                        >
                          <Link
                            href={origin}
                            className="ss-wordmark"
                            style={{
                              background: INK_BACKGROUND,
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
                      </PaddedCell>
                      <PaddedCell
                        // The heading starts OVERLAP above the sorrel's lower edge.
                        padding={`${ORNAMENTS.sorrel.height - OVERLAP - WORDMARK_TOP - WORDMARK_LINE}px 32px ${ORNAMENTS.salt.height - PARAGRAPH_GAP}px`}
                      >
                        <Heading
                          as="h1"
                          style={{
                            margin: '0 0 16px',
                            color: dark.text,
                            fontFamily: HEADING_FONT,
                            fontSize: '32px',
                            fontWeight: 700,
                            letterSpacing: '0.01em',
                            lineHeight: '38px',
                            ...EXACT_LINES,
                          }}
                        >
                          <Ink className="ss-text" color={dark.text} font={HEADING_FONT}>
                            {heading}
                          </Ink>
                        </Heading>
                        {children}
                      </PaddedCell>
                    </Section>
                  </Section>
                </Container>
                <span data-mso="close" />
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

/** A paragraph's own style; the colour is repeated on the Ink inside it, which is what Zoho reads. */
function paragraphStyle(muted: boolean): CSSProperties {
  return {
    margin: `0 0 ${PARAGRAPH_GAP}px`,
    color: muted ? dark.muted : dark.text,
    fontFamily: BODY_FONT,
    fontSize: muted ? '14px' : '16px',
    lineHeight: muted ? '22px' : '26px',
    ...EXACT_LINES,
  };
}

/** A paragraph of text only: a link inside one goes through `Action`, since an anchor cannot nest. */
export function Paragraph({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text style={paragraphStyle(muted)}>
      <Ink className={muted ? 'ss-muted' : 'ss-text'} color={muted ? dark.muted : dark.text}>
        {children}
      </Ink>
    </Text>
  );
}

/** The one thing to do. The HTML has a button, with the link written out for a client that hides buttons; the text part has the link once. */
export function Action({ href, label, part }: { href: string; label: string; part: Part }) {
  if (part === 'text') return <Paragraph>{href}</Paragraph>;
  return (
    <>
      {/* The button is an anchor of our own, not React Email's, whose label
          sits in a nested span Zoho would recolour. A gradient alone paints
          it, so Zoho has no colour to invert; the cell's `bgcolor` is for
          Word, which draws no gradient, and the anchor covers it elsewhere. */}
      <table
        role="presentation"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={{ margin: '8px 0 24px' }}
      >
        <tbody>
          <tr>
            <td {...{ bgcolor: dark.accent }} style={{ borderRadius: '8px' }}>
              <a
                href={href}
                target="_blank"
                className="ss-button"
                style={{
                  display: 'block',
                  background: `linear-gradient(${dark.accent},${dark.accent})`,
                  color: dark.onAccent,
                  borderRadius: '8px',
                  padding: '14px 24px',
                  fontFamily: BODY_FONT,
                  fontSize: '16px',
                  fontWeight: 500,
                  lineHeight: '20px',
                  textDecoration: 'none',
                  ...EXACT_LINES,
                }}
              >
                {label}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <Text style={paragraphStyle(true)}>
        <Ink className="ss-muted" color={dark.muted}>
          Or copy this link into your browser:
        </Ink>
        <br />
        <Link
          href={href}
          className="ss-link"
          style={{
            background: INK_BACKGROUND,
            color: dark.accent,
            fontFamily: BODY_FONT,
            wordBreak: 'break-all',
          }}
        >
          {href}
        </Link>
      </Text>
    </>
  );
}

/**
 * What a sentence tells the reader to do with the `Action`: the HTML has a
 * button, and the text part a link with nothing to click.
 */
export function actionVerb(part: Part): string {
  return part === 'html' ? 'click the button below' : 'open the link below';
}

/**
 * The closing line every mail ends on: whoever did not ask for it can ignore
 * it. `when` is the template's own way of saying who that is. One string,
 * not JSX text around an expression, which React renders with a `<!-- -->`
 * between the two in the HTML.
 */
export function IgnoreNote({ when }: { when: string }) {
  return <Paragraph muted>{`${when}, you can ignore this email.`}</Paragraph>;
}

/** Renders a template once per part, so the text part is written for text rather than stripped from the HTML. */
export async function renderParts(
  email: (part: Part) => ReactElement,
): Promise<{ html: string; text: string }> {
  return {
    html: (await render(email('html')))
      .replace(MSO_OPEN, MSO_OPEN_COMMENT)
      .replace(MSO_CLOSE, MSO_CLOSE_COMMENT),
    text: await render(email('text'), {
      plainText: true,
      htmlToTextOptions: {
        selectors: [
          // Headings as written: the converter capitalises them by default.
          { selector: 'h1', options: { uppercase: false } },
          // The wordmark's link is decoration; with its address the first one in the
          // text would be the site's, not the action's.
          { selector: 'a.ss-wordmark', format: 'anchor', options: { ignoreHref: true } },
        ],
      },
    }),
  };
}

/**
 * A template's message function: `subject` and `to`, and the template
 * rendered to both parts `send` takes, so a caller never renders anything
 * itself. The template is handed `to` along with its own props and ignores
 * it: dropping it first would leave a generic `Omit` TypeScript cannot
 * prove is the template's props again. `subject` is a function when the
 * subject names something the message carries, such as a coven.
 */
export function defineMessage<Props extends BaseEmailProps>(
  subject: string | ((input: MessageInput<Props>) => string),
  Template: (props: Omit<Props, 'part'> & { part: Part }) => ReactElement,
): (input: MessageInput<Props>) => Promise<Message> {
  return async (input) => ({
    to: input.to,
    subject: typeof subject === 'function' ? subject(input) : subject,
    ...(await renderParts((part) => <Template {...input} part={part} />)),
  });
}
