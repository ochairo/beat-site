export type SampleKey = "crypto-dashboard" | "task-boards";

export interface SampleItem {
  readonly key: SampleKey;
  readonly label: string;
}

// ── Crypto Dashboard domain types ──

export interface CoinMeta {
  readonly rank: number;
  readonly name: string;
  readonly symbol: string;
  readonly basePrice: number;
}

// ── Task Board domain types ──

export type WorkItemType = "Epic" | "Feature" | "User Story" | "Task" | "Bug";
export type Priority = "Critical" | "High" | "Medium" | "Low";
export type ColumnId = "new" | "active" | "review" | "closed";

export interface WorkItem {
  readonly id: number;
  readonly title: string;
  readonly type: WorkItemType;
  readonly priority: Priority;
  readonly assignee: string;
  readonly points: number;
  readonly tags: readonly string[];
  readonly column: ColumnId;
}

export interface TaskBoardColumn {
  readonly id: ColumnId;
  readonly label: string;
  readonly limit?: number;
}

export interface FilterOption {
  readonly label: string;
  readonly value: string;
}

export interface TaskBoardData {
  readonly columns: readonly TaskBoardColumn[];
  readonly items: readonly WorkItem[];
  readonly typeOptions: readonly FilterOption[];
  readonly priorityOptions: readonly FilterOption[];
  readonly sprintLabel: string;
  readonly sprintRange: string;
}
