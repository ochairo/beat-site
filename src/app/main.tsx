import { Outlet, render } from "@ochairo/beat";
import { ThemeRoot } from "@ochairo/beat-ui";
import "@ochairo/beat-ui/style.css";

import { router } from "./router";
import { themeController } from "../shared/theme";
import css from "./main.module.css";

themeController.applyTo(document.documentElement);
document.documentElement.style.background = "var(--beat-ui-color-background)";

const app = (
  <ThemeRoot controller={themeController}>
    <div class={css["root"]!}>
      <Outlet router={router} />
    </div>
  </ThemeRoot>
);

render(document.getElementById("app")!, app);
