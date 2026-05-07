import { build } from "esbuild";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, copyFileSync } from "fs";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const out = resolve(root, "public/playground");
const require = createRequire(import.meta.url);

function siblingOrInstalled(pkg, srcRelPath, tsconfigRelPath) {
  const siblingDir = resolve(root, `../${pkg}`);
  if (existsSync(siblingDir)) {
    return {
      entryPoint: resolve(siblingDir, srcRelPath),
      tsconfig: resolve(siblingDir, tsconfigRelPath),
    };
  }
  // Fall back to installed package dist
  const pkgMain = require.resolve(`@ochairo/${pkg}`);
  // For sub-paths like jsx-runtime, render, dom — derive from package exports
  const pkgDir = resolve(pkgMain, "../../");
  const distFile = resolve(
    pkgDir,
    srcRelPath.replace(/^src\//, "dist/").replace(/\.ts$/, ".js"),
  );
  return {
    entryPoint: existsSync(distFile) ? distFile : pkgMain,
    tsconfig: undefined,
  };
}

const beatExternals = [
  "@ochairo/beat",
  "@ochairo/beat/jsx-runtime",
  "@ochairo/beat/jsx-dev-runtime",
  "@ochairo/pulse",
];

const bundles = [
  {
    ...siblingOrInstalled("pulse", "src/index.ts", "tsconfig.json"),
    outfile: `${out}/pulse.js`,
    external: [],
  },
  {
    ...siblingOrInstalled("beat", "src/index.ts", "tsconfig.json"),
    outfile: `${out}/beat.js`,
    external: ["@ochairo/pulse"],
  },
  {
    ...siblingOrInstalled("beat", "src/jsx-runtime.ts", "tsconfig.json"),
    outfile: `${out}/beat-jsx-runtime.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
  },
  {
    ...siblingOrInstalled("beat", "src/render.ts", "tsconfig.json"),
    outfile: `${out}/beat-render.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
  },
  {
    ...siblingOrInstalled("beat", "src/dom.ts", "tsconfig.json"),
    outfile: `${out}/beat-dom.js`,
    external: ["@ochairo/beat", "@ochairo/pulse"],
  },
  {
    ...siblingOrInstalled("beat-ui", "src/index.ts", "tsconfig.json"),
    outfile: `${out}/beat-ui.js`,
    external: beatExternals,
    jsxImportSource: "@ochairo/beat",
  },
];

for (const {
  entryPoint,
  outfile,
  external,
  tsconfig,
  jsxImportSource,
} of bundles) {
  await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    outfile,
    external,
    minify: true,
    jsx: "automatic",
    ...(jsxImportSource ? { jsxImportSource } : {}),
    ...(tsconfig ? { tsconfig } : {}),
  });
  console.log(`built ${outfile.replace(root + "/", "")}`);
}

// Copy beat-ui CSS
const beatUiSiblingDir = resolve(root, "../beat-ui");
let beatUiCssSrc;
if (existsSync(beatUiSiblingDir)) {
  beatUiCssSrc = resolve(beatUiSiblingDir, "dist/index.css");
} else {
  const pkgMain = require.resolve("@ochairo/beat-ui");
  beatUiCssSrc = resolve(pkgMain, "../../dist/index.css");
}
if (existsSync(beatUiCssSrc)) {
  copyFileSync(beatUiCssSrc, resolve(out, "beat-ui.css"));
  console.log("built public/playground/beat-ui.css");
} else {
  console.warn("beat-ui CSS not found at", beatUiCssSrc);
}
