import {
  Show,
  component,
  onCleanup,
  onMount,
  type BeatJsxChild,
} from "@ochairo/beat";
import {
  Button,
  DateInput,
  Dialog,
  Input,
  MultiSelect,
  NumberInput,
  Popover,
  Select,
  TextArea,
  type MultiSelectOption,
  type SelectOption,
} from "@ochairo/beat-ui";
import { derived, pulse, type Pulse, type ReadonlyPulse } from "@ochairo/pulse";

import type { TaskBoardPort } from "../domain/ports";
import type {
  ColumnId,
  Priority,
  TaskBoardColumn,
  TaskBoardData,
  TaskBoardSprintData,
  TaskColumnKind,
  WorkItem,
  WorkItemType,
} from "../domain/types";
import {
  loadTaskManagementData,
  taskManagementData,
} from "./state/task-management-state";
import {
  GanttChart,
  GanttChartToolbar,
} from "./components/gantt-chart/GanttChart";
import {
  TaskBoard,
  TaskBoardToolbar,
} from "./components/task-boards/TaskBoard";
import sharedCss from "./TaskManagementPage.module.css";

const css = sharedCss;

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_START_DATE = "2026-05-01";
const DEFAULT_DESCRIPTION = "Capture scope, blockers, and next steps here.";
const DEFAULT_GANTT_DAYS_BEFORE_NOW = 10;
const DEFAULT_GANTT_DAYS_AFTER_NOW = 20;
const GANTT_DAY_WIDTH_REM = 4.25;
const NO_PARENT_TICKET_VALUE = "__none__";
const NO_STATUS_COLUMN_ID = "__no-status__";

type TimeWindowMode = "sprint" | "year" | "month" | "week" | "day";

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
  readonly order: number;
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
  readonly isBarClippedStart: boolean;
  readonly isBarClippedEnd: boolean;
  readonly barColor: string;
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

type GanttWeekendKind = "saturday" | "sunday";

interface GanttBandModel {
  readonly id: string;
  readonly style: string;
  readonly kind: GanttWeekendKind;
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
  readonly startDate: string;
  readonly endDate: string;
  readonly startDay: number;
  readonly endDay: number;
}

interface GanttModel {
  readonly days: readonly number[];
  readonly rows: readonly GanttRowModel[];
  readonly weekendBands: readonly GanttBandModel[];
  readonly todayMarkerStyle: string | null;
}

type GanttInteractionMode = "move" | "resize-start" | "resize-end";

interface GanttInteractionState {
  readonly mode: GanttInteractionMode;
  readonly itemId: number;
  readonly originClientX: number;
  readonly laneWidthPx: number;
  readonly timelineLeftPx: number;
  readonly chartStartDay: number;
  readonly chartDayCount: number;
  readonly originStartDay: number;
  readonly originEndDay: number;
  readonly originDurationDays: number;
  readonly previewStartDay: number;
  readonly previewDurationDays: number;
}

type GanttTaskReorderPosition = "before" | "after";

interface GanttTaskReorderState {
  readonly draggedItemId: number;
  readonly overItemId: number | null;
  readonly position: GanttTaskReorderPosition;
}

interface TaskManagementStore {
  readonly data: TaskBoardData;
  readonly columns: Pulse<readonly BoardColumn[]>;
  readonly items: Pulse<readonly BoardItem[]>;
  readonly search: Pulse<string>;
  readonly filterTypes: Pulse<readonly string[]>;
  readonly filterPriorities: Pulse<readonly string[]>;
  readonly timeWindowMode: Pulse<string>;
  readonly timeWindowAnchorDate: Pulse<string>;
  readonly timeWindowStartDate: Pulse<string>;
  readonly timeWindowEndDate: Pulse<string>;
  readonly timeWindowStartDay: Pulse<number>;
  readonly timeWindowEndDay: Pulse<number>;
  readonly collapsedGanttParentIds: Pulse<readonly number[]>;
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
  return getWeekendDayKind(dayNumber) !== null;
}

function getWeekendDayKind(dayNumber: number): GanttWeekendKind | null {
  const weekDay = new Date(dayNumber * DAY_MS).getUTCDay();
  if (weekDay === 6) return "saturday";
  if (weekDay === 0) return "sunday";
  return null;
}

function getCurrentDayNumber(): number {
  const now = new Date();
  return Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
      DAY_MS,
  );
}

function getDefaultGanttDateWindow(): {
  readonly startDay: number;
  readonly endDay: number;
  readonly startDate: string;
  readonly endDate: string;
} {
  const currentDay = getCurrentDayNumber();
  const startDay = currentDay - DEFAULT_GANTT_DAYS_BEFORE_NOW;
  const endDay = currentDay + DEFAULT_GANTT_DAYS_AFTER_NOW;

  return {
    startDay,
    endDay,
    startDate: fromDayNumber(startDay),
    endDate: fromDayNumber(endDay),
  };
}

