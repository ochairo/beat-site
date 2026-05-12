import mermaid from "mermaid";

function getSansFontFamily(): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue("--beat-ui-font-family-sans")
      .trim() || '"Avenir Next", "Segoe UI Variable", "SF Pro Text", sans-serif'
  );
}

function isDarkMode(): boolean {
  return (
    document.documentElement.dataset["beatUiMode"] === "dark" ||
    (document.documentElement.dataset["beatUiMode"] === undefined &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function initMermaid(): void {
  mermaid.initialize({
    startOnLoad: false,
    theme: isDarkMode() ? "dark" : "default",
    fontFamily: getSansFontFamily(),
  });
}

export async function renderMermaidBlocks(
  container: HTMLElement,
): Promise<void> {
  const codeBlocks = container.querySelectorAll("pre code.language-mermaid");
  if (codeBlocks.length === 0) return;

  initMermaid();

  for (let i = 0; i < codeBlocks.length; i++) {
    const codeEl = codeBlocks[i]!;
    const preEl = codeEl.parentElement;
    if (!preEl) continue;

    const source = codeEl.textContent ?? "";
    const id = `mermaid-${crypto.randomUUID()}`;

    const { svg } = await mermaid.render(id, source);

    const wrapper = document.createElement("div");
    wrapper.className = "beat-md-mermaid";
    wrapper.innerHTML = svg;

    preEl.replaceWith(wrapper);
  }
}
