# Beat API Reference

This document describes the current public API of `@ochairo/beat`.

## Stability

- the public API is stable within the documented scope
- breaking changes are reserved for future major versions
- minor releases should add features without breaking existing contracts
- patch releases should focus on fixes and non-breaking refinements

## Package Entry Points

Beat currently exposes these package entry points:

- `@ochairo/beat` — runtime, DOM, router, and resource APIs
- `@ochairo/beat/jsx-runtime` — consumed by TypeScript's JSX transform via `jsxImportSource`
- `@ochairo/beat/jsx-dev-runtime` — dev-mode JSX transform
- `@ochairo/beat/vite-plugin` — Beat-specific JSX lowering for Vite
- `@ochairo/beat/server` — server-side rendering utilities (`renderToString`, `waitForRouter`)

## Core Runtime

### `createRoot(target)`

Create a Beat render root for a DOM element.

```ts
createRoot(target: Element): BeatRoot
```

`BeatRoot`:

```ts
interface BeatRoot {
  readonly target: Element;
  readonly mounted: boolean;
  render(view: BeatJsxChild): void;
  destroy(): void;
}
```

A root fully owns the currently mounted view.
Calling `render()` replaces the previous view and runs its cleanup.

### `render(target, view)`

Render a Beat view into an element and return a dispose function.

```ts
render(target: Element, view: BeatJsxChild): BeatCleanup
```

Use this when you want one-shot mounting without holding onto a root object.

### `hydrate(target, view)`

Attach a Beat view to a server-rendered element.

```ts
hydrate(target: Element, view: BeatJsxChild): BeatCleanup
```

Renders the view into detached nodes first, then performs a single atomic `replaceChildren` swap.
The server HTML remains visible until the swap — no blank intermediate frame.

Use `hydrate` in your client entry point when the HTML was produced by `renderToString` on the server.

```ts
// entry-client.ts
import { createRouter, hydrate } from "@ochairo/beat";

const router = createRouter({ routes, window });
hydrate(document.getElementById("app")!, <App router={router} />);
```

## JSX Runtime

### `jsx`, `jsxs`, `jsxDEV`, `Fragment`

These functions and values back Beat's JSX transform.
In normal usage they are not called manually.
They are consumed by the TypeScript JSX runtime when `jsxImportSource` points to Beat.

### `component(setup)`

Create a scope-aware Beat component.

```ts
component<TProps>(setup: BeatComponent<TProps>): BeatComponent<TProps>
```

A Beat component behaves more like a setup function than a rerender function.
Its cleanup is tied to the owning render scope.

### `onCleanup(cleanup)`

Register cleanup work inside a Beat component scope.

```ts
onCleanup(cleanup: BeatCleanup): void
```

This must run inside `component(...)`.
It throws if used outside an active Beat component scope.

### `onMount(callback)`

Queue a callback to run after the current render is committed to the DOM.

```ts
onMount(callback: () => void): void
```

This must run inside `component(...)`.
During server-side rendering (`renderToString`) `onMount` callbacks are suppressed — they are not queued and will not fire against the server DOM.

### `Show`

Conditional rendering primitive.

```ts
interface ShowProps<TValue> {
  readonly when: Pulse<TValue>;
  readonly children: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly fallback?: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly mapValue?: (value: TValue) => boolean;
}
```

Use `Show` for explicit mount/unmount branch behavior.

### `For`

Keyed collection rendering primitive.

```ts
interface ForProps<TValue> {
  readonly each: Pulse<readonly TValue[]>;
  readonly children: (value: Pulse<TValue>, index: number) => BeatJsxChild;
  readonly key?: (value: TValue, index: number) => PropertyKey;
}
```

`For` keeps a stable `Pulse<TValue>` per keyed entry. Exact-path writes like `rows[0].label.set(...)` update that entry in place and should not remount sibling entries.

Important behavior:

