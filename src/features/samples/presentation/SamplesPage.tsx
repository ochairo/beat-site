import { component, type BeatJsxChild } from "@ochairo/beat";
import { Tab, type TabItem } from "@ochairo/beat-ui";

import { SiteLayout } from "../../../shared/layout/Layout";
import css from "./SamplesPage.module.css";

type SampleRouteKey = "crypto-dashboard" | "task-management";
type TaskManagementRouteKey = "task-boards" | "gantt-chart";

export interface SamplesPageProps {
  readonly activeSampleKey: SampleRouteKey;
  readonly activeTaskManagementKey?: TaskManagementRouteKey;
  readonly navigateTo: (to: string) => void;
  readonly children: BeatJsxChild;
}

const SAMPLE_ROUTES = [
  {
    key: "crypto-dashboard" as const,
    label: "Crypto Dashboard",
    href: "/beat-site/samples/crypto-dashboard",
  },
  {
    key: "task-management" as const,
    label: "Task Management",
    href: "/beat-site/samples/task-management/task-boards",
  },
];

const TASK_MANAGEMENT_ROUTES = [
  {
    key: "task-boards" as const,
    label: "Task Boards",
    href: "/beat-site/samples/task-management/task-boards",
  },
  {
    key: "gantt-chart" as const,
    label: "Gantt Chart",
    href: "/beat-site/samples/task-management/gantt-chart",
  },
];

export const SamplesPage = component<SamplesPageProps>(
  (props): BeatJsxChild => {
    const renderCurrentContent = (): BeatJsxChild => (
      <div class={css["content"]!}>{props.children}</div>
    );

    const taskManagementItems: readonly TabItem[] = TASK_MANAGEMENT_ROUTES.map(
      (sample) => ({
        key: sample.key,
        label: sample.label,
        content:
          sample.key === props.activeTaskManagementKey
            ? renderCurrentContent()
            : null,
      }),
    );

    const sampleItems: readonly TabItem[] = SAMPLE_ROUTES.map((sample) => ({
      key: sample.key,
      label: sample.label,
      content:
        sample.key !== props.activeSampleKey ? null : sample.key ===
          "task-management" ? (
          <Tab
            ariaLabel="Task management demos"
            class={css["subtab"]!}
            items={taskManagementItems}
            defaultValue={props.activeTaskManagementKey ?? "task-boards"}
            onValueChange={(nextValue) => {
              const nextRoute = TASK_MANAGEMENT_ROUTES.find(
                (route) => route.key === nextValue,
              );
              if (nextRoute !== undefined) {
                props.navigateTo(nextRoute.href);
              }
            }}
            styles={{
              container:
                "display:flex;flex-direction:column;flex:1 1 auto;min-height:0;",
              panel:
                "display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden;",
            }}
          />
        ) : (
          renderCurrentContent()
        ),
    }));

    return (
      <SiteLayout contentStyle="display:flex;flex-direction:column;min-height:0;overflow:hidden">
        <section class={css["page"]!}>
          <Tab
            ariaLabel="Sample demos"
            class={css["tab"]!}
            items={sampleItems}
            defaultValue={props.activeSampleKey}
            unmountInactivePanels
            onValueChange={(nextValue) => {
              const nextRoute = SAMPLE_ROUTES.find(
                (route) => route.key === nextValue,
              );
              if (nextRoute !== undefined) {
                props.navigateTo(nextRoute.href);
              }
            }}
            styles={{
              container:
                "display:flex;flex-direction:column;flex:1 1 auto;min-height:0;",
              panel:
                "display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden;",
            }}
          />
        </section>
      </SiteLayout>
    );
  },
);
