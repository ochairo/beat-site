# Compiler

`@ochairo/beat/vite-plugin` configures Beat as the JSX import source for Vite and lowers intrinsic binding syntax into runtime props.

## Setup

**TypeScript (`tsconfig.json`):**

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ochairo/beat"
  }
}
```

**Vite (`vite.config.ts`):**

```ts
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  plugins: [createBeatVitePlugin()],
});
```

## Lowering Rules

### Beat Runtime Components

Control-flow and routing components — `Show`, `For`, `Link`, `Outlet` — stay on the normal JSX runtime path and are not transformed by the plugin.

### Intrinsic Bindings

The plugin lowers these bindings on lowercase DOM tags:

- `text={value}`
- `class:name={value}`
- `style:name={value}`
- `prop:name={value}`

```tsx
<button text={label} class:active={isActive} prop:value={value} />
```

Style property names containing non-alphanumeric characters (e.g. hyphens) are quoted as string keys:

```tsx
<span style:background-color={bgColor} />
// → __beatStyleBindings={{ "background-color": bgColor }}
```

### Single-Child Text Lowering

A single child — expression or plain text — on a lowercase intrinsic tag is lowered into the text-binding path, provided no explicit `text={...}` is already present:

```tsx
<button>{label}</button>   // → __beatText={label}
<button>hello</button>    // → __beatText={"hello"}
```

This does not apply when there are multiple children.
