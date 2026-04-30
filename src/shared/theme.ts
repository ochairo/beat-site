import {
  createThemeController,
  type BeatUiThemeController,
} from "@ochairo/beat-ui";

export const themeController: BeatUiThemeController = createThemeController({
  initialPreference: "system",
  storageKey: "beat-site-theme",
});