- each rendered item receives a stable `Pulse<TValue>` for the keyed item
- Beat reuses keyed entries where possible
- child-pulse field updates continue to flow through reused keyed entries without requiring structural array changes
- structural list changes remount only the entries that need to move or be created

### Shared JSX Types

Beat exports several shared JSX and component types:

- `BeatJsxChild`
- `BeatJsxProps`
- `BeatComponent`
- `BeatScope`
- `ShowProps`
- `ForProps`

Use these in libraries built on top of Beat when you need to type component inputs or low-level view helpers.

## Router

Beat's router is an SPA router built on explicit Pulse route state.
The current route is exposed through `router.current`.

### `createRouter(options)`

```ts
createRouter(options: CreateBeatRouterOptions): BeatRouter
```

`CreateBeatRouterOptions`:

```ts
interface CreateBeatRouterOptions {
  readonly routes: readonly BeatRouteDefinition[];
  readonly basePath?: string;
  readonly prefetchCacheMaxEntries?: number;
  readonly window?: Window;
  /**
   * Initial URL for server-side rendering.
   * When provided, the router resolves the matching route from this URL
   * instead of reading `window.location`.
   * All navigation and history operations become no-ops.
   */
  readonly initialUrl?: string;
  readonly onError?: (event: BeatRouteErrorEvent) => void;
}
```

`BeatRouter`:

```ts
interface BeatRouter {
  readonly current: Pulse<BeatRouteMatch>;
  readonly onError?: (event: BeatRouteErrorEvent) => void;
  resolve(to: string): URL;
  navigate(to: string, options?: BeatNavigateOptions): void;
  prefetch(to: string): Promise<void>;
  invalidatePrefetch(to?: string): void;
  reload(): void;
  back(): void;
  dispose(): void;
}
```

Important current behavior:

- redirects and guards resolve before navigation commits
- route loaders receive an `AbortSignal`
- `prefetch(to)` warms route and named-outlet loaders without changing current route state or history
- prefetched route data is stored in a bounded in-memory cache and reused on later navigation
- `invalidatePrefetch(to?)` clears one prefetched route or the whole prefetch cache and aborts matching in-flight prefetches
- stale loader results are suppressed on newer navigations
- `reload()` reruns the current route loaders without pushing new history
- disposing the router aborts in-flight loaders
- named outlets keep their own branch loader state

### Route Definitions

```ts
interface BeatRouteDefinition {
  readonly path: string;
  readonly outlet?: string;
  readonly view: (match: BeatRouteMatch) => BeatJsxChild;
  readonly errorView?: (error: unknown, match: BeatRouteMatch) => BeatJsxChild;
  readonly children?: readonly BeatRouteDefinition[];
  readonly load?: (match: BeatRouteMatch, signal: AbortSignal) => Promise<unknown>;
  readonly redirectTo?: BeatNavigationTarget | ((match: BeatRouteMatch) => BeatNavigationTarget);
  readonly beforeEnter?: (context: BeatRouteGuardContext) => BeatRouteGuardResult;
}
```

Key fields:

- `path`: route segment pattern
- `view`: rendered view for the route branch
- `children`: nested route tree
- `outlet`: named outlet target, defaults to the main outlet
- `load`: async branch loader
- `errorView`: fallback shown for route loader or render failures
- `redirectTo`: static or computed redirect
- `beforeEnter`: navigation guard

### `BeatRouteMatch`

```ts
interface BeatRouteMatch {
  readonly path: string;
  readonly fullPath: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly route?: BeatRouteDefinition;
  readonly matches: readonly BeatRouteBranchMatch[];
  readonly routeData: readonly BeatRouteDataMatch[];
  readonly depth: number;
  readonly status: BeatRouteDataStatus;
  readonly loading: boolean;
  readonly data: unknown;
  readonly error: unknown;
  outlet(name?: string): BeatJsxChild | null;
  navigate(to: string, options?: BeatNavigateOptions): void;
  back(): void;
}
```

Important behavior:

