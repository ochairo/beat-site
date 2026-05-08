import { For, component, onCleanup, type BeatJsxChild } from "@ochairo/beat";
import { Badge, Card, MultiSelect, SearchInput } from "@ochairo/beat-ui";
import { pulse, derived } from "@ochairo/pulse";

import type {
  ColumnId,
  Priority,
  TaskBoardData,
  WorkItem,
} from "../../../domain/types";
import css from "./TaskBoards.module.css";

// ── Helpers ──

function priorityTone(
  p: Priority,
): "danger" | "warning" | "primary" | "default" {
  if (p === "Critical") return "danger";
  if (p === "High") return "warning";
  if (p === "Medium") return "primary";
  return "default";
}

function columnColor(id: ColumnId): string {
  if (id === "new") return "var(--beat-ui-color-text-muted)";
  if (id === "active") return "var(--beat-ui-color-primary)";
  if (id === "review") return "var(--beat-ui-color-warning)";
  return "var(--beat-ui-color-success)";
}

// ── WorkItemCard ──

interface WorkItemCardProps {
  readonly item: WorkItem;
  readonly cardWrapperClass: string;
  readonly draggingClass: string;
  readonly columnOverClass: string;
  readonly onDragStart: () => void;
  readonly onDragEnd: () => void;
}

