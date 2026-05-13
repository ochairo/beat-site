import type {
  FilterOption,
  TaskBoardColumn,
  TaskBoardSprintData,
} from "../domain/types";
import type { TaskBoardPort } from "../domain/ports";
import type { HttpClient } from "../../../shared/lib/http/http-client";

export class HttpTaskBoardRepository implements TaskBoardPort {
  constructor(private readonly http: HttpClient) {}

  async getTaskBoardColumns(): Promise<readonly TaskBoardColumn[]> {
    return this.http.get<readonly TaskBoardColumn[]>(
      "/api/samples/task-board/columns",
    );
  }

  async getTaskTypeOptions(): Promise<readonly FilterOption[]> {
    return this.http.get<readonly FilterOption[]>(
      "/api/samples/task-board/task-types",
    );
  }

  async getPriorityTypeOptions(): Promise<readonly FilterOption[]> {
    return this.http.get<readonly FilterOption[]>(
      "/api/samples/task-board/priority-types",
    );
  }

  async getSprintData(): Promise<readonly TaskBoardSprintData[]> {
    return this.http.get<readonly TaskBoardSprintData[]>(
      "/api/samples/task-board/sprints",
    );
  }
}
