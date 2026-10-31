import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  catalog,
  toObj,
  decode,
  paramsSchema,
  createSchema,
} from "../server/domain.mjs";
function topology(g) {
  const edges = new Map();
  let signed = 0;
  for (let i = 0; i < g.indices.length; i += 3) {
    const t = g.indices.slice(i, i + 3);
    for (let k = 0; k < 3; k++) {
      const a = t[k],
        b = t[(k + 1) % 3],
        key = [Math.min(a, b), Math.max(a, b)].join(":");
      const e = edges.get(key) ?? { count: 0, direction: 0 };
      e.count++;
      e.direction += a < b ? 1 : -1;
      edges.set(key, e);
    }
    const [a, b, c] = t.map((x) => g.positions.slice(x * 3, x * 3 + 3));
    signed +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
  }
  for (const e of edges.values()) {
    assert.equal(e.count, 2);
    assert.equal(e.direction, 0);
  }
  assert.equal(g.stats.vertices - edges.size + g.stats.triangles, 0);
  assert.ok(signed > 0);
  return signed;
}
test("catalog presets form closed oriented genus-one surfaces", () => {
  for (const p of catalog.presets) {
    const g = generate(p.params);
    assert.equal(g.stats.vertices, 3072);
    assert.equal(g.stats.triangles, 6144);
    assert.ok(Math.abs(topology(g) - g.stats.volume) < 1e-9);
  }
});
test("all extremal parameter combinations preserve topology and finite bounds", () => {
  for (const folds of [3, 9])
    for (const torsion of [0, 4])
      for (const tension of [0, 100]) {
        const g = generate({ folds, torsion, tension, finish: "chrome" });
        topology(g);
        for (let k = 0; k < 3; k++) {
          assert.ok(g.stats.bounds.min[k] < g.stats.bounds.max[k]);
          for (let i = k; i < g.positions.length; i += 3)
            assert.ok(
              Number.isFinite(g.positions[i]) &&
                g.positions[i] >= g.stats.bounds.min[k] &&
                g.positions[i] <= g.stats.bounds.max[k],
            );
        }
      }
});
test("geometry generation deterministic and has no global mutable state", () => {
  const a = generate(catalog.presets[0].params);
  generate(catalog.presets[1].params);
  assert.deepEqual(a, generate(catalog.presets[0].params));
});
test("finish changes appearance metadata without changing topology", () => {
  const a = generate(catalog.presets[0].params),
    b = generate({ ...catalog.presets[0].params, finish: "copper" });
  assert.deepEqual(a.positions, b.positions);
  assert.deepEqual(a.indices, b.indices);
});
test("torsion and tension change actual vertices", () => {
  const a = generate(catalog.presets[0].params);
  assert.notDeepEqual(
    a.positions,
    generate({ ...a.params, torsion: 0 }).positions,
  );
  assert.notDeepEqual(
    a.positions,
    generate({ ...a.params, tension: 0 }).positions,
  );
});
test("OBJ has exact vertices and valid one-based triangle indices", () => {
  const g = generate(catalog.presets[0].params),
    lines = toObj(g).split("\n");
  assert.equal(
    lines.filter((x) => x.startsWith("v ")).length,
    g.stats.vertices,
  );
  assert.equal(
    lines.filter((x) => x.startsWith("f ")).length,
    g.stats.triangles,
  );
  for (const l of lines.filter((x) => x.startsWith("f ")))
    for (const n of l.slice(2).split(" ").map(Number))
      assert.ok(n >= 1 && n <= g.stats.vertices);
  assert.ok(!lines.some((l) => l.startsWith("mtllib")));
});
test("strict validation rejects limits, fractions, unknown fields, null and nonfinite values", () => {
  for (const params of [
    { ...catalog.presets[0].params, folds: 2 },
    { ...catalog.presets[0].params, folds: 3.5 },
    { ...catalog.presets[0].params, tension: 101 },
    { ...catalog.presets[0].params, torsion: -1 },
    { ...catalog.presets[0].params, finish: "gold" },
    { ...catalog.presets[0].params, extra: true },
    null,
    { ...catalog.presets[0].params, tension: NaN },
  ])
    assert.throws(() => decode(paramsSchema, params));
});
test("titles trimmed, Unicode retained and control characters refused", () => {
  assert.equal(
    decode(createSchema, {
      params: catalog.presets[0].params,
      title: "  João / estudo  ",
    }).title,
    "João / estudo",
  );
  for (const title of ["", "x".repeat(49), "a\nb"])
    assert.throws(() =>
      decode(createSchema, { params: catalog.presets[0].params, title }),
    );
});
