# Theming

Beat UI ships two built-in themes: `TOKYO_NIGHT_THEME` (dark) and `TOKYO_DAY_THEME` (light).

## ThemeRoot

`ThemeRoot` is the simplest way to apply a theme. It wraps its children in a `div` and applies theme CSS variables to it.

```tsx
import { ThemeRoot } from "@ochairo/beat-ui";

<ThemeRoot>
  <App />
</ThemeRoot>
```

Pass a `controller` to make the theme reactive:

```tsx
import { createThemeController, ThemeRoot } from "@ochairo/beat-ui";

const controller = createThemeController();

<ThemeRoot controller={controller}>
  <App />
</ThemeRoot>
```

## createThemeController

```ts
createThemeController(options?: CreateThemeControllerOptions): BeatUiThemeController
```

Creates a reactive theme controller. The controller exposes:

- `mode` — current resolved mode (`"light"` or `"dark"`)
- `preference` — current preference (`"light"`, `"dark"`, or `"system"`)
- `theme` — current `BeatUiThemeDefinition`
- `setMode(mode)` — set mode directly
- `setPreference(preference)` — set preference (use `"system"` to follow the OS)
- `toggleMode()` — toggle between light and dark
- `applyTo(element)` — apply and subscribe theme to a DOM element, returns cleanup
- `destroy()` — tear down subscriptions

```ts
import { createThemeController } from "@ochairo/beat-ui";

const controller = createThemeController({
  initialPreference: "system",
  storageKey: "my-app-theme",
});

controller.setMode("light");
controller.toggleMode();
```

`storageKey` persists the preference to `localStorage`.

## applyThemeToElement

Applies a theme snapshot to a DOM element without reactivity:

```ts
import { applyThemeToElement, TOKYO_NIGHT_THEME } from "@ochairo/beat-ui";

applyThemeToElement(document.documentElement, TOKYO_NIGHT_THEME);
```

## Custom themes

Use `createThemeDefinition` to derive a custom theme from a base. Override only the tokens you need — the rest inherit from the base theme.

```ts
import { createThemeDefinition, TOKYO_NIGHT_THEME } from "@ochairo/beat-ui";

const myDark = createThemeDefinition({
  name: "my-dark",
  mode: "dark",
  baseTheme: TOKYO_NIGHT_THEME,
  tokens: {
    primary: "#ff6b6b",
    primaryHover: "#ff8787",
    primaryActive: "#e05555",
    primaryText: "#ffffff",
  },
});
```

If `baseTheme` is omitted, it defaults to `TOKYO_NIGHT_THEME` for `"dark"` and `TOKYO_DAY_THEME` for `"light"`.

## CSS variables

All theme tokens are applied as CSS custom properties under the `--beat-ui-color-*` namespace. The full mapping is exported as `BEAT_UI_THEME_VARIABLES`:

```ts
import { BEAT_UI_THEME_VARIABLES } from "@ochairo/beat-ui";

BEAT_UI_THEME_VARIABLES.primary // "--beat-ui-color-primary"
```
