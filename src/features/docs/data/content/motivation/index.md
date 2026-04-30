# Motivation

## The question

Have you ever stared at a `useEffect` dependency array and wondered: *why am I telling the framework what my own code depends on?*

Have you ever traced a re-render through five components, only to find that a single text node changed?

Have you ever wrapped a callback in `useCallback`, memoized a value with `useMemo`, added a `key` prop to force a reset — and felt like you were fighting the framework instead of building with it?

I have. And at some point the question shifted from "how do I fix this?" to **"does it have to be this way?"**

## Root problem

Most frameworks are built on a core assumption: **the framework decides when your code runs.**

In React, a state change re-executes your entire component function — every variable, every expression, every child. Then a virtual DOM diff figures out what actually changed. You write declarative code, and the framework handles the when and the how. It's elegant. It's also the source of every `useMemo`, every `useCallback`, every stale closure bug you've ever hit.

```tsx
function Dashboard() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");

  // Changing the theme re-runs this entire function.
  // user, setUser, theme, setTheme — all re-created.
  // Every child component re-evaluates.
  // The virtual DOM diffs everything to find that
  // one CSS class changed.

  return (
    <div className={theme}>
      <Profile user={user} />
      <Settings onThemeChange={setTheme} />
    </div>
  );
}
```

React provides tools: `React.memo`, `useMemo`, `useCallback`, the React Compiler. These are effective. But they exist because the model creates the problem they solve.

Other frameworks took different paths. Vue and MobX track property access automatically behind proxies — you read a value, the framework remembers. Solid runs components once and auto-tracks signal reads. Svelte compiles reactivity into the code itself. Angular moved from Zone.js to signals. Each avoids the re-render problem in its own way.

But they all share one thing: **the framework is doing something you didn't explicitly ask for.** Proxies intercept your reads. Compilers rewrite your assignments. Auto-tracking builds dependency graphs behind the scenes.

For most projects, that's a great trade-off. The magic works, and you ship faster.

But if you've ever debugged a reactivity system — traced why a computed value isn't updating, why an effect runs twice, why a watcher triggers for a property you didn't change — you've felt the cost of that trade-off. The framework is doing work you can't see, based on rules you have to memorize.

## What if it didn't?

That's the conviction behind Beat.

**Your component runs once.** It creates DOM elements, wires up subscriptions, and exits. There is no re-execution, no diffing, no reconciliation. When state changes, the specific DOM nodes that depend on it update directly. Nothing else runs.

```tsx
function Dashboard() {
  const user = pulse<User | null>(null);
  const theme = pulse("dark");

  // This function runs once. That's it.
  // Changing `theme` updates one class name.
  // `user` is untouched. No diff. No re-run.

  return (
    <div class:dark={theme}>
      <Profile user={user} />
      <Settings onThemeChange={(t) => theme.set(t)} />
    </div>
  );
}
```

No stale closures — the function doesn't re-run, so there's nothing to go stale. No dependency arrays — there are no effects that need to know what they depend on. No memoization — nothing is re-computed unless you explicitly subscribed to it.

This isn't a new idea. Solid does this too, and it does it well. Where Beat diverges is in **what "explicit" means.**

## Explicit reactivity

In auto-tracking systems (Solid, Vue, MobX, Angular signals), the framework builds a dependency graph by watching what you read during execution. This is powerful — you write natural code, and reactivity happens. But the graph is implicit. You can't see it in your code. You discover it through behavior.

Beat makes a different trade-off. Reactivity is never inferred:

- **`.get()`** reads a value. Nothing else happens.
- **`.set()`** writes a value. Subscribers are notified.
- **`.on()`** subscribes. You choose what you listen to.
- **`batch()`** groups writes. You control when notifications fire.

```ts
const state = pulse({ user: { name: "Ada" }, theme: "dark" });

// This reads the name. No side effects. No tracking.
console.log(state.user.name.get());

// This subscribes to the name. You'll be notified when it changes.
state.user.name.on((e) => updateLabel(e.currentValue));

// This subscribes to the user. You'll be notified when the
// entire user object is replaced — not when a child changes.
state.user.on((e) => reloadProfile(e.currentValue));
```

The cost is more explicit code. The benefit is that every reactive relationship is visible, traceable, and debuggable. There is no hidden behavior — if it's not in your code, it's not happening.

In JSX, Beat's Vite plugin handles the common wiring automatically — when you write `{count}` in a template, it creates the subscription for you. But the mechanism is always the same underneath: `.get()` to read, `.on()` to subscribe.

## Path-level state

Most reactive systems track at the **property level** (MobX, Vue) or the **signal level** (Solid, Angular). Pulse tracks at the **path level**.

```ts
const state = pulse({ user: { name: "Ada", age: 30 }, theme: "dark" });

state.user.name.on(() => { /* fires when name changes */ });
state.user.on(() => { /* fires when user is replaced */ });
```

`state.user.name.set("Grace")` notifies the name listener. The user listener stays silent — the user object wasn't replaced, only a child changed.

`state.user.set({ name: "Grace", age: 31 })` notifies both — the user was replaced, and the name value is now different.

This is structural — the subscription is bound to a path in the tree, not to a computation. You don't subscribe to "whatever I happen to read." You subscribe to exactly the data you care about.

Under the hood, Pulse uses structural sharing. When you update `state.user.name`, only the nodes along the path `root → user → name` are cloned. Everything else keeps its reference. Writes are O(path depth), not O(tree size).

## Direct DOM

Beat creates real DOM elements. No virtual DOM, no diffing, no reconciliation.

```tsx
<div style:color={theme}>{count}</div>
```

This creates a `<div>`, subscribes `theme` to `style.color`, and subscribes `count` to a text node. When `theme` changes, one `style.setProperty` call runs. When `count` changes, one `textNode.data` assignment runs. That's it.

Solid takes the same approach — and for the same reason. When you know exactly which piece of state maps to which DOM node, diffing is unnecessary work.

## Trade-offs

Beat is not the right choice for every project.

- **No server-side rendering** — Beat is a client-side SPA framework
- **No auto-tracking** — you manage subscriptions explicitly (JSX handles common cases, but the model is manual)
- **Smaller ecosystem** — fewer community packages and integrations
- **Learning curve** — path-level reactivity is a different mental model

Auto-tracking is a genuinely great idea. Solid, Vue, and Angular signals prove that every day. If you want maximum ergonomics and a mature ecosystem, those are excellent choices.

Beat is for a different kind of developer. The kind who wants to open DevTools, look at a DOM update, and trace it back to a single `.set()` call. The kind who'd rather write an explicit subscription than wonder why a computed value recalculated. The kind who believes that **understanding your code should never require understanding the framework's hidden behavior.**

If that sounds like you, welcome.

## At a glance

| | Re-render model (React) | Auto-tracking (Vue, Solid, Angular) | Beat |
| - | - | - | - |
| Components | Re-execute on state change | Run once (Solid) or re-render (Vue) | Run once |
| DOM updates | Virtual DOM diff | Direct binding (Solid) or VDOM (Vue) | Direct binding |
| Reactivity | Manual dependency arrays | Automatic via proxies or signals | Explicit path subscriptions |
| Subscription scope | Component-level | Computation-level | Path-level |
| Dependency management | Arrays and memoization | Automatic | None |
