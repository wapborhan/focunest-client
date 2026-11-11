import "server-only";
import { ZodError } from "zod";
import { requireUser } from "./auth";
import { ApiError } from "./errors";
/** Wraps a body with an explicit HTTP status. Plain return values are always sent as 200, so a body field called "status" is never mistaken for one. */
class Reply { constructor(body, status) { this.body = body; this.status = status; } }
const err = (status, code, message, details) => Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });

/** Wraps a handler: authenticates, passes the verified user, and maps errors to consistent JSON. */
export function route(handler) {
  return async (req, ctx) => {
    try {
      const user = await requireUser();
      const params = ctx?.params ? await ctx.params : {};
      const out = await handler({ req, user, params });
      if (out instanceof Response) return out;
      return out instanceof Reply ? Response.json(out.body, { status: out.status }) : Response.json(out);
    } catch (e) {
      if (e instanceof Response) return e;
      if (e instanceof ZodError) return err(400, "invalid_input", "Check the highlighted fields", e.flatten().fieldErrors);
      if (e instanceof ApiError) return err(e.status, e.code, e.message);
      if (e?.code === 11000) return err(409, "duplicate", "This request was already processed");
      console.error(e);
      return err(500, "server_error", "Something went wrong. Try again.");
    }
  };
}
export const created = (body) => new Reply(body, 201);
