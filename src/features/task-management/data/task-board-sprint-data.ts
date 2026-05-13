import type { TaskBoardSprintData, WorkItem } from "../domain/types";

import { TASK_BOARD_TASK_DATA } from "./data";

const SAMPLE_YEAR = new Date().getUTCFullYear();
const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_SPRINT_LABEL = "Sprint 12";
const BASE_SPRINT_START_DATE = "2026-05-01";
const BASE_SPRINT_END_DATE = "2026-05-15";
const BASE_SPRINT_NUMBER =
  Number.parseInt(BASE_SPRINT_LABEL.replace(/[^0-9]/g, ""), 10) || 1;
const BASE_SPRINT_LABEL_PREFIX =
  BASE_SPRINT_LABEL.replace(/\d+/g, "").trim() || "Sprint";

type SprintShell = Omit<TaskBoardSprintData, "items">;

function toCurrentYearDate(isoDate: string): string {
  return `${SAMPLE_YEAR}${isoDate.slice(4)}`;
}

function toDayNumber(isoDate: string): number {
  const [year = 0, month = 1, day = 1] = isoDate
    .split("-")
    .map((part) => Number.parseInt(part, 10));

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function fromDayNumber(dayNumber: number): string {
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

function buildSprintShells(): readonly SprintShell[] {
  const baseStartDay = toDayNumber(toCurrentYearDate(BASE_SPRINT_START_DATE));
  const baseEndDay = toDayNumber(toCurrentYearDate(BASE_SPRINT_END_DATE));
  const sprintLengthDays = Math.max(1, baseEndDay - baseStartDay + 1);
  const yearStartDay = toDayNumber(`${SAMPLE_YEAR}-01-01`);
  const yearEndDay = toDayNumber(`${SAMPLE_YEAR}-12-31`);
  const earliestOffset = Math.ceil(
    (yearStartDay - baseStartDay) / sprintLengthDays,
  );
  const latestOffset = Math.floor((yearEndDay - baseEndDay) / sprintLengthDays);

  return Array.from(
    { length: latestOffset - earliestOffset + 1 },
    (_, index) => {
      const offset = earliestOffset + index;
      const sprintNumber = BASE_SPRINT_NUMBER + offset;
      const startDay = baseStartDay + offset * sprintLengthDays;
      const endDay = startDay + sprintLengthDays - 1;

      return {
        id: `sprint-${sprintNumber}`,
        label: `${BASE_SPRINT_LABEL_PREFIX} ${sprintNumber}`.trim(),
        startDate: fromDayNumber(startDay),
        endDate: fromDayNumber(endDay),
      } satisfies SprintShell;
    },
  );
}

function assignTasksToSprints(
  items: readonly WorkItem[],
  sprints: readonly SprintShell[],
): readonly TaskBoardSprintData[] {
  const itemsBySprintId = new Map(
    sprints.map((sprint) => [sprint.id, [] as WorkItem[]]),
  );
  const fallbackSprint = sprints[0];

  for (const item of items) {
    const itemStartDate = item.startDate;
    const itemStartDay =
      itemStartDate === undefined ? null : toDayNumber(itemStartDate);
    const sprint =
      itemStartDay === null
        ? fallbackSprint
        : (sprints.find((candidate) => {
            const sprintStartDay = toDayNumber(candidate.startDate);
            const sprintEndDay = toDayNumber(candidate.endDate);

            return (
              itemStartDay >= sprintStartDay && itemStartDay <= sprintEndDay
            );
          }) ?? fallbackSprint);

    if (sprint === undefined) {
      continue;
    }

    itemsBySprintId.get(sprint.id)?.push(item);
  }

  return sprints.map((sprint) => ({
    ...sprint,
    items: itemsBySprintId.get(sprint.id) ?? [],
  }));
}

const CURRENT_YEAR_TASK_BOARD_TASK_DATA: readonly WorkItem[] =
  TASK_BOARD_TASK_DATA.map((item) =>
    item.startDate === undefined
      ? item
      : {
          ...item,
          startDate: toCurrentYearDate(item.startDate),
        },
  );

export const TASK_BOARD_SPRINT_DATA: readonly TaskBoardSprintData[] =
  assignTasksToSprints(CURRENT_YEAR_TASK_BOARD_TASK_DATA, buildSprintShells());