import { pulse } from "@ochairo/pulse";

import type { TaskBoardPort } from "../../domain/ports";
import type { TaskBoardData } from "../../domain/types";

export const taskManagementData = pulse<TaskBoardData | null>(null);

let taskManagementLoadPromise: Promise<TaskBoardData> | null = null;

export function loadTaskManagementData(
  taskBoardPort: TaskBoardPort,
): Promise<TaskBoardData> {
  const currentData = taskManagementData.get();
  if (currentData !== null) {
    return Promise.resolve(currentData);
  }

  if (taskManagementLoadPromise !== null) {
    return taskManagementLoadPromise;
  }

  taskManagementLoadPromise = Promise.all([
    taskBoardPort.getTaskBoardColumns(),
    taskBoardPort.getTaskTypeOptions(),
    taskBoardPort.getPriorityTypeOptions(),
    taskBoardPort.getSprintData(),
  ])
    .then(([columns, taskTypeOptions, priorityTypeOptions, sprints]) => {
      const nextData: TaskBoardData = {
        columns,
        taskTypeOptions,
        priorityTypeOptions,
        sprints,
      };

      taskManagementData.set(nextData);
      return nextData;
    })
    .finally(() => {
      taskManagementLoadPromise = null;
    });

  return taskManagementLoadPromise;
}