function startOfMonthDayNumber(dayNumber: number): number {
  const date = new Date(dayNumber * DAY_MS);
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / DAY_MS,
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
  ).toUpperCase();
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

  if (mode === "month" || mode === "day" || mode === "sprint") {
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`;

    return {
      key: `month-${monthKey}`,
      label: MONTH_YEAR_FORMATTER.format(date),
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

function buildSprintWindowOptions(
  sprints: readonly TaskBoardSprintData[],
): readonly SprintWindowOption[] {
  return sprints
    .map((sprint) => {
      const startDay = toDayNumber(sprint.startDate);
      const endDay = toDayNumber(sprint.endDate);
      const rangeLabel = formatSprintWindowRange(startDay, endDay);

      return {
        value: sprint.startDate,
        label: sprint.label,
        rangeLabel,
        optionLabel: `${sprint.label} · ${rangeLabel}`,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        startDay,
        endDay,
      } satisfies SprintWindowOption;
    })
    .sort((left, right) => left.startDay - right.startDay);
}

function getDefaultTaskBoardSprint(
  sprints: readonly TaskBoardSprintData[],
): TaskBoardSprintData | null {
  const currentDay = getCurrentDayNumber();

  return (
    sprints.find((sprint) => {
      const startDay = toDayNumber(sprint.startDate);
      const endDay = toDayNumber(sprint.endDate);

      return currentDay >= startDay && currentDay <= endDay;
    }) ??
    sprints[0] ??
    null
  );
}

function flattenSprintItems(
  sprints: readonly TaskBoardSprintData[],
): readonly WorkItem[] {
  return sprints.reduce<WorkItem[]>((allItems, sprint) => {
    allItems.push(...sprint.items);
    return allItems;
  }, []);
}

function syncSprintItems(
  sprints: readonly TaskBoardSprintData[],
  items: readonly BoardItem[],
): readonly TaskBoardSprintData[] {
  const itemsBySprintId = new Map(
    sprints.map((sprint) => [sprint.id, [] as BoardItem[]]),
  );
  const fallbackSprint = sprints[0];

  for (const item of items) {
    const itemStartDay = toDayNumber(item.startDate);
    const sprint =
      sprints.find((candidate) => {
        const sprintStartDay = toDayNumber(candidate.startDate);
        const sprintEndDay = toDayNumber(candidate.endDate);

        return itemStartDay >= sprintStartDay && itemStartDay <= sprintEndDay;
      }) ?? fallbackSprint;

    if (sprint === undefined) {
      continue;
    }

    itemsBySprintId.get(sprint.id)?.push(item);
  }

  return sprints.map((sprint) => ({
    ...sprint,
    items: itemsBySprintId.get(sprint.id) ?? [],
  }));
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

function canAssignParent(
  items: readonly BoardItem[],
  currentTaskId: number | null,
  nextParentId: number | null,
): boolean {
  if (nextParentId === null) {
    return true;
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  if (!itemById.has(nextParentId)) {
    return false;
  }

  if (currentTaskId === null) {
    return true;
  }

  if (nextParentId === currentTaskId) {
    return false;
  }

  let parentId: number | null = nextParentId;

  while (parentId !== null) {
    if (parentId === currentTaskId) {
      return false;
    }

    parentId = itemById.get(parentId)?.parentId ?? null;
  }

  return true;
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
  const order = Number.isFinite(item.order) ? Math.max(1, item.order ?? 1) : 0;
  return {
    ...item,
    column,
    description: item.description?.trim() || DEFAULT_DESCRIPTION,
    order,
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

function initializeTaskOrders(
  items: readonly BoardItem[],
): readonly BoardItem[] {
  const siblingItemsByParentId = new Map<number | null, BoardItem[]>();
  const nextOrderById = new Map<number, number>();

  for (const item of items) {
    const siblingItems = siblingItemsByParentId.get(item.parentId) ?? [];
    siblingItems.push(item);
    siblingItemsByParentId.set(item.parentId, siblingItems);
  }

  for (const siblingItems of siblingItemsByParentId.values()) {
    if (siblingItems.every((item) => item.order > 0)) {
      continue;
    }

    [...siblingItems]
      .sort((left, right) => {
        const startDiff =
          toDayNumber(left.startDate) - toDayNumber(right.startDate);
        if (startDiff !== 0) return startDiff;
        return left.id - right.id;
      })
      .forEach((item, index) => {
        nextOrderById.set(item.id, index + 1);
      });
  }

  if (nextOrderById.size === 0) {
    return items;
  }

  return items.map((item) => {
    const nextOrder = nextOrderById.get(item.id);
    return nextOrder === undefined ? item : { ...item, order: nextOrder };
  });
}

function getNextTaskOrder(
  items: readonly BoardItem[],
  parentId: number | null,
  excludedTaskId: number | null = null,
): number {
  return (
    items
      .filter(
        (item) =>
          item.parentId === parentId &&
          (excludedTaskId === null || item.id !== excludedTaskId),
      )
      .reduce((maxOrder, item) => Math.max(maxOrder, item.order), 0) + 1
  );
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
    order: getNextTaskOrder(items, null),
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
      .filter(
        (item) =>
          item.id !== currentTaskId &&
          (currentTaskId === null ||
            canAssignParent(items, currentTaskId, item.id)),
      )
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
    const orderDiff = left.order - right.order;
    if (orderDiff !== 0) return orderDiff;
    return left.id - right.id;
  });
}

function resolveGanttTaskReorderParentId(
  items: readonly BoardItem[],
  draggedItemId: number,
  targetItemId: number,
  position: GanttTaskReorderPosition,
): number | null | undefined {
  const targetItem = items.find((item) => item.id === targetItemId);
  if (targetItem === undefined) {
    return undefined;
  }

  const targetHasChildren = items.some(
    (item) => item.parentId === targetItem.id,
  );
  const nextParentId =
    position === "after" && targetHasChildren
      ? targetItem.id
      : targetItem.parentId;

  return canAssignParent(items, draggedItemId, nextParentId)
    ? nextParentId
    : undefined;
}

function reorderGanttTasks(
  items: readonly BoardItem[],
  draggedItemId: number,
  targetItemId: number,
  position: GanttTaskReorderPosition,
): readonly BoardItem[] {
  if (draggedItemId === targetItemId) {
    return items;
  }

  const draggedItem = items.find((item) => item.id === draggedItemId);
  const targetItem = items.find((item) => item.id === targetItemId);

  if (draggedItem === undefined || targetItem === undefined) {
    return items;
  }

  const nextParentId = resolveGanttTaskReorderParentId(
    items,
    draggedItemId,
    targetItemId,
    position,
  );
  if (nextParentId === undefined) {
    return items;
  }

  const targetSiblingItems = sortGanttItems(
    items.filter(
      (item) => item.parentId === nextParentId && item.id !== draggedItemId,
    ),
  );

  const reorderedSiblingItems = [...targetSiblingItems];
  const insertIndex =
    nextParentId === targetItem.id
      ? 0
      : (() => {
          const targetIndex = targetSiblingItems.findIndex(
            (item) => item.id === targetItemId,
          );
          if (targetIndex < 0) {
            return -1;
          }

          return position === "after" ? targetIndex + 1 : targetIndex;
        })();

  if (insertIndex < 0) {
    return items;
  }

  reorderedSiblingItems.splice(insertIndex, 0, {
    ...draggedItem,
    parentId: nextParentId,
  });

  let hasChanged = false;
  const nextOrderById = new Map<number, number>();
  reorderedSiblingItems.forEach((item, index) => {
    const nextOrder = index + 1;
    nextOrderById.set(item.id, nextOrder);
    if (item.order !== nextOrder) {
      hasChanged = true;
    }
  });

  if (draggedItem.parentId !== nextParentId) {
    const previousSiblingItems = sortGanttItems(
      items.filter(
        (item) =>
          item.parentId === draggedItem.parentId && item.id !== draggedItemId,
      ),
    );

    previousSiblingItems.forEach((item, index) => {
      const nextOrder = index + 1;
      nextOrderById.set(item.id, nextOrder);
      if (item.order !== nextOrder) {
        hasChanged = true;
      }
    });

    hasChanged = true;
  }

  if (!hasChanged) {
    return items;
  }

  return items.map((item) => {
    const nextOrder = nextOrderById.get(item.id);
    if (item.id === draggedItemId) {
      return {
        ...item,
        order: nextOrder ?? item.order,
        parentId: nextParentId,
      };
    }

    return nextOrder === undefined ? item : { ...item, order: nextOrder };
  });
}

function buildGanttBarStyle(
  barStartDay: number,
  barEndDay: number,
  chartStartDay: number,
  totalDays: number,
  color: string,
): string {
  const visibleBarWindow = resolveVisibleGanttBarWindow(
    barStartDay,
    barEndDay,
    chartStartDay,
    totalDays,
  );
  const visibleStartDay = visibleBarWindow.visibleStartDay;
  const visibleEndDay = visibleBarWindow.visibleEndDay;
  const startOffsetDays = visibleStartDay - chartStartDay;
  const widthDays = Math.max(visibleEndDay - visibleStartDay + 1, 0);

  return `left:calc(${startOffsetDays} * var(--timeline-day-width));width:calc(${widthDays} * var(--timeline-day-width));--gantt-bar-color:${color};`;
}

function resolveVisibleGanttBarWindow(
  barStartDay: number,
  barEndDay: number,
  chartStartDay: number,
  totalDays: number,
): {
  readonly visibleStartDay: number;
  readonly visibleEndDay: number;
  readonly isStartClipped: boolean;
  readonly isEndClipped: boolean;
} {
  const chartEndDay = chartStartDay + totalDays - 1;

  return {
    visibleStartDay: Math.max(barStartDay, chartStartDay),
    visibleEndDay: Math.min(barEndDay, chartEndDay),
    isStartClipped: barStartDay < chartStartDay,
    isEndClipped: barEndDay > chartEndDay,
  };
}

function buildGanttMarkerStyle(
  markerDay: number,
  chartStartDay: number,
  _totalDays: number,
): string {
  const markerOffsetDays = markerDay - chartStartDay + 0.5;

  return `left:calc(${markerOffsetDays} * var(--timeline-day-width));`;
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
    .map((dayNumber) => {
      const kind = getWeekendDayKind(dayNumber) ?? "saturday";
      const dayOffset = dayNumber - startDay;

      return {
        id: `weekend-${dayNumber}`,
        kind,
        style: `left:calc(${dayOffset} * var(--timeline-day-width));width:var(--timeline-day-width);`,
      };
    });

  const currentDayNumber = getCurrentDayNumber();
  const todayMarkerStyle =
    currentDayNumber < startDay || currentDayNumber > endDay
      ? null
      : buildGanttMarkerStyle(currentDayNumber, startDay, totalDays);

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
        const visibleBarWindow = resolveVisibleGanttBarWindow(
          barStartDay,
          barEndDay,
          startDay,
          totalDays,
        );
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
            isBarClippedStart: visibleBarWindow.isStartClipped,
            isBarClippedEnd: visibleBarWindow.isEndClipped,
            barColor: color,
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
      const visibleBarWindow = resolveVisibleGanttBarWindow(
        barStartDay,
        barEndDay,
        startDay,
        totalDays,
      );

      return [
        {
          kind: "summary",
          depth,
          item,
          barStartDay,
          barEndDay,
          isBarClippedStart: visibleBarWindow.isStartClipped,
          isBarClippedEnd: visibleBarWindow.isEndClipped,
          barColor: color,
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

interface TaskManagementViewProps {
  readonly data: TaskBoardData;
  readonly view: "board" | "gantt";
}

function createTaskManagementStore(data: TaskBoardData): TaskManagementStore {
  const initialColumns = hydrateColumns(data.columns);
  const defaultSprint = getDefaultTaskBoardSprint(data.sprints);
  const initialItems = initializeTaskOrders(
    flattenSprintItems(data.sprints).map((item, index) =>
      hydrateItem(item, index, initialColumns),
    ),
  );
  const defaultGanttDateWindow = getDefaultGanttDateWindow();

  return {
    data,
    columns: pulse<readonly BoardColumn[]>(initialColumns),
    items: pulse<readonly BoardItem[]>(initialItems),
    search: pulse(""),
    filterTypes: pulse<readonly string[]>([]),
    filterPriorities: pulse<readonly string[]>([]),
    timeWindowMode: pulse<string>("sprint"),
    timeWindowAnchorDate: pulse(
      defaultSprint?.startDate ?? defaultGanttDateWindow.startDate,
    ),
    timeWindowStartDate: pulse(defaultGanttDateWindow.startDate),
    timeWindowEndDate: pulse(defaultGanttDateWindow.endDate),
    timeWindowStartDay: pulse(defaultGanttDateWindow.startDay),
    timeWindowEndDay: pulse(defaultGanttDateWindow.endDay),
    collapsedGanttParentIds: pulse<readonly number[]>([]),
  };
}

const TaskManagementView = component<TaskManagementViewProps>(
  (props): BeatJsxChild => {
    const taskManagementStore = createTaskManagementStore(props.data);
    const isGanttView = props.view === "gantt";
    const data = taskManagementStore.data;
    const columns = taskManagementStore.columns;
    const items = taskManagementStore.items;
    const search = taskManagementStore.search;
    const filterTypes = taskManagementStore.filterTypes;
    const filterPriorities = taskManagementStore.filterPriorities;
    const timeWindowMode = taskManagementStore.timeWindowMode;
    const ganttScaleMode = derived(
      timeWindowMode,
      (value): TimeWindowMode => (isTimeWindowMode(value) ? value : "sprint"),
    );
    const timeWindowAnchorDate = taskManagementStore.timeWindowAnchorDate;
    const timeWindowStartDate = taskManagementStore.timeWindowStartDate;
    const timeWindowEndDate = taskManagementStore.timeWindowEndDate;
    const timeWindowStartDay = taskManagementStore.timeWindowStartDay;
    const timeWindowEndDay = taskManagementStore.timeWindowEndDay;
    const defaultSprint = getDefaultTaskBoardSprint(data.sprints);
    const fallbackSprintDay = getCurrentDayNumber();
    const selectedSprintWindow = pulse({
      label: defaultSprint?.label ?? "",
      startDay:
        defaultSprint === null
          ? fallbackSprintDay
          : toDayNumber(defaultSprint.startDate),
      endDay:
        defaultSprint === null
          ? fallbackSprintDay
          : toDayNumber(defaultSprint.endDate),
    });
    const sprintRangeLabel = pulse("");
    const timeWindowSummaryLabel = pulse("");
    const sprintWindowOptions = buildSprintWindowOptions(data.sprints);
    const sprintSelectOptions: readonly SelectOption[] =
      sprintWindowOptions.map((window) => ({
        label: window.optionLabel,
        triggerLabel: window.label,
        value: window.value,
      }));

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
    const collapsedGanttParentIds = taskManagementStore.collapsedGanttParentIds;

    function setSelectedSprintWindow(
      label: string,
      startDay: number,
      endDay: number,
    ): void {
      const currentWindow = selectedSprintWindow.get();

      if (
        currentWindow.label === label &&
        currentWindow.startDay === startDay &&
        currentWindow.endDay === endDay
      ) {
        return;
      }

      selectedSprintWindow.set({ label, startDay, endDay });
    }

    function syncTimeWindow(): void {
      const selectedSprint =
        sprintWindowOptions.find(
          (window) => window.value === timeWindowAnchorDate.get(),
        ) ??
        (defaultSprint === null
          ? undefined
          : sprintWindowOptions.find(
              (window) => window.value === defaultSprint.startDate,
            )) ??
        sprintWindowOptions[0];

      if (selectedSprint === undefined) {
        setSelectedSprintWindow("", fallbackSprintDay, fallbackSprintDay);
        sprintRangeLabel.set("");
        return;
      }

      setSelectedSprintWindow(
        selectedSprint.label,
        selectedSprint.startDay,
        selectedSprint.endDay,
      );
      sprintRangeLabel.set(selectedSprint.rangeLabel);

      if (timeWindowAnchorDate.get() !== selectedSprint.startDate) {
        timeWindowAnchorDate.set(selectedSprint.startDate);
      }
    }

    function syncDateWindow(): void {
      const defaultGanttDateWindow = getDefaultGanttDateWindow();
      const rawStartDate = isIsoDateString(timeWindowStartDate.get())
        ? timeWindowStartDate.get()
        : defaultGanttDateWindow.startDate;
      const rawEndDate = isIsoDateString(timeWindowEndDate.get())
        ? timeWindowEndDate.get()
        : defaultGanttDateWindow.endDate;
      const normalizedStartDay = toDayNumber(rawStartDate);
      const normalizedEndDay = toDayNumber(rawEndDate);
      const startDay = Math.min(normalizedStartDay, normalizedEndDay);
      const endDay = Math.max(normalizedStartDay, normalizedEndDay);
      const normalizedStartDate = fromDayNumber(startDay);
      const normalizedEndDate = fromDayNumber(endDay);

      if (timeWindowStartDate.get() !== normalizedStartDate) {
        timeWindowStartDate.set(normalizedStartDate);
        return;
      }

      if (timeWindowEndDate.get() !== normalizedEndDate) {
        timeWindowEndDate.set(normalizedEndDate);
        return;
      }

      timeWindowStartDay.set(startDay);
      timeWindowEndDay.set(endDay);
      timeWindowSummaryLabel.set(
        `Visible dates · ${formatSprintWindowRange(startDay, endDay)}`,
      );
    }

    function syncFiltered(): void {
      const query = search.get().trim().toLowerCase();
      const selectedTypes = filterTypes.get();
      const selectedPriorities = filterPriorities.get();
      const sprintWindow = selectedSprintWindow.get();
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
          const matchesSprint = overlapsTimeWindow(
            item,
            sprintWindow.startDay,
            sprintWindow.endDay,
          );
          const matchesDateRange = overlapsTimeWindow(item, startDay, endDay);
          const matchesViewWindow = isGanttView
            ? matchesDateRange
            : matchesSprint;

          return (
            matchesViewWindow &&
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

      const committedStyleOverride = committedGanttBarStyleOverride.get();
      if (committedStyleOverride !== null) {
        const matchingRow = model.rows.find(
          (row) => row.item.id === committedStyleOverride.itemId,
        );

        if (
          matchingRow === undefined ||
          matchingRow.barStyle === committedStyleOverride.style
        ) {
          committedGanttBarStyleOverride.set(null);
        }
      }

      ganttWeekendBands.set(model.weekendBands);
      ganttTodayMarkerStyle.set(model.todayMarkerStyle);

      const timelineDays = Math.max(model.days.length, 1);
      const timelineDayWidthRem = Math.max(
        GANTT_DAY_WIDTH_REM,
        32 / timelineDays,
      );

      ganttTimelineStyle.set(
        `--timeline-days:${timelineDays};--timeline-day-width:${timelineDayWidthRem}rem;width:${timelineDays * timelineDayWidthRem}rem;`,
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

    const committedGanttBarStyleOverride = pulse<{
      readonly itemId: number;
      readonly style: string;
    } | null>(null);

    syncTimeWindow();
    syncDateWindow();
    syncVisibleColumns();
    syncFiltered();
    syncGanttFiltered();
    syncProgress();
    syncGantt();
    syncBoardStyle();

    onCleanup(timeWindowAnchorDate.on(syncTimeWindow));
    onCleanup(timeWindowStartDate.on(syncDateWindow));
    onCleanup(timeWindowEndDate.on(syncDateWindow));
    onCleanup(selectedSprintWindow.on(syncFiltered));
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
    onCleanup(selectedSprintWindow.on(syncGantt));
    onCleanup(timeWindowMode.on(syncGantt));
    onCleanup(timeWindowStartDay.on(syncGantt));
    onCleanup(timeWindowEndDay.on(syncGantt));
    onCleanup(visibleColumns.on(syncBoardStyle));

    let draggedId: number | null = null;
    let isDragging = false;
    let cleanupGanttInteractionListeners: (() => void) | null = null;
    let cleanupGanttTaskReorderListeners: (() => void) | null = null;
    let activeGanttBarElement: HTMLDivElement | null = null;
    let activeGanttBarCommittedStyle: string | null = null;
    let activeGanttBarColor: string | null = null;
    let suppressNextGanttTaskOpen = false;
    let suppressGanttTaskOpenUntil = 0;
    const ganttTaskReorder = pulse<GanttTaskReorderState | null>(null);
    const ganttInteraction = pulse<GanttInteractionState | null>(null);
    const ganttParentDropTargetId = pulse<number | null>(null);
    const onDocDragover = (event: Event): void => {
      if (isDragging) event.preventDefault();
    };

    document.addEventListener("dragover", onDocDragover, true);
    onCleanup(() => {
      document.removeEventListener("dragover", onDocDragover, true);
      cleanupGanttInteractionListeners?.();
      cleanupGanttTaskReorderListeners?.();
      if (
        activeGanttBarElement !== null &&
        activeGanttBarCommittedStyle !== null
      ) {
        activeGanttBarElement.style.cssText = activeGanttBarCommittedStyle;
      }
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    });

    function syncTaskManagementSnapshot(
      nextColumns: readonly BoardColumn[] = columns.get(),
      nextItems: readonly BoardItem[] = items.get(),
    ): void {
      const currentData = taskManagementData.get();
      if (currentData === null) {
        return;
      }

      taskManagementData.set({
        ...currentData,
        columns: nextColumns,
        sprints: syncSprintItems(currentData.sprints, nextItems),
      });
    }

    function setTaskItems(nextItems: readonly BoardItem[]): void {
      items.set(nextItems);
      syncTaskManagementSnapshot(columns.get(), nextItems);
    }

    function setTaskColumns(nextColumns: readonly BoardColumn[]): void {
      columns.set(nextColumns);
      syncTaskManagementSnapshot(nextColumns, items.get());
    }

    function setTaskColumnsAndItems(
      nextColumns: readonly BoardColumn[],
      nextItems: readonly BoardItem[],
    ): void {
      columns.set(nextColumns);
      items.set(nextItems);
      syncTaskManagementSnapshot(nextColumns, nextItems);
    }

    function moveItem(id: number, to: ColumnId): void {
      if (
        to !== NO_STATUS_COLUMN_ID &&
        !columns.get().some((column) => column.id === to)
      ) {
        return;
      }

      setTaskItems(
        items
          .get()
          .map((item) => (item.id === id ? { ...item, column: to } : item)),
      );
    }

    function markGanttTaskOpenSuppressed(): void {
      suppressNextGanttTaskOpen = true;
      suppressGanttTaskOpenUntil = Date.now() + 250;
    }

    function openGanttTask(item: BoardItem): void {
      if (suppressNextGanttTaskOpen) {
        suppressNextGanttTaskOpen = false;
        return;
      }

      if (Date.now() < suppressGanttTaskOpenUntil) {
        return;
      }

      openTaskDetails(item);
    }

    function stopGanttTaskReorderListeners(): void {
      cleanupGanttTaskReorderListeners?.();
      cleanupGanttTaskReorderListeners = null;
    }

    function clearGanttTaskReorderTarget(): void {
      const reorder = ganttTaskReorder.get();
      if (reorder !== null && reorder.overItemId !== null) {
        ganttTaskReorder.set({
          ...reorder,
          overItemId: null,
        });
      }
    }

    function resolveGanttTaskReorderTarget(
      target: EventTarget | null,
      clientY: number,
    ): {
      readonly itemId: number;
      readonly position: GanttTaskReorderPosition;
    } | null {
      if (!(target instanceof Element)) {
        return null;
      }

      const rowTarget = target.closest("[data-gantt-reorder-item-id]");
      if (!(rowTarget instanceof HTMLElement)) {
        return null;
      }

      const rawItemId = rowTarget.dataset["ganttReorderItemId"];
      const itemId = Number.parseInt(rawItemId ?? "", 10);
      if (!Number.isFinite(itemId)) {
        return null;
      }

      const rect = rowTarget.getBoundingClientRect();
      return {
        itemId,
        position: clientY < rect.top + rect.height / 2 ? "before" : "after",
      };
    }

    function armGanttTaskReorderListeners(): void {
      stopGanttTaskReorderListeners();

      const handleDocDragOver = (event: Event): void => {
        const reorder = ganttTaskReorder.get();
        if (reorder === null) {
          return;
        }

        const dragEvent = event as DragEvent;
        dragEvent.preventDefault();
        if (dragEvent.dataTransfer !== null) {
          dragEvent.dataTransfer.dropEffect = "move";
        }

        const nextTarget = resolveGanttTaskReorderTarget(
          dragEvent.target,
          dragEvent.clientY,
        );

        if (nextTarget === null) {
          clearGanttTaskReorderTarget();
          return;
        }

        updateGanttTaskReorderTarget(nextTarget.itemId, nextTarget.position);
      };

      const handleDocDrop = (event: Event): void => {
        const reorder = ganttTaskReorder.get();
        if (reorder === null) {
          return;
        }

        const dragEvent = event as DragEvent;
        dragEvent.preventDefault();
        dragEvent.stopPropagation();

        if (reorder.overItemId === null) {
          endGanttTaskReorder();
          return;
        }

        commitGanttTaskReorder(reorder.overItemId, reorder.position);
      };

      document.addEventListener("dragover", handleDocDragOver, true);
      document.addEventListener("drop", handleDocDrop, true);

      cleanupGanttTaskReorderListeners = () => {
        document.removeEventListener("dragover", handleDocDragOver, true);
        document.removeEventListener("drop", handleDocDrop, true);
      };
    }

    function startGanttTaskReorder(itemId: number): void {
      const draggedItem = items.get().find((item) => item.id === itemId);
      if (draggedItem === undefined) {
        return;
      }

      markGanttTaskOpenSuppressed();

      ganttTaskReorder.set({
        draggedItemId: itemId,
        overItemId: null,
        position: "after",
      });

      armGanttTaskReorderListeners();
    }

    function updateGanttTaskReorderTarget(
      itemId: number,
      position: GanttTaskReorderPosition,
    ): void {
      const reorder = ganttTaskReorder.get();
      if (reorder === null) {
        return;
      }

      const currentItems = items.get();
      const nextParentId = resolveGanttTaskReorderParentId(
        currentItems,
        reorder.draggedItemId,
        itemId,
        position,
      );
      if (nextParentId === undefined || reorder.draggedItemId === itemId) {
        if (reorder.overItemId !== null) {
          ganttTaskReorder.set({
            ...reorder,
            overItemId: null,
          });
        }
        return;
      }

      if (reorder.overItemId === itemId && reorder.position === position) {
        return;
      }

      ganttTaskReorder.set({
        ...reorder,
        overItemId: itemId,
        position,
      });
    }

    function endGanttTaskReorder(): void {
      stopGanttTaskReorderListeners();
      ganttTaskReorder.set(null);
    }

    function commitGanttTaskReorder(
      itemId: number,
      position: GanttTaskReorderPosition,
    ): void {
      const currentItems = items.get();
      const reorder = ganttTaskReorder.get();
      if (reorder === null) {
        return;
      }

      const nextItems = reorderGanttTasks(
        currentItems,
        reorder.draggedItemId,
        itemId,
        position,
      );

      stopGanttTaskReorderListeners();
      ganttTaskReorder.set(null);
      if (nextItems !== currentItems) {
        setTaskItems(nextItems);
      }
    }

    function withInlineCursor(styleText: string, cursor: string): string {
      return `${styleText}${styleText.endsWith(";") ? "" : ";"}cursor:${cursor};`;
    }

    function clearActiveGanttBarPreview(restoreCommittedStyle: boolean): void {
      if (restoreCommittedStyle) {
        if (
          activeGanttBarElement !== null &&
          activeGanttBarCommittedStyle !== null
        ) {
          activeGanttBarElement.style.cssText = withInlineCursor(
            activeGanttBarCommittedStyle,
            "grab",
          );
        }
      }

      activeGanttBarElement = null;
      activeGanttBarCommittedStyle = null;
      activeGanttBarColor = null;
    }

    function applyActiveGanttBarPreview(
      interaction: GanttInteractionState,
    ): void {
      if (activeGanttBarElement === null || activeGanttBarColor === null) {
        return;
      }

      activeGanttBarElement.style.cssText = withInlineCursor(
        buildGanttBarStyle(
          interaction.previewStartDay,
          interaction.previewStartDay + interaction.previewDurationDays - 1,
          interaction.chartStartDay,
          interaction.chartDayCount,
          activeGanttBarColor,
        ),
        interaction.mode === "move" ? "grabbing" : "ew-resize",
      );
    }

    function stopGanttInteraction(restoreCommittedStyle = true): void {
      const releasedBarElement = activeGanttBarElement;
      const releasedBarStyle =
        restoreCommittedStyle && activeGanttBarCommittedStyle !== null
          ? activeGanttBarCommittedStyle
          : null;

      cleanupGanttInteractionListeners?.();
      cleanupGanttInteractionListeners = null;
      clearActiveGanttBarPreview(restoreCommittedStyle);
      ganttInteraction.set(null);
      ganttParentDropTargetId.set(null);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");

      if (releasedBarElement !== null) {
        requestAnimationFrame(() => {
          releasedBarElement.classList.remove(
            css["ganttBarDragging"]!,
            css["ganttBarResizing"]!,
          );

          if (releasedBarStyle !== null) {
            releasedBarElement.style.cssText = withInlineCursor(
              releasedBarStyle,
              "grab",
            );
            return;
          }

          releasedBarElement.style.cursor = "grab";
        });
      }
    }

    function resolveGanttParentDropTargetId(
      itemId: number,
      clientX: number,
      clientY: number,
    ): number | null {
      const target = document.elementFromPoint(clientX, clientY);
      if (!(target instanceof Element)) {
        return null;
      }

      const parentTarget = target.closest("[data-gantt-parent-id]");
      if (!(parentTarget instanceof HTMLElement)) {
        return null;
      }

      const rawParentId = parentTarget.dataset["ganttParentId"];
      const nextParentId = Number.parseInt(rawParentId ?? "", 10);
      if (!Number.isFinite(nextParentId)) {
        return null;
      }

      return canAssignParent(items.get(), itemId, nextParentId)
        ? nextParentId
        : null;
    }

    function syncGanttInteractionPreview(
      clientX: number,
      clientY: number,
    ): void {
      const interaction = ganttInteraction.get();
      if (interaction === null) {
        return;
      }

      const dayWidthPx = Math.max(
        interaction.laneWidthPx / Math.max(interaction.chartDayCount, 1),
        1,
      );
      const deltaDays = Math.round(
        (clientX - interaction.originClientX) / dayWidthPx,
      );

      if (interaction.mode === "move") {
        const parentDropTargetId =
          clientX < interaction.timelineLeftPx
            ? resolveGanttParentDropTargetId(
                interaction.itemId,
                clientX,
                clientY,
              )
            : null;
        const previewStartDay =
          clientX < interaction.timelineLeftPx
            ? interaction.originStartDay
            : interaction.originStartDay + deltaDays;

        ganttParentDropTargetId.set(parentDropTargetId);

        if (previewStartDay === interaction.previewStartDay) {
          applyActiveGanttBarPreview(interaction);
          return;
        }

        const nextInteraction = {
          ...interaction,
          previewStartDay,
        };
        ganttInteraction.set(nextInteraction);
        applyActiveGanttBarPreview(nextInteraction);
        return;
      }

      ganttParentDropTargetId.set(null);

      if (interaction.mode === "resize-start") {
        const previewStartDay = Math.min(
          interaction.originStartDay + deltaDays,
          interaction.originEndDay,
        );
        const previewDurationDays =
          interaction.originEndDay - previewStartDay + 1;

        if (
          previewStartDay === interaction.previewStartDay &&
          previewDurationDays === interaction.previewDurationDays
        ) {
          applyActiveGanttBarPreview(interaction);
          return;
        }

        const nextInteraction = {
          ...interaction,
          previewStartDay,
          previewDurationDays,
        };
        ganttInteraction.set(nextInteraction);
        applyActiveGanttBarPreview(nextInteraction);
        return;
      }

      const previewDurationDays = Math.max(
        1,
        interaction.originDurationDays + deltaDays,
      );
      if (previewDurationDays === interaction.previewDurationDays) {
        applyActiveGanttBarPreview(interaction);
        return;
      }

      const nextInteraction = {
        ...interaction,
        previewDurationDays,
      };
      ganttInteraction.set(nextInteraction);
      applyActiveGanttBarPreview(nextInteraction);
    }

    function commitGanttInteraction(clientX: number, clientY: number): void {
      const interaction = ganttInteraction.get();
      if (interaction === null) {
        return;
      }

      syncGanttInteractionPreview(clientX, clientY);

      const latestInteraction = ganttInteraction.get() ?? interaction;
      const currentItems = items.get();
      const nextParentId = ganttParentDropTargetId.get();
      const committedBarColor =
        activeGanttBarColor ??
        ganttRows.get().find((row) => row.item.id === latestInteraction.itemId)
          ?.barColor ??
        "var(--beat-ui-color-primary)";
      const committedBarStyle = buildGanttBarStyle(
        latestInteraction.previewStartDay,
        latestInteraction.previewStartDay +
          latestInteraction.previewDurationDays -
          1,
        latestInteraction.chartStartDay,
        latestInteraction.chartDayCount,
        committedBarColor,
      );

      activeGanttBarCommittedStyle = committedBarStyle;
      committedGanttBarStyleOverride.set({
        itemId: latestInteraction.itemId,
        style: committedBarStyle,
      });

      stopGanttInteraction();

      setTaskItems(
        currentItems.map((item) => {
          if (item.id !== latestInteraction.itemId) {
            return item;
          }

          const resolvedParentId =
            latestInteraction.mode === "move" &&
            nextParentId !== null &&
            canAssignParent(currentItems, item.id, nextParentId)
              ? nextParentId
              : item.parentId;

          return {
            ...item,
            order:
              resolvedParentId !== item.parentId
                ? getNextTaskOrder(currentItems, resolvedParentId, item.id)
                : item.order,
            startDate: fromDayNumber(latestInteraction.previewStartDay),
            durationDays:
              latestInteraction.mode !== "move"
                ? latestInteraction.previewDurationDays
                : item.durationDays,
            parentId: resolvedParentId,
          };
        }),
      );
    }

    function beginGanttInteraction(
      mode: GanttInteractionMode,
      row: GanttRowModel,
      barElement: HTMLDivElement | null,
      clientX: number,
      clientY: number,
      laneWidthPx: number,
      timelineLeftPx: number,
    ): void {
      endGanttTaskReorder();
      stopGanttInteraction();

      activeGanttBarElement = barElement;
      activeGanttBarCommittedStyle = row.barStyle;
      activeGanttBarColor = row.barColor;

      const nextInteraction: GanttInteractionState = {
        mode,
        itemId: row.item.id,
        originClientX: clientX,
        laneWidthPx: Math.max(laneWidthPx, 1),
        timelineLeftPx,
        chartStartDay: timeWindowStartDay.get(),
        chartDayCount: Math.max(ganttDays.get().length, 1),
        originStartDay: toDayNumber(row.item.startDate),
        originEndDay:
          toDayNumber(row.item.startDate) + row.item.durationDays - 1,
        originDurationDays: row.item.durationDays,
        previewStartDay: toDayNumber(row.item.startDate),
        previewDurationDays: row.item.durationDays,
      };

      ganttInteraction.set(nextInteraction);
      ganttParentDropTargetId.set(null);
      document.body.style.cursor = mode === "move" ? "grabbing" : "ew-resize";
      document.body.style.userSelect = "none";
      applyActiveGanttBarPreview(nextInteraction);

      const handlePointerMove = (event: PointerEvent): void => {
        syncGanttInteractionPreview(event.clientX, event.clientY);
      };

      const handlePointerUp = (event: PointerEvent): void => {
        commitGanttInteraction(event.clientX, event.clientY);
      };

      const handlePointerCancel = (): void => {
        stopGanttInteraction();
      };

      const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          event.preventDefault();
          stopGanttInteraction();
        }
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerCancel);
      document.addEventListener("keydown", handleKeyDown, true);

      cleanupGanttInteractionListeners = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
        document.removeEventListener("pointercancel", handlePointerCancel);
        document.removeEventListener("keydown", handleKeyDown, true);
      };

      syncGanttInteractionPreview(clientX, clientY);
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
    function syncColumnAutoAccentValue(): void {
      const label = columnLabel.get().trim();
      const draftId =
        editingColumnId.get() ??
        (slugifyColumnId(label || "status") || "status");

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
      const currentItem =
        item === undefined
          ? undefined
          : (items.get().find((candidate) => candidate.id === item.id) ?? item);
      const draftTask =
        currentItem ?? createBlankTask(columns.get(), items.get());
      editingTaskId.set(currentItem?.id ?? null);
      loadTaskDraft(draftTask);
      taskDialogOpen.set(true);
    }

    function saveTask(): void {
      const title = taskTitle.get().trim();
      if (title.length === 0) return;

      const currentItems = items.get();
      const currentEditingId = editingTaskId.get();
      const currentTask = currentItems.find(
        (item) => item.id === currentEditingId,
      );
      const taskId = currentEditingId ?? getNextTaskId(currentItems);
      const requestedParentId = normalizeParentId(taskParentId.get(), taskId);
      const nextParentId = canAssignParent(
        currentItems,
        taskId,
        requestedParentId,
      )
        ? requestedParentId
        : null;
      const nextOrder =
        currentTask === undefined || currentTask.parentId !== nextParentId
          ? getNextTaskOrder(currentItems, nextParentId, taskId)
          : currentTask.order;
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
        order: nextOrder,
        parentId: nextParentId,
        startDate: isIsoDateString(taskStartDate.get())
          ? taskStartDate.get()
          : DEFAULT_START_DATE,
        durationDays: parsePositiveInteger(taskDurationDays.get(), 3),
        dependencyIds: normalizeDependencyIds(taskDependencyIds.get(), taskId),
      };

      if (currentEditingId === null) {
        setTaskItems([...currentItems, nextTask]);
      } else {
        setTaskItems(
          currentItems.map((item) => (item.id === taskId ? nextTask : item)),
        );
      }

      taskDialogOpen.set(false);
    }

    function openColumnDialog(column?: BoardColumn): void {
      const currentColumn =
        column === undefined
          ? undefined
          : (columns.get().find((candidate) => candidate.id === column.id) ??
            column);

      editingColumnId.set(currentColumn?.id ?? null);
      columnLabel.set(currentColumn?.label ?? "");
      columnOrder.set(
        String(
          currentColumn === undefined
            ? columns.get().length + 1
            : Math.max(
                columns
                  .get()
                  .findIndex((candidate) => candidate.id === currentColumn.id) +
                  1,
                1,
              ),
        ),
      );
      columnAccentColor.set(currentColumn?.accentColor ?? "auto");
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

      setTaskColumns(nextColumns);
      editingColumnId.set(null);
      columnDialogOpen.set(false);
    }

    function deleteColumn(columnId: ColumnId): void {
      const currentColumns = columns.get();
      if (currentColumns.length <= 1) return;

      const remainingColumns = currentColumns.filter(
        (column) => column.id !== columnId,
      );

      const nextItems = items
        .get()
        .map((item) =>
          item.column === columnId
            ? { ...item, column: NO_STATUS_COLUMN_ID }
            : item,
        );

      setTaskColumnsAndItems(remainingColumns, nextItems);

      if (taskColumn.get() === columnId) {
        taskColumn.set(NO_STATUS_COLUMN_ID);
      }
    }

    const typeOptions: readonly MultiSelectOption[] = data.taskTypeOptions.map(
      (option) => ({
        label: option.label,
        value: option.value,
      }),
    );
    const priorityOptions: readonly MultiSelectOption[] =
      data.priorityTypeOptions.map((option) => ({
        label: option.label,
        value: option.value,
      }));
    const taskTypeOptions: readonly SelectOption[] = data.taskTypeOptions.map(
      (option) => ({
        label: option.label,
        value: option.value,
      }),
    );
    const taskPriorityOptions: readonly SelectOption[] =
      data.priorityTypeOptions.map((option) => ({
        label: option.label,
        value: option.value,
      }));

    const renderBoardViewContent = (): BeatJsxChild => (
      <TaskBoard
        boardColumnCount={boardColumnCount}
        visibleColumns={visibleColumns}
        filteredItems={filtered}
        resolveColumnAccentValue={resolveColumnAccentValue}
        formatTaskDateRange={formatTaskDateRange}
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
    );

    const renderGanttViewContent = (): BeatJsxChild => (
      <GanttChart
        rows={ganttRows}
        days={ganttDays}
        weekendBands={ganttWeekendBands}
        scaleBands={ganttScaleBands}
        scaleMode={ganttScaleMode}
        todayMarkerStyle={ganttTodayMarkerStyle}
        timelineStyle={ganttTimelineStyle}
        interaction={ganttInteraction}
        reorder={ganttTaskReorder}
        committedStyleOverride={committedGanttBarStyleOverride}
        formatDayNumber={formatGanttDayNumber}
        formatWeekdayLabel={formatGanttWeekdayLabel}
        isWeekendDay={isWeekendDayNumber}
        getWeekendDayKind={getWeekendDayKind}
        getCurrentDayNumber={getCurrentDayNumber}
        startOfMonthDayNumber={startOfMonthDayNumber}
        buildBarStyle={buildGanttBarStyle}
        resolveVisibleBarWindow={resolveVisibleGanttBarWindow}
        onOpenTask={openGanttTask}
        onInteractionStart={markGanttTaskOpenSuppressed}
        onToggleParent={toggleCollapsedGanttParent}
        onReorderDragStart={startGanttTaskReorder}
        onReorderDragEnd={endGanttTaskReorder}
        onStartMoveInteraction={(
          row,
          barElement,
          clientX,
          clientY,
          laneWidthPx,
          timelineLeftPx,
        ) => {
          beginGanttInteraction(
            "move",
            row,
            barElement,
            clientX,
            clientY,
            laneWidthPx,
            timelineLeftPx,
          );
        }}
        onStartResizeInteraction={(
          mode,
          row,
          barElement,
          clientX,
          laneWidthPx,
          timelineLeftPx,
        ) => {
          beginGanttInteraction(
            mode,
            row,
            barElement,
            clientX,
            0,
            laneWidthPx,
            timelineLeftPx,
          );
        }}
      />
    );

    return (
      <div class={css["root"]!}>
        <div class={css["header"]!}>
          <div class={css["headerCopy"]!}>
            <div
              class={`${css["titleRow"]!} ${isGanttView ? css["titleRowGantt"]! : ""}`}
            >
              {!isGanttView ? (
                <>
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
                        chevron:
                          "right:0;color:var(--beat-ui-color-text-muted);",
                        menu: "min-width:18rem;",
                      }}
                    />
                  </div>
                  <Show
                    when={sprintRangeLabel}
                    mapValue={(label) => label.trim().length > 0}
                  >
                    {() => (
                      <p class={css["titleMeta"]!} text={sprintRangeLabel} />
                    )}
                  </Show>
                </>
              ) : null}
              {isGanttView ? (
                <GanttChartToolbar
                  timeWindowStartDate={timeWindowStartDate}
                  timeWindowEndDate={timeWindowEndDate}
                  search={search}
                  filterTypes={filterTypes}
                  filterPriorities={filterPriorities}
                  typeOptions={typeOptions}
                  priorityOptions={priorityOptions}
                  onCreateTask={() => openTaskDetails()}
                />
              ) : null}
            </div>
          </div>
          <div class={css["progress"]!}>
            <span class={css["progressLabel"]!} text={progressLabel} />
            <div class={css["progressTrack"]!}>
              <div
                class={css["progressFill"]!}
                style:width={progressWidthPct}
              />
            </div>
          </div>
        </div>

        {!isGanttView ? (
          <TaskBoardToolbar
            search={search}
            filterTypes={filterTypes}
            filterPriorities={filterPriorities}
            typeOptions={typeOptions}
            priorityOptions={priorityOptions}
            onCreateTask={() => openTaskDetails()}
            onCreateStatus={() => openColumnDialog()}
          />
        ) : null}

        <div class={css["viewsTab"]!}>
          {props.view === "gantt"
            ? renderGanttViewContent()
            : renderBoardViewContent()}
        </div>

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
                    <NumberInput
                      id="points"
                      name="points"
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
                    <label class={css["fieldLabel"]!}>Duration (days)</label>
                    <NumberInput
                      id="duration"
                      name="duration"
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
                    <label class={css["fieldLabel"]!}>
                      Status column order
                    </label>
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
  },
);

export interface TaskManagementPageProps {
  readonly taskBoardPort: TaskBoardPort;
  readonly view: "board" | "gantt";
}

export const TaskManagementPage = component<TaskManagementPageProps>(
  (props): BeatJsxChild => {
    const initialData = pulse<TaskBoardData | null>(taskManagementData.get());

    onMount(() => {
      if (initialData.get() !== null) {
        return;
      }

      void loadTaskManagementData(props.taskBoardPort).then((data) => {
        initialData.set(data);
      });
    });

    return (
      <Show when={initialData} mapValue={(value) => value !== null}>
        {() => (
          <TaskManagementView data={initialData.get()!} view={props.view} />
        )}
      </Show>
    );
  },
);
