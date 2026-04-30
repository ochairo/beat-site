import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  base: "/beat/",
  plugins: [createBeatVitePlugin()],
});
