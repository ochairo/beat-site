import mermaid from "mermaid";

let initialized = false;

function initMermaid(): void {
  if (initialized) return;
  initialized = true;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    fontFamily: "system-ui, -apple-system, sans-serif",
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
