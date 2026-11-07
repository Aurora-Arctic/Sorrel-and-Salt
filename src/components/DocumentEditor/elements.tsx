'use client';

import {
  BlockquotePlugin,
  BoldPlugin,
  CodePlugin,
  H2Plugin,
  H3Plugin,
  H4Plugin,
  H5Plugin,
  H6Plugin,
  HorizontalRulePlugin,
  ItalicPlugin,
  StrikethroughPlugin,
} from '@platejs/basic-nodes/react';
import { FootnoteDefinitionPlugin, FootnoteReferencePlugin } from '@platejs/footnote/react';
import { IndentPlugin } from '@platejs/indent/react';
import { LinkPlugin } from '@platejs/link/react';
import { ListPlugin } from '@platejs/list/react';
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from '@platejs/table/react';
import { MarkdownPlugin } from '@platejs/markdown';
import { isUrl, KEYS } from 'platejs';
import {
  createPlatePlugin,
  ParagraphPlugin,
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type RenderNodeWrapper,
  type PlateLeafProps,
} from 'platejs/react';
import { Children, type ReactElement } from 'react';
import remarkGfm from 'remark-gfm';

// The editor's nodes drawn as the public page draws them, so the text is edited looking as it will read: the same elements
// under `.document-page__body`. Each plugin is the one `markdown.ts` reads the text with, with a component added.

