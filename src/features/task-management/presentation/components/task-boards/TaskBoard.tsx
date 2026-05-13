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
  IconPlus,
  MultiSelect,
  SearchInput,
  type MultiSelectOption,
} from "@ochairo/beat-ui";
import { derived, pulse, type Pulse, type ReadonlyPulse } from "@ochairo/pulse";

import type {
  ColumnId,
  Priority,
  TaskBoardColumn,
  TaskColumnKind,
  WorkItem,
} from "../../../domain/types";

import css from "./TaskBoard.module.css";

interface BoardColumn extends TaskBoardColumn {
  readonly kind: TaskColumnKind;
  readonly isSystem?: boolean;
}

interface BoardItem extends WorkItem {
  readonly description: string;
  readonly order: number;
  readonly parentId: number | null;
  readonly startDate: string;
  readonly durationDays: number;
  readonly dependencyIds: readonly number[];
}

export interface TaskBoardToolbarProps {
  readonly search: Pulse<string>;
  readonly filterTypes: Pulse<readonly string[]>;
  readonly filterPriorities: Pulse<readonly string[]>;
  readonly typeOptions: readonly MultiSelectOption[];
  readonly priorityOptions: readonly MultiSelectOption[];
  readonly onCreateTask: () => void;
  readonly onCreateStatus: () => void;
}

interface WorkItemCardProps {
  readonly item: Pulse<BoardItem>;
  readonly formatTaskDateRange: (item: BoardItem) => string;
  readonly onDragStart: (itemId: number) => void;
  readonly onDragEnd: () => void;
  readonly onOpenDetails: (item: BoardItem) => void;
}

interface BoardColumnViewProps {
  readonly column: ReadonlyPulse<BoardColumn>;
  readonly filteredItems: Pulse<readonly BoardItem[]>;
  readonly resolveColumnAccentValue: (column: BoardColumn) => string;
  readonly formatTaskDateRange: (item: BoardItem) => string;
  readonly onOpenColumn: (column: BoardColumn) => void;
  readonly getDraggedId: () => number | null;
  readonly onMoveItem: (id: number, to: ColumnId) => void;
  readonly onOpenTask: (item: BoardItem) => void;
  readonly onDragStart: (id: number) => void;
  readonly onDragEnd: () => void;
}

export interface TaskBoardProps {
  readonly boardColumnCount: ReadonlyPulse<string>;
  readonly visibleColumns: Pulse<readonly BoardColumn[]>;
  readonly filteredItems: Pulse<readonly BoardItem[]>;
  readonly resolveColumnAccentValue: (column: BoardColumn) => string;
  readonly formatTaskDateRange: (item: BoardItem) => string;
  readonly onOpenColumn: (column: BoardColumn) => void;
  readonly getDraggedId: () => number | null;
  readonly onMoveItem: (id: number, to: ColumnId) => void;
  readonly onOpenTask: (item: BoardItem) => void;
  readonly onDragStart: (id: number) => void;
  readonly onDragEnd: () => void;
}

function priorityTone(
  priority: Priority,
): "danger" | "warning" | "primary" | "default" {
  if (priority === "Critical") return "danger";
  if (priority === "High") return "warning";
  if (priority === "Medium") return "primary";
  return "default";
}

export const TaskBoardToolbar = component<TaskBoardToolbarProps>(
  (props): BeatJsxChild => (
    <div class={css["toolbar"]!}>
      <div class={css["toolbarFilters"]!}>
        <div class={css["searchWrap"]!}>
          <SearchInput
            value={props.search}
            onValueChange={(value: string) => props.search.set(value)}
            placeholder="Search work items…"
          />
        </div>
        <div class={css["filterWrap"]!}>
          <MultiSelect
            value={props.filterTypes}
            onValueChange={(value: readonly string[]) =>
              props.filterTypes.set(value)
            }
            options={props.typeOptions}
            placeholder="Type"
          />
        </div>
        <div class={css["filterWrap"]!}>
          <MultiSelect
            value={props.filterPriorities}
            onValueChange={(value: readonly string[]) =>
              props.filterPriorities.set(value)
            }
            options={props.priorityOptions}
            placeholder="Priority"
          />
        </div>
      </div>

      <div class={css["toolbarActions"]!}>
        <Button tone="primary" onPress={props.onCreateTask}>
          <IconPlus size={14} />
          New task
        </Button>
        <Button appearance="soft" onPress={props.onCreateStatus}>
          <IconPlus size={14} />
          Add status
        </Button>
      </div>
    </div>
  ),
);

