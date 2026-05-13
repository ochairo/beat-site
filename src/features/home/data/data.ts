import type { FeatureData } from "../domain/types";

export const HOME_FEATURES: readonly FeatureData[] = [
  {
    icon: "reactivity",
    title: "Local Updates",
    description:
      "Exact-path subscriptions update only the binding that depends on the changed value.",
  },
  {
    icon: "direct-dom",
    title: "Direct DOM",
    description:
      "Beat renders to real DOM nodes and updates them directly instead of diffing a virtual tree.",
  },
  {
    icon: "router",
    title: "Explicit Router",
    description:
      "Params, loaders, prefetch, guards, and named outlets stay in explicit router APIs.",
  },
  {
    icon: "resource",
    title: "Async Resources",
    description:
      "Resources expose loading, error, and data state directly, with caching, debounce, and reload support.",
  },
  {
    icon: "typescript",
    title: "Strict TypeScript",
    description:
      "Route params, resource state, and component props stay strongly typed.",
  },
  {
    icon: "run-once",
    title: "Run-Once Components",
    description:
      "Components set up once, then bindings keep the UI current without rerunning component code.",
  },
];
