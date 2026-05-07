import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, "public/playground");

const beatExternals = [
  "@ochairo/beat",
  "@ochairo/beat/jsx-runtime",
  "@ochairo/beat/jsx-dev-runtime",
  "@ochairo/pulse",
];

const bundles = [
  {
    entryPoints: [resolve(root, "../pulse/src/index.ts")],
    outfile: `${out}/pulse.js`,
    external: [],
    tsconfig: resolve(root, "../pulse/tsconfig.json"),
  },
  {
    entryPoints: [resolve(root, "../beat/src/index.ts")],
    outfile: `${out}/beat.js`,
    external: ["@ochairo/pulse"],
    tsconfig: resolve(root, "../beat/tsconfig.json"),
  },
  {
    entryPoints: [resolve(root, "../beat/src/jsx-runtime.ts")],
    outfile: `${out}/beat-jsx-runtime.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
    tsconfig: resolve(root, "../beat/tsconfig.json"),
  },
  {
    entryPoints: [resolve(root, "../beat/src/render.ts")],
    outfile: `${out}/beat-render.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
    tsconfig: resolve(root, "../beat/tsconfig.json"),
  },
  {
    entryPoints: [resolve(root, "../beat/src/dom.ts")],
    outfile: `${out}/beat-dom.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
    tsconfig: resolve(root, "../beat/tsconfig.json"),
  },
  {
    entryPoints: [resolve(root, "../beat-ui/src/index.ts")],
    outfile: `${out}/beat-ui.js`,
    // @ochairo/scales is bundled in (Sparkline dependency)
    external: beatExternals,
    tsconfig: resolve(root, "../beat-ui/tsconfig.json"),
    jsxImportSource: "@ochairo/beat",
  },
];

for (const {
  entryPoints,
  outfile,
  external,
  tsconfig,
  jsxImportSource,
} of bundles) {
  await build({
    entryPoints,
    bundle: true,
    format: "esm",
    outfile,
    external,
    minify: true,
    jsx: "automatic",
    ...(jsxImportSource ? { jsxImportSource } : {}),
    tsconfig,
  });
  console.log(`built ${outfile.replace(root + "/", "")}`);
}
