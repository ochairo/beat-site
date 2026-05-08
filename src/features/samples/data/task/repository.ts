import type { TaskBoardData } from "../../domain/types";
import type { TaskBoardPort } from "../../domain/ports";
import type { HttpClient } from "../../../../shared/lib/http/http-client";

export class HttpTaskBoardRepository implements TaskBoardPort {
  constructor(private readonly http: HttpClient) {}

  async getTaskBoardData(): Promise<TaskBoardData> {
    return this.http.get<TaskBoardData>("/api/samples/task-board");
  }
}
