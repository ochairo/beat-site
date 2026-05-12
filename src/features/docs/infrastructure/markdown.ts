import { Marked } from "marked";

const marked = new Marked();

const MARKDOWN_STYLE = [
  "line-height:1.7",
  "color:var(--beat-ui-color-text)",
  "font-family:var(--beat-ui-font-family-sans,inherit)",
  "max-width:100%",
  "word-wrap:break-word",
].join(";");

const MARKDOWN_CSS = `
  .beat-md h1,
  .beat-md h2,
  .beat-md h3,
  .beat-md h4,
  .beat-md h5,
  .beat-md h6 {
    color: var(--beat-ui-color-text);
    font-weight: 600;
    line-height: 1.3;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
  .beat-md h1 { font-size: 1.5em; border-bottom: 1px solid var(--beat-ui-color-border); padding-bottom: 0.3em; margin-top: 0; margin-bottom: 0.25rem; }
  .beat-md h2 { font-size: 1.25em; border-bottom: 1px solid var(--beat-ui-color-border); padding-bottom: 0.3em; }
  .beat-md h3 { font-size: 1.25em; }
  .beat-md h4 { font-size: 1em; }

  .beat-md p { margin: 0.8em 0; }

  .beat-md a {
    color: var(--beat-ui-color-primary);
    text-decoration: none;
  }
  .beat-md a:hover {
    text-decoration: underline;
  }

  .beat-md strong { color: var(--beat-ui-color-text); font-weight: 600; }

  .beat-md code {
    background: var(--beat-ui-color-background-subtle);
    color: var(--beat-ui-color-secondary);
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-size: 0.88em;
    font-family: var(
      --beat-ui-font-family-mono,
      'SF Mono',
      'Fira Code',
      'JetBrains Mono',
      monospace
    );
  }

  .beat-md pre {
    margin: 1em 0;
  }
  .beat-md pre code {
    background: none;
    color: var(--beat-ui-color-text);
    padding: 0;
    border-radius: 0;
    font-size: 0.88em;
    line-height: 1.6;
  }

  .beat-md blockquote {
    border-left: 3px solid var(--beat-ui-color-primary);
    margin: 1em 0;
    padding: 0.5em 1em;
    color: var(--beat-ui-color-text-muted);
    background: var(--beat-ui-color-background-subtle);
    border-radius: 0 6px 6px 0;
  }
  .beat-md blockquote p { margin: 0.3em 0; }

  .beat-md ul, .beat-md ol {
    padding-left: 1.8em;
    margin: 0.8em 0;
  }
  .beat-md li { margin: 0.3em 0; }
  .beat-md li::marker { color: var(--beat-ui-color-text-muted); }

  .beat-md hr {
    border: none;
    border-top: 1px solid var(--beat-ui-color-border);
    margin: 1.5em 0;
  }

  .beat-md table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
  }
  .beat-md th {
    text-align: left;
    padding: 0.6em 1em;
    border-bottom: 2px solid var(--beat-ui-color-border-strong);
    color: var(--beat-ui-color-text);
    font-weight: 600;
    font-size: 0.88em;
  }
  .beat-md td {
    padding: 0.5em 1em;
    border-bottom: 1px solid var(--beat-ui-color-border);
    color: var(--beat-ui-color-text-muted);
    font-size: 0.88em;
  }
  .beat-md tr:hover td {
    background: var(--beat-ui-color-background-subtle);
  }

  .beat-md img {
    max-width: 100%;
    border-radius: 8px;
  }

  .beat-md-mermaid {
    display: flex;
    justify-content: center;
    margin: 1.5em 0;
  }
  .beat-md-mermaid svg {
    max-width: 100%;
    height: auto;
  }
`;

let styleInjected = false;

function injectMarkdownStyles(): void {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement("style");
  style.textContent = MARKDOWN_CSS;
  document.head.appendChild(style);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function addHeadingIds(container: HTMLElement): void {
  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  for (const heading of headings) {
    if (!heading.id) {
      heading.id = slugify(heading.textContent ?? "");
    }
  }
}

export function renderMarkdown(
  content: string,
  onRender?: (container: HTMLElement) => void,
): HTMLElement {
  injectMarkdownStyles();

  const html = marked.parse(content, { async: false }) as string;
  const container = document.createElement("div");
  container.className = "beat-md";
  container.style.cssText = MARKDOWN_STYLE;
  container.innerHTML = html;

  addHeadingIds(container);

  if (onRender) {
    onRender(container);
  }

  return container;
}
