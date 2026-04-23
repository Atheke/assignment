import { describe, expect, it } from "vitest";
import { buildCors } from "./cors.js";

describe("CORS policy", () => {
  it("restricts methods and headers per API contract", () => {
    const c = buildCors();
    expect(c.methods).toEqual(["GET", "POST", "PUT", "DELETE", "OPTIONS"]);
    expect(c.allowedHeaders).toEqual(["Content-Type", "Authorization"]);
    expect(c.credentials).toBe(true);
    expect(c.optionsSuccessStatus).toBe(204);
  });
});