const WorkItemCard = component<WorkItemCardProps>((props) => {
  const { item } = props;
  return (
    <div
      class={props.cardWrapperClass}
      ref={(el) => {
        (el as HTMLElement).draggable = true;
        el.addEventListener("dragstart", (e) => {
          props.onDragStart();
          el.classList.add(props.draggingClass);
          (e as DragEvent).dataTransfer!.effectAllowed = "move";
        });
        el.addEventListener("dragend", () => {
          props.onDragEnd();
          el.classList.remove(props.draggingClass);
          document
            .querySelectorAll(`.${props.columnOverClass}`)
            .forEach((c) => c.classList.remove(props.columnOverClass));
        });
      }}
    >
      <Card padding="sm" radius="md" elevation="flat">
        <div class={css["cardMeta"]!}>
          <span class={css["cardType"]!}>{item.type}</span>
          <span class={css["cardId"]!}>#{item.id}</span>
        </div>
        <p class={css["cardTitle"]!}>{item.title}</p>
        <div class={css["cardBottom"]!}>
          <div class={css["cardTags"]!}>
            {item.tags.map((tag) => (
              <span class={css["tag"]!}>{tag}</span>
            ))}
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

// ── Board component ──

export interface TaskBoardsProps {
  readonly data: TaskBoardData;
}

export const TaskBoards = component<TaskBoardsProps>((props): BeatJsxChild => {
  const { data } = props;

  const items = pulse<readonly WorkItem[]>(data.items);
  const search = pulse("");
  const filterTypes = pulse<readonly string[]>([]);
  const filterPriorities = pulse<readonly string[]>([]);

  function getFiltered(): readonly WorkItem[] {
    const all = items.get();
    const types = filterTypes.get();
    const priorities = filterPriorities.get();
    const q = search.get().toLowerCase();
    return all.filter(
      (i) =>
        (types.length === 0 || types.includes(i.type)) &&
        (priorities.length === 0 || priorities.includes(i.priority)) &&
        (q === "" || i.title.toLowerCase().includes(q)),
    );
  }

  const filtered = pulse<readonly WorkItem[]>(getFiltered());
  items.on(() => filtered.set(getFiltered()));
  filterTypes.on(() => filtered.set(getFiltered()));
  filterPriorities.on(() => filtered.set(getFiltered()));
  search.on(() => filtered.set(getFiltered()));

  // ── Drag state ──
  let draggedId: number | null = null;
  let isDragging = false;

  const onDocDragover = (e: Event): void => {
    if (isDragging) e.preventDefault();
  };
  document.addEventListener("dragover", onDocDragover, true);
  onCleanup(() =>
    document.removeEventListener("dragover", onDocDragover, true),
  );

  function moveItem(id: number, to: ColumnId): void {
    items.set(items.get().map((i) => (i.id === id ? { ...i, column: to } : i)));
  }

  const progressWidthPct = derived(items, (all) => {
    const total = all.reduce((s, i) => s + i.points, 0);
    const done = all
      .filter((i) => i.column === "closed")
      .reduce((s, i) => s + i.points, 0);
    return `${total === 0 ? 0 : Math.round((done / total) * 100)}%`;
  });
  const progressLabel = derived(items, (all) => {
    const total = all.reduce((s, i) => s + i.points, 0);
    const done = all
      .filter((i) => i.column === "closed")
      .reduce((s, i) => s + i.points, 0);
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return `${done} / ${total} pts · ${pct}%`;
  });

  return (
    <div class={css["root"]!}>
      {/* Header */}
      <div class={css["header"]!}>
        <div>
          <h2 class={css["title"]!}>{data.sprintLabel}</h2>
          <p class={css["subtitle"]!}>{data.sprintRange}</p>
        </div>
        <div class={css["progress"]!}>
          <span class={css["progressLabel"]!} text={progressLabel} />
          <div class={css["progressTrack"]!}>
            <div class={css["progressFill"]!} style:width={progressWidthPct} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div class={css["toolbar"]!}>
        <div class={css["searchWrap"]!}>
          <SearchInput
            value={search}
            onValueChange={(v: string) => search.set(v)}
            placeholder="Search work items…"
          />
        </div>
        <div class={css["filterWrap"]!}>
          <MultiSelect
            value={filterTypes}
            onValueChange={(v: readonly string[]) => filterTypes.set(v)}
            options={data.typeOptions}
            placeholder="Type"
          />
        </div>
        <div class={css["filterWrap"]!}>
          <MultiSelect
            value={filterPriorities}
            onValueChange={(v: readonly string[]) => filterPriorities.set(v)}
            options={data.priorityOptions}
            placeholder="Priority"
          />
        </div>
      </div>

      {/* Board */}
      <div class={css["board"]!}>
        {data.columns.map((col) => {
          const colItems = pulse<readonly WorkItem[]>(
            filtered.get().filter((i) => i.column === col.id),
          );
          filtered.on(({ currentValue }) => {
            colItems.set(currentValue.filter((i) => i.column === col.id));
          });

          const headerText = derived(colItems, (a) => String(a.length));

          return (
            <div
              style={`border-radius: 0.75rem; padding-top: 2px; background: linear-gradient(to right, transparent 0%, ${columnColor(col.id)} 30%, ${columnColor(col.id)} 70%, transparent 100%)`}
            >
              <Card
                padding="none"
                radius="lg"
                ref={(el) => {
                  el.addEventListener("dragenter", (e) => {
                    e.preventDefault();
                    el.classList.add(css["columnOver"]!);
                  });
                  el.addEventListener("dragleave", (e) => {
                    const r = el.getBoundingClientRect();
                    const { clientX: x, clientY: y } = e as DragEvent;
                    if (
                      x < r.left ||
                      x > r.right ||
                      y < r.top ||
                      y > r.bottom
                    ) {
                      el.classList.remove(css["columnOver"]!);
                    }
                  });
                  el.addEventListener("drop", (e) => {
                    e.preventDefault();
                    if (draggedId !== null) moveItem(draggedId, col.id);
                    el.classList.remove(css["columnOver"]!);
                  });
                }}
              >
                {/* Column header */}
                <div class={css["columnHeader"]!}>
                  <span class={css["columnLabel"]!}>{col.label}</span>
                  <div class={css["columnMeta"]!}>
                    <span class={css["columnCount"]!} text={headerText} />
                    {col.limit !== undefined && (
                      <span
                        style:display={derived(colItems, (a) =>
                          a.length > (col.limit ?? Infinity) ? "" : "none",
                        )}
                      >
                        <Badge tone="danger" size="sm">
                          limit
                        </Badge>
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div class={css["columnBody"]!}>
                  <For each={colItems} key={(item) => item.id}>
                    {(itemPulse) => {
                      const item = itemPulse.get();
                      return (
                        <WorkItemCard
                          item={item}
                          cardWrapperClass={css["cardWrapper"]!}
                          draggingClass={css["dragging"]!}
                          columnOverClass={css["columnOver"]!}
                          onDragStart={() => {
                            isDragging = true;
                            draggedId = item.id;
                          }}
                          onDragEnd={() => {
                            isDragging = false;
                            draggedId = null;
                          }}
                        />
                      );
                    }}
                  </For>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
});
