export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  let r: Response;
  try {
    r = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.token ? { authorization: "Bearer " + options.token } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: options.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      "network",
      "Sem conexão com o ateliê. Suas alterações continuam na tela.",
      0,
    );
  }
  const value = await r.json();
  if (!r.ok)
    throw new ApiError(
      value.code ?? "server",
      value.message ?? "Não foi possível concluir.",
      r.status,
    );
  return value as T;
}
