// The design sync's library entry: one explicit list of everything the sync's bundle
// (window.SorrelAndSalt) exposes. It replaces a script that wrote `export *` lines
// into dist/ after the build, because `export *` drops, without a word, a name that two
// modules both export, so a story found `undefined` (StockIcon, IconTip's glyph and
// StockBadge's component). Here a repeated name is a TypeScript error (TS2300, TS2308), and
// the `index` entry in .design-sync/vite.config.ts builds it with the components so they
// share chunks. A new component needs a line here (.design-sync/NOTES.md, "Re-sync risks").
// Value exports are named so a clash cannot hide; `export type *` carries the types.
export { default as AccountMenu } from '../src/components/AccountMenu';
export type * from '../src/components/AccountMenu';
export { default as AddIcon, ADDED_HOLD_MS } from '../src/components/AddIcon';
export type * from '../src/components/AddIcon';
export { default as AdminInvitations, InviteAdmin } from '../src/components/AdminInvitations';
export type * from '../src/components/AdminInvitations';
export { default as AdminNav, AdminContents } from '../src/components/AdminNav';
export type * from '../src/components/AdminNav';
export { default as AppShell } from '../src/components/AppShell';
export type * from '../src/components/AppShell';
export { default as Backdrop } from '../src/components/Backdrop';
export type * from '../src/components/Backdrop';
export { default as BusyButton } from '../src/components/BusyButton';
export type * from '../src/components/BusyButton';
export { default as CardDensitySwitch } from '../src/components/CardDensitySwitch';
export { default as CategoryChips, CATEGORY_CHIP_LIMIT } from '../src/components/CategoryChips';
export type * from '../src/components/CategoryChips';
export { default as CategoryPicker } from '../src/components/CategoryPicker';
export type * from '../src/components/CategoryPicker';
export { default as ChipColorField } from '../src/components/ChipColorField';
export type * from '../src/components/ChipColorField';
export { useClickFeedback } from '../src/components/ClickFeedback';
export type * from '../src/components/ClickFeedback';
export {
  default as Combobox,
  ComboboxEntry,
  ComboboxMultiSelect,
  ComboboxSelect,
  ComboboxSortableEntries,
} from '../src/components/Combobox';
export type * from '../src/components/Combobox';
export { default as CompendiumCards } from '../src/components/CompendiumCards';
export type * from '../src/components/CompendiumCards';
export { default as CompendiumList, emptyText } from '../src/components/CompendiumList';
export type * from '../src/components/CompendiumList';
export { default as ContextRow } from '../src/components/ContextRow';
export type * from '../src/components/ContextRow';
export { default as CovenCards } from '../src/components/CovenCards';
export type * from '../src/components/CovenCards';
export { default as CovenNav } from '../src/components/CovenNav';
export type * from '../src/components/CovenNav';
export { default as CovenSwitchTargets } from '../src/components/CovenSwitchTargets';
export type * from '../src/components/CovenSwitchTargets';
export { default as CreateWorkspaceForm } from '../src/components/CreateWorkspaceForm';
export type * from '../src/components/CreateWorkspaceForm';
export { default as CupboardEntryForm } from '../src/components/CupboardEntryForm';
export type * from '../src/components/CupboardEntryForm';
export { default as DataTable, GroupChip, updatedColumn } from '../src/components/DataTable';
export type * from '../src/components/DataTable';
export { default as DeleteWorkspaceButton } from '../src/components/DeleteWorkspaceButton';
export type * from '../src/components/DeleteWorkspaceButton';
export {
  default as EmailForm,
  CHANGE_STATUS,
  NO_EMAIL_STATUS,
  RESEND_DELAY_SECONDS,
  UNVERIFIED_STATUS,
  VERIFIED_STATUS,
} from '../src/components/EmailForm';
export type * from '../src/components/EmailForm';
export { default as EntryMarks, RecencyMark } from '../src/components/EntryMarks';
export type * from '../src/components/EntryMarks';
export { default as ErrorPage } from '../src/components/ErrorPage';
export type * from '../src/components/ErrorPage';
export { default as FacetCombobox } from '../src/components/FacetCombobox';
export type * from '../src/components/FacetCombobox';
export { default as FacetPanel, WIDE } from '../src/components/FacetPanel';
export type * from '../src/components/FacetPanel';
export {
  EditedFieldsContext,
  FieldError,
  FieldShell,
  FilterSelectField,
  FormActions,
  FormHistoryButtons,
  FormHistoryContext,
  RadioGroupField,
  ReasonField,
  Required,
  SearchField,
  SelectField,
  SwitchField,
  TextField,
  errorShown,
  fieldDescription,
  useEditedFields,
  useEditedFieldsContext,
  useField,
  useFormHistory,
  useFormHistoryContext,
  usePointerHeld,
  useSettledWhilePressed,
} from '../src/components/Field';
export type * from '../src/components/Field';
export { default as FilterForm, useApplyFilter } from '../src/components/FilterForm';
export type * from '../src/components/FilterForm';
export { default as FormIcon, SPOON } from '../src/components/FormIcon';
export type * from '../src/components/FormIcon';
export { default as GroupForm } from '../src/components/GroupForm';
export type * from '../src/components/GroupForm';
export { default as GroupList } from '../src/components/GroupList';
export type * from '../src/components/GroupList';
export { default as GroupedValueForm } from '../src/components/GroupedValueForm';
export type * from '../src/components/GroupedValueForm';
export { default as GroupedValueList } from '../src/components/GroupedValueList';
export type * from '../src/components/GroupedValueList';
export {
  default as IconTip,
  AnnotateButton,
  AnnotateIcon,
  AnnotateLink,
  BinButton,
  BinIcon,
  CauldronIcon,
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  CompendiumEditLink,
  CompleteIcon,
  CopyIcon,
  CrossIcon,
  DotsIcon,
  EditButton,
  EditLink,
  LinkIcon,
  MoreMenu,
  MysticEyeIcon,
  PencilIcon,
  PlusIcon,
  PreviewButton,
  PreviewIcon,
  PrintIcon,
  QuickLookButton,
  QuickLookLink,
  RecordButton,
  RedoIcon,
  UndoIcon,
} from '../src/components/IconTip';
export type * from '../src/components/IconTip';
export { default as ImpersonationBanner } from '../src/components/ImpersonationBanner';
export type * from '../src/components/ImpersonationBanner';
export { default as InfoTip } from '../src/components/InfoTip';
export type * from '../src/components/InfoTip';
export { default as IngredientCard } from '../src/components/IngredientCard';
export type * from '../src/components/IngredientCard';
export { default as IngredientCardList } from '../src/components/IngredientCardList';
export type * from '../src/components/IngredientCardList';
export { default as IngredientEntry } from '../src/components/IngredientEntry';
export type * from '../src/components/IngredientEntry';
export { default as IngredientForm } from '../src/components/IngredientForm';
export type * from '../src/components/IngredientForm';
export {
  default as IngredientSearch,
  IngredientSearchForm,
  useSearchText,
} from '../src/components/IngredientSearch';
export type * from '../src/components/IngredientSearch';
export { default as InvitationAcceptance } from '../src/components/InvitationAcceptance';
export type * from '../src/components/InvitationAcceptance';
export { default as InviteDialog } from '../src/components/InviteDialog';
export type * from '../src/components/InviteDialog';
export { default as JarLines } from '../src/components/JarLines';
export type * from '../src/components/JarLines';
export {
  default as JarShelf,
  JarDrawing,
  pickJarShape,
  ONE_OFF_HELD,
  BANDS_FULL,
} from '../src/components/JarShelf';
export type * from '../src/components/JarShelf';
export { default as LastEdit } from '../src/components/LastEdit';
export type * from '../src/components/LastEdit';
export { default as LeaveWorkspaceButton } from '../src/components/LeaveWorkspaceButton';
export type * from '../src/components/LeaveWorkspaceButton';
export { default as LinkHint, LinkIconHint } from '../src/components/LinkHint';
export type * from '../src/components/LinkHint';
export {
  default as ListFrame,
  ListBody,
  ListNavigationContext,
  useListNavigation,
} from '../src/components/ListFrame';
export type * from '../src/components/ListFrame';
export { default as MemberList } from '../src/components/MemberList';
export type * from '../src/components/MemberList';
export { default as MenuButton } from '../src/components/MenuButton';
export type * from '../src/components/MenuButton';
export {
  default as Modal,
  ConfirmOverlay,
  ConfirmQuestion,
  DiscardQuestion,
  HeaderNoteContext,
  HeaderSlotContext,
  ModalButton,
  RouteModal,
  RouteModalProvider,
  UNSAVED_CHANGES_LOST,
  useDiscardGuard,
  useModalHeaderNote,
  useModalHeaderSlot,
  useOpenModalClick,
} from '../src/components/Modal';
export type * from '../src/components/Modal';
export { default as NameForm } from '../src/components/NameForm';
export type * from '../src/components/NameForm';
export { default as NotAuthorized } from '../src/components/NotAuthorized';
export type * from '../src/components/NotAuthorized';
export { default as Notice } from '../src/components/Notice';
export type * from '../src/components/Notice';
export { default as PageHeader } from '../src/components/PageHeader';
export type * from '../src/components/PageHeader';
export { default as PageNav } from '../src/components/PageNav';
export type * from '../src/components/PageNav';
export { default as Pager } from '../src/components/Pager';
export type * from '../src/components/Pager';
export { default as PendingInvitations } from '../src/components/PendingInvitations';
export type * from '../src/components/PendingInvitations';
export { default as PrivilegeLedger } from '../src/components/PrivilegeLedger';
export type * from '../src/components/PrivilegeLedger';
export { default as ProviderMark } from '../src/components/ProviderMark';
export type * from '../src/components/ProviderMark';
export { default as PublicFrame } from '../src/components/PublicFrame';
export type * from '../src/components/PublicFrame';
export { default as ReceivedInvitations } from '../src/components/ReceivedInvitations';
export type * from '../src/components/ReceivedInvitations';
export {
  default as SafetyNote,
  CautionMark,
  SafetyMark,
  ToxicMark,
} from '../src/components/SafetyNote';
export type * from '../src/components/SafetyNote';
export { default as SearchSentence } from '../src/components/SearchSentence';
export type * from '../src/components/SearchSentence';
export { default as SectionBody } from '../src/components/SectionBody';
export type * from '../src/components/SectionBody';
export { default as SectionNav } from '../src/components/SectionNav';
export type * from '../src/components/SectionNav';
export { default as SignInMethods } from '../src/components/SignInMethods';
export type * from '../src/components/SignInMethods';
export { default as SignInPanel } from '../src/components/SignInPanel';
export type * from '../src/components/SignInPanel';
export { default as Skeleton } from '../src/components/Skeleton';
export type * from '../src/components/Skeleton';
export {
  SkeletonCover,
  SkeletonOverlay,
  heldPage,
  skeletonFadeHost,
  useLeavingSkeleton,
} from '../src/components/SkeletonFade';
export type * from '../src/components/SkeletonFade';
export { default as Spinner } from '../src/components/Spinner';
export type * from '../src/components/Spinner';
export { StockBadge, StockIcon, StockTip, stockState } from '../src/components/StockBadge';
export type * from '../src/components/StockBadge';
export {
  default as StockDialog,
  StockDialogModal,
  StockJarButton,
} from '../src/components/StockDialog';
export type * from '../src/components/StockDialog';
export {
  default as StockFields,
  EMPTY_STOCK,
  UNIT_OPTIONS,
  stockAmountsOf,
  stockFormValues,
  unitLabel,
} from '../src/components/StockFields';
export type * from '../src/components/StockFields';
export { default as TabbedPage } from '../src/components/TabbedPage';
export type * from '../src/components/TabbedPage';
export { default as ThemeToggle, applyTheme } from '../src/components/ThemeToggle';
export { default as UserDetail } from '../src/components/UserDetail';
export type * from '../src/components/UserDetail';
export { default as UserList, PauseControl } from '../src/components/UserList';
export type * from '../src/components/UserList';
export { default as Welcome } from '../src/components/Welcome';
export type * from '../src/components/Welcome';
export { default as WorkspaceSwitcher } from '../src/components/WorkspaceSwitcher';
export type * from '../src/components/WorkspaceSwitcher';
export type * from '../scripts/library-tokens';

