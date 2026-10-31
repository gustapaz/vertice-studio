import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import { createApi } from "../server/api.mjs";
import { catalog } from "../server/domain.mjs";
let mf, db, api, dir, time;
const params = catalog.presets[0].params;
const runtime = () =>
  new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: "2026-05-15",
    d1Databases: { DB: "vertice-test" },
    d1Persist: dir,
  });
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "vertice-tests-"));
  mf = runtime();
  db = await mf.getD1Database("DB");
  for (const sql of (
    await readFile(
      new URL("../drizzle/0000_fluffy_tombstone.sql", import.meta.url),
      "utf8",
    )
  )
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(sql).run();
});
beforeEach(async () => {
  await db.batch([
    db.prepare("DELETE FROM pieces"),
    db.prepare("DELETE FROM quotas"),
  ]);
  time = 2000000000;
  api = createApi(db, () => time);
});
after(async () => {
  await mf.dispose();
  const target = resolve(dir);
  if (
    !target.startsWith(resolve(tmpdir()) + sep) ||
    !basename(target).startsWith("vertice-tests-")
  )
    throw new Error("Unsafe cleanup");
  await rm(target, { recursive: true, force: true });
});
async function req(path, method = "GET", body, token, headers = {}) {
  const r = await api(
    new Request("https://vertice.test" + path, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: "Bearer " + token } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
  return {
    status: r.status,
    body: r.headers.get("content-type")?.includes("json")
      ? await r.json()
      : await r.text(),
    headers: r.headers,
  };
}
async function create(title = "Estudo sintético") {
  const r = await req("/api/pieces", "POST", { title, params });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}
test("health probes geometry and database; catalog and mesh contract", async () => {
  assert.equal((await req("/api/health")).body.geometry, true);
  assert.equal((await req("/api/catalog")).body.presets.length, 3);
  const r = await req("/api/mesh", "POST", { params });
  assert.equal(r.body.positions.length, 9216);
  assert.equal(r.body.stats.closed, true);
});
test("draft private by default; only digest persisted", async () => {
  const s = await create();
  assert.equal(s.piece.published, false);
  assert.equal((await req("/api/pieces/" + s.piece.id)).status, 404);
  assert.equal(
    (await req("/api/pieces/" + s.piece.id, "GET", undefined, s.token)).status,
    200,
  );
  const r = await db.prepare("SELECT * FROM pieces").first();
  assert.notEqual(r.token_hash, s.token);
  assert.ok(!JSON.stringify(r).includes(s.token));
});
test("cross-piece credential does not read, edit, publish, delete or export", async () => {
  const a = await create(),
    b = await create();
  for (const [tail, method, body] of [
    ["", "GET"],
    ["", "PUT", { params, title: "Changed", expected_revision: 1 }],
    ["/publish", "POST", { expected_revision: 1, published: true }],
    ["", "DELETE"],
    ["/mesh.obj", "GET"],
  ])
    assert.equal(
      (await req("/api/pieces/" + a.piece.id + tail, method, body, b.token))
        .status,
      404,
    );
});
test("real edit persisted; stale revision returns conflict", async () => {
  const a = await create();
  const body = {
    params: { ...params, folds: 6 },
    title: "Nova forma",
    expected_revision: 1,
  };
  assert.equal(
    (await req("/api/pieces/" + a.piece.id, "PUT", body, a.token)).body.piece
      .revision,
    2,
  );
  assert.equal(
    (await req("/api/pieces/" + a.piece.id, "PUT", body, a.token)).status,
    409,
  );
  const saved = await req(
    "/api/pieces/" + a.piece.id,
    "GET",
    undefined,
    a.token,
  );
  assert.equal(saved.body.piece.params.folds, 6);
  assert.equal(saved.body.piece.title, "Nova forma");
});
test("concurrent edits yield one winner and no lost update", async () => {
  const a = await create();
  const r = await Promise.all(
    ["One", "Two"].map((title) =>
      req(
        "/api/pieces/" + a.piece.id,
        "PUT",
        { params, title, expected_revision: 1 },
        a.token,
      ),
    ),
  );
  assert.deepEqual(r.map((x) => x.status).sort(), [200, 409]);
  assert.equal(
    (await req("/api/pieces/" + a.piece.id, "GET", undefined, a.token)).body
      .piece.revision,
    2,
  );
});
test("publishing creates read-only link; unpublishing removes public access", async () => {
  const a = await create(),
    path = "/api/pieces/" + a.piece.id;
  assert.equal(
    (
      await req(
        path + "/publish",
        "POST",
        { expected_revision: 1, published: true },
        a.token,
      )
    ).body.piece.revision,
    2,
  );
  const r = await req(path);
  assert.equal(r.status, 200);
  assert.equal(r.body.piece.published, true);
  assert.equal(r.body.token, undefined);
  assert.equal(
    (await req(path, "PUT", { params, title: "Attack", expected_revision: 2 }))
      .status,
    404,
  );
  assert.equal(
    (
      await req(
        path + "/publish",
        "POST",
        { expected_revision: 2, published: false },
        a.token,
      )
    ).status,
    200,
  );
  assert.equal((await req(path)).status, 404);
});
test("CAS applies to visibility, not just geometry edits", async () => {
  const a = await create();
  await req(
    "/api/pieces/" + a.piece.id,
    "PUT",
    { params, title: "Changed", expected_revision: 1 },
    a.token,
  );
  assert.equal(
    (
      await req(
        "/api/pieces/" + a.piece.id + "/publish",
        "POST",
        { expected_revision: 1, published: true },
        a.token,
      )
    ).status,
    409,
  );
});
test("OBJ follows stored revision and same authorization", async () => {
  const a = await create(),
    path = "/api/pieces/" + a.piece.id + "/mesh.obj";
  assert.equal((await req(path)).status, 404);
  const r = await req(path, "GET", undefined, a.token);
  assert.equal(r.status, 200);
  assert.ok(r.body.includes("o VERTICE"));
  assert.equal(
    r.body.split("\n").filter((x) => x.startsWith("v ")).length,
    3072,
  );
  assert.ok(r.headers.get("content-disposition").includes(".obj"));
});
test("expiry invalidates private and public reads and export", async () => {
  const a = await create();
  await req(
    "/api/pieces/" + a.piece.id + "/publish",
    "POST",
    { expected_revision: 1, published: true },
    a.token,
  );
  time += 604800;
  assert.equal((await req("/api/pieces/" + a.piece.id)).status, 404);
  assert.equal(
    (await req("/api/pieces/" + a.piece.id, "GET", undefined, a.token)).status,
    404,
  );
  assert.equal(
    (
      await req(
        "/api/pieces/" + a.piece.id + "/mesh.obj",
        "GET",
        undefined,
        a.token,
      )
    ).status,
    404,
  );
});
test("deletion revokes only own resource", async () => {
  const a = await create(),
    b = await create();
  assert.equal(
    (await req("/api/pieces/" + a.piece.id, "DELETE", undefined, a.token))
      .status,
    200,
  );
  assert.equal(
    (await req("/api/pieces/" + a.piece.id, "GET", undefined, a.token)).status,
    404,
  );
  assert.equal(
    (await req("/api/pieces/" + b.piece.id, "GET", undefined, b.token)).status,
    200,
  );
});
test("12 global creations/hour atomically bounded; next hour resets", async () => {
  const r = await Promise.all(
    Array.from({ length: 14 }, () =>
      req("/api/pieces", "POST", { title: "Synthetic", params }),
    ),
  );
  assert.equal(r.filter((x) => x.status === 201).length, 12);
  assert.equal(r.filter((x) => x.status === 429).length, 2);
  time += 3600;
  assert.equal((await create()).piece.revision, 1);
});
test("30 revisions bounded; no implicit TTL extension", async () => {
  const a = await create();
  for (let i = 1; i < 30; i++)
    assert.equal(
      (
        await req(
          "/api/pieces/" + a.piece.id,
          "PUT",
          { params, title: "Revision " + i, expected_revision: i },
          a.token,
        )
      ).status,
      200,
    );
  assert.equal(
    (
      await req(
        "/api/pieces/" + a.piece.id,
        "PUT",
        { params, title: "Full", expected_revision: 30 },
        a.token,
      )
    ).status,
    409,
  );
  assert.equal(
    (await req("/api/pieces/" + a.piece.id, "GET", undefined, a.token)).body
      .piece.expires_at,
    a.piece.expires_at,
  );
});
test("strict request validation; title is data not markup", async () => {
  assert.equal(
    (await req("/api/mesh", "POST", { params: { ...params, folds: 12 } }))
      .status,
    422,
  );
  assert.equal(
    (await req("/api/pieces", "POST", { title: "", params })).status,
    422,
  );
  assert.equal(
    (await req("/api/pieces", "POST", { title: "Test", params, extra: 1 }))
      .status,
    422,
  );
  const a = await create("<img onerror=alert(1)>");
  assert.equal(a.piece.title, "<img onerror=alert(1)>");
});
test("transport guards bytes, JSON, UTF8, media, origin; masks internals", async () => {
  assert.equal(
    (await req("/api/mesh", "POST", { x: "x".repeat(17000) })).status,
    413,
  );
  assert.equal(
    (
      await req("/api/mesh", "POST", {}, undefined, {
        "content-type": "text/plain",
      })
    ).status,
    415,
  );
  assert.equal(
    (
      await req("/api/health", "GET", undefined, undefined, {
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
  const r = await api(
    new Request("https://vertice.test/api/mesh", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new Uint8Array([255]),
    }),
  );
  assert.equal(r.status, 400);
  assert.equal(
    (await req("/api/health")).headers.get("cache-control"),
    "no-store",
  );
});
test("database failure masked and request ID present", async () => {
  const fail = createApi({
    prepare() {
      throw new Error("secret database detail");
    },
  });
  const r = await fail(new Request("https://vertice.test/api/health"));
  assert.equal(r.status, 500);
  assert.ok(!(await r.text()).includes("secret"));
  assert.ok(r.headers.get("x-request-id"));
});
test("persisted piece survives closing and reopening runtime", async () => {
  const a = await create();
  await mf.dispose();
  mf = runtime();
  db = await mf.getD1Database("DB");
  api = createApi(db, () => time);
  const r = await req("/api/pieces/" + a.piece.id, "GET", undefined, a.token);
  assert.equal(r.status, 200);
  assert.equal(r.body.piece.title, a.piece.title);
});
