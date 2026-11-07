import { BaseBasicBlocksPlugin, BaseBasicMarksPlugin } from '@platejs/basic-nodes';
import { BaseFootnoteDefinitionPlugin, BaseFootnoteReferencePlugin } from '@platejs/footnote';
import { BaseLinkPlugin } from '@platejs/link';
import { BaseListPlugin } from '@platejs/list';
import { MarkdownPlugin } from '@platejs/markdown';
import {
  BaseTableCellHeaderPlugin,
  BaseTableCellPlugin,
  BaseTablePlugin,
  BaseTableRowPlugin,
} from '@platejs/table';
import { createSlateEditor, type Value } from 'platejs';
import remarkGfm from 'remark-gfm';

export const documentPlugins = [
  BaseBasicBlocksPlugin,
  BaseBasicMarksPlugin,
  BaseLinkPlugin,
  BaseListPlugin,
  BaseTablePlugin,
  BaseTableRowPlugin,
  BaseTableCellPlugin,
  BaseTableCellHeaderPlugin,
  BaseFootnoteDefinitionPlugin,
  BaseFootnoteReferencePlugin,
  MarkdownPlugin.configure({ options: { remarkPlugins: [remarkGfm] } }),
];

const stringifyOptions = {
  bullet: '-',
  emphasis: '_',
  strong: '*',
  rule: '-',
  listItemIndent: 'one',
} as const;

function markdownEditor() {
  return createSlateEditor({ plugins: documentPlugins });
}

export function markdownToEditorValue(markdown: string): Value {
  return markdownEditor().getApi(MarkdownPlugin).markdown.deserialize(markdown) as Value;
}

const emptyCell = /(\| )\u200B(?= \|)/g;
const emptyDefinition = /^(\[\^[^\]]+\]:) \u200B$/gm;

export function editorValueToMarkdown(value: Value): string {
  const editor = markdownEditor();
  return editor
    .getApi(MarkdownPlugin)
    .markdown.serialize({ value, remarkStringifyOptions: stringifyOptions })
    .replace(emptyCell, '$1')
    .replace(emptyDefinition, '$1')
    .trimEnd();
}