- `status`, `loading`, `data`, and `error` reflect the leaf route of the current branch
- `routeData` contains per-branch route loader state
- `outlet()` renders the next branch level
- `outlet(name)` renders a named outlet branch
- `navigate(to)` navigates to a new route from the current match context
- `back()` navigates to the previous history entry

### Router Components

#### `Link(props)`

```ts
interface LinkProps extends BeatJsxProps {
  readonly router: BeatRouter;
  readonly to: string;
  readonly replace?: boolean;
  readonly prefetch?: boolean | "hover" | "focus";
}
```

Render a router-aware anchor that intercepts navigation through Beat.

`prefetch` behavior:

- `true`: prefetch on hover and focus
- `"hover"`: prefetch on hover only
- `"focus"`: prefetch on focus only

#### `Outlet(props)`

```ts
interface OutletProps {
  readonly router: BeatRouter;
  readonly name?: string;
}
```

Render the current route branch or named outlet branch.

### Router Types

Beat exports these router-related types:

- `BeatRouter`
- `BeatRouteDefinition`
- `BeatRouteMatch`
- `BeatRouteBranchMatch`
- `BeatRouteDataMatch`
- `BeatRouteDataStatus`
- `BeatNavigateOptions`
- `BeatRouteErrorPhase`
- `BeatRouteErrorEvent`
- `CreateBeatRouterOptions`
- `LinkProps`
- `OutletProps`

## Resources

Beat resources provide explicit async state and optional shared caching.

### `createResource(options)`

```ts
createResource<TSource, TValue>(
  options: CreateBeatResourceOptions<TSource, TValue>,
): BeatResource<TValue>
```

`CreateBeatResourceOptions`:

```ts
interface CreateBeatResourceOptions<TSource, TValue> {
  readonly source?: Pulse<TSource>;
  readonly initialValue?: TValue;
  readonly load: (source: TSource, signal: AbortSignal) => Promise<TValue>;
  readonly immediate?: boolean;
  readonly debounceMs?: number;
  readonly keepStaleWhileRefreshing?: boolean;
  readonly getCacheKey?: (source: TSource) => string;
  readonly cacheTimeMs?: number;
  readonly cache?: BeatResourceCache<TValue>;
}
```

`source` is optional.
When it is omitted, the resource becomes a manually triggered async state machine and `reload()` runs `load(...)` without subscribing to any pulse source.

`BeatResource`:

```ts
interface BeatResource<TValue> {
  readonly state: Pulse<BeatResourceState<TValue>>;
  invalidate(cacheKey?: string): void;
  reload(): Promise<void>;
  dispose(): void;
}
```

State shape:

```ts
interface BeatResourceState<TValue> {
  readonly status: "idle" | "pending" | "resolved" | "rejected";
  readonly loading: boolean;
  readonly data: TValue | undefined;
  readonly error: unknown;
}
```

Important current behavior:

- loads receive an `AbortSignal`
- stale async completions are ignored
- `dispose()` aborts the active request
- debounced reload promises settle correctly across reschedules and dispose
- resources can run without a source pulse when used as manual loaders
- resource state remains explicit instead of being hidden behind Suspense-style control flow

### `createResourceCache(options?)`

```ts
createResourceCache<TValue>(
  options?: CreateBeatResourceCacheOptions,
): BeatResourceCache<TValue>
```

`CreateBeatResourceCacheOptions`:

```ts
interface CreateBeatResourceCacheOptions {
  readonly maxEntries?: number;
  readonly defaultCacheTimeMs?: number;
  readonly namespace?: string;
  readonly eviction?: "lru" | "fifo";
}
```

`BeatResourceCache`:

```ts
interface BeatResourceCache<TValue> {
  get(cacheKey: string): TValue | undefined;
  set(cacheKey: string, value: TValue, cacheTimeMs?: number): void;
  delete(cacheKey: string): void;
  clear(): void;
  pruneExpired(): number;
  size(): number;
  namespace(namespace: string): BeatResourceCache<TValue>;
}
```

