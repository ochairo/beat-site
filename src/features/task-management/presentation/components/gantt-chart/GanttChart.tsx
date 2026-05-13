import {
  For,
  Show,
  component,
  onCleanup,
  type BeatJsxChild,
} from "@ochairo/beat";
import {
  Button,
  DateRangeInput,
  IconPlus,
  MultiSelect,
  SearchInput,
  type MultiSelectOption,
} from "@ochairo/beat-ui";
import { derived, pulse, type Pulse, type ReadonlyPulse } from "@ochairo/pulse";

import type { WorkItem } from "../../../domain/types";

import css from "./GanttChart.module.css";

const GANTT_INTERACTION_START_DISTANCE_PX = 4;

type TimeWindowMode = "sprint" | "year" | "month" | "week" | "day";
type GanttWeekendKind = "saturday" | "sunday";
type GanttInteractionMode = "move" | "resize-start" | "resize-end";
type GanttTaskReorderPosition = "before" | "after";

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

interface GanttTaskReorderState {
  readonly draggedItemId: number;
  readonly overItemId: number | null;
  readonly position: GanttTaskReorderPosition;
}

interface GanttVisibleBarWindow {
  readonly isStartClipped: boolean;
  readonly isEndClipped: boolean;
}

export interface GanttChartToolbarProps {
  readonly timeWindowStartDate: Pulse<string>;
  readonly timeWindowEndDate: Pulse<string>;
  readonly search: Pulse<string>;
  readonly filterTypes: Pulse<readonly string[]>;
  readonly filterPriorities: Pulse<readonly string[]>;
  readonly typeOptions: readonly MultiSelectOption[];
  readonly priorityOptions: readonly MultiSelectOption[];
  readonly onCreateTask: () => void;
}

interface GanttTaskRowProps {
  readonly row: Pulse<GanttRowModel>;
  readonly onOpenTask: (item: BoardItem) => void;
  readonly onToggleParent: (parentId: number) => void;
  readonly onReorderDragStart: (itemId: number) => void;
  readonly onReorderDragEnd: () => void;
}

interface GanttBarRowProps {
  readonly row: Pulse<GanttRowModel>;
  readonly weekendBands: Pulse<readonly GanttBandModel[]>;
  readonly interaction: ReadonlyPulse<GanttInteractionState | null>;
  readonly committedStyleOverride: ReadonlyPulse<{
    readonly itemId: number;
    readonly style: string;
  } | null>;
  readonly resolveVisibleBarWindow: (
    startDay: number,
    endDay: number,
    chartStartDay: number,
    chartDayCount: number,
  ) => GanttVisibleBarWindow;
  readonly buildBarStyle: (
    startDay: number,
    endDay: number,
    chartStartDay: number,
    chartDayCount: number,
    color: string,
  ) => string;
  readonly onOpenTask: (item: BoardItem) => void;
  readonly onInteractionStart: () => void;
  readonly onToggleParent: (parentId: number) => void;
  readonly onReorderDragStart: (itemId: number) => void;
  readonly onReorderDragEnd: () => void;
  readonly onStartMoveInteraction: (
    row: GanttRowModel,
    barElement: HTMLDivElement | null,
    clientX: number,
    clientY: number,
    laneWidthPx: number,
    timelineLeftPx: number,
  ) => void;
  readonly onStartResizeInteraction: (
    mode: Extract<GanttInteractionMode, "resize-start" | "resize-end">,
    row: GanttRowModel,
    barElement: HTMLDivElement | null,
    clientX: number,
    laneWidthPx: number,
    timelineLeftPx: number,
  ) => void;
}

