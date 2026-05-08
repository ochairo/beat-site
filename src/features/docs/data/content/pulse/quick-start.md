# Quick Start

Get up and running with Pulse in under a minute.

## Install

```sh
pnpm add @ochairo/pulse
```

## Create a pulse

```ts
import { pulse } from "@ochairo/pulse";

const count = pulse(0);
```

A pulse wraps any value — primitives, objects, or arrays — and makes it reactive.

## Read & write

```ts
count.get(); // 0
count.set(1);
count.get(); // 1
```

No selectors, no reducers. Just `get()` and `set()`.

## Subscribe to changes

```ts
const unsubscribe = count.on((event) => {
  console.log(event.currentValue); // 1
});

count.set(1);
unsubscribe();
```

Listeners fire only when the value actually changes.

## Nested state

Pulse supports deep objects and arrays out of the box.

```ts
const state = pulse({
  user: { name: "Ada", age: 30 },
  todos: ["ship docs"],
});

// Read nested paths
state.user.name.get(); // "Ada"

// Write nested paths
state.user.name.set("Grace");

// Subscribe to exact paths
state.user.name.on((event) => {
  console.log(event.currentValue); // "Grace"
});
```

Reads, writes, and subscriptions are always scoped to the exact path you access.

## Derived values

Create read-only computed values that update when the source changes:

```ts
import { pulse, derived } from "@ochairo/pulse";

const count = pulse(0);
const doubled = derived(count, (v) => v * 2);

doubled.get(); // 0
count.set(3);
doubled.get(); // 6
```

`derived` skips notifications when the computed value is unchanged.

## Batch writes

Group multiple writes and flush listeners once:

```ts
const state = pulse({ x: 0, y: 0 });

state.batch(() => {
  state.x.set(10);
  state.y.set(20);
});
```

Writes apply immediately inside the batch. Listeners are deferred until the batch completes.

## Next steps

- [API](./api) — full reference for every pulse method and type
- [Integration](./integration) — adding Pulse to an existing project
