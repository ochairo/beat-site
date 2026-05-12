# Motivation

## Where this started

Have you ever traced a re-render through five components, only to find that a single text node changed?

Have you ever stared at a `useEffect` dependency array and thought: *why am I telling the framework what my own code depends on?*

Have you ever added `useCallback`, `useMemo`, and a `key` prop to a single component — and felt like you were fighting the framework rather than building with it?

I have. That frustration eventually turned into a question: **does it have to be this way?**

Beat is my answer to that question — here's the thinking behind it.

## How frameworks handle updates

Most frameworks share a core assumption: **the framework decides the granularity of updates.**

In React, a state change re-executes your entire component function — every variable, every expression, every child. A virtual DOM diff then figures out what actually changed.

```tsx
import { useState, useEffect, memo } from "react";

const MessagesPanelMemo = memo(MessagesPanel);

function Dashboard({ socket }: { socket: WebSocket }) {
  const [notifications, setNotifications] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "notification") setNotifications((n) => n + 1);
      if (data.type === "message") setMessages((m) => [...m, data.message]);
    };

    return () => { socket.onmessage = null; };
  }, [socket]);

  return (
    <div>
      <NotificationBadge count={notifications} />
      <MessagesPanelMemo messages={messages} />
    </div>
  );
}
```

React has good tools to manage this: `React.memo`, `useMemo`, `useCallback`, and now the React Compiler. They work well. But they exist because the model creates the problem they solve.

Other frameworks took different paths. Vue tracks property access automatically via proxies. Solid.js runs components once and tracks signal reads. Svelte compiles reactivity into the output. Angular moved from Zone.js to signals. Each one is a thoughtful take on the same problem, and they're all worth knowing.

Beat uses a compiler too — its Vite plugin rewrites JSX so that `{count}` in a template automatically wires a subscription, similar to how Svelte works. Outside of templates, though, reactivity is always manual: `.get()` to read, `.on()` to subscribe, nothing inferred at runtime.

## Components run once

In Beat, **your component runs once.** It creates DOM elements, wires up subscriptions, and exits. When state changes, only the specific DOM nodes that depend on it update. Nothing else runs.

```tsx
import { onCleanup } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

function Dashboard({ socket }: { socket: WebSocket }) {
  const notifications = pulse(0);
  const messages = pulse<Message[]>([]);

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === "notification") notifications.set((n) => n + 1);
    if (data.type === "message") messages.set((m) => [...m, data.message]);
  };

  onCleanup(() => { socket.onmessage = null; });

  return (
    <div>
      <NotificationBadge count={notifications} />
      <MessagesPanel messages={messages} />
    </div>
  );
}
```

No dependency arrays to maintain — subscriptions are created once and stay. No memoization needed — components don't re-run, so there's nothing to cache. Cleanup is explicit via `onCleanup`, not inferred from a dependency array.

In the same scenario: no `React.memo` to add — isolation is the default, not something you opt into.

Solid does this too, and does it well. Where Beat differs is in **what "explicit" means.**

## Explicit subscriptions

In auto-tracking systems (Solid, Vue, Angular signals), the framework builds a dependency graph by watching what you read during execution. You write natural code, and reactivity follows. It's a genuinely good approach, and the ergonomics show.

Beat takes a more manual path. Reactivity is never inferred at runtime:

- **`.get()`** reads a value. Nothing else happens.
- **`.set()`** writes a value. Subscribers are notified.
- **`.on()`** subscribes. You choose what you listen to.
- **`batch()`** groups writes. You control when notifications fire.

```ts
const state = pulse({ user: { name: "Ada" }, theme: "dark" });

state.user.name.get();
state.user.name.on((e) => updateLabel(e.currentValue));
state.user.on((e) => reloadProfile(e.currentValue));
```

The trade-off is more explicit code. The upside is that every reactive relationship is visible in your code — there's nothing inferred at runtime that you'd have to trace down later.

In JSX templates, Beat's Vite plugin handles the common cases automatically. But the mechanism underneath is always the same: `.get()` to read, `.on()` to subscribe.

## Path-level state

Most reactive systems track at the **property level** (Vue) or the **signal level** (Solid, Angular). Pulse tracks at the **path level**.

```ts
const state = pulse({ user: { name: "Ada", age: 30 }, theme: "dark" });
state.user.name.on(() => { /* fires when name changes */ });
state.user.on(() => { /* fires when user is replaced */ });
```

`state.user.name.set("Grace")` notifies the name listener. The user listener stays silent — the user object wasn't replaced, only a child changed.

`state.user.set({ name: "Grace", age: 31 })` notifies both — the user was replaced, and the name is now different.

Your subscription is bound to a path in the tree. You're subscribing to exactly the data you care about, not to "whatever I happened to read."

Under the hood, Pulse uses structural sharing. Updating `state.user.name` only clones the nodes along `root → user → name`. Everything else keeps its reference. Writes are O(path depth), not O(tree size).

## Direct DOM updates

Beat creates real DOM elements — no virtual DOM, no diffing, no reconciliation.

```tsx
<div style:color={theme}>{count}</div>
```

This creates a `<div>`, subscribes `theme` to `style.color`, and subscribes `count` to a text node. When `theme` changes, one `style.setProperty` call runs. When `count` changes, one `textNode.data` assignment runs.

Solid takes the same approach. When you know exactly which state maps to which DOM node, there's no need to diff anything.

## Trade-offs

Beat is not the right choice for every project.

- **Manual subscriptions** — you manage reactive relationships explicitly (JSX handles the common cases, but the model is manual)
- **Smaller ecosystem** — fewer community packages and integrations
- **Different mental model** — path-level reactivity takes some getting used to

Auto-tracking frameworks like Solid, Vue, and Angular signals offer better ergonomics and a much more mature ecosystem. For most projects, one of those is probably the right call.

Beat is a good fit if you enjoy knowing exactly what your code is doing — if you'd rather write an explicit subscription than wonder why something re-ran. It's a narrower trade-off, made deliberately.

If that sounds like your kind of thing, welcome. Feel free to ask questions or share ideas in the [GitHub Discussions](https://github.com/ochairo/beat/discussions).

## At a glance

| | React | Vue | Angular | Solid | Beat |
| - | - | - | - | - | - |
| Components | Re-execute on state change | Setup once, render re-runs | Change detection (Zone.js or signals) | Run once | Run once |
| DOM updates | Virtual DOM diff | Virtual DOM diff | Compiled DOM instructions | Direct binding | Direct binding |
| Reactivity | Manual dependency arrays | Automatic via proxies | Automatic via signals | Automatic via signals | Explicit path subscriptions |
| Subscription scope | Component-level | Property-level | Signal-level | Computation-level | Path-level |
| Dependency management | Arrays and memoization | Automatic | Automatic | Automatic | Explicit `.on()` calls |
| SSR | Yes | Yes | Yes | Yes | Yes |
| State primitive | `useState` / `useReducer` | `ref` / `reactive` | `signal` / `computed` | `createSignal` / `createStore` | `pulse` / `derived` |
