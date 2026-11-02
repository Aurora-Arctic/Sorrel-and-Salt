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
import { KEYS } from 'platejs';
import {
  ParagraphPlugin,
  PlateElement,
  PlateLeaf,
  type PlateElementProps,
  type RenderNodeWrapper,
  type PlateLeafProps,
} from 'platejs/react';
import type { ReactElement } from 'react';
import remarkGfm from 'remark-gfm';

// The editor's nodes drawn as the public page draws them, so the text is edited looking as it will read: the same elements
// under `.document-page__body`. Each plugin is the one `markdown.ts` reads the text with, with a component added.

const heading = (tag: 'h2' | 'h3' | 'h4' | 'h5' | 'h6') =>
  function Heading(props: PlateElementProps): ReactElement {
    return <PlateElement as={tag} {...props} />;
  };

function Paragraph(props: PlateElementProps): ReactElement {
  return <PlateElement as="p" {...props} />;
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
  return (
    <PlateElement as="table" {...props}>
      <tbody>{props.children}</tbody>
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

/** A source mark: the note's number, raised, where the text refers to it. */
function FootnoteMark(
  props: PlateElementProps<{ type: 'footnoteReference'; identifier: string; children: never[] }>,
): ReactElement {
  return (
    <PlateElement as="sup" {...props}>
      [{props.element.identifier}]{props.children}
    </PlateElement>
  );
}

/** A source's entry: its number, then its text. */
function FootnoteEntry(
  props: PlateElementProps<{ type: 'footnoteDefinition'; identifier: string; children: never[] }>,
): ReactElement {
  return (
    <PlateElement {...props}>
      <span contentEditable={false}>[{props.element.identifier}]: </span>
      {props.children}
    </PlateElement>
  );
}

/** The list around a paragraph the list plugin marks as a list item. */
function List(props: PlateElementProps): ReactElement {
  const { listStyleType, listStart } = props.element as {
    listStyleType?: string;
    listStart?: number;
  };
  const Tag = listStyleType === 'decimal' ? 'ol' : 'ul';
  return (
    <Tag start={listStart} style={{ listStyleType, margin: 0, paddingInlineStart: '1.5rem' }}>
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

/** The plugins the editor runs. */
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
  TablePlugin.withComponent(Table),
  TableRowPlugin.withComponent(Row),
  TableCellPlugin.withComponent(Cell),
  TableCellHeaderPlugin.withComponent(HeaderCell),
  FootnoteReferencePlugin.withComponent(FootnoteMark),
  FootnoteDefinitionPlugin.withComponent(FootnoteEntry),
  MarkdownPlugin.configure({ options: { remarkPlugins: [remarkGfm] } }),
];
