import { createRouter, type BeatRouteDefinition } from "@ochairo/beat";

import { InMemoryDocRepository } from "../features/docs/data/doc-repository";
import { DocsPage } from "../features/docs/presentation/DocPage";
import { InMemoryComponentRepository } from "../features/beat-ui/data/component-repository";
import { BeatUIPage } from "../features/beat-ui/presentation/BeatUIPage";
import { InMemoryPlaygroundRepository } from "../features/stackblitz/data/playground-repository";
import { StackBlitzPage } from "../features/stackblitz/presentation/StackBlitzPage";
import { InMemoryFeatureRepository } from "../features/home/data/feature-repository";
import { HomePage } from "../features/home/presentation/Home";

/* ── Composition root: instantiate repositories ── */

const docRepository = new InMemoryDocRepository();
const componentRepository = new InMemoryComponentRepository();
const playgroundRepository = new InMemoryPlaygroundRepository();
const featureRepository = new InMemoryFeatureRepository();

/* ── Load data from repositories ── */

const [docSections, navGroups, showcases, templates, features] =
  await Promise.all([
    docRepository.getDocSections(),
    componentRepository.getNavGroups(),
    componentRepository.getShowcases(),
    playgroundRepository.getTemplates(),
    featureRepository.getFeatures(),
  ]);

/* ── Define routes ── */

const routes: readonly BeatRouteDefinition[] = [
  {
    path: "/",
    view: (match) => <HomePage match={match} features={features} />,
  },
  {
    path: "/docs/:slug",
    view: (match) => <DocsPage match={match} sections={docSections} />,
  },
  {
    path: "/docs",
    view: () => null,
    redirectTo: "/docs/motivation",
  },
  {
    path: "/stackblitz",
    view: () => <StackBlitzPage templates={templates} />,
  },
  {
    path: "/beat-ui",
    view: () => <BeatUIPage navGroups={navGroups} showcases={showcases} />,
  },
];

export const router = createRouter({
  routes,
  basePath: "/beat-site",
});
