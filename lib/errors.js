export class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export const notFound = (what = "Record") => new ApiError(404, "not_found", `${what} not found`);
export const conflict = (message) => new ApiError(409, "conflict", message);
