import { H3 } from "h3";
import {
  catalog,
  decode,
  generate,
  toObj,
  digest,
  createSchema,
  meshSchema,
  updateSchema,
  publishSchema,
  DomainError,
} from "./domain.mjs";
import { readJson, secure, problem } from "./transport.mjs";
import { spec } from "./spec.mjs";
export function createApi(db, clock = () => Math.floor(Date.now() / 1000)) {
  const app = new H3({ debug: false });
  const wrap = (fn) => async (event) => {
    const id = crypto.randomUUID();
    try {
      const req = event.req,
        url = new URL(req.url),
        origin = req.headers.get("origin");
      if (origin && origin !== url.origin)
        throw new DomainError("origin_denied", "Origem não autorizada.", 403);
      if (url.search)
        throw new DomainError(
          "invalid_query",
          "Parâmetros de URL não são aceitos.",
          400,
        );
      return secure(await fn(req, event.context.params ?? {}), id);
    } catch (e) {
      return secure(problem(e, id), id);
    }
  };
  const publicPiece = (r) => ({
    id: r.id,
    title: r.title,
    params: JSON.parse(r.params),
    revision: r.revision,
    published: !!r.published,
    created_at: r.created_at,
    updated_at: r.updated_at,
    expires_at: r.expires_at,
  });
  async function piece(req, id, ownerOnly = false) {
    if (!/^[a-f0-9-]{36}$/.test(id))
      throw new DomainError(
        "not_found",
        "Peça não encontrada ou acesso encerrado.",
        404,
      );
    const r = await db
      .prepare("SELECT * FROM pieces WHERE id=? AND expires_at>?")
      .bind(id, clock())
      .first();
    if (!r)
      throw new DomainError(
        "not_found",
        "Peça não encontrada ou acesso encerrado.",
        404,
      );
    const auth = req.headers.get("authorization");
    const own =
      !!auth &&
      /^Bearer vrt_[a-f0-9]{64}$/.test(auth) &&
      (await digest(auth.slice(7))) === r.token_hash;
    if ((ownerOnly || !r.published) && !own)
      throw new DomainError(
        "not_found",
        "Peça não encontrada ou acesso encerrado.",
        404,
      );
    return r;
  }
  app.get(
    "/api/health",
    wrap(async () => {
      await db.prepare("SELECT 1").first();
      const m = generate(catalog.presets[0].params);
      return Response.json({
        status: "ok",
        database: "ok",
        geometry: m.stats.vertices === 3072,
      });
    }),
  );
  app.get(
    "/api/catalog",
    wrap(() => Response.json(catalog)),
  );
  app.get(
    "/api/openapi.json",
    wrap(() => Response.json(spec)),
  );
  app.post(
    "/api/mesh",
    wrap(async (req) =>
      Response.json(generate(decode(meshSchema, await readJson(req)).params)),
    ),
  );
  app.post(
    "/api/pieces",
    wrap(async (req) => {
      const input = decode(createSchema, await readJson(req));
      generate(input.params);
      const now = clock();
      await db.batch([
        db
          .prepare(
            "DELETE FROM pieces WHERE id IN (SELECT id FROM pieces WHERE expires_at<=? LIMIT 100)",
          )
          .bind(now),
        db.prepare("DELETE FROM quotas WHERE expires_at<=?").bind(now),
      ]);
      const q = await db
        .prepare(
          "INSERT INTO quotas(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<12 RETURNING count",
        )
        .bind(
          "create:" + Math.floor(now / 3600),
          (Math.floor(now / 3600) + 1) * 3600,
        )
        .first();
      if (!q)
        throw new DomainError(
          "rate_limited",
          "O ateliê atingiu 12 criações nesta hora UTC. Tente na próxima hora.",
          429,
        );
      const token =
          "vrt_" +
          [...crypto.getRandomValues(new Uint8Array(32))]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join(""),
        id = crypto.randomUUID();
      const r = await db
        .prepare(
          "INSERT INTO pieces(id,title,params,token_hash,revision,published,created_at,updated_at,expires_at) VALUES(?,?,?,?,1,0,?,?,?) RETURNING *",
        )
        .bind(
          id,
          input.title,
          JSON.stringify(input.params),
          await digest(token),
          now,
          now,
          now + 604800,
        )
        .first();
      return Response.json({ piece: publicPiece(r), token }, { status: 201 });
    }),
  );
  app.get(
    "/api/pieces/:id/mesh.obj",
    wrap(async (req, { id }) => {
      const r = await piece(req, id);
      return new Response(toObj(generate(JSON.parse(r.params))), {
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-disposition":
            'attachment; filename="vertice-' + id + '.obj"',
        },
      });
    }),
  );
  app.get(
    "/api/pieces/:id",
    wrap(async (req, { id }) =>
      Response.json({ piece: publicPiece(await piece(req, id)) }),
    ),
  );
  app.put(
    "/api/pieces/:id",
    wrap(async (req, { id }) => {
      await piece(req, id, true);
      const input = decode(updateSchema, await readJson(req));
      const r = await db
        .prepare(
          "UPDATE pieces SET title=?,params=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND revision<30 AND expires_at>? RETURNING *",
        )
        .bind(
          input.title,
          JSON.stringify(input.params),
          clock(),
          id,
          input.expected_revision,
          clock(),
        )
        .first();
      if (!r)
        throw new DomainError(
          "revision_conflict",
          "A peça mudou ou chegou ao limite de revisões. Reabra antes de continuar.",
          409,
        );
      return Response.json({ piece: publicPiece(r) });
    }),
  );
  app.post(
    "/api/pieces/:id/publish",
    wrap(async (req, { id }) => {
      await piece(req, id, true);
      const input = decode(publishSchema, await readJson(req));
      const r = await db
        .prepare(
          "UPDATE pieces SET published=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND revision<30 AND expires_at>? RETURNING *",
        )
        .bind(
          input.published ? 1 : 0,
          clock(),
          id,
          input.expected_revision,
          clock(),
        )
        .first();
      if (!r)
        throw new DomainError(
          "revision_conflict",
          "A peça mudou. Reabra antes de alterar a visibilidade.",
          409,
        );
      return Response.json({ piece: publicPiece(r) });
    }),
  );
  app.delete(
    "/api/pieces/:id",
    wrap(async (req, { id }) => {
      await piece(req, id, true);
      await db.prepare("DELETE FROM pieces WHERE id=?").bind(id).run();
      return Response.json({ deleted: true });
    }),
  );
  app.all(
    "/**",
    wrap(() => {
      throw new DomainError("not_found", "Página da API não encontrada.", 404);
    }),
  );
  return (req) => app.fetch(req);
}
