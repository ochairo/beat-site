import { component, type BeatJsxChild } from "@ochairo/beat";
import {
  AppShell,
  IconMoon,
  IconSun,
  Switch,
  type AppShellSidebarMode,
} from "@ochairo/beat-ui";

import { themeController } from "../lib/theme/theme";
import css from "./Layout.module.css";

export interface SiteLayoutProps {
  readonly children: BeatJsxChild;
  readonly sidebar?: BeatJsxChild;
  readonly sidebarMode?: AppShellSidebarMode;
  readonly contentStyle?: string;
}

const brand = "Beat";

export const SiteLayout = component<SiteLayoutProps>((props): BeatJsxChild => {
  const headerRight = (
    <div class={css["headerRight"]!}>
      <a href="/beat-site/docs/motivation" class={css["navLink"]!}>
        Docs
      </a>
      <a href="/beat-site/components" class={css["navLink"]!}>
        Components
      </a>
      <a href="/beat-site/playground" class={css["navLink"]!}>
        Playground
      </a>
      <a
        href="https://github.com/ochairo/beat"
        target="_blank"
        rel="noopener noreferrer"
        class={css["navLink"]!}
      >
        GitHub
      </a>
      <Switch
        defaultChecked={themeController.mode.get() === "dark"}
        onCheckedChange={(checked) =>
          themeController.setMode(checked ? "dark" : "light")
        }
        checkedIcon={<IconMoon size={12} />}
        uncheckedIcon={<IconSun size={12} />}
        ariaLabel="Toggle theme"
      />
    </div>
  );

  return (
    <AppShell
      brand={brand}
      brandHref="/beat-site/"
      headerRight={headerRight}
      sidebar={props.sidebar}
      sidebarMode={props.sidebarMode ?? "none"}
      {...(props.contentStyle !== undefined
        ? { styles: { content: props.contentStyle } }
        : {})}
    >
      {props.children}
    </AppShell>
  );
});
