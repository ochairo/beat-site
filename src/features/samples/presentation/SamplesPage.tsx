import { Show, component, onMount, type BeatJsxChild } from "@ochairo/beat";
import { Tab } from "@ochairo/beat-ui";
import { pulse } from "@ochairo/pulse";

import { SiteLayout } from "../../../shared/layout/Layout";
import type { TaskBoardPort, CryptoDashboardPort } from "../domain/ports";
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
  { key: "task-boards" as const, label: "Task Boards" },
];

export const SamplesPage = component<SamplesPageProps>(
  (props): BeatJsxChild => {
    const taskBoardData = pulse<TaskBoardData | null>(null);
    const coins = pulse<readonly CoinMeta[] | null>(null);

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
      content:
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
      <SiteLayout>
        <div class={css["page"]!}>
          <div class={css["header"]!}>
            <h1 class={css["title"]!}>Samples</h1>
            <p class={css["subtitle"]!}>
              UI samples built with Beat UI components
            </p>
          </div>
          <Tab items={items} />
        </div>
      </SiteLayout>
    );
  },
);
