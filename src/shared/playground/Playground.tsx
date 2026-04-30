import { component, onMount, Show, type BeatJsxChild } from "@ochairo/beat";
import { derived, pulse, type Pulse } from "@ochairo/pulse";
import { CodeBlock } from "@ochairo/beat-ui";

import { compile } from "./compiler";
import css from "./Playground.module.css";

export interface PlaygroundProps {
  readonly code: Pulse<string>;
  readonly label?: string;
  readonly height?: string;
  readonly highlight?: (code: string) => string;
}

let playgroundCounter = 0;

function getThemeCss(): string {
  const el = document.documentElement;
  const vars: string[] = [];
  for (let i = 0; i < el.style.length; i++) {
    const prop = el.style.item(i);
    if (prop.startsWith("--beat-ui")) {
      vars.push(`${prop}:${el.style.getPropertyValue(prop)}`);
    }
  }
  const colorScheme = el.style.colorScheme || "dark";
  return `:root{${vars.join(";")};color-scheme:${colorScheme}}`;
}

interface PlaygroundModules {
  readonly [specifier: string]: string;
}

let modulesPromise: Promise<PlaygroundModules> | undefined;

function loadModules(): Promise<PlaygroundModules> {
  if (modulesPromise) return modulesPromise;

  const base = import.meta.env.BASE_URL + "playground/";
  const entries: Array<[string, string]> = [
    ["@ochairo/pulse", "pulse.js"],
    ["@ochairo/beat", "beat.js"],
    ["@ochairo/beat/jsx-runtime", "beat-jsx-runtime.js"],
    ["@ochairo/beat/jsx-dev-runtime", "beat-jsx-runtime.js"],
    ["@ochairo/beat/render", "beat-render.js"],
    ["@ochairo/beat/dom", "beat-dom.js"],
    ["@ochairo/beat-ui", "beat-ui.js"],
  ];

  const seen = new Set<string>();
  const uniqueFiles = entries.filter(([, file]) => {
    if (seen.has(file)) return false;
    seen.add(file);
    return true;
  });

  modulesPromise = Promise.all(
    uniqueFiles.map(([, file]) => fetch(base + file).then((r) => r.text())),
  ).then((texts) => {
    const fileToText = new Map<string, string>();
    uniqueFiles.forEach(([, file], i) => fileToText.set(file, texts[i]!));

    const modules: Record<string, string> = {};
    for (const [specifier, file] of entries) {
      modules[specifier] = fileToText.get(file)!;
    }
    return modules;
  });

  return modulesPromise;
}

function buildSrcdoc(
  compiledJs: string,
  height: string,
  modules: PlaygroundModules,
): string {
  const themeCss = getThemeCss();

  const modulesJson = JSON.stringify(modules).replace(/<\//g, "<\\/");
  const userCodeJson = JSON.stringify(compiledJs).replace(/<\//g, "<\\/");

  return [
    `<!DOCTYPE html>`,
    `<html>`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<style>`,
    themeCss,
    `*{margin:0;padding:0;box-sizing:border-box}`,
    `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`,
    `background:transparent;padding:0.75rem;min-height:${height};`,
    `display:flex;flex-wrap:wrap;align-items:flex-start;gap:0.75rem}`,
    `</style>`,
    `</head>`,
    `<body>`,
    `<div id="root" style="display:contents"></div>`,
    `<script>`,
    `(function(){`,
    `var m=${modulesJson};`,
    `var u={};for(var k in m)u[k]=URL.createObjectURL(new Blob([m[k]],{type:"text/javascript"}));`,
    `var s=document.createElement("script");s.type="importmap";`,
    `s.textContent=JSON.stringify({imports:u});`,
    `document.currentScript.after(s);`,
    `var e=document.createElement("script");e.type="module";`,
    `e.textContent=${userCodeJson};`,
    `document.body.appendChild(e);`,
    `})()`,
    `<\/script>`,
    `</body>`,
    `</html>`,
  ].join("\n");
}

export const Playground = component<PlaygroundProps>((props): BeatJsxChild => {
  const playgroundId = `playground-${++playgroundCounter}`;
  const errorText = pulse("");
  const hasError = derived(errorText, (v) => v.length > 0);
  const iframeRef = { current: undefined as HTMLIFrameElement | undefined };
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const height = props.height ?? "80px";

  const updateOutput = async (code: string): Promise<void> => {
    errorText.set("");

    const [result, modules] = await Promise.all([compile(code), loadModules()]);

    if (!result.ok) {
      errorText.set(result.error);
      return;
    }

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = buildSrcdoc(result.code, height, modules);
    }
  };

  const debouncedUpdate = (code: string): void => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      updateOutput(code);
    }, 400);
  };

  props.code.on((event) => {
    debouncedUpdate(event.currentValue);
  });

  onMount(() => {
    updateOutput(props.code.get());
  });

  const handleIframeRef = (el: Element): void => {
    iframeRef.current = el as HTMLIFrameElement;
  };

  return (
    <div>
      <iframe
        ref={handleIframeRef}
        sandbox="allow-scripts"
        class={css["output"]!}
        style={`height:${height}`}
        title="Playground output"
      />
      <Show when={hasError}>
        <pre class={css["error"]!} text={errorText} />
      </Show>
      <CodeBlock
        id={playgroundId}
        code={props.code}
        label={props.label ?? "TSX"}
        editable
        {...(props.highlight ? { highlight: props.highlight } : {})}
        style="border-radius:0;border-left:none;border-right:none;border-bottom:none"
      />
    </div>
  );
});
