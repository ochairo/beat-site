export type WorkItemType = "Epic" | "Feature" | "User Story" | "Task" | "Bug";
export type Priority = "Critical" | "High" | "Medium" | "Low";
export type ColumnId = string;
export type TaskColumnKind = "queue" | "progress" | "review" | "done";

export interface WorkItem {
  readonly id: number;
  readonly title: string;
  readonly description?: string;
  readonly order?: number;
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

export interface TaskBoardSprintData {
  readonly id: string;
  readonly label: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly items: readonly WorkItem[];
}

export interface TaskBoardData {
  readonly columns: readonly TaskBoardColumn[];
  readonly taskTypeOptions: readonly FilterOption[];
  readonly priorityTypeOptions: readonly FilterOption[];
  readonly sprints: readonly TaskBoardSprintData[];
}
