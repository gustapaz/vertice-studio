import assert from "node:assert/strict";
const base = process.argv[2];
if (!base || !["http:", "https:"].includes(new URL(base).protocol))
  throw new Error("Use npm run smoke -- URL");
let token, id;
async function request(path, method = "GET", body, auth = token) {
  const r = await fetch(new URL(path, base), {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(auth ? { authorization: "Bearer " + auth } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: r.status,
    body: r.headers.get("content-type")?.includes("json")
      ? await r.json()
      : await r.text(),
  };
}
try {
  const health = await request("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.geometry, true);
  const { presets } = (await request("/api/catalog")).body,
    params = { ...presets[1].params, folds: 6 };
  const mesh = await request("/api/mesh", "POST", { params });
  assert.equal(mesh.body.stats.vertices, 3072);
  const created = await request("/api/pieces", "POST", {
    title: "Estudo sintético / smoke",
    params,
  });
  assert.equal(created.status, 201);
  id = created.body.piece.id;
  token = created.body.token;
  assert.equal(
    (await request("/api/pieces/" + id, "GET", undefined, "")).status,
    404,
  );
  assert.equal(
    (
      await request("/api/pieces/" + id, "PUT", {
        title: "Smoke revisado",
        params,
        expected_revision: 1,
      })
    ).body.piece.revision,
    2,
  );
  assert.equal(
    (
      await request("/api/pieces/" + id, "PUT", {
        title: "Revisão antiga",
        params,
        expected_revision: 1,
      })
    ).status,
    409,
  );
  const published = await request("/api/pieces/" + id + "/publish", "POST", {
    published: true,
    expected_revision: 2,
  });
  assert.equal(published.body.piece.revision, 3);
  assert.equal(
    (await request("/api/pieces/" + id, "GET", undefined, "")).body.piece.title,
    "Smoke revisado",
  );
  const obj = await request(
    "/api/pieces/" + id + "/mesh.obj",
    "GET",
    undefined,
    "",
  );
  assert.equal(obj.status, 200);
  assert.ok(obj.body.includes("o VERTICE"));
  assert.equal(
    (
      await request("/api/pieces/" + id + "/publish", "POST", {
        published: false,
        expected_revision: 3,
      })
    ).status,
    200,
  );
  assert.equal(
    (await request("/api/pieces/" + id, "GET", undefined, "")).status,
    404,
  );
  const html = await request("/");
  assert.equal(html.status, 200);
  assert.ok(html.body.includes("O impossível"));
  assert.equal((await request("/api-docs.html")).status, 200);
  console.log(
    JSON.stringify(
      {
        ok: true,
        base,
        checks: [
          "geometry+DB health",
          "catalog",
          "mesh",
          "private piece",
          "real edit",
          "stale conflict",
          "public read",
          "OBJ export",
          "unpublish",
          "HTML+docs",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  if (id && token) {
    assert.equal((await request("/api/pieces/" + id, "DELETE")).status, 200);
    console.log("Synthetic smoke piece revoked.");
  }
}
