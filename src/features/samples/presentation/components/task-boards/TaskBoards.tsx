import {
  For,
  Show,
  component,
  onCleanup,
  type BeatJsxChild,
} from "@ochairo/beat";
import {
  Badge,
  Button,
  Card,
  DateInput,
  Dialog,
  IconPlus,
  Input,
  MultiSelect,
  Popover,
  SearchInput,
  Select,
  Tab,
  TextArea,
  type MultiSelectOption,
  type SelectOption,
} from "@ochairo/beat-ui";
import { derived, pulse, type Pulse, type ReadonlyPulse } from "@ochairo/pulse";

import type {
  ColumnId,
  Priority,
  TaskBoardColumn,
  TaskBoardData,
  TaskColumnKind,
  WorkItem,
  WorkItemType,
} from "../../../domain/types";
import css from "./TaskBoards.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_START_DATE = "2026-05-01";
const DEFAULT_DESCRIPTION = "Capture scope, blockers, and next steps here.";
const GANTT_DAY_WIDTH_REM = 4.25;
const NO_PARENT_TICKET_VALUE = "__none__";
const NO_STATUS_COLUMN_ID = "__no-status__";

type TimeWindowMode = "sprint" | "year" | "month" | "week" | "day";

interface TimeWindowModel {
  readonly startDay: number;
  readonly endDay: number;
  readonly summaryLabel: string;
}

interface StatusColorOption {
  readonly label: string;
  readonly value: string;
  readonly swatchStyle: string;
}

const WORK_ITEM_TYPES = [
  "Epic",
  "Feature",
  "User Story",
  "Task",
  "Bug",
] as const satisfies readonly WorkItemType[];
const PRIORITIES = [
  "Critical",
  "High",
  "Medium",
  "Low",
] as const satisfies readonly Priority[];
const STATUS_COLUMN_COLOR_OPTIONS = [
  {
    label: "Auto",
    value: "auto",
    swatchStyle:
      "linear-gradient(135deg, var(--beat-ui-color-text-muted) 0%, var(--beat-ui-color-primary) 38%, var(--beat-ui-color-warning) 68%, var(--beat-ui-color-success) 100%)",
  },
  {
    label: "Slate",
    value: "slate",
    swatchStyle: "var(--beat-ui-color-text-muted)",
  },
  {
    label: "Blue",
    value: "blue",
    swatchStyle: "var(--beat-ui-color-primary)",
  },
  {
    label: "Amber",
    value: "amber",
    swatchStyle: "var(--beat-ui-color-warning)",
  },
  {
    label: "Green",
    value: "green",
    swatchStyle: "var(--beat-ui-color-success)",
  },
  {
    label: "Red",
    value: "red",
    swatchStyle: "var(--beat-ui-color-danger)",
  },
] as const satisfies readonly StatusColorOption[];
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const WEEKDAY_SHORT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
});

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

interface BoardColumn extends TaskBoardColumn {
  readonly kind: TaskColumnKind;
  readonly isSystem?: boolean;
}

interface StatusColorSelectProps {
  readonly value: Pulse<string>;
  readonly autoPreviewValue: ReadonlyPulse<string>;
}

interface StatusColorSelectOptionProps {
  readonly option: StatusColorOption;
  readonly value: ReadonlyPulse<string>;
  readonly onSelect: (value: string) => void;
}

interface BoardItem extends WorkItem {
  readonly description: string;
  readonly parentId: number | null;
  readonly startDate: string;
  readonly durationDays: number;
  readonly dependencyIds: readonly number[];
}

interface GanttRowModel {
  readonly kind: "task" | "summary";
  readonly depth: number;
  readonly item: BoardItem;
  readonly barStartDay: number;
  readonly barEndDay: number;
  readonly barStyle: string;
  readonly metaLabel: string;
  readonly dependencyBadges: readonly string[];
  readonly barCueLabel: string | null;
  readonly barCueTone: "blocked" | "ready" | "summary" | null;
  readonly hasIncomingDependency: boolean;
  readonly hasOutgoingDependency: boolean;
  readonly isCollapsible: boolean;
  readonly isCollapsed: boolean;
}

interface GanttBandModel {
  readonly id: string;
  readonly style: string;
}

interface GanttScaleBandModel {
  readonly id: string;
  readonly label: string;
  readonly style: string;
}

interface SprintWindowOption {
  readonly value: string;
  readonly label: string;
  readonly rangeLabel: string;
  readonly optionLabel: string;
}

interface GanttModel {
  readonly days: readonly number[];
  readonly rows: readonly GanttRowModel[];
  readonly weekendBands: readonly GanttBandModel[];
  readonly todayMarkerStyle: string | null;
}

function priorityTone(
  priority: Priority,
): "danger" | "warning" | "primary" | "default" {
  if (priority === "Critical") return "danger";
  if (priority === "High") return "warning";
  if (priority === "Medium") return "primary";
  return "default";
}

function getStatusColorOption(value: string): StatusColorOption {
  return (
    STATUS_COLUMN_COLOR_OPTIONS.find((option) => option.value === value) ??
    STATUS_COLUMN_COLOR_OPTIONS[0]!
  );
}

function isWorkItemType(value: string): value is WorkItemType {
  return (WORK_ITEM_TYPES as readonly string[]).includes(value);
}

function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

function isTimeWindowMode(value: string): value is TimeWindowMode {
  return ["sprint", "year", "month", "week", "day"].includes(value);
}

function sanitizeWorkItemType(value: string): WorkItemType {
  return isWorkItemType(value) ? value : "Task";
}

function sanitizePriority(value: string): Priority {
  return isPriority(value) ? value : "Medium";
}

function resolveColumnKind(column: TaskBoardColumn): TaskColumnKind {
  if (column.kind !== undefined) return column.kind;
  const key = `${column.id} ${column.label}`.toLowerCase();
  if (
    /(done|done|complete|completed|released|launch|launched|live|shipped)/.test(
      key,
    )
  ) {
    return "done";
  }
  if (
    /(review|qa|verify|verification|approve|approval|test|testing)/.test(key)
  ) {
    return "review";
  }
  if (
    /(active|progress|doing|blocked|build|develop|implement|working)/.test(key)
  ) {
    return "progress";
  }
  return "queue";
}

function columnAccent(kind: TaskColumnKind): string {
  if (kind === "progress") return "var(--beat-ui-color-primary)";
  if (kind === "review") return "var(--beat-ui-color-warning)";
  if (kind === "done") return "var(--beat-ui-color-success)";
  return "var(--beat-ui-color-text-muted)";
}

function columnAccentOptionValue(kind: TaskColumnKind): string {
  if (kind === "progress") return "blue";
  if (kind === "review") return "amber";
  if (kind === "done") return "green";
  return "slate";
}

const StatusColorSelect = component<StatusColorSelectProps>((props) => {
  const isOpen = pulse(false);
  const displayValue = pulse(
    props.value.get() === "auto"
      ? props.autoPreviewValue.get()
      : props.value.get(),
  );

  function syncDisplayValue(): void {
    displayValue.set(
      props.value.get() === "auto"
        ? props.autoPreviewValue.get()
        : props.value.get(),
    );
  }

  onCleanup(props.value.on(syncDisplayValue));
  onCleanup(props.autoPreviewValue.on(syncDisplayValue));

  const selectedOption = derived(displayValue, (value) =>
    getStatusColorOption(value),
  );
  const selectedLabel = derived(selectedOption, (option) => option.label);
  const selectedSwatchStyle = derived(
    selectedOption,
    (option) => option.swatchStyle,
  );
  const expandedLabel = derived(isOpen, (open) => String(open));

  let anchorEl: HTMLButtonElement | null = null;

  return (
    <>
      <button
        type="button"
        class={css["colorSelectTrigger"]!}
        aria-haspopup="listbox"
        aria-expanded={expandedLabel}
        onClick={() => isOpen.set(!isOpen.get())}
        ref={(el) => {
          anchorEl = el as HTMLButtonElement;
        }}
      >
        <span
          class={css["colorSelectSwatch"]!}
          style:background={selectedSwatchStyle}
          aria-hidden="true"
        />
        <span class={css["colorSelectValue"]!} text={selectedLabel} />
        <span class={css["colorSelectChevron"]!} aria-hidden="true">
          ▾
        </span>
      </button>

      <Popover
        open={isOpen}
        onOpenChange={(nextOpen) => isOpen.set(nextOpen)}
        anchorRef={() => anchorEl}
        placement="bottom-start"
        offset={6}
        matchAnchorWidth
        dismissOnOutsideClick
        class={css["colorSelectPopover"]!}
      >
        <div class={css["colorSelectMenu"]!} role="listbox">
          {STATUS_COLUMN_COLOR_OPTIONS.map((option) => (
            <StatusColorSelectOption
              option={option}
              value={displayValue}
              onSelect={(value) => {
                props.value.set(value);
                isOpen.set(false);
              }}
            />
          ))}
        </div>
      </Popover>
    </>
  );
});

const StatusColorSelectOption = component<StatusColorSelectOptionProps>(
  (props) => {
    const isSelected = derived(
      props.value,
      (value) => value === props.option.value,
    );
    const checkmark = derived(isSelected, (selected) => (selected ? "✓" : ""));

    let optionEl: HTMLButtonElement | null = null;

    const syncSelectedState = (selected: boolean): void => {
      if (optionEl === null) return;
      optionEl.dataset["selected"] = String(selected);
      optionEl.setAttribute("aria-selected", String(selected));
    };

    onCleanup(
      isSelected.on(({ currentValue }) => {
        syncSelectedState(currentValue);
      }),
    );

    return (
      <button
        type="button"
        role="option"
        class={css["colorSelectOption"]!}
        ref={(el) => {
          optionEl = el as HTMLButtonElement;
          syncSelectedState(isSelected.get());
        }}
        onClick={() => props.onSelect(props.option.value)}
      >
        <span
          class={css["colorSelectSwatch"]!}
          style={`background:${props.option.swatchStyle};`}
          aria-hidden="true"
        />
        <span class={css["colorSelectOptionLabel"]!}>{props.option.label}</span>
        <span
          class={css["colorSelectOptionCheck"]!}
          aria-hidden="true"
          text={checkmark}
        />
      </button>
    );
  },
);