export interface GanttChartProps {
  readonly rows: Pulse<readonly GanttRowModel[]>;
  readonly days: Pulse<readonly number[]>;
  readonly weekendBands: Pulse<readonly GanttBandModel[]>;
  readonly scaleBands: Pulse<readonly GanttScaleBandModel[]>;
  readonly scaleMode: ReadonlyPulse<TimeWindowMode>;
  readonly todayMarkerStyle: Pulse<string | null>;
  readonly timelineStyle: Pulse<string>;
  readonly interaction: ReadonlyPulse<GanttInteractionState | null>;
  readonly reorder: ReadonlyPulse<GanttTaskReorderState | null>;
  readonly committedStyleOverride: ReadonlyPulse<{
    readonly itemId: number;
    readonly style: string;
  } | null>;
  readonly formatDayNumber: (dayNumber: number) => string;
  readonly formatWeekdayLabel: (dayNumber: number) => string;
  readonly isWeekendDay: (dayNumber: number) => boolean;
  readonly getWeekendDayKind: (dayNumber: number) => GanttWeekendKind | null;
  readonly getCurrentDayNumber: () => number;
  readonly startOfMonthDayNumber: (dayNumber: number) => number;
  readonly buildBarStyle: (
    startDay: number,
    endDay: number,
    chartStartDay: number,
    chartDayCount: number,
    color: string,
  ) => string;
  readonly resolveVisibleBarWindow: (
    startDay: number,
    endDay: number,
    chartStartDay: number,
    chartDayCount: number,
  ) => GanttVisibleBarWindow;
  readonly onOpenTask: (item: BoardItem) => void;
  readonly onInteractionStart: () => void;
  readonly onToggleParent: (parentId: number) => void;
  readonly onReorderDragStart: (itemId: number) => void;
  readonly onReorderDragEnd: () => void;
  readonly onStartMoveInteraction: (
    row: GanttRowModel,
    barElement: HTMLDivElement | null,
    clientX: number,
    clientY: number,
    laneWidthPx: number,
    timelineLeftPx: number,
  ) => void;
  readonly onStartResizeInteraction: (
    mode: Extract<GanttInteractionMode, "resize-start" | "resize-end">,
    row: GanttRowModel,
    barElement: HTMLDivElement | null,
    clientX: number,
    laneWidthPx: number,
    timelineLeftPx: number,
  ) => void;
}

export const GanttChartToolbar = component<GanttChartToolbarProps>(
  (props): BeatJsxChild => {
    const timeWindowRange = pulse({
      start: props.timeWindowStartDate.get(),
      end: props.timeWindowEndDate.get(),
    });

    onCleanup(
      props.timeWindowStartDate.on(({ currentValue }) => {
        const currentRange = timeWindowRange.get();
        if (currentRange.start !== currentValue) {
          timeWindowRange.set({
            start: currentValue,
            end: currentRange.end,
          });
        }
      }),
    );

    onCleanup(
      props.timeWindowEndDate.on(({ currentValue }) => {
        const currentRange = timeWindowRange.get();
        if (currentRange.end !== currentValue) {
          timeWindowRange.set({
            start: currentRange.start,
            end: currentValue,
          });
        }
      }),
    );

    return (
      <>
        <div class={css["titleDateRange"]!}>
          <div class={css["titleDateRangeField"]!}>
            <DateRangeInput
              value={timeWindowRange}
              onValueChange={(value) => {
                props.timeWindowStartDate.set(value.start);
                props.timeWindowEndDate.set(value.end);
              }}
              ariaLabel="Timeline range"
            />
          </div>
        </div>

        <div class={css["toolbarInline"]!}>
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
          </div>
        </div>
      </>
    );
  },
);

