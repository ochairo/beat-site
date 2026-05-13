import { createRouter, type BeatRouteDefinition } from "@ochairo/beat";

import { HttpDocRepository } from "../features/docs/data/doc-repository";
import { DocsPage } from "../features/docs/presentation/DocPage";
import { HttpComponentRepository } from "../features/beat-ui/data/component-repository";
import { BeatUIPage } from "../features/beat-ui/presentation/BeatUIPage";
import { HttpPlaygroundRepository } from "../features/stackblitz/data/playground-repository";
import { StackBlitzPage } from "../features/stackblitz/presentation/StackBlitzPage";
import { HttpFeatureRepository } from "../features/home/data/feature-repository";
import { HomePage } from "../features/home/presentation/Home";
import { HttpCryptoDashboardRepository } from "../features/crypto-dashboard/data/crypto-dashboard-repository";
import { CryptoDashboardPage } from "../features/crypto-dashboard/presentation/CryptoDashboardPage";
import { HttpTaskBoardRepository } from "../features/task-management/data/task-board-repository";
import { TaskManagementPage } from "../features/task-management/presentation/TaskManagementPage";
import { SamplesPage } from "../features/samples/presentation/SamplesPage";
import { httpClient } from "./http-client";

/* ── Composition root: instantiate repositories ── */

const docRepository = new HttpDocRepository(httpClient);
const componentRepository = new HttpComponentRepository(httpClient);
const playgroundRepository = new HttpPlaygroundRepository(httpClient);
const featureRepository = new HttpFeatureRepository(httpClient);
const taskBoardRepository = new HttpTaskBoardRepository(httpClient);
const cryptoDashboardRepository = new HttpCryptoDashboardRepository(httpClient);

/* ── Define routes ── */

const routes: readonly BeatRouteDefinition[] = [
  {
    path: "/",
    view: (match) => <HomePage match={match} homePort={featureRepository} />,
  },
  {
    path: "/docs/:slug",
    view: (match) => <DocsPage match={match} docsPort={docRepository} />,
  },
  {
    path: "/docs",
    view: () => null,
    redirectTo: "/docs/motivation",
  },
  {
    path: "/stackblitz",
    view: () => <StackBlitzPage stackBlitzPort={playgroundRepository} />,
  },
  {
    path: "/beat-ui",
    view: () => (
      <BeatUIPage
        navGroupPort={componentRepository}
        showcasePort={componentRepository}
      />
    ),
  },
  {
    path: "/samples",
    view: () => null,
    redirectTo: "/samples/crypto-dashboard",
  },
  {
    path: "/samples/crypto-dashboard",
    view: (match) => (
      <SamplesPage
        activeSampleKey="crypto-dashboard"
        navigateTo={(to) => match.navigate(to)}
      >
        <CryptoDashboardPage cryptoDashboardPort={cryptoDashboardRepository} />
      </SamplesPage>
    ),
  },
  {
    path: "/samples/task-management",
    view: () => null,
    redirectTo: "/samples/task-management/task-boards",
  },
  {
    path: "/samples/task-boards",
    view: () => null,
    redirectTo: "/samples/task-management/task-boards",
  },
  {
    path: "/samples/gantt-chart",
    view: () => null,
    redirectTo: "/samples/task-management/gantt-chart",
  },
  {
    path: "/samples/task-management/task-boards",
    view: (match) => (
      <SamplesPage
        activeSampleKey="task-management"
        activeTaskManagementKey="task-boards"
        navigateTo={(to) => match.navigate(to)}
      >
        <TaskManagementPage taskBoardPort={taskBoardRepository} view="board" />
      </SamplesPage>
    ),
  },
  {
    path: "/samples/task-management/gantt-chart",
    view: (match) => (
      <SamplesPage
        activeSampleKey="task-management"
        activeTaskManagementKey="gantt-chart"
        navigateTo={(to) => match.navigate(to)}
      >
        <TaskManagementPage taskBoardPort={taskBoardRepository} view="gantt" />
      </SamplesPage>
    ),
  },
];

export const router = createRouter({
  routes,
  basePath: "/beat-site",
});
