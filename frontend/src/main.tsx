import { h, render } from "omi";
import "./editor";
import type { Atelier } from "./editor";
import type { Geometry } from "./types";
const canvas = document.querySelector<HTMLCanvasElement>("#sculpture")!,
  stage = document.querySelector<HTMLElement>(".stage")!,
  editorRoot = document.querySelector<HTMLElement>("#atelier-root")!;
let renderer: ReturnType<typeof import("./scene").createStage> | undefined,
  latest: Geometry | undefined,
  loading = false;
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
const toggle = document.querySelector<HTMLButtonElement>("#motion-toggle")!;
function motion() {
  toggle.setAttribute("aria-pressed", String(paused));
  toggle.textContent = paused ? "Movimento pausado" : "Pausar movimento";
  document.documentElement.classList.toggle("reduced-motion", paused);
  renderer?.pause(paused);
}
motion();
toggle.addEventListener("click", () => {
  paused = !paused;
  motion();
});
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  (e) => {
    paused = e.matches;
    motion();
  },
);
window.addEventListener("vertice:geometry", async (e) => {
  latest = (e as CustomEvent<Geometry>).detail;
  if (renderer) {
    renderer.geometry(latest);
    return;
  }
  if (loading) return;
  loading = true;
  try {
    const { createStage } = await import("./scene");
    renderer = createStage(canvas, latest);
    renderer.pause(paused);
    document.documentElement.classList.add("webgl-ready");
    scroll();
  } catch {
    document.documentElement.classList.add("no-webgl");
    const text = document.querySelector<HTMLElement>("#scene-status");
    if (text)
      text.textContent =
        "Visualização estática. O ateliê e a exportação continuam disponíveis.";
  }
});
window.addEventListener("vertice:wire", (e) =>
  renderer?.wire((e as CustomEvent<boolean>).detail),
);
window.addEventListener("vertice:angle", () => renderer?.angle());
window.addEventListener("vertice:webgl-failed", () => {
  const text = document.querySelector<HTMLElement>("#scene-status");
  if (text)
    text.textContent =
      "A visualização 3D foi interrompida. Seus controles e peças continuam acessíveis.";
});
editorRoot.replaceChildren();
render(h("vertice-atelier", {}), editorRoot);
function editor() {
  return editorRoot.querySelector("vertice-atelier") as unknown as Atelier;
}
document
  .querySelectorAll<HTMLButtonElement>("[data-preset]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const a = editor(),
        preset = a.presets.find((p) => p.id === button.dataset.preset);
      if (preset) a.select(preset);
      document
        .querySelector("#atelier")
        ?.scrollIntoView({ behavior: paused ? "instant" : "smooth" });
    }),
  );
let ticking = false;
function scroll() {
  ticking = false;
  const y = window.scrollY,
    h = innerHeight,
    atelier = document.querySelector<HTMLElement>("#atelier")!,
    end = document.querySelector<HTMLElement>("#manifesto")!,
    editorTop = atelier.getBoundingClientRect().top,
    footerTop = end.getBoundingClientRect().top,
    p = Math.max(0, Math.min(1.5, y / (h * 2.6)));
  const entering = Math.max(0, Math.min(1, 1 - editorTop / h));
  const leaving = Math.max(0, Math.min(1, 1 - footerTop / (h * 0.75)));
  const shift = innerWidth > 760 ? -20 * entering : 0;
  stage.style.transform = `translateX(${shift}vw)`;
  stage.style.opacity = String(1 - leaving);
  stage.classList.toggle("editor-view", editorTop < h * 0.5);
  renderer?.progress(paused ? 0 : p);
  renderer?.visible(leaving < 0.99);
  document.documentElement.style.setProperty(
    "--journey",
    String(Math.min(1, y / (h * 1.5))),
  );
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight * 0.88)
      el.classList.add("is-revealed");
  });
  const label = document.querySelector<HTMLElement>("#chapter-number");
  if (label)
    label.textContent = editorTop < h * 0.5 ? "03" : y > h * 0.6 ? "02" : "01";
}
window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(scroll);
    }
  },
  { passive: true },
);
window.addEventListener("resize", scroll);
scroll();
if (new URL(location.href).searchParams.has("piece"))
  document.querySelector("#atelier")?.scrollIntoView({ behavior: "instant" });
window.addEventListener("pagehide", () => renderer?.dispose(), { once: true });
