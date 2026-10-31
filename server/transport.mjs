import { DomainError } from "./domain.mjs";
export async function readJson(req) {
  if (
    req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new DomainError("unsupported_media", "Use application/json.", 415);
  if (
    req.headers.has("content-encoding") &&
    req.headers.get("content-encoding") !== "identity"
  )
    throw new DomainError(
      "unsupported_encoding",
      "Compressão não aceita.",
      415,
    );
  const reader = req.body?.getReader();
  if (!reader) throw new DomainError("invalid_json", "Envie JSON.", 400);
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16384) {
        await reader.cancel();
        throw new DomainError("body_too_large", "Limite de 16 KiB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new DomainError("invalid_json", "JSON ou UTF-8 inválido.", 400);
  }
}
export function secure(r, id) {
  const h = new Headers(r.headers);
  h.set("cache-control", "no-store");
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "no-referrer");
  h.set("x-request-id", id);
  return new Response(r.body, { status: r.status, headers: h });
}
export function problem(e, id) {
  const known = e instanceof DomainError;
  return Response.json(
    {
      code: known ? e.code : "internal_error",
      message: known
        ? e.message
        : "Não foi possível concluir. Tente novamente.",
      request_id: id,
    },
    { status: known ? e.status : 500 },
  );
}
