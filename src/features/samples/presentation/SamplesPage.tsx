import { Show, component, onMount, type BeatJsxChild } from "@ochairo/beat";
import { Tab } from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";

import { SiteLayout } from "../../../shared/layout/Layout";
import type { CryptoDashboardPort, TaskBoardPort } from "../domain/ports";
import type { CoinMeta, TaskBoardData } from "../domain/types";
import { CryptoDashboard } from "./components/crypto-dashboard/CryptoDashboard";
import { TaskBoards } from "./components/task-boards/TaskBoards";
import css from "./SamplesPage.module.css";

export interface SamplesPageProps {
  readonly taskBoardPort: TaskBoardPort;
  readonly cryptoDashboardPort: CryptoDashboardPort;
}

const SAMPLE_TABS = [
  { key: "crypto-dashboard" as const, label: "Crypto Dashboard" },
  { key: "task-boards" as const, label: "Task Boards / Gantt Chart" },
];

const DEFAULT_SAMPLE_TAB = SAMPLE_TABS[0]?.key ?? "crypto-dashboard";

export const SamplesPage = component<SamplesPageProps>(
  (props): BeatJsxChild => {
    const taskBoardData = pulse<TaskBoardData | null>(null);
    const coins = pulse<readonly CoinMeta[] | null>(null);
    const activeSample = pulse<string>(DEFAULT_SAMPLE_TAB);

    onMount(() => {
      void Promise.all([
        props.taskBoardPort.getTaskBoardData(),
        props.cryptoDashboardPort.getCoins(),
      ]).then(([task, crypto]) => {
        taskBoardData.set(task);
        coins.set(crypto);
      });
    });

    const items = SAMPLE_TABS.map((tab) => ({
      key: tab.key,
      label: tab.label,
      renderContent: () =>
        tab.key === "crypto-dashboard" ? (
          <Show when={coins} mapValue={(v) => v !== null}>
            {() => <CryptoDashboard coins={coins.get()!} />}
          </Show>
        ) : (
          <Show when={taskBoardData} mapValue={(v) => v !== null}>
            {() => <TaskBoards data={taskBoardData.get()!} />}
          </Show>
        ),
    }));

    return (
      <SiteLayout contentStyle="display:flex;flex-direction:column;min-height:0;overflow:hidden">
        <div class={css["page"]!}>
          <Tab
            class={css["tab"]!}
            items={items}
            value={activeSample}
            onValueChange={(nextValue) => activeSample.set(nextValue)}
          />
        </div>
      </SiteLayout>
    );
  },
);
