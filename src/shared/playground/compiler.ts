import * as esbuild from "esbuild-wasm";

let initialized = false;
let initializing: Promise<void> | undefined;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;

  if (initializing) {
    await initializing;
    return;
  }

  initializing = esbuild
    .initialize({
      wasmURL: import.meta.env.BASE_URL + "playground/esbuild.wasm",
    })
    .then(() => {
      initialized = true;
    });

  await initializing;
}

const BEAT_UI_COMPONENTS = [
  "Badge",
  "Button",
  "DatePicker",
  "Card",
  "CheckBox",
  "CodeBlock",
  "DataGrid",
  "DateInput",
  "Dialog",
  "Dropdown",
  "Input",
  "Loading",
  "MultiSelect",
  "Notification",
  "AreaChart",
  "BarChart",
  "LineChart",
  "NumberInput",
  "PieChart",
  "RadioButton",
  "RadioGroup",
  "ScatterPlot",
  "Select",
  "SideMenu",
  "Sparkline",
  "Switch",
  "Tab",
  "TextArea",
  "TextInput",
  "TimeInput",
  "TimePicker",
] as const;

const BEAT_UI_ICONS = [
  "IconArrowRight",
  "IconTreeChart",
  "IconAim",
  "IconRoute",
  "IconCrossArrowsToRight",
  "IconPlay",
  "IconReact",
  "IconPulse",
  "IconCode",
  "IconVue",
  "IconAngular",
  "IconTypeScript",
  "IconJavaScript",
  "IconCalendar",
  "IconCheck",
  "IconChevronDown",
  "IconChevronRight",
  "IconClock",
  "IconClose",
  "IconCopy",
  "IconEdit",
  "IconError",
  "IconExternalLink",
  "IconEye",
  "IconGithub",
  "IconInfo",
  "IconLink",
  "IconMenu",
  "IconMoon",
  "IconPackage",
  "IconPlus",
  "IconSearch",
  "IconSettings",
  "IconSuccess",
  "IconSun",
  "IconTerminal",
  "IconTrash",
  "IconWarning",
] as const;

function wrapUserCode(code: string): string {
  const importLines: string[] = [];
  const bodyLines: string[] = [];

  for (const line of code.split("\n")) {
    if (/^\s*import\s/.test(line)) {
      importLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  const body = bodyLines.join("\n").trim();
  const hasReturn = /\breturn\b/.test(body);
  const fnBody = hasReturn ? body : `return (<>${body}</>)`;

  return [
    `import { component, For, onCleanup, onMount, Show } from "@ochairo/beat";`,
    `import { render } from "@ochairo/beat";`,
    `import { derived, pulse } from "@ochairo/pulse";`,
    `import { ${BEAT_UI_COMPONENTS.join(", ")} } from "@ochairo/beat-ui";`,
    `import { ${BEAT_UI_ICONS.join(", ")} } from "@ochairo/beat-ui";`,
    ...importLines,
    ``,
    `const App = component(() => {`,
    fnBody,
    `});`,
    ``,
    `render(document.getElementById("root"), App());`,
  ].join("\n");
}

export interface CompileResult {
  readonly ok: true;
  readonly code: string;
}

export interface CompileError {
  readonly ok: false;
  readonly error: string;
}

export type CompileOutput = CompileResult | CompileError;

export async function compile(userCode: string): Promise<CompileOutput> {
  try {
    await ensureInitialized();

    const wrapped = wrapUserCode(userCode);

    const result = await esbuild.transform(wrapped, {
      loader: "tsx",
      jsx: "automatic",
      jsxImportSource: "@ochairo/beat",
      target: "es2020",
      format: "esm",
    });

    return { ok: true, code: result.code };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
