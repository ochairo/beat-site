import { createRouter, type BeatRouteDefinition } from "@ochairo/beat";

import { HttpDocRepository } from "../features/docs/data/doc-repository";
import { DocsPage } from "../features/docs/presentation/DocPage";
import { HttpComponentRepository } from "../features/beat-ui/data/component-repository";
import { BeatUIPage } from "../features/beat-ui/presentation/BeatUIPage";
import { HttpPlaygroundRepository } from "../features/stackblitz/data/playground-repository";
import { StackBlitzPage } from "../features/stackblitz/presentation/StackBlitzPage";
import { HttpFeatureRepository } from "../features/home/data/feature-repository";
import { HomePage } from "../features/home/presentation/Home";
import { HttpTaskBoardRepository } from "../features/samples/data/task/repository";
import { HttpCryptoDashboardRepository } from "../features/samples/data/crypto/repository";
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
    view: () => (
      <SamplesPage
        taskBoardPort={taskBoardRepository}
        cryptoDashboardPort={cryptoDashboardRepository}
      />
    ),
  },
];

export const router = createRouter({
  routes,
  basePath: "/beat-site",
});
