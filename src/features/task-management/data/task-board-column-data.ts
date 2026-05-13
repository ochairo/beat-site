import type { TaskBoardColumn } from "../domain/types";

export const TASK_BOARD_COLUMN_DATA: readonly TaskBoardColumn[] = [
  { id: "new", label: "New", kind: "queue", limit: 10 },
  { id: "active", label: "Active", kind: "progress", limit: 5 },
  { id: "review", label: "In Review", kind: "review", limit: 4 },
  { id: "done", label: "Done", kind: "done" },
];