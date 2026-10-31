const params = {
  type: "object",
  additionalProperties: false,
  required: ["folds", "torsion", "tension", "finish"],
  properties: {
    folds: { type: "integer", minimum: 3, maximum: 9 },
    torsion: { type: "integer", minimum: 0, maximum: 4 },
    tension: { type: "integer", minimum: 0, maximum: 100 },
    finish: { type: "string", enum: ["chrome", "copper", "ceramic"] },
  },
};
const title = { type: "string", minLength: 1, maxLength: 48 },
  revision = { type: "integer", minimum: 1, maximum: 30 };
const body = (properties, required = Object.keys(properties)) => ({
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: false,
        required,
        properties,
      },
    },
  },
});
const response = (description) => ({
  description,
  content: { "application/json": { schema: { type: "object" } } },
});
const errors = Object.fromEntries(
  [400, 403, 404, 409, 413, 415, 422, 429, 500].map((s) => [
    s,
    response(
      "Erro: {code,message,request_id}; recursos privados sem token retornam 404.",
    ),
  ]),
);
const op = (summary, requestBody, secured = false, status = 200) => ({
  summary,
  ...(requestBody ? { requestBody } : {}),
  ...(secured ? { security: [{ pieceToken: [] }] } : {}),
  responses: {
    [status]: response("Resultado real calculado ou persistido."),
    ...errors,
  },
});
const id = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};
export const spec = {
  openapi: "3.0.3",
  info: {
    title: "VÉRTICE API",
    version: "1.0.0",
    description:
      "Geometria paramétrica original e peças D1. Unidades artísticas, sem especificação física. Tokens por recurso de 256 bits, TTL 7 dias, somente digest no banco. Máximo 12 criações por hora UTC globalmente e 30 revisões. Corpo JSON 16 KiB. Datas Unix seconds UTC. Catálogo curatorial sintético; backend real. OBJ contém só geometria.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      pieceToken: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "vrt_<64 hex>",
      },
    },
  },
  paths: {
    "/api/health": { get: op("Verificar banco e geometria") },
    "/api/catalog": { get: op("Obter presets e limites") },
    "/api/mesh": {
      post: op(
        "Gerar malha fechada com positions, indices e stats",
        body({ params }),
      ),
    },
    "/api/pieces": {
      post: op(
        "Criar peça privada; token aparece uma vez",
        body({ params, title }),
        false,
        201,
      ),
    },
    "/api/pieces/{id}": {
      parameters: [id],
      get: op("Ler peça: pública ou token proprietário"),
      put: op(
        "Editar com CAS de revisão",
        body({ params, title, expected_revision: revision }),
        true,
      ),
      delete: op("Revogar e excluir somente a peça autenticada", null, true),
    },
    "/api/pieces/{id}/publish": {
      parameters: [id],
      post: op(
        "Publicar ou retirar visibilidade por revisão",
        body({ expected_revision: revision, published: { type: "boolean" } }),
        true,
      ),
    },
    "/api/pieces/{id}/mesh.obj": {
      parameters: [id],
      get: {
        summary: "Exportar OBJ com mesma autorização da leitura",
        responses: {
          200: {
            description: "Arquivo OBJ original, sem material MTL.",
            content: { "text/plain": { schema: { type: "string" } } },
          },
          ...errors,
        },
      },
    },
  },
};

const pieceSchema = {
  type: "object",
  required: [
    "id",
    "title",
    "params",
    "revision",
    "published",
    "created_at",
    "updated_at",
    "expires_at",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    title,
    params,
    revision,
    published: { type: "boolean" },
    ...Object.fromEntries(
      ["created_at", "updated_at", "expires_at"].map((k) => [
        k,
        { type: "integer", description: "Unix seconds UTC" },
      ]),
    ),
  },
};
const vector = {
  type: "array",
  minItems: 3,
  maxItems: 3,
  items: { type: "number" },
};
const statsSchema = {
  type: "object",
  required: [
    "vertices",
    "triangles",
    "area",
    "volume",
    "bounds",
    "unit",
    "closed",
  ],
  properties: {
    vertices: { type: "integer", enum: [3072] },
    triangles: { type: "integer", enum: [6144] },
    area: { type: "number", minimum: 0 },
    volume: { type: "number", minimum: 0 },
    bounds: { type: "object", properties: { min: vector, max: vector } },
    unit: { type: "string", enum: ["artistic"] },
    closed: { type: "boolean", enum: [true] },
  },
};
const meshReply = {
  type: "object",
  required: ["params", "positions", "indices", "stats"],
  properties: {
    params,
    positions: {
      type: "array",
      minItems: 9216,
      maxItems: 9216,
      items: { type: "number" },
    },
    indices: {
      type: "array",
      minItems: 18432,
      maxItems: 18432,
      items: { type: "integer", minimum: 0, maximum: 3071 },
    },
    stats: statsSchema,
  },
};
spec.components.schemas = {
  Params: params,
  Piece: pieceSchema,
  Mesh: meshReply,
};
function result(path, method, schema, status = 200) {
  spec.paths[path][method].responses[status] = {
    description: "Resultado real.",
    content: { "application/json": { schema } },
  };
}
result("/api/mesh", "post", meshReply);
result(
  "/api/pieces",
  "post",
  {
    type: "object",
    required: ["piece", "token"],
    properties: {
      piece: pieceSchema,
      token: {
        type: "string",
        pattern: "^vrt_[a-f0-9]{64}$",
        description: "Aparece apenas na criação; nunca em URL.",
      },
    },
  },
  201,
);
for (const [path, method] of [
  ["/api/pieces/{id}", "get"],
  ["/api/pieces/{id}", "put"],
  ["/api/pieces/{id}/publish", "post"],
])
  result(path, method, {
    type: "object",
    required: ["piece"],
    properties: { piece: pieceSchema },
  });
result("/api/pieces/{id}", "delete", {
  type: "object",
  properties: { deleted: { type: "boolean" } },
});
result("/api/health", "get", {
  type: "object",
  properties: {
    status: { type: "string" },
    database: { type: "string" },
    geometry: { type: "boolean" },
  },
});
result("/api/catalog", "get", {
  type: "object",
  properties: {
    presets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title,
          subtitle: { type: "string" },
          params,
        },
      },
    },
    limits: {
      type: "object",
      properties: {
        folds: { type: "array", items: { type: "integer" } },
        torsion: { type: "array", items: { type: "integer" } },
        tension: { type: "array", items: { type: "integer" } },
        max_revision: { type: "integer" },
        ttl_days: { type: "integer" },
      },
    },
  },
});
