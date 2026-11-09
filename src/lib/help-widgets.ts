import { textRuns } from './help-marks';

// The widgets a help body may place, as `::widget[name]` on a paragraph of its own (claude-docs/components/help-pages.md,
// "Widgets"). `HelpWidget` draws each; the help service refuses a body naming any other.

export const HELP_WIDGETS = [
  'unit-converter',
  'invitation-refusals',
  'role-permission-table',
  'autosave-status',
] as const;

export type HelpWidgetName = (typeof HELP_WIDGETS)[number];

const TAG = /::widget\[([^[\]\n]+)\]/g;
const ALONE = /^::widget\[([^[\]\n]+)\]$/;

const isWidget = (name: string): name is HelpWidgetName =>
  (HELP_WIDGETS as readonly string[]).includes(name);

/** The name each tag in a Markdown body gives, in order; a tag in code is not a tag. */
export function widgetsInMarkdown(body: string): string[] {
  return textRuns(body).flatMap((run) => [...run.matchAll(TAG)].map((match) => match[1].trim()));
}

/** Each name a body's tags give that is not a widget, once. */
export function unknownWidgets(body: string): string[] {
  return [...new Set(widgetsInMarkdown(body).filter((name) => !isWidget(name)))];
}

/** The widget a paragraph places, when its whole text is one tag naming a widget. */
export function widgetOf(paragraph: string): HelpWidgetName | undefined {
  const name = ALONE.exec(paragraph.trim())?.[1].trim();
  return name !== undefined && isWidget(name) ? name : undefined;
}
