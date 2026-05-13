# Integration

Add Pulse to an existing project — no framework required.

## Install

```sh
pnpm add @ochairo/pulse
```

Pulse has zero dependencies and works in any JavaScript or TypeScript environment.

## TypeScript setup

Pulse ships with full type inference. Enable strict mode for the best experience:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

`noUncheckedIndexedAccess` ensures array index access returns `T | undefined`, matching Pulse's runtime safety.

## Replace local state

Swap mutable variables for pulse nodes wherever you need reactivity:

```ts
import { pulse } from "@ochairo/pulse";

// Before
let count = 0;
function increment() { count++; }

// After
const count = pulse(0);
function increment() { count.set((n) => n + 1); }
```

## Replace global stores

Pulse handles nested state natively — no actions, reducers, or selectors:

```ts
import { pulse } from "@ochairo/pulse";

const store = pulse({
  user: { name: "Ada", role: "admin" },
  settings: { theme: "dark", lang: "en" },
});

// Exact-path subscriptions
store.user.name.on((event) => {
  updateHeader(event.currentValue);
});

store.settings.theme.on((event) => {
  applyTheme(event.currentValue);
});
```

Each `on()` fires only for its own path — no broad store subscriptions, no over-rendering.

## Use with vanilla DOM

Pulse works without any framework:

```ts
import { pulse } from "@ochairo/pulse";

const count = pulse(0);
const el = document.getElementById("count")!;

count.on((event) => {
  el.textContent = String(event.currentValue);
});

document.getElementById("btn")!.addEventListener("click", () => {
  count.set((n) => n + 1);
});
```

## Use with Beat

Pulse is the native state layer for Beat. Pulse nodes render directly in JSX:

```tsx
import { pulse } from "@ochairo/pulse";
import { render } from "@ochairo/beat";

const count = pulse(0);

render(document.getElementById("app")!, (
  <button onClick={() => count.set((n) => n + 1)}>
    count: {count}
  </button>
));
```

## Gradual adoption

Pulse integrates incrementally:

1. Start with a single `pulse()` call for one piece of state
2. Subscribe with `on()` to update your existing UI
3. Expand to nested state as needed
4. Add `derived()` for computed values
5. Use `batch()` when you need grouped writes

No migration required. Pulse nodes are plain values that coexist with any existing state management.