const WorkItemCard = component<WorkItemCardProps>((props): BeatJsxChild => {
  let cleanupDragListeners: (() => void) | null = null;
  const currentItem = pulse<BoardItem | null>(props.item.get() ?? null);
  const itemTags = pulse<readonly string[]>(currentItem.get()?.tags ?? []);
  const itemIdLabel = derived(currentItem, (item) =>
    item === null ? "" : `#${item.id}`,
  );
  const itemType = derived(currentItem, (item) => item?.type ?? "");
  const itemTitle = derived(currentItem, (item) => item?.title ?? "");
  const itemDescription = derived(
    currentItem,
    (item) => item?.description ?? "",
  );
  const taskDateRange = derived(currentItem, (item) =>
    item === null ? "" : props.formatTaskDateRange(item),
  );
  const parentLabel = derived(currentItem, (item) =>
    item === null || item.parentId === null ? null : `Parent #${item.parentId}`,
  );
  const relatedLabel = derived(currentItem, (item) =>
    item !== null && item.dependencyIds.length > 0
      ? `Related: ${item.dependencyIds.length}`
      : null,
  );
  const assigneeLabel = derived(currentItem, (item) => item?.assignee ?? "");
  const priorityLabel = derived(currentItem, (item) => item?.priority ?? "Low");
  const pointsLabel = derived(currentItem, (item) =>
    item === null ? "" : `${item.points}p`,
  );

  const syncCurrentItem = (item: BoardItem | null | undefined): void => {
    currentItem.set(item ?? null);
    itemTags.set(item?.tags ?? []);
  };

  onCleanup(
    props.item.on(({ currentValue }) => {
      syncCurrentItem(currentValue as BoardItem | null | undefined);
    }),
  );

  onCleanup(() => {
    cleanupDragListeners?.();
    itemIdLabel.destroy?.();
    itemType.destroy?.();
    itemTitle.destroy?.();
    itemDescription.destroy?.();
    taskDateRange.destroy?.();
    parentLabel.destroy?.();
    relatedLabel.destroy?.();
    assigneeLabel.destroy?.();
    priorityLabel.destroy?.();
    pointsLabel.destroy?.();
  });

  const handleOpenDetails = (): void => {
    const item = currentItem.get();
    if (item !== null) {
      props.onOpenDetails(item);
    }
  };

  return (
    <div
      class={css["cardWrapper"]!}
      ref={(el) => {
        cleanupDragListeners?.();

        const node = el as HTMLElement;
        node.draggable = true;

        const handleDragStart = (event: Event): void => {
          const item = currentItem.get();
          if (item === null) {
            return;
          }

          props.onDragStart(item.id);
          node.classList.add(css["dragging"]!);
          const dragEvent = event as DragEvent;
          if (dragEvent.dataTransfer !== null) {
            dragEvent.dataTransfer.effectAllowed = "move";
          }
        };

        const handleDragEnd = (): void => {
          props.onDragEnd();
          node.classList.remove(css["dragging"]!);
          document
            .querySelectorAll(`.${css["columnOver"]!}`)
            .forEach((column) => column.classList.remove(css["columnOver"]!));
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
        onPress={handleOpenDetails}
      >
        <div class={css["cardMeta"]!}>
          <span class={css["cardType"]!}>{itemType}</span>
          <span class={css["cardId"]!}>{itemIdLabel}</span>
        </div>
        <p class={css["cardTitle"]!}>{itemTitle}</p>
        <p class={css["cardDescription"]!}>{itemDescription}</p>
        <div class={css["cardBottom"]!}>
          <div class={css["cardTags"]!}>
            <For each={itemTags} key={(tag, index) => `${index}-${tag}`}>
              {(tagPulse) => <span class={css["tag"]!}>{tagPulse}</span>}
            </For>
          </div>
          <div class={css["cardSchedule"]!}>
            <span>{taskDateRange}</span>
            <Show when={parentLabel} mapValue={(label) => label !== null}>
              {(label) => <span>{label ?? ""}</span>}
            </Show>
            <Show when={relatedLabel} mapValue={(label) => label !== null}>
              {(label) => <span>{label ?? ""}</span>}
            </Show>
          </div>
          <div class={css["cardFooter"]!}>
            <span class={css["avatar"]!}>{assigneeLabel}</span>
            <Show when={currentItem} mapValue={(item) => item !== null}>
              {() => (
                <Badge
                  tone={priorityTone(currentItem.get()?.priority ?? "Low")}
                  size="sm"
                >
                  {priorityLabel}
                </Badge>
              )}
            </Show>
            <span class={css["points"]!}>{pointsLabel}</span>
          </div>
        </div>
      </Card>
    </div>
  );
});

const BoardColumnView = component<BoardColumnViewProps>(
  (props): BeatJsxChild => {
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
      (column) => `--column-accent:${props.resolveColumnAccentValue(column)};`,
    );
    const columnIsSystem = derived(
      props.column,
      (column) => column.isSystem === true,
    );
    const columnIsCustom = derived(columnIsSystem, (isSystem) => !isSystem);
    const columnAriaLabel = derived(
      props.column,
      (column) => `Edit ${column.label} status`,
    );
    const columnCount = derived(columnItems, (currentItems) =>
      String(currentItems.length),
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
      columnLabel.destroy?.();
      columnStyle.destroy?.();
      columnIsSystem.destroy?.();
      columnIsCustom.destroy?.();
      columnAriaLabel.destroy?.();
      columnCount.destroy?.();
    });

    return (
      <div
        class={css["columnShell"]!}
        ref={(el) => {
          cleanupColumnShellSubscription?.();

          const node = el as HTMLDivElement;
          node.style.cssText = columnStyle.get();
          cleanupColumnShellSubscription = columnStyle.on(
            ({ currentValue }) => {
              node.style.cssText = currentValue;
            },
          );
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

          <Show when={columnIsCustom}>
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

              node.addEventListener("dragenter", handleDragEnter);
              node.addEventListener("dragover", handleDragEnter);
              node.addEventListener("dragleave", handleDragLeave);
              node.addEventListener("drop", handleDrop);

              cleanupColumnBodyListeners = () => {
                node.removeEventListener("dragenter", handleDragEnter);
                node.removeEventListener("dragover", handleDragEnter);
                node.removeEventListener("dragleave", handleDragLeave);
                node.removeEventListener("drop", handleDrop);
              };
            }}
          >
            <For each={columnItems} key={(item) => item.id}>
              {(itemPulse) => (
                <WorkItemCard
                  item={itemPulse}
                  formatTaskDateRange={props.formatTaskDateRange}
                  onDragStart={props.onDragStart}
                  onDragEnd={props.onDragEnd}
                  onOpenDetails={props.onOpenTask}
                />
              )}
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
  },
);

export const TaskBoard = component<TaskBoardProps>((props): BeatJsxChild => {
  let cleanupBoardStyleSubscription: (() => void) | null = null;

  onCleanup(() => {
    cleanupBoardStyleSubscription?.();
  });

  return (
    <div
      class={css["board"]!}
      ref={(el) => {
        cleanupBoardStyleSubscription?.();

        const node = el as HTMLDivElement;
        node.style.setProperty("--column-count", props.boardColumnCount.get());
        cleanupBoardStyleSubscription = props.boardColumnCount.on(
          ({ currentValue }) => {
            node.style.setProperty("--column-count", currentValue);
          },
        );
      }}
    >
      <For each={props.visibleColumns} key={(column) => column.id}>
        {(columnPulse) => (
          <BoardColumnView
            column={columnPulse}
            filteredItems={props.filteredItems}
            resolveColumnAccentValue={props.resolveColumnAccentValue}
            formatTaskDateRange={props.formatTaskDateRange}
            onOpenColumn={props.onOpenColumn}
            getDraggedId={props.getDraggedId}
            onMoveItem={props.onMoveItem}
            onOpenTask={props.onOpenTask}
            onDragStart={props.onDragStart}
            onDragEnd={props.onDragEnd}
          />
        )}
      </For>
    </div>
  );
});
