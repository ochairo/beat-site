import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/playground");
const require = createRequire(import.meta.url);
const beatEntry = require.resolve("@ochairo/beat");

// Keep the existing playground-only DOM alias. Beat has no public DOM subpath,
// so this one legacy entry depends on a fixed member of the locked artifact.
const legacyDomEntry = resolve(dirname(beatEntry), "dom.js");
if (!existsSync(legacyDomEntry)) {
  throw new Error("The installed @ochairo/beat package is missing the legacy playground DOM entry.");
}

const beatExternals = [
  "@ochairo/beat",
  "@ochairo/beat/jsx-runtime",
  "@ochairo/beat/jsx-dev-runtime",
  "@ochairo/pulse",
];

const bundles = [
  {
    entryPoints: [require.resolve("@ochairo/pulse")],
    outfile: `${out}/pulse.js`,
    external: [],
  },
  {
    entryPoints: [beatEntry],
    outfile: `${out}/beat.js`,
    external: ["@ochairo/pulse"],
  },
  {
    entryPoints: [require.resolve("@ochairo/beat/jsx-runtime")],
    outfile: `${out}/beat-jsx-runtime.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
  },
  {
    // Preserve the existing playground alias using Beat's public exports.
    stdin: {
      contents: 'export { createRoot, hydrate, render } from "@ochairo/beat";',
      sourcefile: "playground-render.js",
      resolveDir: root,
    },
    outfile: `${out}/beat-render.js`,
    external: ["@ochairo/beat"],
  },
  {
    entryPoints: [legacyDomEntry],
    outfile: `${out}/beat-dom.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
  },
  {
    entryPoints: [require.resolve("@ochairo/beat-ui")],
    outfile: `${out}/beat-ui.js`,
    external: beatExternals,
  },
];

mkdirSync(out, { recursive: true });
for (const bundle of bundles) {
  await build({
    ...bundle,
    bundle: true,
    format: "esm",
    minify: true,
  });
  console.log(`built ${bundle.outfile.replace(root + "/", "")}`);
}

// Both assets come from the same locked packages used by the site's JS clients.
copyFileSync(require.resolve("@ochairo/beat-ui/style.css"), resolve(out, "beat-ui.css"));
copyFileSync(require.resolve("esbuild-wasm/esbuild.wasm"), resolve(out, "esbuild.wasm"));
console.log("copied playground CSS and WASM from installed packages");