function resolveColumnAccentValue(column: BoardColumn): string {
  if (column.accentColor === "slate") {
    return "var(--beat-ui-color-text-muted)";
  }
  if (column.accentColor === "blue") {
    return "var(--beat-ui-color-primary)";
  }
  if (column.accentColor === "amber") {
    return "var(--beat-ui-color-warning)";
  }
  if (column.accentColor === "green") {
    return "var(--beat-ui-color-success)";
  }
  if (column.accentColor === "red") {
    return "var(--beat-ui-color-danger)";
  }

  return columnAccent(column.kind);
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDayNumber(date: string): number {
  const [rawYear, rawMonth, rawDay] = date.split("-");
  const year = Number.parseInt(rawYear ?? "", 10);
  const month = Number.parseInt(rawMonth ?? "", 10);
  const day = Number.parseInt(rawDay ?? "", 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return Math.floor(Date.UTC(2026, 4, 1) / DAY_MS);
  }

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function fromDayNumber(dayNumber: number): string {
  const date = new Date(dayNumber * DAY_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: string, amount: number): string {
  return fromDayNumber(toDayNumber(date) + amount);
}

function formatDayLabel(dayNumber: number): string {
  return DATE_FORMATTER.format(new Date(dayNumber * DAY_MS));
}

function isWeekendDayNumber(dayNumber: number): boolean {
  const weekDay = new Date(dayNumber * DAY_MS).getUTCDay();
  return weekDay === 0 || weekDay === 6;
}

function getCurrentDayNumber(): number {
  const now = new Date();
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
      DAY_MS,
  );
}

function startOfYearDayNumber(dayNumber: number): number {
  const date = new Date(dayNumber * DAY_MS);
  return Math.floor(Date.UTC(date.getUTCFullYear(), 0, 1) / DAY_MS);
}

function endOfYearDayNumber(dayNumber: number): number {
  const date = new Date(dayNumber * DAY_MS);
  return Math.floor(Date.UTC(date.getUTCFullYear(), 11, 31) / DAY_MS);
}

function startOfMonthDayNumber(dayNumber: number): number {
  const date = new Date(dayNumber * DAY_MS);
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / DAY_MS,
  );
}

function endOfMonthDayNumber(dayNumber: number): number {
  const date = new Date(dayNumber * DAY_MS);
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0) / DAY_MS,
  );
}

function startOfWeekDayNumber(dayNumber: number): number {
  const weekDay = new Date(dayNumber * DAY_MS).getUTCDay();
  return dayNumber - ((weekDay + 6) % 7);
}

