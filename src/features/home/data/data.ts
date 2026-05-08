import type { FeatureData } from "../domain/types";

export const HOME_FEATURES: readonly FeatureData[] = [
  {
    icon: "reactivity",
    title: "Fine-Grained Reactivity",
    description:
      "Pulse's exact-path subscriptions update only the DOM nodes that depend on the changed value. No diffing, no virtual DOM.",
  },
  {
    icon: "direct-dom",
    title: "Direct DOM",
    description:
      "JSX compiles to real DOM nodes. No reconciler overhead. Updates happen at the binding site, not the component boundary.",
  },
  {
    icon: "router",
    title: "Explicit Router",
    description:
      "SPA router with typed params, prefetch, guards, named outlets, and route-level async loaders. All routing state is reactive and inspectable.",
  },
  {
    icon: "resource",
    title: "Async Resources",
    description:
      "First-class async state with explicit loading, error, and data. Caching, debounce, and stale-while-refresh built in.",
  },
  {
    icon: "typescript",
    title: "Strict TypeScript",
    description:
      "No any types. Full type inference for route params, resource state, and component props. Zero compromise.",
  },
  {
    icon: "run-once",
    title: "Run-Once Components",
    description:
      "Components execute exactly once. Only the DOM nodes bound to reactive state update. No re-renders, no stale closures, no dependency arrays.",
  },
];
