import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import "@babylonjs/core/Rendering/edgesRenderer";
import type { Geometry } from "./types";
export function createStage(canvas: HTMLCanvasElement, initial: Geometry) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
    stencil: false,
  });
  engine.setHardwareScalingLevel(Math.max(1, devicePixelRatio / 1.5));
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0, 0, 0, 0);
  scene.environmentIntensity = 1.2;
  scene.imageProcessingConfiguration.toneMappingEnabled = true;
  scene.imageProcessingConfiguration.exposure = 0.82;
  const camera = new ArcRotateCamera(
    "eye",
    -Math.PI / 2,
    Math.PI / 2,
    6.7,
    Vector3.Zero(),
    scene,
  );
  camera.minZ = 0.1;
  camera.fov = 0.72;
  const env = new HDRCubeTexture(
    "/media/studio-small-09.hdr",
    scene,
    128,
    false,
    true,
    false,
    true,
  );
  scene.environmentTexture = env;
  const key = new DirectionalLight("key", new Vector3(-1, -0.8, -1), scene);
  key.intensity = 3.1;
  key.diffuse = new Color3(0.85, 0.91, 1);
  const rim = new DirectionalLight("rim", new Vector3(1, 0.1, 1), scene);
  rim.intensity = 2.5;
  rim.diffuse = new Color3(1, 0.66, 0.42);
  const fill = new HemisphericLight("fill", new Vector3(0, 1, 0), scene);
  fill.intensity = 0.35;
  fill.groundColor = new Color3(0.15, 0.16, 0.2);
  const root = new TransformNode("gesture", scene);
  const parts: Mesh[] = [];
  const mesh = new Mesh("original", scene),
    material = new PBRMaterial("surface", scene);
  mesh.parent = root;
  mesh.material = material;
  material.backFaceCulling = true;
  material.environmentIntensity = 1.5;
  material.directIntensity = 1.2;
  let alpha = 0,
    phase = 0,
    wire = false,
    paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
    visible = true,
    targetScale = 1,
    scale = 0.92,
    last = performance.now(),
    angleOffset = 0,
    current: Geometry;
  function setGeometry(g: Geometry) {
    current = g;
    const data = new VertexData();
    data.positions = g.positions;
    data.indices = g.indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(g.positions, g.indices, normals);
    data.normals = normals;
    data.applyToMesh(mesh, true);
    for (const part of parts) part.dispose();
    parts.length = 0;
    // An exploded view explains the same server mesh. It never changes saved geometry.
    const chunkSize = g.indices.length / 8;
    for (let section = 0; section < 8; section++) {
      const part = new Mesh("section-" + section, scene);
      part.parent = root;
      part.material = material;
      const vertices: number[] = [],
        ns: number[] = [],
        faces: number[] = [],
        map = new Map<number, number>();
      for (let f = section * chunkSize; f < (section + 1) * chunkSize; f++) {
        const original = g.indices[f];
        if (!map.has(original)) {
          map.set(original, map.size);
          vertices.push(...g.positions.slice(original * 3, original * 3 + 3));
          ns.push(...normals.slice(original * 3, original * 3 + 3));
        }
        faces.push(map.get(original)!);
      }
      const vd = new VertexData();
      vd.positions = vertices;
      vd.normals = ns;
      vd.indices = faces;
      vd.applyToMesh(part);
      part.setEnabled(false);
      parts.push(part);
    }
    material.albedoColor = Color3.FromHexString(
      g.params.finish === "copper"
        ? "#d8a07e"
        : g.params.finish === "ceramic"
          ? "#e8e1d1"
          : "#dee6f1",
    );
    material.metallic = g.params.finish === "ceramic" ? 0.05 : 1;
    material.roughness = g.params.finish === "ceramic" ? 0.46 : 0.19;
    material.wireframe = wire;
    scale = 0.83;
  }
  setGeometry(initial);
  function render() {
    const now = performance.now(),
      dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!visible || document.hidden) return;
    if (!paused) alpha += dt * 0.085;
    const smooth = paused ? 1 : Math.min(1, dt * 7);
    scale += (targetScale - scale) * smooth;
    const small = innerWidth < 760;
    const targetAlpha =
        -Math.PI / 2 + Math.sin(phase * Math.PI) * 0.7 + angleOffset,
      targetBeta = Math.PI / 2 - 0.15 + Math.sin(phase * Math.PI * 1.5) * 0.28;
    camera.alpha += (targetAlpha - camera.alpha) * smooth;
    camera.beta += (targetBeta - camera.beta) * smooth;
    // Vertical FOV needs extra distance on a portrait viewport to preserve width.
    const radius = small ? 14 : Math.max(6.7, (innerHeight / innerWidth) * 12);
    camera.target.y += ((small ? 0.6 : 0) - camera.target.y) * smooth;
    camera.radius +=
      (radius - 1.35 * Math.sin(Math.min(phase, 1) * Math.PI) - camera.radius) *
      smooth;
    root.rotation.y = 0.16 + Math.sin(alpha) * 0.2;
    root.rotation.z = alpha * 0.24 + phase * 0.6;
    root.rotation.x = 0.18 + Math.sin(phase * Math.PI) * 0.4;
    root.scaling.setAll(scale);
    const expansion = paused
      ? 0
      : Math.sin(Math.max(0, Math.min(1, (phase - 0.2) / 0.85)) * Math.PI);
    mesh.setEnabled(expansion < 0.003);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i],
        a = ((i + 0.5) / 8) * Math.PI * 2;
      part.setEnabled(expansion >= 0.003);
      part.position.set(
        Math.cos(a) * expansion * 0.65,
        Math.sin(a) * expansion * 0.65,
        Math.sin(a * 2) * expansion * 0.38,
      );
    }
    env.rotationY = alpha * 0.35;
    scene.render();
  }
  engine.runRenderLoop(render);
  const resize = () => engine.resize();
  window.addEventListener("resize", resize);
  canvas.addEventListener("webglcontextlost", () => {
    document.documentElement.classList.remove("webgl-ready");
    window.dispatchEvent(new CustomEvent("vertice:webgl-failed"));
  });
  return {
    geometry: setGeometry,
    progress: (p: number) => {
      phase = p;
    },
    pause: (v: boolean) => {
      paused = v;
    },
    visible: (v: boolean) => {
      visible = v;
    },
    wire: (v: boolean) => {
      wire = v;
      material.wireframe = v;
    },
    angle: () => {
      angleOffset += Math.PI / 3;
    },
    dispose: () => {
      window.removeEventListener("resize", resize);
      engine.dispose();
    },
    get current() {
      return current;
    },
  };
}
