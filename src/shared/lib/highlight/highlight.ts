import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import cssLang from "highlight.js/lib/languages/css";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("javascript", typescript);
hljs.registerLanguage("js", typescript);
hljs.registerLanguage("jsx", typescript);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("css", cssLang);

hljs.registerLanguage("tree", () => ({
  name: "tree",
  case_insensitive: false,
  contains: [
    {
      className: "comment",
      begin: /#/,
      end: /$/,
    },
    {
      className: "string",
      begin: /(?<=[─\s])[\w[\].-]+\.\w+/,
    },
    {
      className: "title",
      begin: /(?<=[─\s])[\w[\].-]+\//,
    },
  ],
}));

const HIGHLIGHT_CSS = `
  .hljs-keyword { color: var(--beat-ui-color-secondary); }
  .hljs-string { color: var(--beat-ui-color-success); }
  .hljs-comment { color: var(--beat-ui-color-text-muted); font-style: italic; }
  .hljs-number { color: var(--beat-ui-color-warning); }
  .hljs-built_in { color: var(--beat-ui-color-info); }
  .hljs-type,
  .hljs-title.class_ { color: var(--beat-ui-color-primary); }
  .hljs-title.function_ { color: var(--beat-ui-color-primary); }
  .hljs-attr { color: var(--beat-ui-color-warning); }
  .hljs-params { color: var(--beat-ui-color-text); }
  .hljs-literal { color: var(--beat-ui-color-info); }
  .hljs-meta { color: var(--beat-ui-color-text-muted); }
  .hljs-punctuation { color: var(--beat-ui-color-text-muted); }
  .hljs-tag { color: var(--beat-ui-color-secondary); }
  .hljs-name { color: var(--beat-ui-color-primary); }
  .hljs-attribute { color: var(--beat-ui-color-warning); }
  .hljs-selector-class { color: var(--beat-ui-color-primary); }
  .hljs-selector-tag { color: var(--beat-ui-color-secondary); }
  .hljs-property { color: var(--beat-ui-color-text); }
  .hljs-variable { color: var(--beat-ui-color-text); }

  .language-tree .hljs-title { color: #7ec8e3; font-weight: 600; }
  .language-tree .hljs-string { color: #c3e88d; }
  .language-tree .hljs-comment { color: #7f8c8d; font-style: italic; }
`;

let injected = false;

function injectHighlightStyles(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = HIGHLIGHT_CSS;
  document.head.appendChild(style);
}

export function highlightCode(code: string, language: string): string {
  injectHighlightStyles();
  return hljs.highlight(code, { language }).value;
}

export function highlightCodeBlocks(container: HTMLElement): void {
  injectHighlightStyles();
  const codeElements = container.querySelectorAll("pre code");
  for (const el of codeElements) {
    hljs.highlightElement(el as HTMLElement);
  }
}
