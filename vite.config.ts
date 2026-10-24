import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

// Beat does not export its package.json; read the installed direct dependency.
const beatPackage: unknown = JSON.parse(
  readFileSync(
    new URL("./node_modules/@ochairo/beat/package.json", import.meta.url),
    "utf8",
  ),
);

if (
  typeof beatPackage !== "object" ||
  beatPackage === null ||
  !("name" in beatPackage) ||
  beatPackage.name !== "@ochairo/beat" ||
  !("version" in beatPackage) ||
  typeof beatPackage.version !== "string" ||
  beatPackage.version.trim() === ""
) {
  throw new Error("The installed @ochairo/beat package has no valid version.");
}

export default defineConfig({
  base: "/beat-site/",
  define: {
    __BEAT_VERSION__: JSON.stringify(beatPackage.version),
  },
  plugins: [createBeatVitePlugin()],
});