const heading = (tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
  function Heading(props: PlateElementProps): ReactElement {
    return <PlateElement as={tag} {...props} />;
  };

// A list item's paragraph is a `div`, since the list wrapper draws a `<ul>` inside it and a `<p>` cannot hold one.
// It drops the indent plugin's margin, as the list's own padding is the indent the public page draws.
function Paragraph(props: PlateElementProps): ReactElement {
  const listed = Boolean((props.element as { listStyleType?: string }).listStyleType);
  return listed ? (
    <PlateElement as="div" {...props} style={{ ...props.style, marginLeft: undefined }} />
  ) : (
    <PlateElement as="p" {...props} />
  );
}

function Quote(props: PlateElementProps): ReactElement {
  return <PlateElement as="blockquote" {...props} />;
}

function Rule(props: PlateElementProps): ReactElement {
  return (
    <PlateElement {...props}>
      <hr />
      {props.children}
    </PlateElement>
  );
}

function Link(
  props: PlateElementProps<{ type: 'a'; url: string; children: never[] }>,
): ReactElement {
  return (
    <PlateElement as="a" {...props} attributes={{ ...props.attributes, href: props.element.url }} />
  );
}

function Table(props: PlateElementProps): ReactElement {
  const [head, ...body] = Children.toArray(props.children);
  return (
    <PlateElement {...props} className="data-table-frame">
      <table className="data-table">
        <thead>{head}</thead>
        <tbody>{body}</tbody>
      </table>
    </PlateElement>
  );
}

function Row(props: PlateElementProps): ReactElement {
  return <PlateElement as="tr" {...props} />;
}

function Cell(props: PlateElementProps): ReactElement {
  return <PlateElement as="td" {...props} />;
}

function HeaderCell(props: PlateElementProps): ReactElement {
  return <PlateElement as="th" {...props} />;
}

function FootnoteMark(
  props: PlateElementProps<{ type: 'footnoteReference'; identifier: string; children: never[] }>,
): ReactElement {
  return (
    <PlateElement as="sup" {...props} className="document-page__marks">
      <span contentEditable={false}>{props.element.identifier}</span>
      {props.children}
    </PlateElement>
  );
}

function FootnoteEntry(
  props: PlateElementProps<{ type: 'footnoteDefinition'; identifier: string; children: never[] }>,
): ReactElement {
  const start = Number(props.element.identifier);
  const before = props.editor.children[props.path[0] - 1] as { type?: string } | undefined;
  return (
    <PlateElement {...props}>
      {/* The heading the public page adds above its footnotes, drawn and never saved, as the markdown holds none. */}
      {before?.type !== props.element.type && <h2 contentEditable={false}>Sources</h2>}
      <ol className="document-page__sources" start={Number.isInteger(start) ? start : undefined}>
        <li className="document-page__source">{props.children}</li>
      </ol>
    </PlateElement>
  );
}

function List(props: PlateElementProps): ReactElement {
  const {
    listStyleType,
    listStart,
    indent = 1,
  } = props.element as {
    listStyleType?: string;
    listStart?: number;
    indent?: number;
  };
  const inset = `calc(${indent} * 1.25rem)`;
  const ordered = listStyleType === 'decimal';
  const Tag = ordered ? 'ol' : 'ul';
  // A bulleted list keeps the typography's drawn ✦ alone, as the public page does; a browser bullet would sit behind it.
  return (
    <Tag
      start={listStart}
      style={{
        listStyleType: ordered ? listStyleType : undefined,
        margin: 0,
        paddingInlineStart: inset,
      }}
    >
      <li>{props.children}</li>
    </Tag>
  );
}

/** Wraps a block in a list only when it carries a list style. */
const listItem: RenderNodeWrapper = (props) => {
  if (!(props.element as { listStyleType?: string }).listStyleType) return undefined;
  return (wrapped) => <List {...wrapped} />;
};

const mark = (tag: 'strong' | 'em' | 's' | 'code') =>
  function Mark(props: PlateLeafProps): ReactElement {
    return <PlateLeaf as={tag} {...props} />;
  };

// Shift+Tab on a block with no indent moves focus out of the text, where the indent plugin would swallow it and trap the keyboard.
const TabEscapePlugin = createPlatePlugin({ key: 'tabEscape' }).overrideEditor(
  ({ editor, tf: { tab } }) => ({
    transforms: {
      tab(options) {
        const entry = options.reverse ? editor.api.block() : undefined;
        if (entry && !(entry[0] as { indent?: number }).indent) {
          const inQuote = editor.api.above({
            at: entry[1],
            match: (node) => (node as { type?: string }).type === editor.getType(KEYS.blockquote),
          });
          if (!inQuote) return false;
        }
        return tab(options);
      },
    },
  }),
);

/** Whether a clipboard's HTML is a code editor's rendering of its text: one pre-formatted block, so the plain text is the source. */
function isPreformatted(html: string): boolean {
  const blocks = [...new DOMParser().parseFromString(html, 'text/html').body.children];
  const [block] = blocks;
  return (
    blocks.length === 1 &&
    (block.tagName === 'PRE' || /^pre/.test((block as HTMLElement).style.whiteSpace))
  );
}

// Plain text is read as markdown, as Plate does, and so is a code editor's copy, whose HTML is only the text highlighted:
// VS Code marks its copy with `vscode-editor-data`, and any editor's rendering is one pre-formatted block.
// A function extension, since the package sets its parser in one and a plain object is merged beneath it.
const PasteMarkdownPlugin = MarkdownPlugin.configure({
  options: { remarkPlugins: [remarkGfm] },
}).extend(() => ({
  parser: {
    query: ({ data, dataTransfer }: { data: string; dataTransfer: DataTransfer }) => {
      const html = dataTransfer.getData('text/html');
      if (html && !dataTransfer.types.includes('vscode-editor-data') && !isPreformatted(html))
        return false;
      // A lone address is left to the link plugin, as Plate leaves it.
      return Boolean(dataTransfer.files?.length) || !isUrl(data);
    },
  },
}));

export const editorPlugins = [
  ParagraphPlugin.withComponent(Paragraph),
  H2Plugin.withComponent(heading('h2')),
  H3Plugin.withComponent(heading('h3')),
  H4Plugin.withComponent(heading('h4')),
  H5Plugin.withComponent(heading('h5')),
  H6Plugin.withComponent(heading('h6')),
  BlockquotePlugin.withComponent(Quote),
  HorizontalRulePlugin.withComponent(Rule),
  BoldPlugin.withComponent(mark('strong')),
  ItalicPlugin.withComponent(mark('em')),
  StrikethroughPlugin.withComponent(mark('s')),
  CodePlugin.withComponent(mark('code')),
  LinkPlugin.withComponent(Link),
  IndentPlugin.configure({
    inject: {
      targetPlugins: [KEYS.p, KEYS.h2, KEYS.h3, KEYS.h4, KEYS.h5, KEYS.h6, KEYS.blockquote],
    },
  }),
  ListPlugin.configure({
    inject: {
      targetPlugins: [KEYS.p, KEYS.h2, KEYS.h3, KEYS.h4, KEYS.h5, KEYS.h6, KEYS.blockquote],
    },
    render: { belowNodes: listItem },
  }),
  TabEscapePlugin,
  TablePlugin.withComponent(Table),
  TableRowPlugin.withComponent(Row),
  TableCellPlugin.withComponent(Cell),
  TableCellHeaderPlugin.withComponent(HeaderCell),
  FootnoteReferencePlugin.withComponent(FootnoteMark),
  FootnoteDefinitionPlugin.withComponent(FootnoteEntry),
  PasteMarkdownPlugin,
];
