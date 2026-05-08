# Basics

## Install

```sh
pnpm add @ochairo/beat-ui
```

Import the CSS in your entry point:

```ts
import "@ochairo/beat-ui/style.css";
```

## Apply a theme

Beat UI requires a theme to be applied to a root element before components render correctly. Use `ThemeRoot` to wrap your app:

```tsx
import { ThemeRoot } from "@ochairo/beat-ui";

createRoot(document.getElementById("app")!).render(
  <ThemeRoot>
    <App />
  </ThemeRoot>
);
```

`ThemeRoot` applies the default dark theme (`TOKYO_NIGHT_THEME`) to its root element.

## Use components

```tsx
import { Button, Badge } from "@ochairo/beat-ui";

<Button tone="primary" onPress={() => {}}>Save</Button>
<Badge tone="success">Done</Badge>
```

All components are named exports from `@ochairo/beat-ui`.