const GanttTaskRow = component<GanttTaskRowProps>((props): BeatJsxChild => {
  const rowClass = pulse("");
  const rowTitle = derived(props.row, (row) => row.item.title);
  const rowSecondaryText = derived(props.row, (row) =>
    row.kind === "summary"
      ? row.metaLabel
      : (row.dependencyBadges[0] ?? row.metaLabel),
  );
  const rowCollapsedLabel = derived(props.row.isCollapsed, (isCollapsed) =>
    isCollapsed ? "+" : "-",
  );
  let cleanupDepthSubscription: (() => void) | null = null;
  let cleanupDragListeners: (() => void) | null = null;

  const syncTaskRowPresentation = (): void => {
    const row = props.row.get();

    rowClass.set(
      [
        css["ganttTaskCell"]!,
        row.kind === "summary" ? css["ganttTaskCellSummary"]! : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  };

  syncTaskRowPresentation();

  onCleanup(props.row.on(syncTaskRowPresentation));

  onCleanup(() => {
    rowTitle.destroy?.();
    rowSecondaryText.destroy?.();
    rowCollapsedLabel.destroy?.();
    cleanupDepthSubscription?.();
    cleanupDragListeners?.();
  });

  const handlePress = (): void => {
    props.onOpenTask(props.row.get().item);
  };

  const handleTogglePress = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    const row = props.row.get();
    if (!row.isCollapsible) {
      return;
    }

    props.onToggleParent(row.item.id);
  };

  return (
    <button
      type="button"
      class={rowClass}
      onClick={handlePress}
      data-gantt-reorder-item-id={props.row.item.id}
      ref={(el) => {
        cleanupDepthSubscription?.();
        cleanupDragListeners?.();

        const node = el as HTMLButtonElement;
        node.draggable = true;
        node.style.setProperty(
          "--gantt-task-depth",
          String(props.row.get().depth),
        );

        const handleDragStart = (event: Event): void => {
          const dragEvent = event as DragEvent;
          const row = props.row.get();

          props.onReorderDragStart(row.item.id);
          if (dragEvent.dataTransfer !== null) {
            dragEvent.dataTransfer.effectAllowed = "move";
            dragEvent.dataTransfer.setData("text/plain", String(row.item.id));
          }
        };

        const handleDragEnd = (): void => {
          props.onReorderDragEnd();
        };

        node.addEventListener("dragstart", handleDragStart);
        node.addEventListener("dragend", handleDragEnd);

        cleanupDepthSubscription = props.row.on(({ currentValue }) => {
          node.style.setProperty(
            "--gantt-task-depth",
            String(currentValue.depth),
          );
        });

        cleanupDragListeners = () => {
          node.removeEventListener("dragstart", handleDragStart);
          node.removeEventListener("dragend", handleDragEnd);
        };
      }}
    >
      <Show when={props.row.isCollapsible}>
        {() => (
          <span class={css["ganttTaskToggle"]!} onClick={handleTogglePress}>
            {rowCollapsedLabel}
          </span>
        )}
      </Show>
      <Show
        when={props.row.isCollapsible}
        mapValue={(isCollapsible) => !isCollapsible}
      >
        {() => (
          <span class={css["ganttTaskToggleSpacer"]!} aria-hidden="true" />
        )}
      </Show>
      <span class={css["ganttTaskContent"]!}>
        <span class={css["ganttTaskTitle"]!} text={rowTitle} />
        <span class={css["ganttTaskMeta"]!} text={rowSecondaryText} />
      </span>
    </button>
  );
});

const GanttBarRow = component<GanttBarRowProps>((props): BeatJsxChild => {
  const rowClass = pulse("");
  const rowStyle = pulse(props.row.get().barStyle);
  const rowCollapsedLabel = derived(props.row.isCollapsed, (isCollapsed) =>
    isCollapsed ? "+" : "-",
  );
  const rowCueClass = derived(
    props.row.barCueTone,
    (tone) =>
      `${css["ganttBarCue"]!} ${tone === "blocked" ? css["ganttBarCueBlocked"]! : ""} ${tone === "ready" ? css["ganttBarCueReady"]! : ""} ${tone === "summary" ? css["ganttBarCueSummary"]! : ""}`,
  );
  const canAdjustSchedule = derived(
    props.row.isCollapsible,
    (isCollapsible) => !isCollapsible,
  );
  let cleanupLaneDragListeners: (() => void) | null = null;
  let barButtonEl: HTMLDivElement | null = null;
  let capturedPointerTarget: Element | null = null;
  let capturedPointerId: number | null = null;
  let cleanupBarClassSubscription: (() => void) | null = null;
  let cleanupBarStyleSubscription: (() => void) | null = null;
  let cleanupPendingInteraction: (() => void) | null = null;

  const syncBarElementCursor = (): void => {
    if (barButtonEl === null) {
      return;
    }

    const row = props.row.get();
    const interaction = props.interaction.get();
    const isActive = interaction !== null && interaction.itemId === row.item.id;

    if (row.isCollapsible) {
      barButtonEl.style.cursor = "pointer";
      return;
    }

    if (!isActive) {
      barButtonEl.style.cursor = "grab";
      return;
    }

    barButtonEl.style.cursor =
      interaction.mode === "move" ? "grabbing" : "ew-resize";
  };

  const releaseCapturedPointer = (): void => {
    if (
      capturedPointerTarget !== null &&
      capturedPointerId !== null &&
      typeof capturedPointerTarget.releasePointerCapture === "function"
    ) {
      try {
        capturedPointerTarget.releasePointerCapture(capturedPointerId);
      } catch {
        // Ignore if the browser already released capture during pointerup.
      }
    }

    capturedPointerTarget = null;
    capturedPointerId = null;
  };

  function syncBarPresentation(): void {
    const row = props.row.get();
    const interaction = props.interaction.get();
    const committedStyleOverride = props.committedStyleOverride.get();
    const isActive = interaction !== null && interaction.itemId === row.item.id;
    const barClipState =
      isActive && interaction !== null
        ? props.resolveVisibleBarWindow(
            interaction.previewStartDay,
            interaction.previewStartDay + interaction.previewDurationDays - 1,
            interaction.chartStartDay,
            interaction.chartDayCount,
          )
        : {
            isStartClipped: row.isBarClippedStart,
            isEndClipped: row.isBarClippedEnd,
          };

    if (!isActive) {
      releaseCapturedPointer();
      barButtonEl?.classList.remove(
        css["ganttBarDragging"]!,
        css["ganttBarResizing"]!,
      );
    }

    syncBarElementCursor();

    rowClass.set(
      [
        css["ganttBar"]!,
        row.kind === "summary" ? css["ganttBarSummary"]! : "",
        barClipState.isStartClipped ? css["ganttBarClippedStart"]! : "",
        barClipState.isEndClipped ? css["ganttBarClippedEnd"]! : "",
        !row.isCollapsible ? css["ganttBarInteractive"]! : "",
        isActive ? css["ganttBarDragging"]! : "",
        isActive && interaction?.mode !== "move"
          ? css["ganttBarResizing"]!
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    );

    if (isActive && !row.isCollapsible && interaction !== null) {
      rowStyle.set(
        props.buildBarStyle(
          interaction.previewStartDay,
          interaction.previewStartDay + interaction.previewDurationDays - 1,
          interaction.chartStartDay,
          interaction.chartDayCount,
          row.barColor,
        ),
      );
      return;
    }

    if (
      committedStyleOverride !== null &&
      committedStyleOverride.itemId === row.item.id
    ) {
      rowStyle.set(committedStyleOverride.style);
      return;
    }

    rowStyle.set(row.barStyle);
  }

  syncBarPresentation();

  onCleanup(props.row.on(syncBarPresentation));
  onCleanup(props.interaction.on(syncBarPresentation));
  onCleanup(props.committedStyleOverride.on(syncBarPresentation));

  onCleanup(() => {
    cleanupLaneDragListeners?.();
    releaseCapturedPointer();
    cleanupBarClassSubscription?.();
    cleanupBarStyleSubscription?.();
    cleanupPendingInteraction?.();
    rowCollapsedLabel.destroy?.();
    rowCueClass.destroy?.();
    canAdjustSchedule.destroy?.();
  });

  const handlePress = (): void => {
    props.onOpenTask(props.row.get().item);
  };

  const handleTogglePress = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    const row = props.row.get();
    if (!row.isCollapsible) {
      return;
    }

    props.onToggleParent(row.item.id);
  };

  const handleControlClick = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;

    if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") {
      return;
    }

    keyboardEvent.preventDefault();
    handlePress();
  };

  const getInteractionMetrics = (
    event: Event,
  ): {
    readonly row: GanttRowModel;
    readonly laneWidthPx: number;
    readonly timelineLeftPx: number;
    readonly pointerEvent: PointerEvent;
  } | null => {
    const row = props.row.get();
    if (row.isCollapsible) {
      return null;
    }

    const laneRect = barButtonEl?.parentElement?.getBoundingClientRect();
    const pointerEvent = event as PointerEvent;
    const currentTarget = event.currentTarget;

    if (
      currentTarget instanceof Element &&
      typeof currentTarget.setPointerCapture === "function"
    ) {
      releaseCapturedPointer();
      currentTarget.setPointerCapture(pointerEvent.pointerId);
      capturedPointerTarget = currentTarget;
      capturedPointerId = pointerEvent.pointerId;
    }

    return {
      row,
      laneWidthPx: Math.max(laneRect?.width ?? 0, 1),
      timelineLeftPx: laneRect?.left ?? 0,
      pointerEvent,
    };
  };

  const armPendingInteraction = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    const metrics = getInteractionMetrics(event);
    if (metrics === null) {
      return;
    }

    cleanupPendingInteraction?.();

    const originX = metrics.pointerEvent.clientX;
    const originY = metrics.pointerEvent.clientY;
    const laneWidthPx = metrics.laneWidthPx;
    const timelineLeftPx = metrics.timelineLeftPx;

    const activateInteraction = (clientX: number, clientY: number): void => {
      cleanupPendingInteraction?.();
      cleanupPendingInteraction = null;
      props.onInteractionStart();

      props.onStartMoveInteraction(
        metrics.row,
        barButtonEl,
        clientX,
        clientY,
        laneWidthPx,
        timelineLeftPx,
      );
    };

    const clearPendingInteraction = (): void => {
      cleanupPendingInteraction?.();
      cleanupPendingInteraction = null;
      releaseCapturedPointer();
    };

    const handlePointerMove = (moveEvent: PointerEvent): void => {
      const deltaX = Math.abs(moveEvent.clientX - originX);
      const deltaY = Math.abs(moveEvent.clientY - originY);

      if (Math.max(deltaX, deltaY) < GANTT_INTERACTION_START_DISTANCE_PX) {
        return;
      }

      activateInteraction(moveEvent.clientX, moveEvent.clientY);
    };

    const handlePointerUp = (): void => {
      clearPendingInteraction();
    };

    const handlePointerCancel = (): void => {
      clearPendingInteraction();
    };

    cleanupPendingInteraction = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
  };

  const handleMovePointerDown = (event: Event): void => {
    armPendingInteraction(event);
  };

  const handleStartResizePointerDown = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    const metrics = getInteractionMetrics(event);
    if (metrics === null) {
      return;
    }

    props.onInteractionStart();
    props.onStartResizeInteraction(
      "resize-start",
      metrics.row,
      barButtonEl,
      metrics.pointerEvent.clientX,
      metrics.laneWidthPx,
      metrics.timelineLeftPx,
    );
  };

  const handleEndResizePointerDown = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();

    const metrics = getInteractionMetrics(event);
    if (metrics === null) {
      return;
    }

    props.onInteractionStart();
    props.onStartResizeInteraction(
      "resize-end",
      metrics.row,
      barButtonEl,
      metrics.pointerEvent.clientX,
      metrics.laneWidthPx,
      metrics.timelineLeftPx,
    );
  };

  const handleLaneRef = (el: Element): void => {
    cleanupLaneDragListeners?.();

    const node = el as HTMLDivElement;
    node.draggable = true;

    const handleDragStart = (event: Event): void => {
      const dragEvent = event as DragEvent;
      const row = props.row.get();

      if (barButtonEl !== null) {
        const barRect = barButtonEl.getBoundingClientRect();
        if (
          dragEvent.clientX >= barRect.left &&
          dragEvent.clientX <= barRect.right &&
          dragEvent.clientY >= barRect.top &&
          dragEvent.clientY <= barRect.bottom
        ) {
          dragEvent.preventDefault();
          return;
        }
      }

      props.onReorderDragStart(row.item.id);
      if (dragEvent.dataTransfer !== null) {
        dragEvent.dataTransfer.effectAllowed = "move";
        dragEvent.dataTransfer.setData("text/plain", String(row.item.id));
      }
    };

    const handleDragEnd = (): void => {
      props.onReorderDragEnd();
    };

    node.addEventListener("dragstart", handleDragStart);
    node.addEventListener("dragend", handleDragEnd);

    cleanupLaneDragListeners = () => {
      node.removeEventListener("dragstart", handleDragStart);
      node.removeEventListener("dragend", handleDragEnd);
    };
  };

  return (
    <div class={css["ganttLane"]!} ref={handleLaneRef}>
      <Show when={props.weekendBands} mapValue={(bands) => bands.length > 0}>
        {() => (
          <div class={css["ganttWeekendLayer"]!}>
            <For each={props.weekendBands} key={(band) => band.id}>
              {(bandPulse) => (
                <div
                  class={css["ganttWeekendBand"]!}
                  data-weekend-kind={bandPulse.kind as unknown as string}
                  style={bandPulse.style as unknown as string}
                />
              )}
            </For>
          </div>
        )}
      </Show>

      <div
        role="button"
        tabIndex={0}
        onClick={handlePress}
        onPointerDown={handleMovePointerDown}
        onKeyDown={handleKeyDown}
        ref={(el) => {
          cleanupBarClassSubscription?.();
          cleanupBarStyleSubscription?.();

          const node = el as HTMLDivElement;
          barButtonEl = node;
          node.className = rowClass.get();
          node.style.cssText = rowStyle.get();
          syncBarElementCursor();
          cleanupBarClassSubscription = rowClass.on(({ currentValue }) => {
            node.className = currentValue;
            syncBarElementCursor();
          });
          cleanupBarStyleSubscription = rowStyle.on(({ currentValue }) => {
            node.style.cssText = currentValue;
            syncBarElementCursor();
          });
        }}
      >
        <Show when={canAdjustSchedule}>
          {() => (
            <>
              <span
                class={`${css["ganttBarResizeZone"]!} ${css["ganttBarResizeZoneStart"]!}`}
                onPointerDown={handleStartResizePointerDown}
                onClick={handleControlClick}
                aria-hidden="true"
              />
              <span
                class={`${css["ganttBarResizeZone"]!} ${css["ganttBarResizeZoneEnd"]!}`}
                onPointerDown={handleEndResizePointerDown}
                onClick={handleControlClick}
                aria-hidden="true"
              />
            </>
          )}
        </Show>
        <Show when={props.row.isCollapsible}>
          {() => (
            <span class={css["ganttBarToggle"]!} onClick={handleTogglePress}>
              {rowCollapsedLabel}
            </span>
          )}
        </Show>
        <span class={css["ganttBarLabel"]!}>{props.row.item.title}</span>
        <Show when={props.row.barCueLabel} mapValue={(label) => label !== null}>
          {(label) => <span class={rowCueClass}>{label ?? ""}</span>}
        </Show>
      </div>
    </div>
  );
});

