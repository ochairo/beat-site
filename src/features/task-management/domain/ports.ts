import type {
  FilterOption,
  TaskBoardColumn,
  TaskBoardSprintData,
} from "./types";

export interface TaskBoardPort {
  getTaskBoardColumns(): Promise<readonly TaskBoardColumn[]>;
  getTaskTypeOptions(): Promise<readonly FilterOption[]>;
  getPriorityTypeOptions(): Promise<readonly FilterOption[]>;
  getSprintData(): Promise<readonly TaskBoardSprintData[]>;
}