Use shared caches when multiple resources should reuse the same resolved values.

Current cache capabilities:

- max entry bounds
- per-entry TTL
- default TTL
- namespaces
- `lru` or `fifo` eviction
- explicit pruning and size inspection

### Resource Types

Beat exports these resource-related types:

- `BeatResource`
- `BeatResourceState`
- `BeatResourceStatus`
- `BeatResourceCache`
- `BeatResourceCacheEviction`
- `CreateBeatResourceOptions`
- `CreateBeatResourceCacheOptions`

## Vite Plugin

Beat exposes a Vite plugin from `@ochairo/beat/vite-plugin`.

### `createBeatVitePlugin(options?)`

```ts
createBeatVitePlugin(options?: CreateBeatVitePluginOptions): PluginOption
```

`CreateBeatVitePluginOptions`:

```ts
interface CreateBeatVitePluginOptions {
  readonly packageRoot?: string;
  readonly packageName?: string;
  readonly aliasLocalSource?: boolean;
}
```

Current responsibilities:

- standardize Beat JSX runtime resolution
- lower explicit intrinsic bindings on lowercase DOM tags:
  - `text={...}`
  - `class:name={...}`
  - `style:name={...}`
  - `prop:name={...}`
- lower single-child text expressions on lowercase DOM tags into Beat's direct text binding path

The Vite plugin is intentionally a separate subpath export rather than part of the main runtime entry.

## Server-Side Rendering

Import from `@ochairo/beat/server`. Requires a DOM environment such as `happy-dom` to be installed on `globalThis.document` before calling.

### `renderToString(factory)`

```ts
renderToString(factory: () => BeatJsxChild): string
```

Renders the view returned by `factory` to an HTML string.
`onMount` callbacks are suppressed during rendering.

The `factory` form ensures components run inside the SSR context — pass a function, not a pre-evaluated JSX expression:

```ts
// correct
const html = renderToString(() => <App router={router} />);

// incorrect — component runs before SSR context is entered
const html = renderToString(<App router={router} />);
```

### `waitForRouter(router, options?)`

```ts
waitForRouter(
  router: BeatRouter,
  options?: { readonly signal?: AbortSignal },
): Promise<void>
```

Waits for all `load` functions of the currently matched routes to settle.
Resolves immediately when no loaders are active.

Always pass an `AbortSignal` in server contexts so the promise rejects instead of hanging if a loader stalls or the router is disposed:

```ts
const router = createRouter({ routes, initialUrl: url });
await waitForRouter(router, { signal: AbortSignal.timeout(5_000) });
const html = renderToString(() => <App router={router} />);
```

### Full SSR Pattern

```ts
// entry-server.ts
import { Window } from "happy-dom";
import { createRouter } from "@ochairo/beat";
import { renderToString, waitForRouter } from "@ochairo/beat/server";

export async function render(url: string): Promise<string> {
  const win = new Window({ url });
  globalThis.document = win.document as unknown as Document;

  const router = createRouter({ routes, initialUrl: url });
  await waitForRouter(router, { signal: AbortSignal.timeout(5_000) });
  const html = renderToString(() => <App router={router} />);

  win.happyDOM.close();
  return `<div id="app">${html}</div>`;
}

// entry-client.ts
import { createRouter, hydrate } from "@ochairo/beat";

const router = createRouter({ routes, window });
hydrate(document.getElementById("app")!, <App router={router} />);
```

## Recommended Starting Surface

For most app code, start with:

- `createRoot()` or `render()`
- `component()`, `onCleanup()`, and `onMount()`
- `Show` and `For`
- `createRouter()`, `Link`, and `Outlet`
- `createResource()`

For server-rendered apps, add:

- `hydrate()` on the client
- `renderToString()` and `waitForRouter()` from `@ochairo/beat/server`
- `initialUrl` on `createRouter()`
