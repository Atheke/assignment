import { describe, expect, it } from "vitest";
import { buildCors } from "./cors.js";

function resolveOrigin(resultOrigin: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const c = buildCors();
    if (typeof c.origin !== "function") {
      reject(new Error("origin callback not configured"));
      return;
    }
    c.origin(resultOrigin as string | undefined, (err, allowed) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(allowed);
    });
  });
}

describe("CORS policy", () => {
  it("restricts methods and headers per API contract", () => {
    const c = buildCors();
    expect(c.methods).toEqual(["GET", "POST", "PUT", "DELETE", "OPTIONS"]);
    expect(c.allowedHeaders).toEqual(["Content-Type", "Authorization"]);
    expect(c.credentials).toBe(true);
    expect(c.optionsSuccessStatus).toBe(204);
  });

  it("allows localhost and configured frontend origins", async () => {
    await expect(resolveOrigin("http://localhost:3000")).resolves.toBe(
      "http://localhost:3000",
    );
    await expect(resolveOrigin("http://127.0.0.1:3000")).resolves.toBe(
      "http://127.0.0.1:3000",
    );
  });

  it("blocks unknown browser origins", async () => {
    await expect(resolveOrigin("https://evil.example")).resolves.toBe(false);
  });

  it("allows requests without origin header", async () => {
    await expect(resolveOrigin(undefined)).resolves.toBe(true);
  });
});