export const GanttChart = component<GanttChartProps>((props): BeatJsxChild => {
  let rootEl: HTMLDivElement | null = null;
  let headerTimelineViewportEl: HTMLDivElement | null = null;
  let taskListViewportEl: HTMLDivElement | null = null;
  let bodyScrollerEl: HTMLDivElement | null = null;
  let cleanupTimelineHeaderSubscription: (() => void) | null = null;
  let cleanupTimelineColumnSubscription: (() => void) | null = null;
  let cleanupTaskListViewportListeners: (() => void) | null = null;
  let cleanupBodyScrollerListeners: (() => void) | null = null;
  let cleanupBodyScrollerResizeObserver: (() => void) | null = null;
  let presentedReorder: GanttTaskReorderState | null = null;
  let storedBodyScrollTop = 0;
  let storedBodyScrollLeft = 0;
  let restoreScrollFrame: number | null = null;

  function snapshotScrollState(): void {
    if (bodyScrollerEl === null) {
      return;
    }

    storedBodyScrollTop = bodyScrollerEl.scrollTop;
    storedBodyScrollLeft = bodyScrollerEl.scrollLeft;
  }

  function restoreScrollState(): void {
    if (bodyScrollerEl !== null) {
      if (bodyScrollerEl.scrollTop !== storedBodyScrollTop) {
        bodyScrollerEl.scrollTop = storedBodyScrollTop;
      }

      if (bodyScrollerEl.scrollLeft !== storedBodyScrollLeft) {
        bodyScrollerEl.scrollLeft = storedBodyScrollLeft;
      }
    }

    syncHeaderTimelineScroll();
    syncTaskListScroll();
  }

  function scheduleScrollRestore(): void {
    if (restoreScrollFrame !== null) {
      cancelAnimationFrame(restoreScrollFrame);
    }

    restoreScrollFrame = requestAnimationFrame(() => {
      restoreScrollFrame = requestAnimationFrame(() => {
        restoreScrollFrame = null;
        restoreScrollState();
      });
    });
  }

  function syncHeaderScrollbarGutter(): void {
    if (rootEl === null || bodyScrollerEl === null) {
      return;
    }

    const scrollbarWidth = Math.max(
      bodyScrollerEl.offsetWidth - bodyScrollerEl.clientWidth,
      0,
    );
    rootEl.style.setProperty("--gantt-scrollbar-gutter", `${scrollbarWidth}px`);
  }

  function syncTaskListScroll(): void {
    if (taskListViewportEl === null || bodyScrollerEl === null) {
      return;
    }

    if (taskListViewportEl.scrollTop !== bodyScrollerEl.scrollTop) {
      taskListViewportEl.scrollTop = bodyScrollerEl.scrollTop;
    }
  }

  function syncHeaderTimelineScroll(): void {
    if (headerTimelineViewportEl === null || bodyScrollerEl === null) {
      return;
    }

    if (headerTimelineViewportEl.scrollLeft !== bodyScrollerEl.scrollLeft) {
      headerTimelineViewportEl.scrollLeft = bodyScrollerEl.scrollLeft;
    }
  }

  function forEachReorderNode(
    itemId: number,
    callback: (node: HTMLElement) => void,
  ): void {
    if (rootEl === null) {
      return;
    }

    rootEl
      .querySelectorAll(`[data-gantt-reorder-item-id="${itemId}"]`)
      .forEach((node) => {
        if (node instanceof HTMLElement) {
          callback(node);
        }
      });
  }

  function clearReorderPresentation(
    reorder: GanttTaskReorderState | null,
  ): void {
    if (reorder === null) {
      return;
    }

    forEachReorderNode(reorder.draggedItemId, (node) => {
      if (node.tagName === "BUTTON") {
        node.classList.remove(css["ganttTaskCellDragging"]!);
      }
    });

    if (reorder.overItemId !== null) {
      forEachReorderNode(reorder.overItemId, (node) => {
        node.classList.remove(
          css["ganttLaneReorderBefore"]!,
          css["ganttLaneReorderAfter"]!,
        );
      });
    }
  }

  function applyReorderPresentation(
    reorder: GanttTaskReorderState | null,
  ): void {
    if (reorder === null) {
      return;
    }

    forEachReorderNode(reorder.draggedItemId, (node) => {
      if (node.tagName === "BUTTON") {
        node.classList.add(css["ganttTaskCellDragging"]!);
      }
    });

    if (
      reorder.overItemId !== null &&
      reorder.overItemId !== reorder.draggedItemId
    ) {
      const indicatorClass =
        reorder.position === "before"
          ? css["ganttLaneReorderBefore"]!
          : css["ganttLaneReorderAfter"]!;

      forEachReorderNode(reorder.overItemId, (node) => {
        node.classList.add(indicatorClass);
      });
    }
  }

  function syncReorderPresentation(
    reorder: GanttTaskReorderState | null = props.reorder.get(),
  ): void {
    clearReorderPresentation(presentedReorder);
    applyReorderPresentation(reorder);
    presentedReorder = reorder;
  }

  onCleanup(
    props.reorder.on(({ currentValue }) => {
      syncReorderPresentation(currentValue);
    }),
  );

  onCleanup(
    props.rows.on(() => {
      scheduleScrollRestore();
    }),
  );

  onCleanup(() => {
    if (restoreScrollFrame !== null) {
      cancelAnimationFrame(restoreScrollFrame);
      restoreScrollFrame = null;
    }
    cleanupTaskListViewportListeners?.();
    cleanupBodyScrollerListeners?.();
    cleanupBodyScrollerResizeObserver?.();
    cleanupTimelineHeaderSubscription?.();
    cleanupTimelineColumnSubscription?.();
    clearReorderPresentation(presentedReorder);
    presentedReorder = null;
  });

  const handleOpenTask = (item: BoardItem): void => {
    snapshotScrollState();
    props.onOpenTask(item);
    scheduleScrollRestore();
  };

  const handleReorderDragStart = (itemId: number): void => {
    snapshotScrollState();
    props.onReorderDragStart(itemId);
  };

  const handleReorderDragEnd = (): void => {
    props.onReorderDragEnd();

    requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLElement &&
        taskListViewportEl?.contains(activeElement)
      ) {
        activeElement.blur();
      }

      scheduleScrollRestore();
    });
  };

  return (
    <div
      class={css["ganttView"]!}
      ref={(el) => {
        rootEl = el as HTMLDivElement;
        syncReorderPresentation(props.reorder.get());
      }}
    >
      <Show when={props.rows} mapValue={(rows) => rows.length > 0}>
        {() => (
          <>
            <div class={css["ganttHeaderShell"]!}>
              <div class={css["ganttTaskHeader"]!}>Task</div>
              <div
                class={css["ganttHeaderTimelineViewport"]!}
                ref={(el) => {
                  headerTimelineViewportEl = el as HTMLDivElement;
                  syncHeaderTimelineScroll();
                }}
              >
                <div
                  class={css["ganttTimelineHeader"]!}
                  ref={(el) => {
                    cleanupTimelineHeaderSubscription?.();

                    const node = el as HTMLElement;
                    node.style.cssText = props.timelineStyle.get();
                    syncHeaderTimelineScroll();

                    cleanupTimelineHeaderSubscription = props.timelineStyle.on(
                      ({ currentValue }) => {
                        node.style.cssText = currentValue;
                        syncHeaderTimelineScroll();
                      },
                    );
                  }}
                >
                  <Show
                    when={props.todayMarkerStyle}
                    mapValue={(style) => style !== null}
                  >
                    {() => (
                      <div
                        class={`${css["ganttTodayMarker"]!} ${css["ganttTodayMarkerHeader"]!}`}
                        style={props.todayMarkerStyle.get() ?? ""}
                      >
                        <span class={css["ganttTodayLabel"]!}>Today</span>
                      </div>
                    )}
                  </Show>
                  <Show
                    when={props.scaleBands}
                    mapValue={(bands) => bands.length > 0}
                  >
                    {() => (
                      <div class={css["ganttScaleHeader"]!}>
                        <For each={props.scaleBands} key={(band) => band.id}>
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
                  <Show when={props.scaleMode}>
                    {(scaleMode) => (
                      <div class={css["ganttTimelineDays"]!}>
                        <For each={props.days} key={(day) => day}>
                          {(dayPulse) => {
                            const dayNumber = dayPulse.get();
                            const dayLabel =
                              scaleMode === "day" || scaleMode === "sprint"
                                ? props.formatDayNumber(dayNumber)
                                : null;
                            const weekdayLabel =
                              dayLabel !== null
                                ? props.formatWeekdayLabel(dayNumber)
                                : null;
                            const compactDayLabel =
                              dayLabel !== null && weekdayLabel !== null
                                ? `${weekdayLabel}${dayLabel}`
                                : null;
                            const weekendKind =
                              props.getWeekendDayKind(dayNumber);

                            return (
                              <div
                                class={css["ganttDayCell"]!}
                                data-month-boundary={
                                  dayNumber ===
                                  props.startOfMonthDayNumber(dayNumber)
                                    ? "true"
                                    : undefined
                                }
                                data-weekend={
                                  props.isWeekendDay(dayNumber)
                                    ? "true"
                                    : undefined
                                }
                                data-weekend-kind={weekendKind ?? undefined}
                                data-today={
                                  dayNumber === props.getCurrentDayNumber()
                                    ? "true"
                                    : undefined
                                }
                              >
                                {compactDayLabel !== null ? (
                                  <span class={css["ganttDayLabel"]!}>
                                    {compactDayLabel}
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
            </div>

            <div class={css["ganttBodyShell"]!}>
              <div
                class={css["ganttTaskViewport"]!}
                ref={(el) => {
                  cleanupTaskListViewportListeners?.();

                  const node = el as HTMLDivElement;
                  taskListViewportEl = node;
                  syncTaskListScroll();

                  const handleWheel = (event: WheelEvent): void => {
                    if (bodyScrollerEl === null) {
                      return;
                    }

                    if (event.deltaX === 0 && event.deltaY === 0) {
                      return;
                    }

                    event.preventDefault();
                    bodyScrollerEl.scrollLeft += event.deltaX;
                    bodyScrollerEl.scrollTop += event.deltaY;
                    snapshotScrollState();
                    syncHeaderTimelineScroll();
                    syncTaskListScroll();
                  };

                  node.addEventListener("wheel", handleWheel, {
                    passive: false,
                  });

                  cleanupTaskListViewportListeners = () => {
                    node.removeEventListener("wheel", handleWheel);
                  };
                }}
              >
                <div class={css["ganttTaskList"]!}>
                  <For each={props.rows} key={(row) => `task-${row.item.id}`}>
                    {(rowPulse) => (
                      <GanttTaskRow
                        row={rowPulse}
                        onOpenTask={handleOpenTask}
                        onToggleParent={props.onToggleParent}
                        onReorderDragStart={handleReorderDragStart}
                        onReorderDragEnd={handleReorderDragEnd}
                      />
                    )}
                  </For>
                </div>
              </div>

              <div
                class={css["ganttScroller"]!}
                ref={(el) => {
                  cleanupBodyScrollerListeners?.();
                  cleanupBodyScrollerResizeObserver?.();

                  const node = el as HTMLDivElement;
                  bodyScrollerEl = node;
                  syncHeaderScrollbarGutter();
                  restoreScrollState();

                  const handleScroll = (): void => {
                    snapshotScrollState();
                    syncHeaderTimelineScroll();
                    syncTaskListScroll();
                  };

                  node.addEventListener("scroll", handleScroll, {
                    passive: true,
                  });

                  cleanupBodyScrollerListeners = () => {
                    node.removeEventListener("scroll", handleScroll);
                  };

                  const resizeObserver = new ResizeObserver(() => {
                    syncHeaderScrollbarGutter();
                    scheduleScrollRestore();
                  });
                  resizeObserver.observe(node);

                  cleanupBodyScrollerResizeObserver = () => {
                    resizeObserver.disconnect();
                  };
                }}
              >
                <div class={css["ganttBodyFrame"]!}>
                  <div
                    class={css["ganttTimelineColumn"]!}
                    ref={(el) => {
                      cleanupTimelineColumnSubscription?.();

                      const node = el as HTMLElement;
                      node.style.cssText = props.timelineStyle.get();

                      cleanupTimelineColumnSubscription =
                        props.timelineStyle.on(({ currentValue }) => {
                          node.style.cssText = currentValue;
                        });
                    }}
                  >
                    <Show
                      when={props.scaleBands}
                      mapValue={(bands) => bands.length > 0}
                    >
                      {() => (
                        <div
                          class={css["ganttTimelineScaleLayer"]!}
                          aria-hidden="true"
                        >
                          <For each={props.scaleBands} key={(band) => band.id}>
                            {(bandPulse) => {
                              const band = bandPulse.get();

                              return (
                                <div
                                  class={css["ganttTimelineScaleBand"]!}
                                  style={band.style}
                                />
                              );
                            }}
                          </For>
                        </div>
                      )}
                    </Show>

                    <Show
                      when={props.todayMarkerStyle}
                      mapValue={(style) => style !== null}
                    >
                      {() => (
                        <div
                          class={css["ganttTodayMarker"]!}
                          style={props.todayMarkerStyle.get() ?? ""}
                        />
                      )}
                    </Show>

                    <For each={props.rows} key={(row) => row.item.id}>
                      {(rowPulse) => (
                        <GanttBarRow
                          row={rowPulse}
                          weekendBands={props.weekendBands}
                          interaction={props.interaction}
                          committedStyleOverride={props.committedStyleOverride}
                          resolveVisibleBarWindow={
                            props.resolveVisibleBarWindow
                          }
                          buildBarStyle={props.buildBarStyle}
                          onOpenTask={handleOpenTask}
                          onInteractionStart={props.onInteractionStart}
                          onToggleParent={props.onToggleParent}
                          onReorderDragStart={handleReorderDragStart}
                          onReorderDragEnd={handleReorderDragEnd}
                          onStartMoveInteraction={props.onStartMoveInteraction}
                          onStartResizeInteraction={
                            props.onStartResizeInteraction
                          }
                        />
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Show>

      <Show when={props.rows} mapValue={(rows) => rows.length === 0}>
        {() => (
          <div class={css["ganttEmpty"]!}>
            No tasks match the current filters.
          </div>
        )}
      </Show>
    </div>
  );
});
