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
  // primitives
  "AreaChart",
  "Badge",
  "BarChart",
  "Button",
  "Card",
  "CheckBox",
  "CodeBlock",
  "HlAreaChart",
  "HlBadge",
  "HlBarChart",
  "HlButton",
  "HlCard",
  "HlCheckBox",
  "HlCheckbox",
  "HlCodeBlock",
  "HlInput",
  "HlLineChart",
  "HlLoading",
  "HlPieChart",
  "HlRadioButton",
  "HlScatterPlot",
  "HlSparkline",
  "HlSlider",
  "HlSwitch",
  "HlTextArea",
  "Input",
  "LineChart",
  "Loading",
  "PieChart",
  "RadioButton",
  "ScatterPlot",
  "Sparkline",
  "Slider",
  "Switch",
  "TextArea",
  // composites
  "AppShell",
  "DateInput",
  "DatePicker",
  "DateRangeInput",
  "DateRangePicker",
  "Dialog",
  "Dropdown",
  "Dropbox",
  "HlAppShell",
  "HlDateInput",
  "HlDatePicker",
  "HlDateRangeInput",
  "HlDateRangePicker",
  "HlDialog",
  "HlDropdown",
  "HlDropbox",
  "HlModal",
  "HlMultiSelect",
  "HlNotification",
  "HlNumberInput",
  "HlPopover",
  "HlRadioGroup",
  "HlSearchInput",
  "HlSelect",
  "Sheet",
  "SheetBody",
  "SheetCell",
  "SheetColumnHeader",
  "SheetHeader",
  "SheetRoot",
  "SheetRow",
  "SheetRowHeader",
  "createSheetController",
  "HlSideMenu",
  "HlTab",
  "HlTextInput",
  "HlTimeInput",
  "HlTimePicker",
  "Modal",
  "MultiSelect",
  "Notification",
  "NumberInput",
  "RadioGroup",
  "SearchInput",
  "Select",
  "SideMenu",
  "Tab",
  "TextInput",
  "TimeInput",
  "TimePicker",
] as const;

const BEAT_UI_ICONS = [
  "IconAim",
  "IconAngular",
  "IconArrowDown",
  "IconArrowLeft",
  "IconArrowRight",
  "IconArrowUp",
  "IconCalendar",
  "IconCheck",
  "IconChevronDown",
  "IconChevronLeft",
  "IconChevronRight",
  "IconChevronUp",
  "IconClock",
  "IconClose",
  "IconCode",
  "IconCopy",
  "IconCrossArrowsToRight",
  "IconEdit",
  "IconError",
  "IconExternalLink",
  "IconEye",
  "IconEyeOff",
  "IconGithub",
  "IconInfo",
  "IconJavaScript",
  "IconLink",
  "IconMenu",
  "IconMinus",
  "IconMoon",
  "IconMoreHorizontal",
  "IconMoreVertical",
  "IconPackage",
  "IconPlay",
  "IconPause",
  "IconPlus",
  "IconPulse",
  "IconReact",
  "IconRoute",
  "IconSearch",
  "IconSettings",
  "IconSuccess",
  "IconSun",
  "IconTerminal",
  "IconTrash",
  "IconTreeChart",
  "IconTypeScript",
  "IconVue",
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
