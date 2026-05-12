export type SampleKey = "crypto-dashboard" | "task-boards" | "data-sync-sheet";

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
export type ColumnId = string;
export type TaskColumnKind = "queue" | "progress" | "review" | "done";

export interface WorkItem {
  readonly id: number;
  readonly title: string;
  readonly description?: string;
  readonly parentId?: number | null;
  readonly type: WorkItemType;
  readonly priority: Priority;
  readonly assignee: string;
  readonly points: number;
  readonly tags: readonly string[];
  readonly column: ColumnId;
  readonly startDate?: string;
  readonly durationDays?: number;
  readonly dependencyIds?: readonly number[];
}

export interface TaskBoardColumn {
  readonly id: ColumnId;
  readonly label: string;
  readonly accentColor?: string;
  readonly kind?: TaskColumnKind;
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
  readonly sprintStartDate: string;
  readonly sprintEndDate: string;
}

// ── Data Sync Sheet domain types ──

export interface SyncSheetRecord {
  readonly id: string;
  readonly rank: number;
  readonly name: string;
  readonly symbol: string;
  readonly price: number;
  readonly change1h: number;
  readonly change24h: number;
  readonly change7d: number;
  readonly volume24h: number;
  readonly supply: number;
  readonly ath: number;
  readonly history: readonly number[];
}

export interface SyncSheetSnapshot {
  readonly revision: string;
  readonly syncedAt: string;
  readonly records: readonly SyncSheetRecord[];
}