// IconTip's glyph and StockBadge's component are both called StockIcon. The library carries
// StockBadge's, because a story-side module (SpellRecipe's aside) reaches it through the
// library; IconTip's story imports the glyph from its own file, so it needs no library name.

export * from './context-modules';
export { default as __providers } from '../src/app/providers';

// The grimoire: the spell list, card, builder, recipe, workings and the parts they share.
export {
  CollapsibleSection,
  FoldAll,
  FoldFlag,
  useFoldIds,
} from '../src/components/CollapsibleSection';
export type * from '../src/components/CollapsibleSection';
export { default as DateField } from '../src/components/DateField';
export type * from '../src/components/DateField';
export { default as GrimoireList } from '../src/components/GrimoireList';
export type * from '../src/components/GrimoireList';
export { default as JarLine } from '../src/components/JarLine';
export type * from '../src/components/JarLine';
export { default as MoonPhaseIcon } from '../src/components/MoonPhaseIcon';
export type * from '../src/components/MoonPhaseIcon';
export {
  default as RecordWorking,
  RecordWorkingDialog,
  CompleteWorkingAction,
} from '../src/components/RecordWorking';
export type * from '../src/components/RecordWorking';
export { default as SaveStatus, BURST_GAP_MS, RecoveryNotice } from '../src/components/SaveStatus';
export type * from '../src/components/SaveStatus';
export { default as SpellBuilder } from '../src/components/SpellBuilder';
export type * from '../src/components/SpellBuilder';
export {
  default as SpellCard,
  SpellCardFilters,
  UNTITLED_SPELL,
  SPELL_LOOK_PLACE,
} from '../src/components/SpellCard';
export type * from '../src/components/SpellCard';
export { default as SpellMarks } from '../src/components/SpellMarks';
export type * from '../src/components/SpellMarks';
export { default as SpellPreview } from '../src/components/SpellPreview';
export type * from '../src/components/SpellPreview';
export { default as SpellRecipe } from '../src/components/SpellRecipe';
export type * from '../src/components/SpellRecipe';
export { default as SpellWorkings } from '../src/components/SpellWorkings';
export type * from '../src/components/SpellWorkings';
export { default as StepRow, amountOf } from '../src/components/StepRow';
export type * from '../src/components/StepRow';
