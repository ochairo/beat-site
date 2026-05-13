import type { MockHttpClient } from "../../../shared/lib/http/http-client";

import { TASK_BOARD_COLUMN_DATA } from "./task-board-column-data";
import {
  TASK_BOARD_PRIORITY_TYPE_DATA,
  TASK_BOARD_TASK_TYPE_DATA,
} from "./data";
import { TASK_BOARD_SPRINT_DATA } from "./task-board-sprint-data";

export function registerTaskBoardEndpoints(client: MockHttpClient): void {
  client.register(
    "/api/samples/task-board/columns",
    () => TASK_BOARD_COLUMN_DATA,
  );
  client.register(
    "/api/samples/task-board/task-types",
    () => TASK_BOARD_TASK_TYPE_DATA,
  );
  client.register(
    "/api/samples/task-board/priority-types",
    () => TASK_BOARD_PRIORITY_TYPE_DATA,
  );
  client.register(
    "/api/samples/task-board/sprints",
    () => TASK_BOARD_SPRINT_DATA,
  );
}
