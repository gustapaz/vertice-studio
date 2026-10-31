import * as v from "valibot";
export class DomainError extends Error {
  constructor(code, message, status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
const integer = (min, max) =>
  v.pipe(v.number(), v.integer(), v.minValue(min), v.maxValue(max));
export const paramsSchema = v.strictObject({
  folds: integer(3, 9),
  torsion: integer(0, 4),
  tension: integer(0, 100),
  finish: v.picklist(["chrome", "copper", "ceramic"]),
});
export const titleSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.maxLength(48),
  v.check((s) => !/[\u0000-\u001f\u007f]/.test(s), "Sem controles no título."),
);
export const meshSchema = v.strictObject({ params: paramsSchema });
export const createSchema = v.strictObject({
  params: paramsSchema,
  title: titleSchema,
});
export const updateSchema = v.strictObject({
  params: paramsSchema,
  title: titleSchema,
  expected_revision: integer(1, 30),
});
export const publishSchema = v.strictObject({
  expected_revision: integer(1, 30),
  published: v.boolean(),
});
export function decode(schema, input) {
  const r = v.safeParse(schema, input);
  if (!r.success)
    throw new DomainError("invalid_input", "Confira os campos e seus limites.");
  return r.output;
}
export const catalog = {
  presets: [
    {
      id: "elo",
      title: "Elo",
      subtitle: "Uma linha. Infinitas voltas.",
      params: { folds: 3, torsion: 2, tension: 68, finish: "chrome" },
    },
    {
      id: "fluxo",
      title: "Fluxo",
      subtitle: "O gesto que não termina.",
      params: { folds: 5, torsion: 1, tension: 36, finish: "copper" },
    },
    {
      id: "nucleo",
      title: "Núcleo",
      subtitle: "Tudo volta ao centro.",
      params: { folds: 7, torsion: 3, tension: 84, finish: "ceramic" },
    },
  ],
  limits: {
    folds: [3, 9],
    torsion: [0, 4],
    tension: [0, 100],
    max_revision: 30,
    ttl_days: 7,
  },
};
const U = 128,
  V = 24,
  TAU = 2 * Math.PI;
export function generate(raw) {
  const params = decode(paramsSchema, raw),
    positions = [],
    indices = [],
    min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  const tension = params.tension / 100;
  for (let i = 0; i < U; i++) {
    const u = (TAU * i) / U,
      center = 1.55 + 0.16 * Math.cos(params.folds * u),
      wave = (0.12 + tension * 0.62) * Math.sin(params.folds * u),
      theta = params.torsion * u + 0.35 * Math.sin(params.folds * u),
      ct = Math.cos(theta),
      st = Math.sin(theta);
    for (let j = 0; j < V; j++) {
      const a = (TAU * j) / V,
        wide = (0.34 + tension * 0.12) * Math.cos(a),
        thin = 0.115 * Math.sin(a),
        offset = wide * ct - thin * st,
        height = wide * st + thin * ct;
      const point = [
        (center + offset) * Math.cos(u),
        (center + offset) * Math.sin(u),
        wave + height,
      ];
      positions.push(...point);
      point.forEach((x, k) => {
        min[k] = Math.min(min[k], x);
        max[k] = Math.max(max[k], x);
      });
    }
  }
  for (let i = 0; i < U; i++)
    for (let j = 0; j < V; j++) {
      const a = i * V + j,
        b = ((i + 1) % U) * V + j,
        c = ((i + 1) % U) * V + ((j + 1) % V),
        d = i * V + ((j + 1) % V);
      indices.push(a, b, c, a, c, d);
    }
  let area = 0,
    volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3,
      b = indices[i + 1] * 3,
      c = indices[i + 2] * 3,
      ax = positions[a],
      ay = positions[a + 1],
      az = positions[a + 2],
      bx = positions[b],
      by = positions[b + 1],
      bz = positions[b + 2],
      cx = positions[c],
      cy = positions[c + 1],
      cz = positions[c + 2];
    const x1 = bx - ax,
      y1 = by - ay,
      z1 = bz - az,
      x2 = cx - ax,
      y2 = cy - ay,
      z2 = cz - az;
    area +=
      Math.hypot(y1 * z2 - z1 * y2, z1 * x2 - x1 * z2, x1 * y2 - y1 * x2) / 2;
    volume +=
      (ax * (by * cz - bz * cy) +
        ay * (bz * cx - bx * cz) +
        az * (bx * cy - by * cx)) /
      6;
  }
  if (volume < 0) {
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    volume = -volume;
  }
  return {
    params,
    positions,
    indices,
    stats: {
      vertices: positions.length / 3,
      triangles: indices.length / 3,
      area,
      volume,
      bounds: { min, max },
      unit: "artistic",
      closed: true,
    },
  };
}
export function toObj(mesh) {
  const lines = [
    "# VERTICE - original parametric sculpture",
    "# Artistic units. Geometry only; no fabrication specification.",
    "o VERTICE",
  ];
  for (let i = 0; i < mesh.positions.length; i += 3)
    lines.push(
      "v " +
        mesh.positions
          .slice(i, i + 3)
          .map((n) => n.toFixed(8))
          .join(" "),
    );
  for (let i = 0; i < mesh.indices.length; i += 3)
    lines.push(
      "f " +
        mesh.indices
          .slice(i, i + 3)
          .map((n) => n + 1)
          .join(" "),
    );
  return lines.join("\n") + "\n";
}
export async function digest(s) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
