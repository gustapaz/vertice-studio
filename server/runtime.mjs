import { env } from "cloudflare:workers";
import { createApi } from "./api.mjs";
export const handle = (req) => createApi(env.DB)(req);
