# Beat Existing App Setup

Use this guide if you already have an app and want to add Beat manually instead of starting from `create-beat`.

## 1. Install Packages

```sh
pnpm add @ochairo/beat @ochairo/pulse
```

Beat currently expects:

- Node `>=20`

## 2. Configure Vite

```ts
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  plugins: [createBeatVitePlugin()],
});
```

See [Compiler Contract](./compiler) for plugin options and lowering rules.

## 3. Configure TypeScript

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ochairo/beat"
  }
}
```

See [Compiler Contract](./compiler) for the full lowering contract.

## 4. Entry Point

```tsx
import { pulse } from "@ochairo/pulse";
import { For, createRoot } from "@ochairo/beat";

const count = pulse(0);
const items = pulse(["tea", "coffee"]);

const app = (
  <main>
    <h1>Beat</h1>
    <button onClick={() => count.set(count.get() + 1)}>
      count: {count}
    </button>
    <ul>
      <For each={items}>
        {(item) => <li>{item}</li>}
      </For>
    </ul>
  </main>
);

createRoot(document.getElementById("app")!).render(app);
```

## 5. Server-Side Rendering

Add SSR with two entry points and no framework changes. Install a server-side DOM:

```sh
pnpm add -D happy-dom
```

Replace `createRoot` with `hydrate` in your client entry:

```ts
// entry-client.ts
import { createRouter, hydrate } from "@ochairo/beat";

const router = createRouter({ routes, window });
hydrate(document.getElementById("app")!, <App router={router} />);
```

See [API — Server-Side Rendering](./api.md#server-side-rendering) for the full `entry-server.ts` pattern, `renderToString`, and `waitForRouter`.

## 6. Next Steps

- [Getting Started](./quick-start)
- [API](./api)
- [Compiler Contract](./compiler)
