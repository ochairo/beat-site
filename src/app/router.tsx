import { createRouter, type BeatRouteDefinition } from "@ochairo/beat";

import { InMemoryDocRepository, DocsPage } from "../features/docs";
import {
  InMemoryComponentRepository,
  ComponentsPage,
} from "../features/components";
import {
  InMemoryPlaygroundRepository,
  PlaygroundPage,
} from "../features/playground";
import { InMemoryFeatureRepository, HomePage } from "../features/home";

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
    path: "/playground",
    view: () => <PlaygroundPage templates={templates} />,
  },
  {
    path: "/components",
    view: () => <ComponentsPage navGroups={navGroups} showcases={showcases} />,
  },
];

export const router = createRouter({
  routes,
  basePath: "/beat-site",
});