function getIsoWeekNumber(dayNumber: number): number {
  const date = new Date(dayNumber * DAY_MS);
  const weekday = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - weekday);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

  return Math.ceil(((date.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

function formatGanttDayNumber(dayNumber: number): string {
  const date = new Date(dayNumber * DAY_MS);
  return String(date.getUTCDate()).padStart(2, "0");
}

function formatGanttWeekdayLabel(dayNumber: number): string {
  return WEEKDAY_SHORT_FORMATTER.format(
    new Date(dayNumber * DAY_MS),
  ).toLowerCase();
}

function resolveGanttScaleBandPart(
  mode: TimeWindowMode,
  dayNumber: number,
): { key: string; label: string } | null {
  const date = new Date(dayNumber * DAY_MS);

  if (mode === "year") {
    const year = String(date.getUTCFullYear());

    return {
      key: `year-${year}`,
      label: year,
    };
  }

  if (mode === "month") {
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;

    return {
      key: `month-${monthKey}`,
      label: MONTH_SHORT_FORMATTER.format(date),
    };
  }

  if (mode === "week") {
    const weekStartDay = startOfWeekDayNumber(dayNumber);

    return {
      key: `week-${weekStartDay}`,
      label: `W${String(getIsoWeekNumber(weekStartDay)).padStart(2, "0")}`,
    };
  }

  return null;
}

function buildGanttScaleBands(
  mode: TimeWindowMode,
  days: readonly number[],
): readonly GanttScaleBandModel[] {
  if (days.length === 0) return [];

  let currentBand = resolveGanttScaleBandPart(mode, days[0]!);
  if (currentBand === null) return [];

  const bands: GanttScaleBandModel[] = [];
  let bandStartIndex = 0;

  for (let index = 1; index <= days.length; index += 1) {
    const nextBand =
      index < days.length
        ? resolveGanttScaleBandPart(mode, days[index]!)
        : null;

    if (nextBand !== null && nextBand.key === currentBand.key) {
      continue;
    }

    bands.push({
      id: `${currentBand.key}-${bandStartIndex}`,
      label: currentBand.label,
      style: `grid-column:${bandStartIndex + 1} / ${index + 1};`,
    });

    bandStartIndex = index;
    currentBand = nextBand;

    if (currentBand === null) {
      break;
    }
  }

  return bands;
}

function resolveTimeWindow(
  mode: TimeWindowMode,
  anchorDate: string,
  sprintStartDate: string,
  sprintEndDate: string,
): TimeWindowModel {
  const safeAnchorDate = isIsoDateString(anchorDate)
    ? anchorDate
    : sprintStartDate;
  const anchorDay = toDayNumber(safeAnchorDate);

  if (mode === "sprint") {
    const sprintLengthDays = Math.max(
      1,
      toDayNumber(sprintEndDate) - toDayNumber(sprintStartDate) + 1,
    );
    const startDay = anchorDay;
    const endDay = startDay + sprintLengthDays - 1;

    return {
      startDay,
      endDay,
      summaryLabel: "",
    };
  }

  if (mode === "year") {
    const startDay = startOfYearDayNumber(anchorDay);
    const endDay = endOfYearDayNumber(anchorDay);

    return {
      startDay,
      endDay,
      summaryLabel: `Year scale · Full timeline · focus ${new Date(anchorDay * DAY_MS).getUTCFullYear()}`,
    };
  }

  if (mode === "month") {
    const startDay = startOfMonthDayNumber(anchorDay);
    const endDay = endOfMonthDayNumber(anchorDay);

    return {
      startDay,
      endDay,
      summaryLabel: `Month scale · Full timeline · focus ${MONTH_YEAR_FORMATTER.format(new Date(anchorDay * DAY_MS))}`,
    };
  }

  if (mode === "week") {
    const startDay = startOfWeekDayNumber(anchorDay);
    const endDay = startDay + 6;

    return {
      startDay,
      endDay,
      summaryLabel: `Week scale · Full timeline · focus ${formatDayRange(startDay, endDay)}`,
    };
  }

  return {
    startDay: anchorDay,
    endDay: anchorDay,
    summaryLabel: `Day scale · Full timeline · focus ${formatDayLabel(anchorDay)}`,
  };
}

function overlapsTimeWindow(
  item: BoardItem,
  startDay: number,
  endDay: number,
): boolean {
  const itemStartDay = toDayNumber(item.startDate);
  const itemEndDay = itemStartDay + item.durationDays - 1;
  return itemStartDay <= endDay && itemEndDay >= startDay;
}

function expandItemsWithParents(
  allItems: readonly BoardItem[],
  visibleItems: readonly BoardItem[],
): readonly BoardItem[] {
  const itemById = new Map(allItems.map((item) => [item.id, item]));
  const visibleIds = new Set<number>();

  for (const item of visibleItems) {
    let currentItem: BoardItem | undefined = item;

    while (currentItem !== undefined && !visibleIds.has(currentItem.id)) {
      visibleIds.add(currentItem.id);
      currentItem =
        currentItem.parentId === null
          ? undefined
          : itemById.get(currentItem.parentId);
    }
  }

  return allItems.filter((item) => visibleIds.has(item.id));
}

function parsePositiveInteger(value: string, fallback: number): number {
  const nextValue = Number.parseInt(value, 10);
  if (!Number.isFinite(nextValue) || nextValue < 1) return fallback;
  return nextValue;
}

function formatTaskDateRange(item: BoardItem): string {
  const startDay = toDayNumber(item.startDate);
  const endDay = startDay + item.durationDays - 1;
  const startLabel = formatDayLabel(startDay);
  const endLabel = formatDayLabel(endDay);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function formatDayRange(startDay: number, endDay: number): string {
  const startLabel = formatDayLabel(startDay);
  const endLabel = formatDayLabel(endDay);
  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function formatSprintWindowRange(startDay: number, endDay: number): string {
  const startYear = new Date(startDay * DAY_MS).getUTCFullYear();
  const endYear = new Date(endDay * DAY_MS).getUTCFullYear();
  const rangeLabel = formatDayRange(startDay, endDay);

  if (startYear === endYear) {
    return `${rangeLabel}, ${startYear}`;
  }

  return `${formatDayLabel(startDay)}, ${startYear} - ${formatDayLabel(endDay)}, ${endYear}`;
}

function buildSprintWindows(
  items: readonly BoardItem[],
  sprintLabel: string,
  sprintStartDate: string,
  sprintEndDate: string,
): readonly SprintWindowOption[] {
  const baseStartDay = toDayNumber(sprintStartDate);
  const baseEndDay = toDayNumber(sprintEndDate);
  const sprintLengthDays = Math.max(1, baseEndDay - baseStartDay + 1);
  const minStartDay =
    items.length === 0
      ? baseStartDay
      : Math.min(
          baseStartDay,
          ...items.map((item) => toDayNumber(item.startDate)),
        );
  const maxEndDay =
    items.length === 0
      ? baseEndDay
      : Math.max(
          baseEndDay,
          ...items.map(
            (item) => toDayNumber(item.startDate) + item.durationDays - 1,
          ),
        );
  const earliestOffset = Math.floor(
    (minStartDay - baseStartDay) / sprintLengthDays,
  );
  const latestOffset = Math.floor(
    (maxEndDay - baseStartDay) / sprintLengthDays,
  );
  const labelMatch = /^(.*?)(\d+)(.*)$/.exec(sprintLabel);
  const labelPrefix = labelMatch?.[1]?.trim() || "Sprint";
  const labelSuffix = labelMatch?.[3]?.trim() || "";
  const baseSprintNumber = Number.parseInt(labelMatch?.[2] ?? "1", 10);

  return Array.from(
    { length: latestOffset - earliestOffset + 1 },
    (_, index) => {
      const offset = earliestOffset + index;
      const startDay = baseStartDay + offset * sprintLengthDays;
      const endDay = startDay + sprintLengthDays - 1;
      const labelNumber = baseSprintNumber + offset;
      const labelCore = `${labelPrefix} ${labelNumber}`.trim();
      const label =
        labelSuffix === "" ? labelCore : `${labelCore} ${labelSuffix}`.trim();
      const rangeLabel = formatSprintWindowRange(startDay, endDay);

      return {
        value: fromDayNumber(startDay),
        label,
        rangeLabel,
        optionLabel: `${label} · ${rangeLabel}`,
      } satisfies SprintWindowOption;
    },
  );
}

function formatChildCount(count: number): string {
  return `${count} child task${count === 1 ? "" : "s"}`;
}

function slugifyColumnId(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTags(rawValue: string): readonly string[] {
  return rawValue
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeDependencyIds(
  rawValues: readonly string[],
  currentTaskId: number | null,
): readonly number[] {
  const uniqueIds = new Set<number>();
  for (const value of rawValues) {
    const id = Number.parseInt(value, 10);
    if (!Number.isFinite(id)) continue;
    if (currentTaskId !== null && id === currentTaskId) continue;
    uniqueIds.add(id);
  }
  return Array.from(uniqueIds);
}

function normalizeParentId(
  rawValue: string,
  currentTaskId: number | null,
): number | null {
  if (rawValue === "" || rawValue === NO_PARENT_TICKET_VALUE) {
    return null;
  }

  const parentId = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parentId)) return null;
  if (currentTaskId !== null && parentId === currentTaskId) return null;

  return parentId;
}

function getDoneColumnIds(
  columns: readonly BoardColumn[],
): readonly ColumnId[] {
  const explicit = columns.filter((column) => column.kind === "done");
  if (explicit.length > 0) return explicit.map((column) => column.id);
  const fallback = columns[columns.length - 1];
  return fallback !== undefined ? [fallback.id] : [];
}

function getNextTaskId(items: readonly BoardItem[]): number {
  return items.reduce((maxId, item) => Math.max(maxId, item.id), 1000) + 1;
}

function getFallbackColumnId(columns: readonly BoardColumn[]): ColumnId {
  return columns[0]?.id ?? "new";
}

function resolveTaskColumn(
  columnId: string,
  columns: readonly BoardColumn[],
): ColumnId {
  if (columnId === NO_STATUS_COLUMN_ID) {
    return NO_STATUS_COLUMN_ID;
  }

  return columns.some((column) => column.id === columnId)
    ? columnId
    : getFallbackColumnId(columns);
}

function normalizeTaskColumn(
  columnId: string,
  columns: readonly BoardColumn[],
): ColumnId {
  return columns.some((column) => column.id === columnId)
    ? columnId
    : NO_STATUS_COLUMN_ID;
}

function hydrateColumns(
  columns: readonly TaskBoardColumn[],
): readonly BoardColumn[] {
  return columns.map((column) => ({
    ...column,
    kind: resolveColumnKind(column),
  }));
}

function hydrateItem(
  item: WorkItem,
  index: number,
  columns: readonly BoardColumn[],
): BoardItem {
  const column = normalizeTaskColumn(item.column, columns);
  return {
    ...item,
    column,
    description: item.description?.trim() || DEFAULT_DESCRIPTION,
    parentId:
      item.parentId !== undefined && item.parentId !== item.id
        ? item.parentId
        : null,
    startDate:
      item.startDate !== undefined && isIsoDateString(item.startDate)
        ? item.startDate
        : addDays(DEFAULT_START_DATE, index),
    durationDays: Math.max(1, item.durationDays ?? 3),
    dependencyIds: Array.from(
      new Set((item.dependencyIds ?? []).filter((id) => id !== item.id)),
    ),
  };
}

function createBlankTask(
  columns: readonly BoardColumn[],
  items: readonly BoardItem[],
): BoardItem {
  const latestEndDay =
    items.length === 0
      ? toDayNumber(DEFAULT_START_DATE)
      : Math.max(
          ...items.map(
            (item) => toDayNumber(item.startDate) + item.durationDays - 1,
          ),
        );

  return {
    id: getNextTaskId(items),
    title: "",
    description: "",
    type: "Task",
    priority: "Medium",
    assignee: "AO",
    points: 3,
    tags: [],
    column: getFallbackColumnId(columns),
    parentId: null,
    startDate: fromDayNumber(latestEndDay + 1),
    durationDays: 3,
    dependencyIds: [],
  };
}

function buildParentTicketOptions(
  items: readonly BoardItem[],
  currentTaskId: number | null,
): readonly SelectOption[] {
  return [
    { label: "No parent ticket", value: NO_PARENT_TICKET_VALUE },
    ...[...items]
      .filter((item) => item.id !== currentTaskId)
      .sort((left, right) => left.id - right.id)
      .map((item) => ({
        label: `${item.title} · #${item.id}`,
        value: String(item.id),
      })),
  ];
}

function buildColumnOptions(
  columns: readonly BoardColumn[],
): readonly SelectOption[] {
  return columns.map((column) => ({
    label: column.label,
    value: column.id,
  }));
}

function buildVisibleColumns(
  columns: readonly BoardColumn[],
  items: readonly BoardItem[],
): readonly BoardColumn[] {
  const hasNoStatusItems = items.some(
    (item) => item.column === NO_STATUS_COLUMN_ID,
  );

  return hasNoStatusItems
    ? [
        {
          id: NO_STATUS_COLUMN_ID,
          label: "No status",
          kind: "queue",
          isSystem: true,
        },
        ...columns,
      ]
    : columns;
}

function buildColumnOrderOptions(
  columns: readonly BoardColumn[],
): readonly SelectOption[] {
  if (columns.length === 0) {
    return [{ label: "1 · First", value: "1" }];
  }

  return Array.from({ length: columns.length + 1 }, (_, index) => {
    if (index === 0) {
      return { label: "1 · First", value: "1" } satisfies SelectOption;
    }

    if (index === columns.length) {
      return {
        label: `${columns.length + 1} · Last`,
        value: String(index + 1),
      } satisfies SelectOption;
    }

    return {
      label: `${index + 1} · After ${columns[index - 1]!.label}`,
      value: String(index + 1),
    } satisfies SelectOption;
  });
}

function buildDependencyOptions(
  items: readonly BoardItem[],
  currentTaskId: number | null,
): readonly MultiSelectOption[] {
  return [...items]
    .filter((item) => item.id !== currentTaskId)
    .sort((left, right) => left.id - right.id)
    .map((item) => ({
      label: `${item.title} · #${item.id}`,
      value: String(item.id),
    }));
}

function formatTaskIdList(ids: readonly number[]): string {
  if (ids.length === 0) return "";
  if (ids.length <= 2) return ids.map((id) => `#${id}`).join(", ");
  const visible = ids
    .slice(0, 2)
    .map((id) => `#${id}`)
    .join(", ");
  return `${visible} +${ids.length - 2}`;
}

function buildTaskDependencyBadges(
  activeDependencyIds: readonly number[],
  downstreamCount: number,
  childCount: number,
  isDone: boolean,
): readonly string[] {
  if (isDone) {
    return [];
  }

  if (activeDependencyIds.length > 0) {
    return [`Blocked by ${formatTaskIdList(activeDependencyIds)}`];
  }

  if (childCount === 0 && downstreamCount > 0) {
    return [
      downstreamCount === 1
        ? "Ready · blocks 1 task"
        : `Ready · blocks ${downstreamCount} tasks`,
    ];
  }

  if (childCount === 0) {
    return ["Ready"];
  }

  return [];
}

function buildTaskBarCue(
  activeDependencyIds: readonly number[],
  isDone: boolean,
): { label: string | null; tone: "blocked" | "ready" | null } {
  if (isDone) {
    return { label: null, tone: null };
  }

  if (activeDependencyIds.length > 0) {
    return { label: "Blocked", tone: "blocked" };
  }

  return { label: "Ready", tone: "ready" };
}

function sortGanttItems(items: readonly BoardItem[]): readonly BoardItem[] {
  return [...items].sort((left, right) => {
    const startDiff =
      toDayNumber(left.startDate) - toDayNumber(right.startDate);
    if (startDiff !== 0) return startDiff;
    return left.id - right.id;
  });
}

function buildGanttBarStyle(
  barStartDay: number,
  barEndDay: number,
  chartStartDay: number,
  totalDays: number,
  color: string,
): string {
  const leftPct = ((barStartDay - chartStartDay) / totalDays) * 100;
  const widthPct = ((barEndDay - barStartDay + 1) / totalDays) * 100;
  return `left:${leftPct}%;width:${widthPct}%;--gantt-bar-color:${color};`;
}

function collectVisibleTreeItems(
  item: BoardItem,
  childrenByParentId: ReadonlyMap<number, readonly BoardItem[]>,
): readonly BoardItem[] {
  const children = childrenByParentId.get(item.id) ?? [];
  return [
    item,
    ...children.flatMap((child) =>
      collectVisibleTreeItems(child, childrenByParentId),
    ),
  ];
}

function buildGanttModel(
  visibleItems: readonly BoardItem[],
  allItems: readonly BoardItem[],
  columns: readonly BoardColumn[],
  windowStartDay: number,
  windowEndDay: number,
  collapsedParentIds: ReadonlySet<number>,
): GanttModel {
  const startDay = windowStartDay;
  const endDay = windowEndDay;
  const totalDays = Math.max(1, endDay - startDay + 1);
  const days = Array.from(
    { length: totalDays },
    (_, index) => startDay + index,
  );

  const weekendBands = days
    .filter((dayNumber) => isWeekendDayNumber(dayNumber))
    .map((dayNumber) => ({
      id: `weekend-${dayNumber}`,
      style: `left:${((dayNumber - startDay) / totalDays) * 100}%;width:${100 / totalDays}%;`,
    }));

  const currentDayNumber = getCurrentDayNumber();
  const todayMarkerStyle =
    currentDayNumber < startDay || currentDayNumber > endDay
      ? null
      : `left:${((currentDayNumber - startDay + 0.5) / totalDays) * 100}%;`;

  if (visibleItems.length === 0) {
    return {
      days,
      rows: [],
      weekendBands,
      todayMarkerStyle,
    };
  }
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const allItemsById = new Map(allItems.map((item) => [item.id, item]));
  const doneColumnIds = new Set(getDoneColumnIds(columns));

  const sortedVisibleItems = sortGanttItems(visibleItems);
  const visibleIds = new Set(sortedVisibleItems.map((item) => item.id));
  const childrenByParentId = new Map<number, BoardItem[]>();
  const activeDependencyIdsById = new Map<number, readonly number[]>();
  const visibleDownstreamCountById = new Map<number, number>();

  for (const item of sortedVisibleItems) {
    const activeDependencyIds = item.dependencyIds.filter((dependencyId) => {
      const dependency = allItemsById.get(dependencyId);
      return dependency !== undefined && !doneColumnIds.has(dependency.column);
    });

    activeDependencyIdsById.set(item.id, activeDependencyIds);
  }

  for (const item of sortedVisibleItems) {
    const activeDependencyIds = activeDependencyIdsById.get(item.id) ?? [];

    for (const dependencyId of activeDependencyIds) {
      if (!visibleIds.has(dependencyId)) continue;
      visibleDownstreamCountById.set(
        dependencyId,
        (visibleDownstreamCountById.get(dependencyId) ?? 0) + 1,
      );
    }
  }

  for (const item of sortedVisibleItems) {
    if (item.parentId === null || !visibleIds.has(item.parentId)) continue;
    const siblings = childrenByParentId.get(item.parentId) ?? [];
    siblings.push(item);
    childrenByParentId.set(item.parentId, siblings);
  }

  for (const [parentId, children] of childrenByParentId) {
    childrenByParentId.set(parentId, [...sortGanttItems(children)]);
  }

  const rootItems = sortedVisibleItems.filter(
    (item) => item.parentId === null || !visibleIds.has(item.parentId),
  );

  const buildRows = (
    itemsToRender: readonly BoardItem[],
    depth: number,
  ): GanttRowModel[] => {
    return itemsToRender.flatMap((item) => {
      const children = childrenByParentId.get(item.id) ?? [];
      const color = columnAccent(columnById.get(item.column)?.kind ?? "queue");

      if (children.length === 0) {
        const barStartDay = toDayNumber(item.startDate);
        const barEndDay = barStartDay + item.durationDays - 1;
        const isDone = doneColumnIds.has(item.column);
        const activeDependencyIds = activeDependencyIdsById.get(item.id) ?? [];
        const downstreamCount = visibleDownstreamCountById.get(item.id) ?? 0;
        const dependencyBadges = buildTaskDependencyBadges(
          activeDependencyIds,
          downstreamCount,
          0,
          isDone,
        );
        const barCue = buildTaskBarCue(activeDependencyIds, isDone);

        return [
          {
            kind: "task",
            depth,
            item,
            barStartDay,
            barEndDay,
            barStyle: buildGanttBarStyle(
              barStartDay,
              barEndDay,
              startDay,
              totalDays,
              color,
            ),
            metaLabel: `#${item.id} · ${columnById.get(item.column)?.label ?? item.column} · ${formatTaskDateRange(item)}`,
            dependencyBadges,
            barCueLabel: barCue.label,
            barCueTone: barCue.tone,
            hasIncomingDependency: activeDependencyIds.length > 0,
            hasOutgoingDependency: downstreamCount > 0,
            isCollapsible: false,
            isCollapsed: false,
          } satisfies GanttRowModel,
        ];
      }

      const treeItems = collectVisibleTreeItems(item, childrenByParentId);
      const isCollapsed = collapsedParentIds.has(item.id);
      const isDone = doneColumnIds.has(item.column);
      const activeDependencyIds = activeDependencyIdsById.get(item.id) ?? [];
      const downstreamCount = visibleDownstreamCountById.get(item.id) ?? 0;
      const dependencyBadges = buildTaskDependencyBadges(
        activeDependencyIds,
        downstreamCount,
        treeItems.length - 1,
        isDone,
      );
      const barStartDay = Math.min(
        ...treeItems.map((treeItem) => toDayNumber(treeItem.startDate)),
      );
      const barEndDay = Math.max(
        ...treeItems.map(
          (treeItem) =>
            toDayNumber(treeItem.startDate) + treeItem.durationDays - 1,
        ),
      );

      return [
        {
          kind: "summary",
          depth,
          item,
          barStartDay,
          barEndDay,
          barStyle: buildGanttBarStyle(
            barStartDay,
            barEndDay,
            startDay,
            totalDays,
            color,
          ),
          metaLabel: `#${item.id} · Summary · ${formatDayRange(barStartDay, barEndDay)}`,
          dependencyBadges,
          barCueLabel: formatChildCount(treeItems.length - 1),
          barCueTone: "summary",
          hasIncomingDependency: false,
          hasOutgoingDependency: false,
          isCollapsible: true,
          isCollapsed,
        } satisfies GanttRowModel,
        ...(isCollapsed ? [] : buildRows(children, depth + 1)),
      ];
    });
  };

  const rows = buildRows(rootItems, 0);

  return {
    days,
    rows,
    weekendBands,
    todayMarkerStyle,
  };
}

interface WorkItemCardProps {
  readonly item: BoardItem;
  readonly cardWrapperClass: string;
  readonly draggingClass: string;
  readonly columnOverClass: string;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
  readonly onOpenDetails: () => void;
}

const WorkItemCard = component<WorkItemCardProps>((props) => {
  const { item } = props;
  let cleanupDragListeners: (() => void) | null = null;

  onCleanup(() => {
    cleanupDragListeners?.();
  });

  return (
    <div
      class={props.cardWrapperClass}
      ref={(el) => {
        cleanupDragListeners?.();

        const node = el as HTMLElement;
        node.draggable = true;

        const handleDragStart = (event: Event): void => {
          props.onDragStart();
          node.classList.add(props.draggingClass);
          const dragEvent = event as DragEvent;
          if (dragEvent.dataTransfer !== null) {
            dragEvent.dataTransfer.effectAllowed = "move";
          }
        };

        const handleDragEnd = (): void => {
          props.onDragEnd();
          node.classList.remove(props.draggingClass);
          document
            .querySelectorAll(`.${props.columnOverClass}`)
            .forEach((column) =>
              column.classList.remove(props.columnOverClass),
            );
        };

        node.addEventListener("dragstart", handleDragStart);
        node.addEventListener("dragend", handleDragEnd);

        cleanupDragListeners = () => {
          node.removeEventListener("dragstart", handleDragStart);
          node.removeEventListener("dragend", handleDragEnd);
        };
      }}
    >
      <Card
        padding="sm"
        radius="md"
        elevation="flat"
        onPress={props.onOpenDetails}
      >
        <div class={css["cardMeta"]!}>
          <span class={css["cardType"]!}>{item.type}</span>
          <span class={css["cardId"]!}>#{item.id}</span>
        </div>
        <p class={css["cardTitle"]!}>{item.title}</p>
        <p class={css["cardDescription"]!}>{item.description}</p>
        <div class={css["cardBottom"]!}>
          <div class={css["cardTags"]!}>
            {item.tags.map((tag) => (
              <span class={css["tag"]!}>{tag}</span>
            ))}
          </div>
          <div class={css["cardSchedule"]!}>
            <span>{formatTaskDateRange(item)}</span>
            {item.parentId !== null ? (
              <span>Parent #{item.parentId}</span>
            ) : null}
            {item.dependencyIds.length > 0 ? (
              <span>Related: {item.dependencyIds.length}</span>
            ) : null}
          </div>
          <div class={css["cardFooter"]!}>
            <span class={css["avatar"]!}>{item.assignee}</span>
            <Badge tone={priorityTone(item.priority)} size="sm">
              {item.priority}
            </Badge>
            <span class={css["points"]!}>{item.points}p</span>
          </div>
        </div>
      </Card>
    </div>
  );
});

interface BoardColumnViewProps {
  readonly column: ReadonlyPulse<BoardColumn>;
  readonly filteredItems: ReadonlyPulse<readonly BoardItem[]>;
  readonly onOpenColumn: (column: BoardColumn) => void;
  readonly getDraggedId: () => number | null;
  readonly onMoveItem: (id: number, to: ColumnId) => void;
  readonly onOpenTask: (item: BoardItem) => void;
  readonly onDragStart: (id: number) => void;
  readonly onDragEnd: () => void;
}

const BoardColumnView = component<BoardColumnViewProps>((props) => {
  const columnItems = pulse<readonly BoardItem[]>(
    props.filteredItems
      .get()
      .filter((item) => item.column === props.column.get().id),
  );
  let cleanupColumnBodyListeners: (() => void) | null = null;
  let cleanupColumnShellSubscription: (() => void) | null = null;

  const columnLabel = derived(props.column, (column) => column.label);
  const columnStyle = derived(
    props.column,
    (column) => `--column-accent:${resolveColumnAccentValue(column)};`,
  );
  const columnIsSystem = derived(
    props.column,
    (column) => column.isSystem === true,
  );
  const columnAriaLabel = derived(
    props.column,
    (column) => `Edit ${column.label} status`,
  );

  function syncColumnItems(): void {
    const columnId = props.column.get().id;
    columnItems.set(
      props.filteredItems.get().filter((item) => item.column === columnId),
    );
  }

  onCleanup(
    props.filteredItems.on(() => {
      syncColumnItems();
    }),
  );
  onCleanup(
    props.column.on(() => {
      syncColumnItems();
    }),
  );
  onCleanup(() => {
    cleanupColumnShellSubscription?.();
    cleanupColumnBodyListeners?.();
  });

  const columnCount = derived(columnItems, (currentItems) =>
    String(currentItems.length),
  );

  return (
    <div
      class={css["columnShell"]!}
      ref={(el) => {
        cleanupColumnShellSubscription?.();

        const node = el as HTMLDivElement;
        node.style.cssText = columnStyle.get();
        cleanupColumnShellSubscription = columnStyle.on(({ currentValue }) => {
          node.style.cssText = currentValue;
        });
      }}
    >
      <Card class={css["columnCard"]!} padding="none" radius="lg">
        <Show when={columnIsSystem}>
          {() => (
            <div class={css["columnHeader"]!}>
              <div class={css["columnHeading"]!}>
                <span class={css["columnLabel"]!} text={columnLabel} />
                <span class={css["columnCount"]!} text={columnCount} />
              </div>
            </div>
          )}
        </Show>

        <Show when={derived(columnIsSystem, (isSystem) => !isSystem)}>
          {() => (
            <button
              type="button"
              class={`${css["columnHeader"]!} ${css["columnHeaderButton"]!}`}
              aria-label={columnAriaLabel}
              onClick={() => props.onOpenColumn(props.column.get())}
            >
              <div class={css["columnHeading"]!}>
                <span class={css["columnLabel"]!} text={columnLabel} />
                <span class={css["columnCount"]!} text={columnCount} />
              </div>
            </button>
          )}
        </Show>

        <div
          class={css["columnBody"]!}
          ref={(el) => {
            cleanupColumnBodyListeners?.();

            const node = el as HTMLElement;

            const handleDragEnter = (event: Event): void => {
              event.preventDefault();
              node.classList.add(css["columnOver"]!);
            };

            const handleDragLeave = (event: Event): void => {
              const rect = node.getBoundingClientRect();
              const { clientX, clientY } = event as DragEvent;
              if (
                clientX < rect.left ||
                clientX > rect.right ||
                clientY < rect.top ||
                clientY > rect.bottom
              ) {
                node.classList.remove(css["columnOver"]!);
              }
            };

            const handleDrop = (event: Event): void => {
              event.preventDefault();
              const draggedItemId = props.getDraggedId();
              if (draggedItemId !== null) {
                props.onMoveItem(draggedItemId, props.column.get().id);
              }
              node.classList.remove(css["columnOver"]!);
            };

            const handleDropWithMove = (event: Event): void => {
              handleDrop(event);
            };

            node.addEventListener("dragenter", handleDragEnter);
            node.addEventListener("dragover", handleDragEnter);
            node.addEventListener("dragleave", handleDragLeave);
            node.addEventListener("drop", handleDropWithMove);

            cleanupColumnBodyListeners = () => {
              node.removeEventListener("dragenter", handleDragEnter);
              node.removeEventListener("dragover", handleDragEnter);
              node.removeEventListener("dragleave", handleDragLeave);
              node.removeEventListener("drop", handleDropWithMove);
            };
          }}
        >
          <For each={columnItems} key={(item) => item.id}>
            {(itemPulse) => {
              const item = itemPulse.get();

              return (
                <WorkItemCard
                  item={item}
                  cardWrapperClass={css["cardWrapper"]!}
                  draggingClass={css["dragging"]!}
                  columnOverClass={css["columnOver"]!}
                  onDragStart={() => {
                    props.onDragStart(item.id);
                  }}
                  onDragEnd={props.onDragEnd}
                  onOpenDetails={() => props.onOpenTask(item)}
                />
              );
            }}
          </For>

          <Show
            when={columnItems}
            mapValue={(currentItems) => currentItems.length === 0}
          >
            {() => (
              <div class={css["columnEmpty"]!}>
                Drop a task here or create a new one.
              </div>
            )}
          </Show>
        </div>
      </Card>
    </div>
  );
});

export interface TaskBoardsProps {
  readonly data: TaskBoardData;
}

export const TaskBoards = component<TaskBoardsProps>((props): BeatJsxChild => {
  const initialColumns = hydrateColumns(props.data.columns);
  const columns = pulse<readonly BoardColumn[]>(initialColumns);
  const items = pulse<readonly BoardItem[]>(
    props.data.items.map((item, index) =>
      hydrateItem(item, index, initialColumns),
    ),
  );
  const search = pulse("");
  const filterTypes = pulse<readonly string[]>([]);
  const filterPriorities = pulse<readonly string[]>([]);
  const timeWindowMode = pulse<string>("sprint");
  const ganttScaleMode = derived(
    timeWindowMode,
    (value): TimeWindowMode => (isTimeWindowMode(value) ? value : "sprint"),
  );
  const timeWindowAnchorDate = pulse(props.data.sprintStartDate);
  const timeWindowStartDay = pulse(toDayNumber(props.data.sprintStartDate));
  const timeWindowEndDay = pulse(toDayNumber(props.data.sprintEndDate));
  const sprintRangeLabel = pulse("");
  const timeWindowSummaryLabel = pulse("");
  const sprintWindowOptions = buildSprintWindows(
    items.get(),
    props.data.sprintLabel,
    props.data.sprintStartDate,
    props.data.sprintEndDate,
  );
  const sprintSelectOptions: readonly SelectOption[] = sprintWindowOptions.map(
    (window) => ({
      label: window.optionLabel,
      triggerLabel: window.label,
      value: window.value,
    }),
  );

  const visibleColumns = pulse<readonly BoardColumn[]>([]);
  const filtered = pulse<readonly BoardItem[]>([]);
  const ganttFiltered = pulse<readonly BoardItem[]>([]);
  const progressWidthPct = pulse("0%");
  const progressLabel = pulse("0 / 0 pts · 0%");
  const ganttDays = pulse<readonly number[]>([]);
  const ganttScaleBands = pulse<readonly GanttScaleBandModel[]>([]);
  const ganttRows = pulse<readonly GanttRowModel[]>([]);
  const ganttWeekendBands = pulse<readonly GanttBandModel[]>([]);
  const ganttTodayMarkerStyle = pulse<string | null>(null);
  const ganttTimelineStyle = pulse(
    "--timeline-days:1;min-width:32rem;width:100%;",
  );
  const boardColumnCount = pulse("1");
  const collapsedGanttParentIds = pulse<readonly number[]>([]);

  function syncTimeWindow(): void {
    const selectedSprint =
      sprintWindowOptions.find(
        (window) => window.value === timeWindowAnchorDate.get(),
      ) ??
      sprintWindowOptions.find(
        (window) => window.value === props.data.sprintStartDate,
      ) ??
      sprintWindowOptions[0];

    if (selectedSprint === undefined) {
      sprintRangeLabel.set("");
      timeWindowStartDay.set(toDayNumber(props.data.sprintStartDate));
      timeWindowEndDay.set(toDayNumber(props.data.sprintEndDate));
      timeWindowSummaryLabel.set("");
      return;
    }

    sprintRangeLabel.set(selectedSprint.rangeLabel);

    if (timeWindowAnchorDate.get() !== selectedSprint.value) {
      timeWindowAnchorDate.set(selectedSprint.value);
      return;
    }

    const window = resolveTimeWindow(
      "sprint",
      selectedSprint.value,
      props.data.sprintStartDate,
      props.data.sprintEndDate,
    );
    timeWindowStartDay.set(window.startDay);
    timeWindowEndDay.set(window.endDay);
    timeWindowSummaryLabel.set(window.summaryLabel);
  }

  function syncFiltered(): void {
    const query = search.get().trim().toLowerCase();
    const selectedTypes = filterTypes.get();
    const selectedPriorities = filterPriorities.get();
    const startDay = timeWindowStartDay.get();
    const endDay = timeWindowEndDay.get();

    filtered.set(
      items.get().filter((item) => {
        const matchesType =
          selectedTypes.length === 0 || selectedTypes.includes(item.type);
        const matchesPriority =
          selectedPriorities.length === 0 ||
          selectedPriorities.includes(item.priority);
        const haystack = [
          item.title,
          item.description,
          item.assignee,
          item.tags.join(" "),
          String(item.id),
        ]
          .join(" ")
          .toLowerCase();

        return (
          overlapsTimeWindow(item, startDay, endDay) &&
          matchesType &&
          matchesPriority &&
          (query === "" || haystack.includes(query))
        );
      }),
    );
  }

  function syncVisibleColumns(): void {
    visibleColumns.set(buildVisibleColumns(columns.get(), items.get()));
  }

  function syncGanttFiltered(): void {
    ganttFiltered.set(expandItemsWithParents(items.get(), filtered.get()));
  }

  function syncProgress(): void {
    const doneColumnIds = new Set(getDoneColumnIds(columns.get()));
    const visibleItems = filtered.get();
    const totalPoints = visibleItems.reduce(
      (sum, item) => sum + item.points,
      0,
    );
    const donePoints = visibleItems
      .filter((item) => doneColumnIds.has(item.column))
      .reduce((sum, item) => sum + item.points, 0);
    const pct =
      totalPoints === 0 ? 0 : Math.round((donePoints / totalPoints) * 100);
    progressWidthPct.set(`${pct}%`);
    progressLabel.set(`${donePoints} / ${totalPoints} pts · ${pct}%`);
  }

  function syncGantt(): void {
    const resolvedScaleMode = ganttScaleMode.get();
    const model = buildGanttModel(
      ganttFiltered.get(),
      items.get(),
      visibleColumns.get(),
      timeWindowStartDay.get(),
      timeWindowEndDay.get(),
      new Set(collapsedGanttParentIds.get()),
    );
    ganttDays.set(model.days);
    ganttScaleBands.set(buildGanttScaleBands(resolvedScaleMode, model.days));
    ganttRows.set(model.rows);
    ganttWeekendBands.set(model.weekendBands);
    ganttTodayMarkerStyle.set(model.todayMarkerStyle);
    ganttTimelineStyle.set(
      `--timeline-days:${Math.max(model.days.length, 1)};min-width:${Math.max(model.days.length * GANTT_DAY_WIDTH_REM, 32)}rem;width:100%;`,
    );
  }

  function syncBoardStyle(): void {
    boardColumnCount.set(String(Math.max(visibleColumns.get().length, 1)));
  }

  function toggleCollapsedGanttParent(parentId: number): void {
    const collapsedParentIds = new Set(collapsedGanttParentIds.get());
    if (collapsedParentIds.has(parentId)) {
      collapsedParentIds.delete(parentId);
    } else {
      collapsedParentIds.add(parentId);
    }
    collapsedGanttParentIds.set(Array.from(collapsedParentIds));
  }

  syncTimeWindow();
  syncVisibleColumns();
  syncFiltered();
  syncGanttFiltered();
  syncProgress();
  syncGantt();
  syncBoardStyle();

  onCleanup(timeWindowMode.on(syncTimeWindow));
  onCleanup(timeWindowAnchorDate.on(syncTimeWindow));
  onCleanup(timeWindowStartDay.on(syncFiltered));
  onCleanup(timeWindowEndDay.on(syncFiltered));
  onCleanup(items.on(syncVisibleColumns));
  onCleanup(columns.on(syncVisibleColumns));
  onCleanup(items.on(syncFiltered));
  onCleanup(search.on(syncFiltered));
  onCleanup(filterTypes.on(syncFiltered));
  onCleanup(filterPriorities.on(syncFiltered));
  onCleanup(filtered.on(syncGanttFiltered));
  onCleanup(filtered.on(syncProgress));
  onCleanup(columns.on(syncProgress));
  onCleanup(ganttFiltered.on(syncGantt));
  onCleanup(visibleColumns.on(syncGantt));
  onCleanup(collapsedGanttParentIds.on(syncGantt));
  onCleanup(timeWindowMode.on(syncGantt));
  onCleanup(timeWindowStartDay.on(syncGantt));
  onCleanup(timeWindowEndDay.on(syncGantt));
  onCleanup(visibleColumns.on(syncBoardStyle));

  let draggedId: number | null = null;
  let isDragging = false;
  let cleanupBoardStyleSubscription: (() => void) | null = null;

  const onDocDragover = (event: Event): void => {
    if (isDragging) event.preventDefault();
  };

  document.addEventListener("dragover", onDocDragover, true);
  onCleanup(() => {
    document.removeEventListener("dragover", onDocDragover, true);
    cleanupBoardStyleSubscription?.();
  });

  function moveItem(id: number, to: ColumnId): void {
    if (
      to !== NO_STATUS_COLUMN_ID &&
      !columns.get().some((column) => column.id === to)
    ) {
      return;
    }

    items.set(
      items
        .get()
        .map((item) => (item.id === id ? { ...item, column: to } : item)),
    );
  }

  const editingTaskId = pulse<number | null>(null);
  const taskDialogOpen = pulse(false);
  const taskTitle = pulse("");
  const taskDescription = pulse("");
  const taskType = pulse<string>("Task");
  const taskPriority = pulse<string>("Medium");
  const taskAssignee = pulse("AO");
  const taskPoints = pulse("3");
  const taskTags = pulse("");
  const taskColumn = pulse<string>(getFallbackColumnId(columns.get()));
  const taskParentId = pulse(NO_PARENT_TICKET_VALUE);
  const taskStartDate = pulse(DEFAULT_START_DATE);
  const taskDurationDays = pulse("3");
  const taskDependencyIds = pulse<readonly string[]>([]);

  const editingColumnId = pulse<ColumnId | null>(null);
  const columnDialogOpen = pulse(false);
  const columnLabel = pulse("");
  const columnOrder = pulse(String(columns.get().length + 1));
  const columnAccentColor = pulse("auto");
  const columnAutoAccentValue = pulse("slate");
  const activeView = pulse("board");

  let cleanupGanttTimelineHeaderSubscription: (() => void) | null = null;
  let cleanupGanttTimelineColumnSubscription: (() => void) | null = null;

  onCleanup(() => {
    cleanupGanttTimelineHeaderSubscription?.();
    cleanupGanttTimelineColumnSubscription?.();
  });

  function syncColumnAutoAccentValue(): void {
    const label = columnLabel.get().trim();
    const draftId =
      editingColumnId.get() ?? (slugifyColumnId(label || "status") || "status");

    columnAutoAccentValue.set(
      columnAccentOptionValue(
        resolveColumnKind({
          id: draftId,
          label,
        }),
      ),
    );
  }

  syncColumnAutoAccentValue();
  onCleanup(columnLabel.on(syncColumnAutoAccentValue));
  onCleanup(editingColumnId.on(syncColumnAutoAccentValue));

  function loadTaskDraft(item: BoardItem): void {
    taskTitle.set(item.title);
    taskDescription.set(item.description);
    taskType.set(item.type);
    taskPriority.set(item.priority);
    taskAssignee.set(item.assignee);
    taskPoints.set(String(item.points));
    taskTags.set(item.tags.join(", "));
    taskColumn.set(item.column);
    taskParentId.set(
      item.parentId === null ? NO_PARENT_TICKET_VALUE : String(item.parentId),
    );
    taskStartDate.set(item.startDate);
    taskDurationDays.set(String(item.durationDays));
    taskDependencyIds.set(item.dependencyIds.map(String));
  }

  function openTaskDetails(item?: BoardItem): void {
    const draftTask = item ?? createBlankTask(columns.get(), items.get());
    editingTaskId.set(item?.id ?? null);
    loadTaskDraft(draftTask);
    taskDialogOpen.set(true);
  }

  function saveTask(): void {
    const title = taskTitle.get().trim();
    if (title.length === 0) return;

    const taskId = editingTaskId.get() ?? getNextTaskId(items.get());
    const nextTask: BoardItem = {
      id: taskId,
      title,
      description: taskDescription.get().trim() || DEFAULT_DESCRIPTION,
      type: sanitizeWorkItemType(taskType.get()),
      priority: sanitizePriority(taskPriority.get()),
      assignee: taskAssignee.get().trim().toUpperCase() || "AO",
      points: parsePositiveInteger(taskPoints.get(), 1),
      tags: normalizeTags(taskTags.get()),
      column: resolveTaskColumn(taskColumn.get(), columns.get()),
      parentId: normalizeParentId(taskParentId.get(), taskId),
      startDate: isIsoDateString(taskStartDate.get())
        ? taskStartDate.get()
        : DEFAULT_START_DATE,
      durationDays: parsePositiveInteger(taskDurationDays.get(), 3),
      dependencyIds: normalizeDependencyIds(taskDependencyIds.get(), taskId),
    };

    if (editingTaskId.get() === null) {
      items.set([...items.get(), nextTask]);
    } else {
      items.set(
        items.get().map((item) => (item.id === taskId ? nextTask : item)),
      );
    }

    taskDialogOpen.set(false);
  }

  function openColumnDialog(column?: BoardColumn): void {
    editingColumnId.set(column?.id ?? null);
    columnLabel.set(column?.label ?? "");
    columnOrder.set(
      String(
        column === undefined
          ? columns.get().length + 1
          : Math.max(
              columns
                .get()
                .findIndex((candidate) => candidate.id === column.id) + 1,
              1,
            ),
      ),
    );
    columnAccentColor.set(column?.accentColor ?? "auto");
    columnDialogOpen.set(true);
  }

  function saveColumn(): void {
    const label = columnLabel.get().trim();
    if (label.length === 0) return;

    const currentEditingId = editingColumnId.get();
    const nextColumns =
      currentEditingId === null
        ? [...columns.get()]
        : columns.get().filter((column) => column.id !== currentEditingId);

    let nextId = currentEditingId;

    if (nextId === null) {
      const baseId = slugifyColumnId(label) || "column";
      nextId = baseId;
      let suffix = 2;
      while (nextColumns.some((column) => column.id === nextId)) {
        nextId = `${baseId}-${suffix}`;
        suffix += 1;
      }
    }

    const nextColumn: BoardColumn = {
      id: nextId,
      label,
      kind: resolveColumnKind({ id: nextId, label }),
      ...(columnAccentColor.get() !== "auto"
        ? { accentColor: columnAccentColor.get() }
        : {}),
    };

    const insertIndex = Math.min(
      Math.max(
        parsePositiveInteger(columnOrder.get(), nextColumns.length + 1) - 1,
        0,
      ),
      nextColumns.length,
    );
    nextColumns.splice(insertIndex, 0, nextColumn);

    columns.set(nextColumns);
    editingColumnId.set(null);
    columnDialogOpen.set(false);
  }

  function deleteColumn(columnId: ColumnId): void {
    const currentColumns = columns.get();
    if (currentColumns.length <= 1) return;

    const remainingColumns = currentColumns.filter(
      (column) => column.id !== columnId,
    );

    columns.set(remainingColumns);
    items.set(
      items
        .get()
        .map((item) =>
          item.column === columnId
            ? { ...item, column: NO_STATUS_COLUMN_ID }
            : item,
        ),
    );

    if (taskColumn.get() === columnId) {
      taskColumn.set(NO_STATUS_COLUMN_ID);
    }
  }

  const typeOptions: readonly MultiSelectOption[] = props.data.typeOptions.map(
    (option) => ({
      label: option.label,
      value: option.value,
    }),
  );
  const priorityOptions: readonly MultiSelectOption[] =
    props.data.priorityOptions.map((option) => ({
      label: option.label,
      value: option.value,
    }));
  const taskTypeOptions: readonly SelectOption[] = props.data.typeOptions.map(
    (option) => ({
      label: option.label,
      value: option.value,
    }),
  );
  const taskPriorityOptions: readonly SelectOption[] =
    props.data.priorityOptions.map((option) => ({
      label: option.label,
      value: option.value,
    }));
  const renderBoardViewContent = (): BeatJsxChild => (
    <div
      class={css["board"]!}
      ref={(el) => {
        cleanupBoardStyleSubscription?.();

        const node = el as HTMLDivElement;
        node.style.setProperty("--column-count", boardColumnCount.get());
        cleanupBoardStyleSubscription = boardColumnCount.on(
          ({ currentValue }) => {
            node.style.setProperty("--column-count", currentValue);
          },
        );
      }}
    >
      <For each={visibleColumns} key={(column) => column.id}>
        {(columnPulse) => (
          <BoardColumnView
            column={columnPulse}
            filteredItems={filtered}
            onOpenColumn={openColumnDialog}
            getDraggedId={() => draggedId}
            onMoveItem={moveItem}
            onOpenTask={openTaskDetails}
            onDragStart={(itemId) => {
              isDragging = true;
              draggedId = itemId;
            }}
            onDragEnd={() => {
              isDragging = false;
              draggedId = null;
            }}
          />
        )}
      </For>
    </div>
  );

  const renderGanttViewContent = (): BeatJsxChild => (
    <div class={css["ganttView"]!}>
      <Show when={ganttRows} mapValue={(rows) => rows.length > 0}>
        {() => (
          <div class={css["ganttScroller"]!}>
            <div class={css["ganttFrame"]!}>
              <div class={css["ganttHeaderRow"]!}>
                <div class={css["ganttStickyHeader"]!}>Task</div>
                <div
                  class={css["ganttTimelineHeader"]!}
                  ref={(el) => {
                    cleanupGanttTimelineHeaderSubscription?.();

                    const node = el as HTMLElement;
                    node.style.cssText = ganttTimelineStyle.get();

                    cleanupGanttTimelineHeaderSubscription =
                      ganttTimelineStyle.on(({ currentValue }) => {
                        node.style.cssText = currentValue;
                      });
                  }}
                >
                  <Show
                    when={ganttTodayMarkerStyle}
                    mapValue={(style) => style !== null}
                  >
                    {() => (
                      <div
                        class={`${css["ganttTodayMarker"]!} ${css["ganttTodayMarkerHeader"]!}`}
                        style={ganttTodayMarkerStyle.get() ?? ""}
                      >
                        <span class={css["ganttTodayLabel"]!}>Today</span>
                      </div>
                    )}
                  </Show>
                  <Show
                    when={ganttScaleBands}
                    mapValue={(bands) => bands.length > 0}
                  >
                    {() => (
                      <div class={css["ganttScaleHeader"]!}>
                        <For each={ganttScaleBands} key={(band) => band.id}>
                          {(bandPulse) => {
                            const band = bandPulse.get();

                            return (
                              <div
                                class={css["ganttScaleBand"]!}
                                style={band.style}
                              >
                                {band.label}
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    )}
                  </Show>
                  <Show when={ganttScaleMode}>
                    {(scaleMode) => (
                      <div class={css["ganttTimelineDays"]!}>
                        <For each={ganttDays} key={(day) => day}>
                          {(dayPulse) => {
                            const dayNumber = dayPulse.get();
                            const dayLabel =
                              scaleMode === "day" || scaleMode === "sprint"
                                ? formatGanttDayNumber(dayNumber)
                                : null;
                            const weekdayLabel =
                              dayLabel !== null
                                ? formatGanttWeekdayLabel(dayNumber)
                                : null;

                            return (
                              <div
                                class={css["ganttDayCell"]!}
                                data-weekend={
                                  isWeekendDayNumber(dayNumber)
                                    ? "true"
                                    : undefined
                                }
                                data-today={
                                  dayNumber === getCurrentDayNumber()
                                    ? "true"
                                    : undefined
                                }
                              >
                                {dayLabel !== null ? (
                                  <span class={css["ganttDayLabel"]!}>
                                    <span class={css["ganttDayWeekday"]!}>
                                      {weekdayLabel}
                                    </span>
                                    <span class={css["ganttDayNumber"]!}>
                                      {dayLabel}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    )}
                  </Show>
                </div>
              </div>

              <div class={css["ganttBody"]!}>
                <div class={css["ganttTaskList"]!}>
                  <For each={ganttRows} key={(row) => row.item.id}>
                    {(rowPulse) => {
                      const row = rowPulse.get();

                      const handleRowPress = (): void => {
                        if (row.isCollapsible) {
                          toggleCollapsedGanttParent(row.item.id);
                          return;
                        }

                        openTaskDetails(row.item);
                      };

                      return (
                        <button
                          type="button"
                          class={`${css["ganttTaskCell"]!} ${row.kind === "summary" ? css["ganttTaskCellSummary"]! : ""} ${row.depth > 0 ? css["ganttTaskCellChild"]! : ""}`}
                          style={`--gantt-depth:${row.depth};`}
                          aria-expanded={
                            row.isCollapsible
                              ? String(!row.isCollapsed)
                              : undefined
                          }
                          onClick={handleRowPress}
                        >
                          <span class={css["ganttTaskCellTitleRow"]!}>
                            {row.isCollapsible ? (
                              <span class={css["ganttTreeToggle"]!}>
                                {row.isCollapsed ? "+" : "-"}
                              </span>
                            ) : null}
                            <span class={css["ganttTaskCellTitle"]!}>
                              {row.item.title}
                            </span>
                          </span>
                          <span class={css["ganttTaskCellMeta"]!}>
                            {row.metaLabel}
                          </span>
                          {row.dependencyBadges.length > 0 ? (
                            <span class={css["ganttTaskCellBadgeRow"]!}>
                              {row.dependencyBadges.map((badge) => (
                                <span class={css["ganttTaskBadge"]!}>
                                  {badge}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </button>
                      );
                    }}
                  </For>
                </div>

                <div
                  class={css["ganttTimelineColumn"]!}
                  ref={(el) => {
                    cleanupGanttTimelineColumnSubscription?.();

                    const node = el as HTMLElement;
                    node.style.cssText = ganttTimelineStyle.get();

                    cleanupGanttTimelineColumnSubscription =
                      ganttTimelineStyle.on(({ currentValue }) => {
                        node.style.cssText = currentValue;
                      });
                  }}
                >
                  <Show
                    when={ganttTodayMarkerStyle}
                    mapValue={(style) => style !== null}
                  >
                    {() => (
                      <div
                        class={css["ganttTodayMarker"]!}
                        style={ganttTodayMarkerStyle.get() ?? ""}
                      />
                    )}
                  </Show>

                  <For each={ganttRows} key={(row) => row.item.id}>
                    {(rowPulse) => {
                      const row = rowPulse.get();

                      const handleBarPress = (): void => {
                        if (row.isCollapsible) {
                          toggleCollapsedGanttParent(row.item.id);
                          return;
                        }

                        openTaskDetails(row.item);
                      };

                      return (
                        <div class={css["ganttLane"]!}>
                          <Show
                            when={ganttWeekendBands}
                            mapValue={(bands) => bands.length > 0}
                          >
                            {() => (
                              <div class={css["ganttWeekendLayer"]!}>
                                <For
                                  each={ganttWeekendBands}
                                  key={(band) => band.id}
                                >
                                  {(bandPulse) => (
                                    <div
                                      class={css["ganttWeekendBand"]!}
                                      style={bandPulse.get().style}
                                    />
                                  )}
                                </For>
                              </div>
                            )}
                          </Show>

                          <button
                            type="button"
                            class={`${css["ganttBar"]!} ${row.kind === "summary" ? css["ganttBarSummary"]! : ""} ${row.hasIncomingDependency ? css["ganttBarIncoming"]! : ""} ${row.hasOutgoingDependency ? css["ganttBarOutgoing"]! : ""}`}
                            style={row.barStyle}
                            aria-expanded={
                              row.isCollapsible
                                ? String(!row.isCollapsed)
                                : undefined
                            }
                            onClick={handleBarPress}
                          >
                            {row.isCollapsible ? (
                              <span class={css["ganttBarToggle"]!}>
                                {row.isCollapsed ? "+" : "-"}
                              </span>
                            ) : null}
                            <span class={css["ganttBarLabel"]!}>
                              {row.item.title}
                            </span>
                            {row.barCueLabel !== null ? (
                              <span
                                class={`${css["ganttBarCue"]!} ${row.barCueTone === "blocked" ? css["ganttBarCueBlocked"]! : ""} ${row.barCueTone === "ready" ? css["ganttBarCueReady"]! : ""} ${row.barCueTone === "summary" ? css["ganttBarCueSummary"]! : ""}`}
                              >
                                {row.barCueLabel}
                              </span>
                            ) : null}
                          </button>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={ganttRows} mapValue={(rows) => rows.length === 0}>
        {() => (
          <div class={css["ganttScroller"]!}>
            <div class={css["ganttEmpty"]!}>
              No tasks match the current filters.
            </div>
          </div>
        )}
      </Show>
    </div>
  );

  return (
    <div class={css["root"]!}>
      <div class={css["header"]!}>
        <div class={css["headerCopy"]!}>
          <div class={css["titleRow"]!}>
            <div class={css["titleSelect"]!}>
              <Select
                value={timeWindowAnchorDate}
                onValueChange={(value) => timeWindowAnchorDate.set(value)}
                options={sprintSelectOptions}
                placeholder="Sprint"
                ariaLabel="Sprint"
                styles={{
                  trigger:
                    "min-height:auto;padding:0.1rem 1.2rem 0.1rem 0;border:none;border-radius:0;background:transparent;color:var(--beat-ui-color-text);width:100%;display:flex;align-items:center;white-space:nowrap;",
                  triggerLabel:
                    "font-size:1.12rem;font-weight:700;line-height:1;letter-spacing:-0.02em;color:var(--beat-ui-color-text);",
                  chevron: "right:0;color:var(--beat-ui-color-text-muted);",
                  menu: "min-width:18rem;",
                }}
              />
            </div>
            <Show
              when={sprintRangeLabel}
              mapValue={(label) => label.trim().length > 0}
            >
              {() => <p class={css["titleMeta"]!} text={sprintRangeLabel} />}
            </Show>
          </div>
          <Show
            when={timeWindowSummaryLabel}
            mapValue={(label) => label.trim().length > 0}
          >
            {() => (
              <p class={css["helperText"]!} text={timeWindowSummaryLabel} />
            )}
          </Show>
        </div>
        <div class={css["progress"]!}>
          <span class={css["progressLabel"]!} text={progressLabel} />
          <div class={css["progressTrack"]!}>
            <div class={css["progressFill"]!} style:width={progressWidthPct} />
          </div>
        </div>
      </div>

      <div class={css["toolbar"]!}>
        <div class={css["toolbarFilters"]!}>
          <div class={css["searchWrap"]!}>
            <SearchInput
              value={search}
              onValueChange={(value: string) => search.set(value)}
              placeholder="Search work items…"
            />
          </div>
          <div class={css["filterWrap"]!}>
            <MultiSelect
              value={filterTypes}
              onValueChange={(value: readonly string[]) =>
                filterTypes.set(value)
              }
              options={typeOptions}
              placeholder="Type"
            />
          </div>
          <div class={css["filterWrap"]!}>
            <MultiSelect
              value={filterPriorities}
              onValueChange={(value: readonly string[]) =>
                filterPriorities.set(value)
              }
              options={priorityOptions}
              placeholder="Priority"
            />
          </div>
        </div>

        <div class={css["toolbarActions"]!}>
          <Button tone="primary" onPress={() => openTaskDetails()}>
            <IconPlus size={14} />
            New task
          </Button>
          <Button appearance="soft" onPress={() => openColumnDialog()}>
            <IconPlus size={14} />
            Add status
          </Button>
        </div>
      </div>

      <Tab
        ariaLabel="Task board views"
        class={css["viewsTab"]!}
        items={[
          {
            key: "board",
            label: "Task board",
            renderContent: renderBoardViewContent,
          },
          {
            key: "gantt",
            label: "Gantt chart",
            renderContent: renderGanttViewContent,
          },
        ]}
        unmountInactivePanels
        value={activeView}
        onValueChange={(value) => activeView.set(value)}
        styles={{
          container:
            "display:flex;flex-direction:column;flex:1 1 auto;min-height:0;",
          panel:
            "display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden;",
        }}
      />

      <Show when={taskDialogOpen}>
        {() => (
          <Dialog
            open={taskDialogOpen}
            onOpenChange={(nextOpen) => taskDialogOpen.set(nextOpen)}
            dismissible={false}
            title={
              editingTaskId.get() === null
                ? "Add task"
                : `Task #${editingTaskId.get()} details`
            }
            styles={{ panel: "width:min(46rem, 100%);" }}
            footer={
              <>
                <Button
                  appearance="ghost"
                  onPress={() => taskDialogOpen.set(false)}
                >
                  Cancel
                </Button>
                <Button tone="primary" onPress={saveTask}>
                  {editingTaskId.get() === null
                    ? "Create task"
                    : "Save changes"}
                </Button>
              </>
            }
          >
            <div class={css["dialogBody"]!}>
              <div class={css["formGrid"]!}>
                <div class={`${css["field"]!} ${css["fieldWide"]!}`}>
                  <label class={css["fieldLabel"]!}>Title</label>
                  <Input
                    value={taskTitle}
                    onValueChange={(value) => taskTitle.set(value)}
                    placeholder="Task title"
                  />
                </div>

                <div class={`${css["field"]!} ${css["fieldWide"]!}`}>
                  <label class={css["fieldLabel"]!}>Details</label>
                  <TextArea
                    value={taskDescription}
                    onValueChange={(value) => taskDescription.set(value)}
                    placeholder="Add scope, blockers, or handoff notes"
                    rows={4}
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Status</label>
                  <Select
                    value={taskColumn}
                    onValueChange={(value) => taskColumn.set(value)}
                    options={buildColumnOptions(visibleColumns.get())}
                    placeholder="Status"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Type</label>
                  <Select
                    value={taskType}
                    onValueChange={(value) => taskType.set(value)}
                    options={taskTypeOptions}
                    placeholder="Type"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Priority</label>
                  <Select
                    value={taskPriority}
                    onValueChange={(value) => taskPriority.set(value)}
                    options={taskPriorityOptions}
                    placeholder="Priority"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Assignee</label>
                  <Input
                    value={taskAssignee}
                    onValueChange={(value) => taskAssignee.set(value)}
                    placeholder="AO"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Points</label>
                  <Input
                    type="number"
                    value={taskPoints}
                    onValueChange={(value) => taskPoints.set(value)}
                    placeholder="3"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Parent ticket</label>
                  <Select
                    value={taskParentId}
                    onValueChange={(value) => taskParentId.set(value)}
                    options={buildParentTicketOptions(
                      items.get(),
                      editingTaskId.get(),
                    )}
                    placeholder="No parent ticket"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Start date</label>
                  <DateInput
                    value={taskStartDate}
                    onValueChange={(value) => taskStartDate.set(value)}
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Duration</label>
                  <Input
                    type="number"
                    value={taskDurationDays}
                    onValueChange={(value) => taskDurationDays.set(value)}
                    placeholder="3"
                  />
                </div>

                <div class={`${css["field"]!} ${css["fieldWide"]!}`}>
                  <label class={css["fieldLabel"]!}>Tags</label>
                  <Input
                    value={taskTags}
                    onValueChange={(value) => taskTags.set(value)}
                    placeholder="frontend, auth, qa"
                  />
                </div>

                <div class={`${css["field"]!} ${css["fieldWide"]!}`}>
                  <label class={css["fieldLabel"]!}>Related</label>
                  <MultiSelect
                    canSearch
                    value={taskDependencyIds}
                    onValueChange={(value) => taskDependencyIds.set(value)}
                    options={buildDependencyOptions(
                      items.get(),
                      editingTaskId.get(),
                    )}
                    placeholder="Select related tickets"
                  />
                  <p class={css["fieldHelp"]!}>
                    Related tickets are shown in the gantt chart and can help
                    sequence linked work.
                  </p>
                </div>
              </div>
            </div>
          </Dialog>
        )}
      </Show>

      <Show when={columnDialogOpen}>
        {() => (
          <Dialog
            open={columnDialogOpen}
            onOpenChange={(nextOpen) => {
              columnDialogOpen.set(nextOpen);
              if (!nextOpen) {
                editingColumnId.set(null);
              }
            }}
            dismissible={false}
            title={
              editingColumnId.get() === null ? "Add status" : "Edit status"
            }
            styles={{ panel: "width:min(32rem, 100%);" }}
            footer={
              <>
                <Show
                  when={editingColumnId}
                  mapValue={(value) => value !== null}
                >
                  {() => (
                    <Button
                      appearance="soft"
                      tone="danger"
                      onPress={() => {
                        const columnId = editingColumnId.get();
                        if (columnId === null) {
                          return;
                        }

                        deleteColumn(columnId);
                        columnDialogOpen.set(false);
                        editingColumnId.set(null);
                      }}
                    >
                      Delete status
                    </Button>
                  )}
                </Show>
                <Button
                  appearance="ghost"
                  onPress={() => {
                    columnDialogOpen.set(false);
                    editingColumnId.set(null);
                  }}
                >
                  Cancel
                </Button>
                <Button tone="primary" onPress={saveColumn}>
                  {editingColumnId.get() === null
                    ? "Save status"
                    : "Save changes"}
                </Button>
              </>
            }
          >
            <div class={css["dialogBody"]!}>
              <div class={css["formGrid"]!}>
                <div class={`${css["field"]!} ${css["fieldWide"]!}`}>
                  <label class={css["fieldLabel"]!}>Status name</label>
                  <Input
                    value={columnLabel}
                    onValueChange={(value) => columnLabel.set(value)}
                    placeholder="Blocked, QA, Done, Ready for launch…"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Status column order</label>
                  <Select
                    value={columnOrder}
                    onValueChange={(value) => columnOrder.set(value)}
                    options={buildColumnOrderOptions(
                      editingColumnId.get() === null
                        ? columns.get()
                        : columns
                            .get()
                            .filter(
                              (column) => column.id !== editingColumnId.get(),
                            ),
                    )}
                    placeholder="Choose order"
                  />
                </div>

                <div class={css["field"]!}>
                  <label class={css["fieldLabel"]!}>Status color</label>
                  <StatusColorSelect
                    value={columnAccentColor}
                    autoPreviewValue={columnAutoAccentValue}
                  />
                </div>

                <div class={`${css["field"]!} ${css["fieldWide"]!}`}>
                  <p class={css["fieldHelp"]!}>
                    Choose where the new status column should appear. Status
                    behavior is inferred from the name, and the status color
                    only affects the board column accent line.
                  </p>
                </div>
              </div>
            </div>
          </Dialog>
        )}
      </Show>
    </div>
  );
});
